import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions'

export async function GET() {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Plaid secret_id from database (most recently updated first)
    const { data: plaidItems, error: plaidError } = await supabase
      .from('plaid_items')
      .select('secret_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (plaidError || !plaidItems || plaidItems.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts found' },
        { status: 404 }
      )
    }

    // Retrieve access token from Supabase Vault
    const { data: access_token, error: vaultError } = await supabase.rpc(
      'get_plaid_token',
      { p_secret_id: plaidItems[0].secret_id }
    )

    if (vaultError || !access_token) {
      return NextResponse.json(
        { error: 'Failed to retrieve account credentials' },
        { status: 500 }
      )
    }

    // Fetch 18 months of transactions for better subscription detection
    const now = new Date()
    const startDate = new Date(now)
    startDate.setMonth(startDate.getMonth() - 18)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]

    // Fetch all transactions with pagination
    let allTransactions: any[] = []
    let offset = 0
    const count = 500

    while (true) {
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token,
        start_date: startDateStr,
        end_date: endDateStr,
        options: {
          count,
          offset,
        },
      })

      const transactions = transactionsResponse.data.transactions
      allTransactions = [...allTransactions, ...transactions]

      if (transactions.length < count) {
        break
      }

      offset += count
    }

    // Run subscription detection algorithm
    const subscriptionSummary = detectSubscriptions(allTransactions)

    return NextResponse.json(subscriptionSummary)
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error)

    if (error?.response?.data?.error_code === 'PRODUCT_NOT_READY') {
      return NextResponse.json(
        { error: 'Transactions are still being processed. Please try again in a few moments.' },
        { status: 202 }
      )
    }

    if (error?.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
      return NextResponse.json(
        { error: 'Your bank connection has expired. Please reconnect your account.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
