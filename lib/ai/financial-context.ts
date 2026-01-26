import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions'
import type { SubscriptionSummary, MergedSubscription, BillingPeriod } from '@/lib/subscriptions/types'
import { calculateGoalProgress, type GoalWithProgress } from '@/lib/goals/types'

// Cache for financial context to avoid excessive Plaid API calls
const contextCache = new Map<string, { data: string; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedContext(userId: string): string | null {
  const cached = contextCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  // Clear expired cache entry
  if (cached) {
    contextCache.delete(userId)
  }
  return null
}

function setCachedContext(userId: string, data: string): void {
  contextCache.set(userId, { data, timestamp: Date.now() })
}

export function invalidateFinancialContextCache(userId: string): void {
  contextCache.delete(userId)
}

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
  // Check cache first
  const cached = getCachedContext(userId)
  if (cached) {
    return cached
  }

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

    // Fetch financial goals
    const { data: goalsData } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Transform goals to GoalWithProgress
    const goals: GoalWithProgress[] = (goalsData || []).map((goal) => ({
      id: goal.id,
      userId: goal.user_id,
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount || 0,
      deadline: goal.deadline,
      category: goal.category,
      color: goal.color,
      icon: goal.icon,
      isCompleted: goal.is_completed || false,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
      progress: calculateGoalProgress({
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount || 0,
        deadline: goal.deadline,
        createdAt: goal.created_at,
      }),
    }))

    // Fetch user-edited subscriptions
    const { data: userSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Fetch dismissed subscription IDs
    const { data: dismissedData } = await supabase
      .from('dismissed_subscriptions')
      .select('detected_subscription_id')
      .eq('user_id', userId)

    const dismissedIds = new Set(dismissedData?.map((d) => d.detected_subscription_id) || [])

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
    const detectedSummary = detectSubscriptions(allTransactions)

    // Merge detected subscriptions with user edits
    const userSubsByDetectedId = new Map<string, any>()
    const manualSubs: MergedSubscription[] = []

    userSubscriptions?.forEach((sub) => {
      if (sub.detected_subscription_id) {
        userSubsByDetectedId.set(sub.detected_subscription_id, sub)
      } else if (sub.source === 'manual') {
        manualSubs.push({
          id: sub.id,
          merchantName: sub.merchant_name,
          displayName: sub.display_name,
          category: sub.category,
          amount: sub.amount,
          billingPeriod: sub.billing_period as BillingPeriod,
          nextChargeDate: sub.next_charge_date,
          lastCharged: null,
          confidence: null,
          transactionCount: null,
          source: 'manual',
          detectedSubscriptionId: null,
          isActive: true,
          userSubscriptionId: sub.id,
        })
      }
    })

    // Build merged subscriptions list
    const mergedSubscriptions: MergedSubscription[] = []

    detectedSummary.subscriptions
      .filter((sub) => !dismissedIds.has(sub.id))
      .forEach((detected) => {
        const userSub = userSubsByDetectedId.get(detected.id)
        if (userSub) {
          mergedSubscriptions.push({
            id: userSub.id,
            merchantName: userSub.merchant_name,
            displayName: userSub.display_name,
            category: userSub.category,
            amount: userSub.amount,
            billingPeriod: userSub.billing_period as BillingPeriod,
            nextChargeDate: userSub.next_charge_date,
            lastCharged: detected.lastCharged,
            confidence: detected.confidence,
            transactionCount: detected.transactionCount,
            source: 'edited',
            detectedSubscriptionId: detected.id,
            isActive: true,
            userSubscriptionId: userSub.id,
          })
        } else {
          mergedSubscriptions.push({
            id: detected.id,
            merchantName: detected.merchantName,
            displayName: null,
            category: detected.category,
            amount: detected.estimatedAmount,
            billingPeriod: detected.billingPeriod,
            nextChargeDate: detected.nextExpectedCharge,
            lastCharged: detected.lastCharged,
            confidence: detected.confidence,
            transactionCount: detected.transactionCount,
            source: 'detected',
            detectedSubscriptionId: detected.id,
            isActive: true,
            userSubscriptionId: null,
          })
        }
      })

    // Add manual subscriptions
    mergedSubscriptions.push(...manualSubs)

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

    const formattedContext = formatFinancialContext(snapshot, budgetProfile, categoryBudgets, mergedSubscriptions, goals)

    // Cache the result
    setCachedContext(userId, formattedContext)

    return formattedContext
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
  subscriptions?: MergedSubscription[] | null,
  goals?: GoalWithProgress[] | null
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
  if (subscriptions && subscriptions.length > 0) {
    // Calculate totals
    const getMonthlyAmount = (amount: number, period: BillingPeriod): number => {
      switch (period) {
        case 'weekly': return amount * 4.33
        case 'biweekly': return amount * 2.17
        case 'monthly': return amount
        case 'quarterly': return amount / 3
        case 'annually': return amount / 12
      }
    }

    const monthlyTotal = subscriptions.reduce((sum, sub) => sum + getMonthlyAmount(sub.amount, sub.billingPeriod), 0)
    const yearlyTotal = monthlyTotal * 12

    lines.push('**Active Subscriptions:**')
    lines.push(`- Total Monthly Cost: $${Math.round(monthlyTotal).toLocaleString()}`)
    lines.push(`- Total Yearly Cost: $${Math.round(yearlyTotal).toLocaleString()}`)
    lines.push(`- Active Subscriptions: ${subscriptions.length}`)
    lines.push('')
    lines.push('**Subscription Details:**')
    subscriptions.forEach((sub) => {
      const name = sub.displayName || sub.merchantName
      const source = sub.source === 'manual' ? ' (manual)' : sub.source === 'edited' ? ' (edited)' : ''
      const nextCharge = sub.nextChargeDate ? `, next charge: ${sub.nextChargeDate}` : ''
      lines.push(
        `- ${name}: $${sub.amount.toFixed(2)} ${formatBillingPeriod(sub.billingPeriod)} (${sub.category || 'Uncategorized'}${nextCharge})${source}`
      )
    })
    lines.push('')
  }

  // Include financial goals if available
  if (goals && goals.length > 0) {
    const activeGoals = goals.filter(g => !g.isCompleted)
    const completedGoals = goals.filter(g => g.isCompleted)

    lines.push('**Financial Goals:**')
    lines.push(`- Active Goals: ${activeGoals.length}`)
    lines.push(`- Completed Goals: ${completedGoals.length}`)
    lines.push('')

    if (activeGoals.length > 0) {
      lines.push('**Active Goal Details:**')
      activeGoals.forEach((goal) => {
        const deadline = goal.deadline ? ` (deadline: ${goal.deadline})` : ''
        const monthlyNeeded = goal.progress.monthlyNeeded ? ` - needs $${goal.progress.monthlyNeeded.toLocaleString()}/mo` : ''
        const onTrack = goal.progress.isOnTrack !== null
          ? goal.progress.isOnTrack ? ' - on track' : ' - behind schedule'
          : ''
        lines.push(
          `- ${goal.name}: $${goal.currentAmount.toLocaleString()} / $${goal.targetAmount.toLocaleString()} (${goal.progress.percentage}% complete${deadline}${monthlyNeeded}${onTrack})`
        )
      })
      lines.push('')
    }

    if (completedGoals.length > 0) {
      lines.push('**Completed Goals:**')
      completedGoals.forEach((goal) => {
        lines.push(`- ${goal.name}: $${goal.targetAmount.toLocaleString()} achieved`)
      })
    }
  }

  return lines.join('\n')
}
