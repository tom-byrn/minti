import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createClient } from '@/lib/supabase/server';

export interface SearchableTransaction {
  transaction_id: string
  name: string
  amount: number
  date: string
  merchant_name: string | null
  account_id: string
  account_name: string
  account_mask: string | null
  institution_name: string | null
  personal_finance_category?: { primary: string; detailed: string } | null
  pending: boolean
}

interface PlaidItem {
  secret_id: string
  institution_name: string | null
}

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

    // Get ALL user's Plaid items from database
    const { data: plaidItems, error: plaidError } = await supabase
      .from('plaid_items')
      .select('secret_id, institution_name')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (plaidError || !plaidItems || plaidItems.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts found' },
        { status: 404 }
      );
    }

    const { start_date, end_date } = await request.json();

    // Default to last 90 days for search (wider range than regular transactions)
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const startDate = start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch transactions from ALL connected accounts in parallel
    const transactionPromises = plaidItems.map(async (item: PlaidItem) => {
      try {
        // Retrieve access token from Supabase Vault
        const { data: access_token, error: vaultError } = await supabase.rpc(
          'get_plaid_token',
          { p_secret_id: item.secret_id }
        );

        if (vaultError || !access_token) {
          console.error('Failed to retrieve token for item:', item.secret_id);
          return { transactions: [], accounts: [], institution_name: item.institution_name };
        }

        const response = await plaidClient.transactionsGet({
          access_token,
          start_date: startDate,
          end_date: endDate,
          options: {
            count: 250, // Fetch more for search
            offset: 0,
          },
        });

        return {
          transactions: response.data.transactions,
          accounts: response.data.accounts,
          institution_name: item.institution_name,
        };
      } catch (error: any) {
        // Handle Plaid-specific errors gracefully
        if (error?.response?.data?.error_code === 'PRODUCT_NOT_READY') {
          console.warn('Transactions not ready for item:', item.secret_id);
        } else {
          console.error('Error fetching transactions for item:', item.secret_id, error);
        }
        return { transactions: [], accounts: [], institution_name: item.institution_name };
      }
    });

    const results = await Promise.all(transactionPromises);

    // Build account lookup map
    const accountMap = new Map<string, { name: string; mask: string | null; institution_name: string | null }>();

    for (const result of results) {
      for (const account of result.accounts) {
        accountMap.set(account.account_id, {
          name: account.name,
          mask: account.mask,
          institution_name: result.institution_name,
        });
      }
    }

    // Combine and enrich all transactions
    const allTransactions: SearchableTransaction[] = [];

    for (const result of results) {
      for (const transaction of result.transactions) {
        const accountInfo = accountMap.get(transaction.account_id);

        allTransactions.push({
          transaction_id: transaction.transaction_id,
          name: transaction.name,
          amount: transaction.amount,
          date: transaction.date,
          merchant_name: transaction.merchant_name ?? null,
          account_id: transaction.account_id,
          account_name: accountInfo?.name || 'Unknown Account',
          account_mask: accountInfo?.mask ?? null,
          institution_name: accountInfo?.institution_name ?? null,
          personal_finance_category: transaction.personal_finance_category ?? null,
          pending: transaction.pending,
        });
      }
    }

    // Sort by date descending (most recent first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      transactions: allTransactions,
      total_count: allTransactions.length,
    });
  } catch (error: any) {
    console.error('Error in transaction search:', error);

    return NextResponse.json(
      { error: 'Failed to search transactions' },
      { status: 500 }
    );
  }
}
