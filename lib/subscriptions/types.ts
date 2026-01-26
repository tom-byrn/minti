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

// Merged subscription type that combines detected and user-persisted data
export interface MergedSubscription {
  id: string
  merchantName: string
  displayName: string | null
  category: string | null
  amount: number
  billingPeriod: BillingPeriod
  nextChargeDate: string | null
  lastCharged: string | null
  confidence: number | null // null for manual subscriptions
  transactionCount: number | null // null for manual subscriptions
  source: 'manual' | 'detected' | 'edited' // edited = detected but user modified
  detectedSubscriptionId: string | null // links back to original detected subscription
  isActive: boolean
  userSubscriptionId: string | null // ID in user_subscriptions table if persisted
}

export interface MergedSubscriptionSummary {
  activeCount: number
  monthlyTotal: number
  yearlyTotal: number
  subscriptions: MergedSubscription[]
  lowConfidenceSubscriptions: MergedSubscription[]
}

// Input type for creating/editing subscriptions
export interface SubscriptionInput {
  merchantName: string
  displayName?: string | null
  category?: string | null
  amount: number
  billingPeriod: BillingPeriod
  nextChargeDate?: string | null
  source: 'manual' | 'detected'
  detectedSubscriptionId?: string | null
}
