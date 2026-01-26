import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

    // Get all user's Plaid items
    const { data: plaidItems, error: plaidError } = await supabase
      .from('plaid_items')
      .select('secret_id, item_id')
      .eq('user_id', user.id);

    if (plaidError) {
      console.error('Error fetching plaid items:', plaidError);
      return NextResponse.json(
        { error: 'Failed to fetch connected accounts' },
        { status: 500 }
      );
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts found' },
        { status: 404 }
      );
    }

    // Process each Plaid item
    for (const item of plaidItems) {
      // Retrieve access token from Supabase Vault
      const { data: accessToken, error: vaultError } = await supabase.rpc(
        'get_plaid_token',
        { p_secret_id: item.secret_id }
      );

      if (!vaultError && accessToken) {
        // Revoke access token with Plaid
        try {
          await plaidClient.itemRemove({
            access_token: accessToken,
          });
        } catch (plaidRemoveError) {
          // Log but continue - token may already be invalid
          console.error('Error revoking Plaid access:', plaidRemoveError);
        }
      }

      // Delete token from Vault
      await supabase.rpc('delete_plaid_token', { p_secret_id: item.secret_id });
    }

    // Delete all plaid_items for this user
    const { error: deleteError } = await supabase
      .from('plaid_items')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting plaid items:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove account records' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting bank:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect bank account' },
      { status: 500 }
    );
  }
}
