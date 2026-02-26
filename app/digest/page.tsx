"use client"

import { useEffect, useState } from 'react'
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BankConnectionChecker } from "@/components/bank-connection-checker"
import {
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  CurrencyDollar as CurrencyDollarIcon,
  Wallet as WalletIcon,
  TrendUp as TrendUpIcon,
  TrendDown as TrendDownIcon,
  Target as TargetIcon,
  CreditCard as CreditCardIcon,
  Sparkle as SparkleIcon,
  ArrowClockwise as ArrowClockwiseIcon,
  CalendarBlank as CalendarBlankIcon,
  CheckCircle as CheckCircleIcon,
  WarningCircle as WarningCircleIcon,
  XCircle as XCircleIcon,
} from "@phosphor-icons/react"
import type { DigestData, WeeklyDigest } from "@/lib/database.types"

export default function DigestPage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [digest, setDigest] = useState<WeeklyDigest | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateDigest = async () => {
    try {
      setGenerating(true)
      setError(null)
      const response = await fetch('/api/digest/generate', { method: 'POST' })
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 202) {
          setError('Transactions are still being processed. Please try again in a moment.')
        } else {
          setError(result.error || 'Failed to generate digest')
        }
        return
      }

      setDigest(result)
    } catch (err) {
      console.error('Error generating digest:', err)
      setError('Failed to generate digest. Please try again.')
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    // Try to fetch existing digest, then generate if needed
    const fetchOrGenerate = async () => {
      try {
        const response = await fetch('/api/digest')
        if (response.ok) {
          const digests = await response.json()
          if (digests.length > 0) {
            setDigest(digests[0])
            setLoading(false)

            // If the digest is older than 6 hours, regenerate in background
            const cacheAge = Date.now() - new Date(digests[0].created_at).getTime()
            if (cacheAge > 6 * 60 * 60 * 1000) {
              generateDigest()
            }
            return
          }
        }
      } catch {
        // Fall through to generate
      }
      generateDigest()
    }

    fetchOrGenerate()
  }, [])

  const formatWeekRange = (start: string, end: string) => {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }

  const data = digest?.digest_data as DigestData | undefined

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 lg:px-8">
          <BankConnectionChecker>
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl font-serif font-semibold text-foreground">Weekly Digest</h1>
                  <p className="text-lg text-muted-foreground">
                    {digest ? formatWeekRange(digest.week_start, digest.week_end) : 'Your weekly financial summary'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateDigest}
                  disabled={generating}
                >
                  <ArrowClockwiseIcon className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} weight="thin" />
                  {generating ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>

              {error && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <WarningCircleIcon className="h-12 w-12 text-destructive" weight="thin" />
                  <p className="text-center text-lg text-muted-foreground">{error}</p>
                  <Button onClick={generateDigest} disabled={generating}>Try Again</Button>
                </div>
              )}

              {loading && !error && (
                <div className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="border-border/50 bg-card/80 backdrop-blur">
                        <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                        <CardContent><Skeleton className="h-8 w-32" /></CardContent>
                      </Card>
                    ))}
                  </div>
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              )}

              {data && !loading && (
                <>
                  {/* Week at a Glance */}
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                          <CurrencyDollarIcon className="h-5 w-5 text-destructive" weight="thin" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold font-serif text-foreground">
                          ${data.weekAtGlance.totalSpent.toLocaleString()}
                        </div>
                        <WeekChange value={data.weekAtGlance.spentChange} invert />
                      </CardContent>
                    </Card>

                    <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <WalletIcon className="h-5 w-5 text-primary" weight="thin" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold font-serif text-foreground">
                          ${data.weekAtGlance.totalEarned.toLocaleString()}
                        </div>
                        <WeekChange value={data.weekAtGlance.earnedChange} />
                      </CardContent>
                    </Card>

                    <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Change</CardTitle>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${data.weekAtGlance.netChange >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                          {data.weekAtGlance.netChange >= 0
                            ? <TrendUpIcon className="h-5 w-5 text-primary" weight="thin" />
                            : <TrendDownIcon className="h-5 w-5 text-destructive" weight="thin" />
                          }
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold font-serif ${data.weekAtGlance.netChange >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {data.weekAtGlance.netChange >= 0 ? '+' : ''}${data.weekAtGlance.netChange.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last week: {(data.weekAtGlance.prevWeekEarned - data.weekAtGlance.prevWeekSpent) >= 0 ? '+' : ''}${(data.weekAtGlance.prevWeekEarned - data.weekAtGlance.prevWeekSpent).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Insight */}
                  {digest?.ai_insight && (
                    <Card className="border-primary/20 bg-primary/5 backdrop-blur shadow-lg">
                      <CardHeader className="flex flex-row items-center gap-3 pb-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <SparkleIcon className="h-5 w-5 text-primary" weight="fill" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-serif font-semibold">AI Insight</CardTitle>
                          <CardDescription>Powered by Minti AI</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-foreground leading-relaxed">{digest.ai_insight}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Budget Scorecard & Top Categories */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Budget Scorecard */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif font-semibold">Budget Scorecard</CardTitle>
                        <CardDescription>Month-to-date progress</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {data.budgetScorecard.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <TargetIcon className="h-10 w-10 text-muted-foreground mb-3" weight="thin" />
                            <p className="text-sm text-muted-foreground">No budgets set. Set up category budgets to see your scorecard.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {data.budgetScorecard.map((budget) => (
                              <div key={budget.category} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {budget.status === 'on_track' && <CheckCircleIcon className="h-4 w-4 text-primary" weight="fill" />}
                                    {budget.status === 'at_risk' && <WarningCircleIcon className="h-4 w-4 text-orange-500" weight="fill" />}
                                    {budget.status === 'exceeded' && <XCircleIcon className="h-4 w-4 text-destructive" weight="fill" />}
                                    <span className="font-medium text-foreground">{budget.category}</span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    ${budget.spent.toLocaleString()} / ${budget.limit.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      budget.status === 'exceeded' ? 'bg-destructive'
                                        : budget.status === 'at_risk' ? 'bg-orange-500'
                                        : 'bg-primary'
                                    }`}
                                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top Spending Categories */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif font-semibold">Top Categories</CardTitle>
                        <CardDescription>Where your money went this week</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {data.topCategories.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CurrencyDollarIcon className="h-10 w-10 text-muted-foreground mb-3" weight="thin" />
                            <p className="text-sm text-muted-foreground">No spending recorded this week.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {data.topCategories.map((cat) => (
                              <div key={cat.category} className="flex items-center justify-between group">
                                <span className="font-medium text-foreground">{cat.category}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold font-serif text-foreground">${cat.amount.toLocaleString()}</span>
                                  {cat.change !== 0 && (
                                    <Badge variant={cat.change > 0 ? "destructive" : "secondary"} className="text-xs">
                                      {cat.change > 0 ? <ArrowUpIcon className="h-3 w-3 mr-0.5" /> : <ArrowDownIcon className="h-3 w-3 mr-0.5" />}
                                      {Math.abs(cat.change)}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Subscriptions & Goals */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Subscription Activity */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif font-semibold">Subscriptions</CardTitle>
                        <CardDescription>Renewal activity this week</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {data.subscriptionActivity.totalMonthly > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <span className="text-sm text-muted-foreground">Monthly total</span>
                            <span className="font-semibold font-serif">${data.subscriptionActivity.totalMonthly.toLocaleString()}/mo</span>
                          </div>
                        )}

                        {data.subscriptionActivity.renewedThisWeek.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Renewed this week</h4>
                            <div className="space-y-2">
                              {data.subscriptionActivity.renewedThisWeek.map((sub, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CreditCardIcon className="h-4 w-4 text-muted-foreground" weight="thin" />
                                    <span className="text-foreground">{sub.name}</span>
                                  </div>
                                  <span className="font-semibold font-serif">${sub.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {data.subscriptionActivity.upcomingNextWeek.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Upcoming next week</h4>
                            <div className="space-y-2">
                              {data.subscriptionActivity.upcomingNextWeek.map((sub, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CalendarBlankIcon className="h-4 w-4 text-muted-foreground" weight="thin" />
                                    <span className="text-foreground">{sub.name}</span>
                                  </div>
                                  <span className="font-semibold font-serif">${sub.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {data.subscriptionActivity.renewedThisWeek.length === 0 &&
                          data.subscriptionActivity.upcomingNextWeek.length === 0 &&
                          data.subscriptionActivity.totalMonthly === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CreditCardIcon className="h-10 w-10 text-muted-foreground mb-3" weight="thin" />
                            <p className="text-sm text-muted-foreground">No subscription activity this week.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Goal Progress */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif font-semibold">Goal Progress</CardTitle>
                        <CardDescription>How your goals are tracking</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {data.goalProgress.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <TargetIcon className="h-10 w-10 text-muted-foreground mb-3" weight="thin" />
                            <p className="text-sm text-muted-foreground">No goals set. Create goals to track your progress.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {data.goalProgress.map((goal) => (
                              <div key={goal.name} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-foreground">{goal.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                                    </span>
                                    {goal.isOnTrack === true && (
                                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">On track</Badge>
                                    )}
                                    {goal.isOnTrack === false && (
                                      <Badge variant="destructive" className="text-xs">Behind</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${goal.percentage}%`,
                                      backgroundColor: goal.color || '#7DB87D',
                                    }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground text-right">
                                  {goal.percentage}% complete
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </BankConnectionChecker>
        </main>
      </div>
    </div>
  )
}

function WeekChange({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return <p className="text-xs text-muted-foreground mt-1">Same as last week</p>

  // For spending, "up" is bad (invert=true). For income, "up" is good.
  const isPositive = invert ? value < 0 : value > 0

  return (
    <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-primary' : 'text-destructive'}`}>
      {value > 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
      <span>{Math.abs(value)}% vs last week</span>
    </div>
  )
}
