import { NextResponse } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions'
import type { BillingPeriod } from '@/lib/subscriptions/types'
import type { DigestData } from '@/lib/database.types'

export const maxDuration = 60

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

    // Calculate current week boundaries (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Check for cached digest
    const { data: existingDigest } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .single()

    // If digest exists and was generated less than 6 hours ago, return cached
    if (existingDigest) {
      const cacheAge = Date.now() - new Date(existingDigest.created_at).getTime()
      const sixHours = 6 * 60 * 60 * 1000
      if (cacheAge < sixHours) {
        return NextResponse.json(existingDigest)
      }
    }

    // Previous week boundaries
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevWeekEnd = new Date(weekStart)
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)

    // Fetch all required data in parallel
    const [categoryBudgetsRes, goalsRes, userSubsRes, dismissedRes, plaidItemsRes] = await Promise.all([
      supabase.from('category_budgets').select('category, monthly_limit').eq('user_id', user.id),
      supabase.from('financial_goals').select('*').eq('user_id', user.id),
      supabase.from('user_subscriptions').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('dismissed_subscriptions').select('detected_subscription_id').eq('user_id', user.id),
      supabase.from('plaid_items').select('secret_id').eq('user_id', user.id).order('updated_at', { ascending: false }),
    ])

    const budgets = categoryBudgetsRes.data || []
    const goals = goalsRes.data || []
    const userSubs = userSubsRes.data || []
    const dismissedIds = new Set(
      dismissedRes.data?.map((d: { detected_subscription_id: string }) => d.detected_subscription_id) || []
    )

    // Default empty digest data
    let digestData: DigestData = {
      weekAtGlance: {
        totalSpent: 0, totalEarned: 0, netChange: 0,
        prevWeekSpent: 0, prevWeekEarned: 0, spentChange: 0, earnedChange: 0,
      },
      budgetScorecard: [],
      topCategories: [],
      subscriptionActivity: { renewedThisWeek: [], upcomingNextWeek: [], totalMonthly: 0 },
      goalProgress: [],
    }

    let allTransactions: any[] = []

    // Fetch Plaid transactions if connected
    if (plaidItemsRes.data && plaidItemsRes.data.length > 0) {
      const { data: accessToken, error: vaultError } = await supabase.rpc(
        'get_plaid_token',
        { p_secret_id: plaidItemsRes.data[0].secret_id }
      )

      if (!vaultError && accessToken) {
        // Fetch transactions covering both weeks + buffer for subscription detection
        const fetchStart = new Date(prevWeekStart)
        fetchStart.setMonth(fetchStart.getMonth() - 12)
        const startDateStr = fetchStart.toISOString().split('T')[0]
        const endDateStr = now.toISOString().split('T')[0]

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

        // This week's transactions
        const thisWeekTxns = allTransactions.filter((t) => {
          const d = new Date(t.date)
          return d >= weekStart && d <= weekEnd
        })

        // Previous week's transactions
        const prevWeekTxns = allTransactions.filter((t) => {
          const d = new Date(t.date)
          return d >= prevWeekStart && d <= prevWeekEnd
        })

        // Week at a glance
        const totalSpent = Math.round(thisWeekTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0))
        const totalEarned = Math.round(thisWeekTxns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0))
        const prevWeekSpent = Math.round(prevWeekTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0))
        const prevWeekEarned = Math.round(prevWeekTxns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0))

        digestData.weekAtGlance = {
          totalSpent,
          totalEarned,
          netChange: totalEarned - totalSpent,
          prevWeekSpent,
          prevWeekEarned,
          spentChange: prevWeekSpent > 0 ? Math.round(((totalSpent - prevWeekSpent) / prevWeekSpent) * 100) : 0,
          earnedChange: prevWeekEarned > 0 ? Math.round(((totalEarned - prevWeekEarned) / prevWeekEarned) * 100) : 0,
        }

        // Top categories (this week vs prev week)
        const thisWeekCategories = new Map<string, number>()
        const prevWeekCategories = new Map<string, number>()

        thisWeekTxns.filter((t) => t.amount > 0).forEach((t) => {
          const cat = (t.personal_finance_category?.primary || t.category?.[0] || 'Other').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          thisWeekCategories.set(cat, (thisWeekCategories.get(cat) || 0) + t.amount)
        })

        prevWeekTxns.filter((t) => t.amount > 0).forEach((t) => {
          const cat = (t.personal_finance_category?.primary || t.category?.[0] || 'Other').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          prevWeekCategories.set(cat, (prevWeekCategories.get(cat) || 0) + t.amount)
        })

        digestData.topCategories = Array.from(thisWeekCategories.entries())
          .map(([category, amount]) => {
            const prevAmount = prevWeekCategories.get(category) || 0
            return {
              category,
              amount: Math.round(amount),
              prevWeekAmount: Math.round(prevAmount),
              change: prevAmount > 0 ? Math.round(((amount - prevAmount) / prevAmount) * 100) : 0,
            }
          })
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 8)

        // Budget scorecard (month-to-date spending vs monthly limits)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthTxns = allTransactions.filter((t) => new Date(t.date) >= startOfMonth)
        const monthCategorySpending = new Map<string, number>()
        monthTxns.filter((t) => t.amount > 0).forEach((t) => {
          const cat = (t.personal_finance_category?.primary || t.category?.[0] || 'Other').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          monthCategorySpending.set(cat, (monthCategorySpending.get(cat) || 0) + t.amount)
        })

        digestData.budgetScorecard = budgets.map((b) => {
          const spent = Math.round(monthCategorySpending.get(b.category) || 0)
          const percentage = Math.round((spent / b.monthly_limit) * 100)
          return {
            category: b.category,
            spent,
            limit: b.monthly_limit,
            percentage,
            status: percentage >= 100 ? 'exceeded' as const : percentage >= 80 ? 'at_risk' as const : 'on_track' as const,
          }
        })

        // Subscription activity
        const detectedSummary = detectSubscriptions(allTransactions)
        const allSubs = detectedSummary.subscriptions.filter((s) => !dismissedIds.has(s.id))

        const renewedThisWeek: DigestData['subscriptionActivity']['renewedThisWeek'] = []
        const upcomingNextWeek: DigestData['subscriptionActivity']['upcomingNextWeek'] = []

        // Check user subs + detected subs for renewal dates
        const nextWeekEnd = new Date(weekEnd)
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7)

        for (const sub of userSubs) {
          if (sub.next_charge_date) {
            const chargeDate = new Date(sub.next_charge_date)
            if (chargeDate >= weekStart && chargeDate <= weekEnd) {
              renewedThisWeek.push({
                name: sub.display_name || sub.merchant_name,
                amount: sub.amount,
                date: sub.next_charge_date,
              })
            } else if (chargeDate > weekEnd && chargeDate <= nextWeekEnd) {
              upcomingNextWeek.push({
                name: sub.display_name || sub.merchant_name,
                amount: sub.amount,
                date: sub.next_charge_date,
              })
            }
          }
        }

        for (const sub of allSubs) {
          // Skip if already covered by user subs
          const alreadyCovered = userSubs.some((u) => u.detected_subscription_id === sub.id)
          if (alreadyCovered) continue

          if (sub.nextExpectedCharge) {
            const chargeDate = new Date(sub.nextExpectedCharge)
            if (chargeDate >= weekStart && chargeDate <= weekEnd) {
              renewedThisWeek.push({
                name: sub.merchantName,
                amount: sub.estimatedAmount,
                date: sub.nextExpectedCharge,
              })
            } else if (chargeDate > weekEnd && chargeDate <= nextWeekEnd) {
              upcomingNextWeek.push({
                name: sub.merchantName,
                amount: sub.estimatedAmount,
                date: sub.nextExpectedCharge,
              })
            }
          }
        }

        const getMonthlyAmount = (amount: number, period: BillingPeriod): number => {
          switch (period) {
            case 'weekly': return amount * 4.33
            case 'biweekly': return amount * 2.17
            case 'monthly': return amount
            case 'quarterly': return amount / 3
            case 'annually': return amount / 12
          }
        }

        const totalMonthly = userSubs.reduce(
          (sum, sub) => sum + getMonthlyAmount(sub.amount, sub.billing_period as BillingPeriod), 0
        )

        digestData.subscriptionActivity = {
          renewedThisWeek,
          upcomingNextWeek,
          totalMonthly: Math.round(totalMonthly),
        }
      }
    }

    // Goal progress (always available, doesn't need Plaid)
    digestData.goalProgress = goals.map((goal) => {
      const percentage = goal.target_amount > 0
        ? Math.min(Math.round(((goal.current_amount || 0) / goal.target_amount) * 100), 100)
        : 0

      let isOnTrack: boolean | null = null
      if (goal.deadline && goal.created_at) {
        const deadlineDate = new Date(goal.deadline)
        const createdDate = new Date(goal.created_at)
        const today = new Date()
        const totalDays = (deadlineDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        const daysElapsed = (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        if (totalDays > 0 && daysElapsed > 0) {
          const expectedProgress = daysElapsed / totalDays
          const actualProgress = (goal.current_amount || 0) / goal.target_amount
          isOnTrack = actualProgress >= expectedProgress * 0.9
        }
      }

      return {
        name: goal.name,
        current: goal.current_amount || 0,
        target: goal.target_amount,
        percentage,
        weeklyChange: 0, // Would need historical tracking
        isOnTrack,
        color: goal.color,
      }
    })

    // Generate AI insight
    let aiInsight: string | null = null
    try {
      const digestSummary = buildDigestSummaryForAI(digestData)
      const { text } = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        system: `You are Minti, a friendly personal finance assistant. Write a single concise paragraph (2-4 sentences) analyzing the user's weekly financial patterns. Be specific with numbers. Offer one actionable suggestion. Be warm and encouraging but honest. Do not use bullet points or headers.`,
        prompt: `Here is the user's weekly financial digest data:\n\n${digestSummary}\n\nWrite a brief, personalized insight paragraph about their week.`,
      })
      aiInsight = text
    } catch (err) {
      console.error('Error generating AI insight:', err)
    }

    // Upsert the digest
    if (existingDigest) {
      const { data: updated, error } = await supabase
        .from('weekly_digests')
        .update({
          digest_data: digestData as any,
          ai_insight: aiInsight,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingDigest.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating digest:', error)
        return NextResponse.json({ error: 'Failed to update digest' }, { status: 500 })
      }
      return NextResponse.json(updated)
    } else {
      const { data: inserted, error } = await supabase
        .from('weekly_digests')
        .insert({
          user_id: user.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          digest_data: digestData as any,
          ai_insight: aiInsight,
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting digest:', error)
        return NextResponse.json({ error: 'Failed to save digest' }, { status: 500 })
      }
      return NextResponse.json(inserted)
    }
  } catch (error: any) {
    console.error('Error generating digest:', error)

    if (error?.response?.data?.error_code === 'PRODUCT_NOT_READY') {
      return NextResponse.json(
        { error: 'Transactions are still being processed' },
        { status: 202 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate digest' },
      { status: 500 }
    )
  }
}

function buildDigestSummaryForAI(data: DigestData): string {
  const lines: string[] = []

  const wag = data.weekAtGlance
  lines.push(`This week: spent $${wag.totalSpent}, earned $${wag.totalEarned}, net ${wag.netChange >= 0 ? '+' : ''}$${wag.netChange}`)
  lines.push(`Last week: spent $${wag.prevWeekSpent}, earned $${wag.prevWeekEarned}`)
  if (wag.spentChange !== 0) {
    lines.push(`Spending ${wag.spentChange > 0 ? 'up' : 'down'} ${Math.abs(wag.spentChange)}% week-over-week`)
  }

  if (data.topCategories.length > 0) {
    lines.push('\nTop spending categories this week:')
    data.topCategories.forEach((cat) => {
      const changeStr = cat.change !== 0 ? ` (${cat.change > 0 ? '+' : ''}${cat.change}% vs last week)` : ''
      lines.push(`- ${cat.category}: $${cat.amount}${changeStr}`)
    })
  }

  if (data.budgetScorecard.length > 0) {
    lines.push('\nBudget status (month-to-date):')
    data.budgetScorecard.forEach((b) => {
      lines.push(`- ${b.category}: $${b.spent}/$${b.limit} (${b.percentage}%, ${b.status.replace('_', ' ')})`)
    })
  }

  if (data.goalProgress.length > 0) {
    lines.push('\nGoals:')
    data.goalProgress.forEach((g) => {
      const trackStr = g.isOnTrack === true ? 'on track' : g.isOnTrack === false ? 'behind schedule' : ''
      lines.push(`- ${g.name}: $${g.current}/$${g.target} (${g.percentage}%${trackStr ? ', ' + trackStr : ''})`)
    })
  }

  if (data.subscriptionActivity.renewedThisWeek.length > 0) {
    lines.push('\nSubscriptions renewed this week:')
    data.subscriptionActivity.renewedThisWeek.forEach((s) => {
      lines.push(`- ${s.name}: $${s.amount}`)
    })
  }

  if (data.subscriptionActivity.upcomingNextWeek.length > 0) {
    lines.push('\nUpcoming renewals next week:')
    data.subscriptionActivity.upcomingNextWeek.forEach((s) => {
      lines.push(`- ${s.name}: $${s.amount}`)
    })
  }

  return lines.join('\n')
}
