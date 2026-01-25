import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions'
import type { SubscriptionSummary } from '@/lib/subscriptions/types'

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

    // Fetch budget profile for user context
    const { data: budgetProfile } = await supabase
      .from('budget_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Fetch category budgets
    const { data: categoryBudgets } = await supabase
      .from('category_budgets')
      .select('category, monthly_limit')
      .eq('user_id', userId)

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

    // Fetch 12 months of transactions for subscription detection
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const startDateStr = twelveMonthsAgo.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]

    // Fetch all transactions with pagination
    let allTransactions: any[] = []
    let offset = 0
    const count = 500

    while (true) {
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDateStr,
        end_date: endDateStr,
        options: {
          count,
          offset,
        },
      })

      const fetchedTransactions = transactionsResponse.data.transactions
      allTransactions = [...allTransactions, ...fetchedTransactions]

      if (fetchedTransactions.length < count) {
        break
      }

      offset += count
    }

    // Filter to current month for spending analysis
    const transactions = allTransactions.filter(
      (t) => new Date(t.date) >= startOfMonth
    )

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

    // Detect subscriptions from all transactions
    const subscriptionSummary = detectSubscriptions(allTransactions)

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

    return formatFinancialContext(snapshot, budgetProfile, categoryBudgets, subscriptionSummary)
  } catch (error) {
    console.error('Error fetching financial context:', error)
    return null
  }
}

interface BudgetProfileData {
  occupation: string | null
  annual_income: number | null
  savings_goal_yearly: number | null
  financial_goals: string | null
}

interface CategoryBudgetData {
  category: string
  monthly_limit: number
}

function formatBillingPeriod(period: string): string {
  switch (period) {
    case 'weekly': return 'weekly'
    case 'biweekly': return 'bi-weekly'
    case 'monthly': return 'monthly'
    case 'quarterly': return 'quarterly'
    case 'annually': return 'annually'
    default: return period
  }
}

function formatFinancialContext(
  snapshot: FinancialSnapshot,
  budgetProfile?: BudgetProfileData | null,
  categoryBudgets?: CategoryBudgetData[] | null,
  subscriptions?: SubscriptionSummary | null
): string {
  const lines: string[] = []

  // Include user financial profile if available
  if (budgetProfile) {
    const hasProfileData = budgetProfile.occupation || budgetProfile.annual_income ||
                          budgetProfile.savings_goal_yearly || budgetProfile.financial_goals
    if (hasProfileData) {
      lines.push('**User Financial Profile:**')
      if (budgetProfile.occupation) {
        lines.push(`- Occupation: ${budgetProfile.occupation}`)
      }
      if (budgetProfile.annual_income) {
        lines.push(`- Annual Income: $${budgetProfile.annual_income.toLocaleString()}`)
      }
      if (budgetProfile.savings_goal_yearly) {
        lines.push(`- Yearly Savings Goal: $${budgetProfile.savings_goal_yearly.toLocaleString()}`)
      }
      if (budgetProfile.financial_goals) {
        lines.push(`\n**Financial Goals & Plans:**\n${budgetProfile.financial_goals}`)
      }
      lines.push('')
    }
  }

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
    lines.push('')
  }

  // Include category budgets if set
  if (categoryBudgets && categoryBudgets.length > 0) {
    lines.push('**Monthly Category Budgets:**')
    categoryBudgets.forEach((budget) => {
      const spending = snapshot.topCategories.find(
        (cat) => cat.category.toLowerCase() === budget.category.toLowerCase()
      )
      const spent = spending?.amount || 0
      const remaining = budget.monthly_limit - spent
      const percentUsed = Math.round((spent / budget.monthly_limit) * 100)
      lines.push(
        `- ${budget.category}: $${spent.toLocaleString()} / $${budget.monthly_limit.toLocaleString()} (${percentUsed}% used, $${remaining.toLocaleString()} ${remaining >= 0 ? 'remaining' : 'over budget'})`
      )
    })
    lines.push('')
  }

  // Include subscription information if available
  if (subscriptions && subscriptions.subscriptions.length > 0) {
    lines.push('**Active Subscriptions:**')
    lines.push(`- Total Monthly Cost: $${subscriptions.monthlyTotal.toLocaleString()}`)
    lines.push(`- Total Yearly Cost: $${subscriptions.yearlyTotal.toLocaleString()}`)
    lines.push(`- Active Subscriptions: ${subscriptions.activeCount}`)
    lines.push('')
    lines.push('**Subscription Details:**')
    subscriptions.subscriptions.forEach((sub) => {
      lines.push(
        `- ${sub.merchantName}: $${sub.estimatedAmount.toFixed(2)} ${formatBillingPeriod(sub.billingPeriod)} (${sub.category}, next charge: ${sub.nextExpectedCharge})`
      )
    })
  }

  return lines.join('\n')
}
