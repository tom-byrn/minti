import { NextRequest, NextResponse } from 'next/server';
import { CountryCode } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { public_token } = await request.json();

    if (!public_token) {
      return NextResponse.json(
        { error: 'Public token is required' },
        { status: 400 }
      );
    }

    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get institution info
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });
    const institutionId = itemResponse.data.item.institution_id;

    let institutionName = null;
    if (institutionId) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        });
        institutionName = instResponse.data.institution.name;
      } catch {
        // Institution lookup failed, continue without name
      }
    }

    // Store token securely in Supabase Vault
    const tokenName = `plaid_${user.id}_${itemId}`;
    const { data: vaultData, error: vaultError } = await supabase.rpc(
      'store_plaid_token',
      { token: accessToken, token_name: tokenName }
    );

    if (vaultError) {
      console.error('Error storing token in vault:', vaultError);
      return NextResponse.json(
        { error: 'Failed to securely store account connection' },
        { status: 500 }
      );
    }

    const secretId = vaultData;

    // Store reference in plaid_items (secret_id points to vault)
    const { error: dbError } = await supabase.from('plaid_items').upsert(
      {
        user_id: user.id,
        secret_id: secretId,
        item_id: itemId,
        institution_name: institutionName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,item_id',
      }
    );

    if (dbError) {
      console.error('Error storing Plaid item:', dbError);
      // Clean up vault secret if db insert fails
      await supabase.rpc('delete_plaid_token', { p_secret_id: secretId });
      return NextResponse.json(
        { error: 'Failed to store account connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item_id: itemId,
      institution_name: institutionName,
      success: true,
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    return NextResponse.json(
      { error: 'Failed to exchange public token' },
      { status: 500 }
    );
  }
}
