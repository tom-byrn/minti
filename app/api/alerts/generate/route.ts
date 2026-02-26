import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'
import { generateAlerts } from '@/lib/alerts/rules'
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions'
import type { MergedSubscription, BillingPeriod } from '@/lib/subscriptions/types'

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for recent alert generation (debounce: 15 min)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: recentAlerts } = await supabase
      .from('alerts')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', fifteenMinAgo)
      .limit(1)

    if (recentAlerts && recentAlerts.length > 0) {
      return NextResponse.json({ generated: 0, message: 'Alerts generated recently, skipped' })
    }

    // Fetch budget data
    const [budgetProfileRes, categoryBudgetsRes, goalsRes, userSubsRes, dismissedRes, plaidItemsRes] = await Promise.all([
      supabase.from('budget_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('category_budgets').select('category, monthly_limit').eq('user_id', user.id),
      supabase.from('financial_goals').select('*').eq('user_id', user.id),
      supabase.from('user_subscriptions').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('dismissed_subscriptions').select('detected_subscription_id').eq('user_id', user.id),
      supabase.from('plaid_items').select('secret_id').eq('user_id', user.id).order('updated_at', { ascending: false }),
    ])

    const budgets = categoryBudgetsRes.data || []
    const goals = goalsRes.data || []
    const savingsGoalYearly = budgetProfileRes.data?.savings_goal_yearly ?? null

    // If no Plaid account connected, run rules on DB-only data
    if (!plaidItemsRes.data || plaidItemsRes.data.length === 0) {
      const candidates = generateAlerts({
        categorySpending: [],
        budgets,
        goals,
        subscriptions: [],
        transactions: [],
        thisMonthIncome: 0,
        thisMonthSpending: 0,
        savingsGoalYearly,
      })

      const inserted = await insertAlerts(supabase, user.id, candidates)
      return NextResponse.json({ generated: inserted })
    }

    // Retrieve Plaid access token
    const { data: accessToken, error: vaultError } = await supabase.rpc(
      'get_plaid_token',
      { p_secret_id: plaidItemsRes.data[0].secret_id }
    )

    if (vaultError || !accessToken) {
      return NextResponse.json({ error: 'Failed to retrieve account credentials' }, { status: 500 })
    }

    // Fetch transactions (last 12 months for subscription detection, current month for spending)
    const now = new Date()
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const startDateStr = twelveMonthsAgo.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]

    let allTransactions: any[] = []
    let offset = 0
    const count = 500

    while (true) {
      const res = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDateStr,
        end_date: endDateStr,
        options: { count, offset },
      })
      allTransactions = [...allTransactions, ...res.data.transactions]
      if (res.data.transactions.length < count) break
      offset += count
    }

    // Current month spending & income
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthTxns = allTransactions.filter(
      (t) => new Date(t.date) >= startOfMonth
    )

    const thisMonthSpending = currentMonthTxns
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const thisMonthIncome = currentMonthTxns
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // Category spending
    const categoryMap = new Map<string, number>()
    currentMonthTxns
      .filter((t) => t.amount > 0)
      .forEach((t) => {
        const category =
          t.personal_finance_category?.primary || t.category?.[0] || 'Other'
        const formatted = category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        categoryMap.set(formatted, (categoryMap.get(formatted) || 0) + t.amount)
      })

    const categorySpending = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({ category, amount: Math.round(amount) })
    )

    // Build merged subscriptions
    const dismissedIds = new Set(
      dismissedRes.data?.map((d: { detected_subscription_id: string }) => d.detected_subscription_id) || []
    )
    const detectedSummary = detectSubscriptions(allTransactions)
    const userSubsByDetectedId = new Map<string, any>()
    const manualSubs: MergedSubscription[] = []

    userSubsRes.data?.forEach((sub: any) => {
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
    mergedSubscriptions.push(...manualSubs)

    // Run alert rules
    const candidates = generateAlerts({
      categorySpending,
      budgets,
      goals,
      subscriptions: mergedSubscriptions,
      transactions: allTransactions,
      thisMonthIncome,
      thisMonthSpending,
      savingsGoalYearly,
    })

    const inserted = await insertAlerts(supabase, user.id, candidates)
    return NextResponse.json({ generated: inserted })
  } catch (error: any) {
    console.error('Error generating alerts:', error)

    if (error?.response?.data?.error_code === 'PRODUCT_NOT_READY') {
      return NextResponse.json(
        { error: 'Transactions are still being processed' },
        { status: 202 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    )
  }
}

async function insertAlerts(
  supabase: any,
  userId: string,
  candidates: Array<{ type: string; title: string; message: string; priority: string; data: Record<string, unknown> }>
): Promise<number> {
  if (candidates.length === 0) return 0

  // Check for duplicate alerts (same type + same data key fields within last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existingAlerts } = await supabase
    .from('alerts')
    .select('type, title')
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo)

  const existingKeys = new Set(
    (existingAlerts || []).map((a: any) => `${a.type}:${a.title}`)
  )

  const newAlerts = candidates.filter(
    (c) => !existingKeys.has(`${c.type}:${c.title}`)
  )

  if (newAlerts.length === 0) return 0

  const rows = newAlerts.map((alert) => ({
    user_id: userId,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    priority: alert.priority,
    data: alert.data,
  }))

  const { error } = await supabase.from('alerts').insert(rows)
  if (error) {
    console.error('Error inserting alerts:', error)
    return 0
  }

  return newAlerts.length
}
