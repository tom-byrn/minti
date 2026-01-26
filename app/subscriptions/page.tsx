"use client"

import { useEffect, useState } from 'react'
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WarningCircle as WarningCircleIcon, CreditCard as CreditCardIcon, Calendar as CalendarIcon, TrendUp as TrendUpIcon, CaretDown as CaretDownIcon, CaretUp as CaretUpIcon, ArrowsClockwise as ArrowsClockwiseIcon, Plus as PlusIcon, PencilSimple as PencilSimpleIcon, X as XIcon, Eye as EyeIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SubscriptionEditDialog } from "@/components/subscriptions/subscription-edit-dialog"
import { AddSubscriptionDialog } from "@/components/subscriptions/add-subscription-dialog"
import type { MergedSubscriptionSummary, MergedSubscription, BillingPeriod, SubscriptionInput } from "@/lib/subscriptions/types"

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

function getSourceBadge(subscription: MergedSubscription) {
  if (subscription.source === 'manual') {
    return <Badge variant="outline" className="text-muted-foreground">Manual</Badge>
  }
  if (subscription.source === 'edited') {
    return <Badge variant="secondary">Edited</Badge>
  }
  // Detected
  if (subscription.confidence !== null) {
    if (subscription.confidence >= 80) {
      return <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">High confidence</Badge>
    } else if (subscription.confidence >= 60) {
      return <Badge variant="secondary">Medium confidence</Badge>
    }
  }
  return <Badge variant="outline" className="text-muted-foreground">Low confidence</Badge>
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = date.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

interface SubscriptionCardProps {
  subscription: MergedSubscription
  onEdit: (subscription: MergedSubscription) => void
  onDismiss: (subscription: MergedSubscription) => void
}

function SubscriptionCard({ subscription, onEdit, onDismiss }: SubscriptionCardProps) {
  const daysUntil = getDaysUntil(subscription.nextChargeDate)
  const isUpcoming = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7

  return (
    <Card className={`border-border/50 bg-card/80 backdrop-blur ${isUpcoming ? 'ring-1 ring-primary/20' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {subscription.displayName || subscription.merchantName}
              </h3>
              {getSourceBadge(subscription)}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{subscription.category || 'Uncategorized'}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Amount</span>
                <p className="font-semibold font-serif text-foreground">
                  ${subscription.amount.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Billing</span>
                <p className="font-medium text-foreground">
                  {formatBillingPeriod(subscription.billingPeriod)}
                </p>
              </div>
              {subscription.lastCharged && (
                <div>
                  <span className="text-muted-foreground">Last charged</span>
                  <p className="font-medium text-foreground">
                    {formatDate(subscription.lastCharged)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Next charge</span>
                <p className={`font-medium ${isUpcoming ? 'text-primary' : 'text-foreground'}`}>
                  {daysUntil === null ? '—' :
                    daysUntil < 0 ? 'Overdue' :
                    daysUntil === 0 ? 'Today' :
                    daysUntil === 1 ? 'Tomorrow' :
                    formatDate(subscription.nextChargeDate)}
                </p>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(subscription)}>
                <PencilSimpleIcon className="h-4 w-4 mr-2" weight="thin" />
                Edit
              </DropdownMenuItem>
              {subscription.source !== 'manual' && (
                <DropdownMenuItem onClick={() => onDismiss(subscription)} className="text-destructive">
                  <XIcon className="h-4 w-4 mr-2" weight="thin" />
                  Dismiss
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MergedSubscriptionSummary | null>(null)
  const [lowConfidenceOpen, setLowConfidenceOpen] = useState(false)

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<MergedSubscription | null>(null)

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

  const handleEdit = (subscription: MergedSubscription) => {
    setSelectedSubscription(subscription)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async (subscription: MergedSubscription, updates: {
    merchantName: string
    displayName: string | null
    category: string | null
    amount: number
    billingPeriod: BillingPeriod
    nextChargeDate: string | null
  }) => {
    // If this subscription has already been saved to user_subscriptions, update it
    if (subscription.userSubscriptionId) {
      const response = await fetch('/api/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subscription.userSubscriptionId,
          ...updates,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update subscription')
      }
    } else {
      // Create a new user subscription entry (converting detected to edited)
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          source: 'detected',
          detectedSubscriptionId: subscription.detectedSubscriptionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }
    }

    // Refresh the list
    await fetchSubscriptions(true)
  }

  const handleDismiss = async (subscription: MergedSubscription) => {
    if (!subscription.detectedSubscriptionId) return

    try {
      const response = await fetch('/api/subscriptions/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detectedSubscriptionId: subscription.detectedSubscriptionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to dismiss subscription')
      }

      // Refresh the list
      await fetchSubscriptions(true)
    } catch (err) {
      console.error('Error dismissing subscription:', err)
    }
  }

  const handleAddSubscription = async (input: SubscriptionInput) => {
    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      throw new Error('Failed to add subscription')
    }

    // Refresh the list
    await fetchSubscriptions(true)
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
              <div className="flex gap-2">
                <Button onClick={() => fetchSubscriptions()} variant="outline">
                  Try again
                </Button>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" weight="thin" />
                  Add Manually
                </Button>
              </div>
            </div>
          </main>
        </div>

        <AddSubscriptionDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAdd={handleAddSubscription}
        />
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-2"
                  >
                    <ArrowsClockwiseIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} weight="thin" />
                    Refresh
                  </Button>
                  <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                    <PlusIcon className="h-4 w-4" weight="thin" />
                    Add Subscription
                  </Button>
                </div>
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
                    <p className="text-sm text-muted-foreground mt-1">tracked recurring charges</p>
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
                    <p className="text-muted-foreground text-center max-w-md mb-4">
                      We couldn't find any recurring payments in your transaction history.
                      You can manually add subscriptions to track them.
                    </p>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" weight="thin" />
                      Add Subscription
                    </Button>
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
                        <SubscriptionCard
                          key={subscription.id}
                          subscription={subscription}
                          onEdit={handleEdit}
                          onDismiss={handleDismiss}
                        />
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
                          <SubscriptionCard
                            key={subscription.id}
                            subscription={subscription}
                            onEdit={handleEdit}
                            onDismiss={handleDismiss}
                          />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
        </main>
      </div>

      {/* Dialogs */}
      <SubscriptionEditDialog
        subscription={selectedSubscription}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
      />

      <AddSubscriptionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddSubscription}
      />
    </div>
  )
}
