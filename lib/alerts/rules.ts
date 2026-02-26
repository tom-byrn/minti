import type { AlertType, AlertPriority } from '@/lib/database.types'
import type { MergedSubscription, BillingPeriod } from '@/lib/subscriptions/types'
import { calculateGoalProgress } from '@/lib/goals/types'

export interface AlertCandidate {
  type: AlertType
  title: string
  message: string
  priority: AlertPriority
  data: Record<string, unknown>
}

interface CategorySpending {
  category: string
  amount: number
}

interface BudgetData {
  category: string
  monthly_limit: number
}

interface GoalData {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  is_completed: boolean
  created_at: string | null
}

interface TransactionData {
  amount: number
  date: string
  name: string
  personal_finance_category?: { primary?: string } | null
  category?: string[] | null
}

interface AlertRuleInput {
  categorySpending: CategorySpending[]
  budgets: BudgetData[]
  goals: GoalData[]
  subscriptions: MergedSubscription[]
  transactions: TransactionData[]
  thisMonthIncome: number
  thisMonthSpending: number
  savingsGoalYearly: number | null
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(Math.round(amount)).toLocaleString()}`
}

function checkBudgetAlerts(
  categorySpending: CategorySpending[],
  budgets: BudgetData[]
): AlertCandidate[] {
  const alerts: AlertCandidate[] = []
  const spendingMap = new Map(
    categorySpending.map((c) => [c.category.toLowerCase(), c.amount])
  )

  for (const budget of budgets) {
    const spent = spendingMap.get(budget.category.toLowerCase()) || 0
    const pct = (spent / budget.monthly_limit) * 100

    if (pct >= 100) {
      alerts.push({
        type: 'budget_exceeded',
        title: `${budget.category} budget exceeded`,
        message: `You've spent ${formatCurrency(spent)} of your ${formatCurrency(budget.monthly_limit)} ${budget.category} budget (${Math.round(pct)}%).`,
        priority: 'high',
        data: { category: budget.category, spent, limit: budget.monthly_limit, percentage: Math.round(pct) },
      })
    } else if (pct >= 80) {
      alerts.push({
        type: 'budget_warning',
        title: `${budget.category} budget almost reached`,
        message: `You've used ${Math.round(pct)}% of your ${formatCurrency(budget.monthly_limit)} ${budget.category} budget (${formatCurrency(spent)} spent).`,
        priority: 'high',
        data: { category: budget.category, spent, limit: budget.monthly_limit, percentage: Math.round(pct) },
      })
    }
  }

  return alerts
}

function checkSubscriptionAlerts(
  subscriptions: MergedSubscription[]
): AlertCandidate[] {
  const alerts: AlertCandidate[] = []
  const now = new Date()
  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  for (const sub of subscriptions) {
    if (!sub.nextChargeDate) continue

    const nextCharge = new Date(sub.nextChargeDate)
    if (nextCharge >= now && nextCharge <= threeDaysFromNow) {
      const name = sub.displayName || sub.merchantName
      const daysUntil = Math.ceil(
        (nextCharge.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const dayLabel = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`

      alerts.push({
        type: 'subscription_renewal',
        title: `${name} renews ${dayLabel}`,
        message: `Your ${name} subscription (${formatCurrency(sub.amount)}/${sub.billingPeriod}) renews ${dayLabel}.`,
        priority: 'medium',
        data: { merchantName: sub.merchantName, amount: sub.amount, billingPeriod: sub.billingPeriod, nextChargeDate: sub.nextChargeDate },
      })
    }
  }

  return alerts
}

function checkGoalAlerts(goals: GoalData[]): AlertCandidate[] {
  const alerts: AlertCandidate[] = []

  for (const goal of goals) {
    if (goal.is_completed) {
      continue
    }

    const progress = calculateGoalProgress({
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount || 0,
      deadline: goal.deadline,
      createdAt: goal.created_at,
    })

    if (progress.percentage >= 100) {
      alerts.push({
        type: 'goal_achieved',
        title: `${goal.name} achieved!`,
        message: `Congratulations! You've reached your ${formatCurrency(goal.target_amount)} goal for ${goal.name}.`,
        priority: 'low',
        data: { goalId: goal.id, goalName: goal.name, targetAmount: goal.target_amount },
      })
      continue
    }

    if (
      progress.daysUntilDeadline !== null &&
      progress.daysUntilDeadline <= 30 &&
      progress.daysUntilDeadline > 0 &&
      progress.percentage < 80
    ) {
      alerts.push({
        type: 'goal_at_risk',
        title: `${goal.name} is at risk`,
        message: `Your ${goal.name} goal deadline is in ${progress.daysUntilDeadline} days and you're only ${progress.percentage}% there (${formatCurrency(progress.remaining)} remaining).`,
        priority: 'medium',
        data: { goalId: goal.id, goalName: goal.name, percentage: progress.percentage, daysUntilDeadline: progress.daysUntilDeadline, remaining: progress.remaining },
      })
    }
  }

  return alerts
}

