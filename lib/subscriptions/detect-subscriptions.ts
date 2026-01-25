import { DetectedSubscription, BillingPeriod, SubscriptionSummary } from './types'

interface Transaction {
  transaction_id: string
  date: string
  amount: number
  name: string
  merchant_name?: string | null
  personal_finance_category?: {
    primary?: string
  } | null
  category?: string[] | null
}

interface MerchantGroup {
  merchantName: string
  category: string
  transactions: Transaction[]
}

function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getMerchantDisplayName(transactions: Transaction[]): string {
  // Find the most common merchant_name or name
  const names = transactions.map(t => t.merchant_name || t.name)
  const nameCounts = new Map<string, number>()

  names.forEach(name => {
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
  })

  let mostCommon = names[0]
  let maxCount = 0

  nameCounts.forEach((count, name) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = name
    }
  })

  return mostCommon
}

function getCategory(transactions: Transaction[]): string {
  const categories = transactions.map(t =>
    t.personal_finance_category?.primary || t.category?.[0] || 'Other'
  )

  const categoryCounts = new Map<string, number>()
  categories.forEach(cat => {
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1)
  })

  let mostCommon = 'Other'
  let maxCount = 0

  categoryCounts.forEach((count, cat) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = cat
    }
  })

  return mostCommon.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function detectBillingPeriod(intervals: number[]): BillingPeriod | null {
  if (intervals.length === 0) return null

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

  // Map average interval to billing period
  if (avgInterval >= 6 && avgInterval <= 8) return 'weekly'
  if (avgInterval >= 13 && avgInterval <= 15) return 'biweekly'
  if (avgInterval >= 28 && avgInterval <= 32) return 'monthly'
  if (avgInterval >= 85 && avgInterval <= 95) return 'quarterly'
  if (avgInterval >= 360 && avgInterval <= 370) return 'annually'

  return null
}

function getBillingPeriodDays(period: BillingPeriod): number {
  switch (period) {
    case 'weekly': return 7
    case 'biweekly': return 14
    case 'monthly': return 30
    case 'quarterly': return 90
    case 'annually': return 365
  }
}

function getMonthlyAmount(amount: number, period: BillingPeriod): number {
  switch (period) {
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'annually': return amount / 12
  }
}

function getYearlyAmount(amount: number, period: BillingPeriod): number {
  switch (period) {
    case 'weekly': return amount * 52
    case 'biweekly': return amount * 26
    case 'monthly': return amount * 12
    case 'quarterly': return amount * 4
    case 'annually': return amount
  }
}

function calculateConfidence(
  transactionCount: number,
  intervalVariance: number,
  amountVariance: number
): number {
  let confidence = 0

  // Transaction count contribution (max 40 points)
  if (transactionCount >= 6) confidence += 40
  else if (transactionCount >= 4) confidence += 30
  else if (transactionCount >= 3) confidence += 20
  else confidence += 10

  // Interval consistency contribution (max 30 points)
  // Lower variance = higher confidence
  if (intervalVariance < 2) confidence += 30
  else if (intervalVariance < 5) confidence += 25
  else if (intervalVariance < 10) confidence += 15
  else confidence += 5

  // Amount consistency contribution (max 30 points)
  // Lower variance = higher confidence
  if (amountVariance < 0.02) confidence += 30 // < 2% variance
  else if (amountVariance < 0.05) confidence += 25 // < 5% variance
  else if (amountVariance < 0.10) confidence += 20 // < 10% variance
  else confidence += 10

  return Math.min(100, Math.max(0, confidence))
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
}

export function detectSubscriptions(transactions: Transaction[]): SubscriptionSummary {
  // Filter to only include spending (positive amounts in Plaid)
  const spendingTransactions = transactions.filter(t => t.amount > 0)

  // Group transactions by normalized merchant name
  const merchantGroups = new Map<string, MerchantGroup>()

  spendingTransactions.forEach(t => {
    const merchantKey = normalizeMerchantName(t.merchant_name || t.name)

    if (!merchantGroups.has(merchantKey)) {
      merchantGroups.set(merchantKey, {
        merchantName: merchantKey,
        category: '',
        transactions: []
      })
    }

    merchantGroups.get(merchantKey)!.transactions.push(t)
  })

  const detectedSubscriptions: DetectedSubscription[] = []

  merchantGroups.forEach((group) => {
    // Need at least 2 transactions to detect a pattern
    if (group.transactions.length < 2) return

    // Sort transactions by date (oldest first)
    const sortedTransactions = [...group.transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate intervals between consecutive charges
    const intervals: number[] = []
    for (let i = 1; i < sortedTransactions.length; i++) {
      const prevDate = new Date(sortedTransactions[i - 1].date)
      const currDate = new Date(sortedTransactions[i].date)
      const daysDiff = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      intervals.push(daysDiff)
    }

    // Detect billing period
    const billingPeriod = detectBillingPeriod(intervals)
    if (!billingPeriod) return

    // Calculate amount statistics
    const amounts = sortedTransactions.map(t => t.amount)
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const amountVariance = calculateVariance(amounts) / avgAmount // Relative variance

    // Check if amounts are within tolerance (10% variance allowed)
    if (amountVariance > 0.15) return

    // Calculate interval variance
    const intervalVariance = calculateVariance(intervals)

    // Calculate confidence
    const confidence = calculateConfidence(
      sortedTransactions.length,
      intervalVariance,
      amountVariance
    )

    // Calculate next expected charge date
    const lastTransaction = sortedTransactions[sortedTransactions.length - 1]
    const lastDate = new Date(lastTransaction.date)
    const periodDays = getBillingPeriodDays(billingPeriod)
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + periodDays)

    // Create subscription entry
    const subscription: DetectedSubscription = {
      id: `sub_${normalizeMerchantName(group.merchantName).replace(/\s/g, '_')}`,
      merchantName: getMerchantDisplayName(sortedTransactions),
      category: getCategory(sortedTransactions),
      estimatedAmount: Math.round(avgAmount * 100) / 100,
      billingPeriod,
      lastCharged: lastTransaction.date,
      nextExpectedCharge: nextDate.toISOString().split('T')[0],
      confidence,
      transactionCount: sortedTransactions.length
    }

    detectedSubscriptions.push(subscription)
  })

  // Sort by confidence (highest first)
  detectedSubscriptions.sort((a, b) => b.confidence - a.confidence)

  // Separate high and low confidence subscriptions
  const highConfidence = detectedSubscriptions.filter(s => s.confidence >= 60)
  const lowConfidence = detectedSubscriptions.filter(s => s.confidence < 60)

  // Calculate totals based on high confidence subscriptions only
  const monthlyTotal = highConfidence.reduce(
    (sum, s) => sum + getMonthlyAmount(s.estimatedAmount, s.billingPeriod),
    0
  )

  const yearlyTotal = highConfidence.reduce(
    (sum, s) => sum + getYearlyAmount(s.estimatedAmount, s.billingPeriod),
    0
  )

  return {
    activeCount: highConfidence.length,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    yearlyTotal: Math.round(yearlyTotal * 100) / 100,
    subscriptions: highConfidence,
    lowConfidenceSubscriptions: lowConfidence
  }
}
