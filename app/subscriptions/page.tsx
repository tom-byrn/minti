"use client"

import { useEffect, useState } from 'react'
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WarningCircle as WarningCircleIcon, CreditCard as CreditCardIcon, Calendar as CalendarIcon, TrendUp as TrendUpIcon, CaretDown as CaretDownIcon, CaretUp as CaretUpIcon, ArrowsClockwise as ArrowsClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import type { SubscriptionSummary, DetectedSubscription, BillingPeriod } from "@/lib/subscriptions/types"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />
}

function SubscriptionCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-20 mb-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div>
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryCardSkeleton({ icon: Icon }: { icon: any }) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-32" />
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" weight="thin" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-20 mb-1" />
        <Skeleton className="h-4 w-36" />
      </CardContent>
    </Card>
  )
}

function SubscriptionsPageSkeleton() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 lg:px-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-serif font-semibold text-foreground">Subscriptions</h1>
                <p className="text-lg text-muted-foreground">Your recurring payments and subscriptions</p>
              </div>
              <Skeleton className="h-9 w-24" />
            </div>

            {/* Summary Cards */}
            <div className="grid gap-5 sm:grid-cols-3">
              <SummaryCardSkeleton icon={CreditCardIcon} />
              <SummaryCardSkeleton icon={CalendarIcon} />
              <SummaryCardSkeleton icon={TrendUpIcon} />
            </div>

            {/* Subscriptions List */}
            <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
              <CardHeader>
                <Skeleton className="h-7 w-48 mb-1" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <SubscriptionCardSkeleton />
                  <SubscriptionCardSkeleton />
                  <SubscriptionCardSkeleton />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

function formatBillingPeriod(period: BillingPeriod): string {
  switch (period) {
    case 'weekly': return 'Weekly'
    case 'biweekly': return 'Bi-weekly'
    case 'monthly': return 'Monthly'
    case 'quarterly': return 'Quarterly'
    case 'annually': return 'Annually'
  }
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 80) {
    return <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">High confidence</Badge>
  } else if (confidence >= 60) {
    return <Badge variant="secondary">Medium confidence</Badge>
  } else {
    return <Badge variant="outline" className="text-muted-foreground">Low confidence</Badge>
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = date.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function SubscriptionCard({ subscription }: { subscription: DetectedSubscription }) {
  const daysUntil = getDaysUntil(subscription.nextExpectedCharge)
  const isUpcoming = daysUntil >= 0 && daysUntil <= 7

  return (
    <Card className={`transition-all hover:shadow-md hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur ${isUpcoming ? 'ring-1 ring-primary/20' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{subscription.merchantName}</h3>
              {getConfidenceBadge(subscription.confidence)}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{subscription.category}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Amount</span>
                <p className="font-semibold font-serif text-foreground">
                  ${subscription.estimatedAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Billing</span>
                <p className="font-medium text-foreground">
                  {formatBillingPeriod(subscription.billingPeriod)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last charged</span>
                <p className="font-medium text-foreground">
                  {formatDate(subscription.lastCharged)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Next charge</span>
                <p className={`font-medium ${isUpcoming ? 'text-primary' : 'text-foreground'}`}>
                  {daysUntil < 0 ? 'Overdue' : daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${formatDate(subscription.nextExpectedCharge)}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SubscriptionSummary | null>(null)
  const [lowConfidenceOpen, setLowConfidenceOpen] = useState(false)

  const fetchSubscriptions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/plaid/subscriptions')
      const result = await response.json()

      if (response.status === 404) {
        setError('No connected accounts found. Please connect your bank account.')
        return
      }

      if (!response.ok) {
        if (response.status === 202) {
          setError('Transactions are still being processed. Please refresh in a moment.')
        } else if (response.status === 401) {
          setError('Your bank connection has expired. Please reconnect your account.')
        } else {
          setError('Failed to fetch subscriptions. Please try again.')
        }
        return
      }

      setData(result)
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
      setError('Failed to connect to your bank. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchSubscriptions(true)
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  if (loading) {
    return <SubscriptionsPageSkeleton />
  }

  if (error || !data) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <div className="relative z-10">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-8 lg:px-8">
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <WarningCircleIcon className="h-12 w-12 text-destructive" weight="thin" />
              <p className="text-center text-lg text-muted-foreground">{error}</p>
              <Button onClick={() => fetchSubscriptions()} variant="outline">
                Try again
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 lg:px-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl font-serif font-semibold text-foreground">Subscriptions</h1>
                  <p className="text-lg text-muted-foreground">Your recurring payments and subscriptions</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="gap-2"
                >
                  <ArrowsClockwiseIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} weight="thin" />
                  Refresh
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-5 sm:grid-cols-3">
                <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CreditCardIcon className="h-5 w-5 text-primary" weight="thin" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-serif text-foreground">
                      {data.activeCount}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">detected recurring charges</p>
                  </CardContent>
                </Card>

                <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Total</CardTitle>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="h-5 w-5 text-primary" weight="thin" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-serif text-foreground">
                      ${data.monthlyTotal.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">estimated per month</p>
                  </CardContent>
                </Card>

                <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Total</CardTitle>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendUpIcon className="h-5 w-5 text-primary" weight="thin" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-serif text-foreground">
                      ${data.yearlyTotal.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">estimated per year</p>
                  </CardContent>
                </Card>
              </div>

              {/* Subscriptions List */}
              {data.subscriptions.length === 0 ? (
                <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <CreditCardIcon className="h-16 w-16 text-muted-foreground/50 mb-4" weight="thin" />
                    <h3 className="text-lg font-semibold mb-2">No subscriptions detected</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      We couldn't find any recurring payments in your transaction history.
                      As you make more transactions, subscriptions will be automatically detected.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif font-semibold">Active Subscriptions</CardTitle>
                    <CardDescription>Recurring payments detected from your transaction history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {data.subscriptions.map((subscription) => (
                        <SubscriptionCard key={subscription.id} subscription={subscription} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Low Confidence Section */}
              {data.lowConfidenceSubscriptions.length > 0 && (
                <Card className="border-border/50 bg-card/60 backdrop-blur">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
                    onClick={() => setLowConfidenceOpen(!lowConfidenceOpen)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-muted-foreground">
                          Possible Subscriptions ({data.lowConfidenceSubscriptions.length})
                        </CardTitle>
                        <CardDescription>
                          These may be subscriptions but need more transaction history to confirm
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm">
                        {lowConfidenceOpen ? (
                          <CaretUpIcon className="h-4 w-4" weight="thin" />
                        ) : (
                          <CaretDownIcon className="h-4 w-4" weight="thin" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {lowConfidenceOpen && (
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {data.lowConfidenceSubscriptions.map((subscription) => (
                          <SubscriptionCard key={subscription.id} subscription={subscription} />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
        </main>
      </div>
    </div>
  )
}
