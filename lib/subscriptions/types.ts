export type BillingPeriod = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'

export interface DetectedSubscription {
  id: string
  merchantName: string
  category: string
  estimatedAmount: number
  billingPeriod: BillingPeriod
  lastCharged: string
  nextExpectedCharge: string
  confidence: number // 0-100
  transactionCount: number
}

export interface SubscriptionSummary {
  activeCount: number
  monthlyTotal: number
  yearlyTotal: number
  subscriptions: DetectedSubscription[]
  lowConfidenceSubscriptions: DetectedSubscription[]
}