function checkUnusualSpending(transactions: TransactionData[]): AlertCandidate[] {
  const alerts: AlertCandidate[] = []
  const now = new Date()

  // Group spending by day for the last 30 days
  const dailySpending = new Map<string, number>()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (const t of transactions) {
    if (t.amount <= 0) continue // skip income
    const date = t.date
    if (new Date(date) < thirtyDaysAgo) continue
    dailySpending.set(date, (dailySpending.get(date) || 0) + t.amount)
  }

  if (dailySpending.size < 7) return alerts // not enough data

  const dailyAmounts = Array.from(dailySpending.values())
  const avg = dailyAmounts.reduce((sum, d) => sum + d, 0) / dailyAmounts.length

  // Check today's spending
  const todayStr = now.toISOString().split('T')[0]
  const todaySpending = dailySpending.get(todayStr) || 0

  if (todaySpending > avg * 2 && todaySpending > 50) {
    alerts.push({
      type: 'unusual_spending',
      title: 'Unusual spending today',
      message: `You've spent ${formatCurrency(todaySpending)} today, which is ${(todaySpending / avg).toFixed(1)}x your daily average of ${formatCurrency(avg)}.`,
      priority: 'high',
      data: { todaySpending, dailyAverage: Math.round(avg) },
    })
  }

  return alerts
}

function checkSavingsRate(
  thisMonthIncome: number,
  thisMonthSpending: number,
  savingsGoalYearly: number | null
): AlertCandidate[] {
  const alerts: AlertCandidate[] = []

  if (!savingsGoalYearly || thisMonthIncome <= 0) return alerts

  const monthlySavingsTarget = savingsGoalYearly / 12
  const actualSavings = thisMonthIncome - thisMonthSpending
  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthProgress = dayOfMonth / daysInMonth

  // Project end-of-month savings at current pace
  const projectedSpending = thisMonthSpending / monthProgress
  const projectedSavings = thisMonthIncome - projectedSpending

  if (projectedSavings < monthlySavingsTarget * 0.5 && monthProgress > 0.4) {
    alerts.push({
      type: 'savings_rate_drop',
      title: 'Savings goal at risk',
      message: `At your current pace, you'll save about ${formatCurrency(Math.max(projectedSavings, 0))} this month — below your ${formatCurrency(monthlySavingsTarget)}/month target.`,
      priority: 'medium',
      data: { projectedSavings: Math.round(projectedSavings), monthlyTarget: Math.round(monthlySavingsTarget) },
    })
  }

  return alerts
}

function checkIncomeReceived(transactions: TransactionData[]): AlertCandidate[] {
  const alerts: AlertCandidate[] = []
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0]

  for (const t of transactions) {
    // Plaid uses negative amounts for income
    if (t.amount >= 0) continue
    if (t.date !== todayStr && t.date !== yesterdayStr) continue

    const amount = Math.abs(t.amount)
    if (amount >= 500) {
      alerts.push({
        type: 'income_received',
        title: `${formatCurrency(amount)} deposit received`,
        message: `A deposit of ${formatCurrency(amount)} from ${t.name} was received.`,
        priority: 'low',
        data: { amount, merchantName: t.name, date: t.date },
      })
    }
  }

  return alerts
}

export function generateAlerts(input: AlertRuleInput): AlertCandidate[] {
  const alerts: AlertCandidate[] = [
    ...checkBudgetAlerts(input.categorySpending, input.budgets),
    ...checkSubscriptionAlerts(input.subscriptions),
    ...checkGoalAlerts(input.goals),
    ...checkUnusualSpending(input.transactions),
    ...checkSavingsRate(input.thisMonthIncome, input.thisMonthSpending, input.savingsGoalYearly),
    ...checkIncomeReceived(input.transactions),
  ]

  return alerts
}
