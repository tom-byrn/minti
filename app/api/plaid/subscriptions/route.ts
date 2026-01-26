import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createClient } from '@/lib/supabase/server'
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions'
import type { MergedSubscription, MergedSubscriptionSummary, DetectedSubscription, BillingPeriod } from '@/lib/subscriptions/types'
import type { UserSubscription } from '@/lib/database.types'

// Helper to convert detected subscription to merged format
function detectedToMerged(detected: DetectedSubscription): MergedSubscription {
  return {
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
  }
}

// Helper to convert user subscription to merged format
function userToMerged(userSub: UserSubscription, originalDetected?: DetectedSubscription): MergedSubscription {
  return {
    id: userSub.id,
    merchantName: userSub.merchant_name,
    displayName: userSub.display_name,
    category: userSub.category,
    amount: userSub.amount,
    billingPeriod: userSub.billing_period as BillingPeriod,
    nextChargeDate: userSub.next_charge_date,
    lastCharged: originalDetected?.lastCharged || null,
    confidence: originalDetected?.confidence || null,
    transactionCount: originalDetected?.transactionCount || null,
    source: userSub.source === 'detected' ? 'edited' : 'manual',
    detectedSubscriptionId: userSub.detected_subscription_id,
    isActive: userSub.is_active,
    userSubscriptionId: userSub.id,
  }
}

// Helper to calculate monthly amount for totals
function getMonthlyAmount(amount: number, billingPeriod: BillingPeriod): number {
  switch (billingPeriod) {
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'annually': return amount / 12
  }
}

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

    // Fetch user's persisted subscriptions
    const { data: userSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)

    // Fetch dismissed subscription IDs
    const { data: dismissedData } = await supabase
      .from('dismissed_subscriptions')
      .select('detected_subscription_id')
      .eq('user_id', user.id)

    const dismissedIds = new Set(dismissedData?.map((d) => d.detected_subscription_id) || [])
    const userSubsByDetectedId = new Map<string, UserSubscription>()
    const manualSubs: UserSubscription[] = []

    // Organize user subscriptions
    userSubscriptions?.forEach((sub) => {
      if (sub.detected_subscription_id) {
        userSubsByDetectedId.set(sub.detected_subscription_id, sub as UserSubscription)
      } else if (sub.source === 'manual') {
        manualSubs.push(sub as UserSubscription)
      }
    })

    // Get user's Plaid secret_id from database (most recently updated first)
    const { data: plaidItems, error: plaidError } = await supabase
      .from('plaid_items')
      .select('secret_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    // If no Plaid connection, return only manual subscriptions
    if (plaidError || !plaidItems || plaidItems.length === 0) {
      const mergedManual = manualSubs
        .filter((sub) => sub.is_active)
        .map((sub) => userToMerged(sub))

      const monthlyTotal = mergedManual.reduce((sum, sub) => sum + getMonthlyAmount(sub.amount, sub.billingPeriod), 0)

      const summary: MergedSubscriptionSummary = {
        activeCount: mergedManual.length,
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        yearlyTotal: Math.round(monthlyTotal * 12 * 100) / 100,
        subscriptions: mergedManual,
        lowConfidenceSubscriptions: [],
      }

      return NextResponse.json(summary)
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
    const detectedSummary = detectSubscriptions(allTransactions)

    // Merge detected subscriptions with user data
    const mergeSubscriptions = (detected: DetectedSubscription[]): MergedSubscription[] => {
      return detected
        .filter((sub) => !dismissedIds.has(sub.id)) // Filter out dismissed
        .map((sub) => {
          const userSub = userSubsByDetectedId.get(sub.id)
          if (userSub) {
            // User has edited this subscription - use their data
            return userToMerged(userSub, sub)
          }
          // No user edits - use detected data
          return detectedToMerged(sub)
        })
        .filter((sub) => sub.isActive) // Only show active subscriptions
    }

    const mergedSubscriptions = mergeSubscriptions(detectedSummary.subscriptions)
    const mergedLowConfidence = mergeSubscriptions(detectedSummary.lowConfidenceSubscriptions)

    // Add manual subscriptions to the main list
    const activeManualSubs = manualSubs
      .filter((sub) => sub.is_active)
      .map((sub) => userToMerged(sub))

    const allMergedSubscriptions = [...mergedSubscriptions, ...activeManualSubs]

    // Recalculate totals based on merged data
    const allActiveForTotals = [...allMergedSubscriptions, ...mergedLowConfidence]
    const monthlyTotal = allActiveForTotals.reduce(
      (sum, sub) => sum + getMonthlyAmount(sub.amount, sub.billingPeriod),
      0
    )

    const summary: MergedSubscriptionSummary = {
      activeCount: allMergedSubscriptions.length,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      yearlyTotal: Math.round(monthlyTotal * 12 * 100) / 100,
      subscriptions: allMergedSubscriptions,
      lowConfidenceSubscriptions: mergedLowConfidence,
    }

    return NextResponse.json(summary)
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
