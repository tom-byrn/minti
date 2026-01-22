import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'

interface FinancialSnapshot {
  totalBalance: number
  accounts: Array<{
    name: string
    type: string
    balance: number
  }>
  thisMonthSpending: number
  thisMonthIncome: number
  topCategories: Array<{
    category: string
    amount: number
  }>
}

export async function getFinancialContext(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Get user's Plaid secret_id from database (most recently updated first)
    const { data: plaidItems, error: plaidError } = await supabase
      .from('plaid_items')
      .select('secret_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (plaidError || !plaidItems || plaidItems.length === 0) {
      return null
    }

    const secretId = plaidItems[0].secret_id
    if (!secretId) {
      return null
    }

    // Retrieve access token from Supabase Vault
    const { data: accessToken, error: vaultError } = await supabase.rpc(
      'get_plaid_token',
      { p_secret_id: secretId }
    )

    if (vaultError || !accessToken) {
      console.error('Error retrieving token from vault:', vaultError)
      return null
    }

    // Fetch account balances
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    })

    const accounts = balanceResponse.data.accounts
    const totalBalance = accounts.reduce(
      (sum, account) => sum + (account.balances.current || 0),
      0
    )

    // Fetch recent transactions for spending analysis
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startDateStr = startOfMonth.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDateStr,
      end_date: endDateStr,
      options: {
        count: 500,
        offset: 0,
      },
    })

    const transactions = transactionsResponse.data.transactions

    // Calculate this month's spending and income
    const thisMonthSpending = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const thisMonthIncome = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // Calculate top spending categories
    const categoryMap = new Map<string, number>()
    transactions
      .filter((t) => t.amount > 0)
      .forEach((t) => {
        const category =
          t.personal_finance_category?.primary || t.category?.[0] || 'Other'
        categoryMap.set(category, (categoryMap.get(category) || 0) + t.amount)
      })

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category: category.replace(/_/g, ' ').toLowerCase(),
        amount: Math.round(amount),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Format the financial context as a readable string
    const snapshot: FinancialSnapshot = {
      totalBalance: Math.round(totalBalance),
      accounts: accounts.map((a) => ({
        name: a.name,
        type: a.type,
        balance: Math.round(a.balances.current || 0),
      })),
      thisMonthSpending: Math.round(thisMonthSpending),
      thisMonthIncome: Math.round(thisMonthIncome),
      topCategories,
    }

    return formatFinancialContext(snapshot)
  } catch (error) {
    console.error('Error fetching financial context:', error)
    return null
  }
}

function formatFinancialContext(snapshot: FinancialSnapshot): string {
  const lines: string[] = []

  lines.push(`**Total Balance Across All Accounts:** $${snapshot.totalBalance.toLocaleString()}`)
  lines.push('')

  lines.push('**Accounts:**')
  snapshot.accounts.forEach((account) => {
    lines.push(`- ${account.name} (${account.type}): $${account.balance.toLocaleString()}`)
  })
  lines.push('')

  lines.push('**This Month:**')
  lines.push(`- Total Spending: $${snapshot.thisMonthSpending.toLocaleString()}`)
  lines.push(`- Total Income: $${snapshot.thisMonthIncome.toLocaleString()}`)
  const netFlow = snapshot.thisMonthIncome - snapshot.thisMonthSpending
  lines.push(`- Net Cash Flow: ${netFlow >= 0 ? '+' : ''}$${netFlow.toLocaleString()}`)
  lines.push('')

  if (snapshot.topCategories.length > 0) {
    lines.push('**Top Spending Categories This Month:**')
    snapshot.topCategories.forEach((cat, i) => {
      lines.push(`${i + 1}. ${cat.category}: $${cat.amount.toLocaleString()}`)
    })
  }

  return lines.join('\n')
}
