import { NextRequest, NextResponse } from 'next/server';
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

    // Get user's Plaid secret_id from database (most recently updated first)
    const { data: plaidItems, error: plaidError } = await supabase
      .from('plaid_items')
      .select('secret_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (plaidError || !plaidItems || plaidItems.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts found' },
        { status: 404 }
      );
    }

    // Retrieve access token from Supabase Vault
    const { data: access_token, error: vaultError } = await supabase.rpc(
      'get_plaid_token',
      { p_secret_id: plaidItems[0].secret_id }
    );

    if (vaultError || !access_token) {
      return NextResponse.json(
        { error: 'Failed to retrieve account credentials' },
        { status: 500 }
      );
    }

    const response = await plaidClient.accountsBalanceGet({
      access_token,
    });

    const accounts = response.data.accounts;

    // Calculate total balance across all accounts
    const totalBalance = accounts.reduce((sum, account) => {
      return sum + (account.balances.current || 0);
    }, 0);

    return NextResponse.json({
      accounts,
      totalBalance,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
