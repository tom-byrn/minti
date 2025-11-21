import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
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
