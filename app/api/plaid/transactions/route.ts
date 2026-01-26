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

    const { start_date, end_date } = await request.json();

    // Default to last 30 days if no dates provided
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch all transactions with pagination
    let allTransactions: any[] = [];
    let accounts: any[] = [];
    let totalTransactions = 0;
    let offset = 0;
    const count = 500;

    while (true) {
      const response = await plaidClient.transactionsGet({
        access_token,
        start_date: startDate,
        end_date: endDate,
        options: {
          count,
          offset,
        },
      });

      const fetchedTransactions = response.data.transactions;
      allTransactions = [...allTransactions, ...fetchedTransactions];

      // Only set accounts and total on first request
      if (offset === 0) {
        accounts = response.data.accounts;
        totalTransactions = response.data.total_transactions;
      }

      // If we got fewer transactions than requested, we've reached the end
      if (fetchedTransactions.length < count) {
        break;
      }

      offset += count;
    }

    return NextResponse.json({
      transactions: allTransactions,
      accounts,
      total_transactions: totalTransactions,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);

    // Handle Plaid-specific errors
    if (error?.response?.data?.error_code === 'PRODUCT_NOT_READY') {
      return NextResponse.json(
        { error: 'Transactions are still being processed. Please try again in a few moments.' },
        { status: 202 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
