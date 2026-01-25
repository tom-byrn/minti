"use client"

import { useEffect, useState } from 'react'
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Wallet, PiggyBank, Percent, AlertCircle, Target } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ReconnectBankCard } from "@/components/reconnect-bank-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { BankConnectionChecker } from "@/components/bank-connection-checker"

interface AnalyticsData {
  summaryStats: {
    totalSpent: number
    totalIncome: number
    totalSaved: number
    savingsRate: number
  }
  dailySpending: Array<{ date: string; day: number; month: string; amount: number; label?: string }>
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number; color: string }>
  incomeVsExpenses: Array<{ month: string; income: number; expenses: number }>
  budgetProgress: Array<{ category: string; spent: number; budget: number | null; percentage: number; hasBudget: boolean }>
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [hasConnectedAccount, setHasConnectedAccount] = useState(true)
  const [spendingPeriod, setSpendingPeriod] = useState<string>('1m')

  const fetchAnalytics = async (period: string = spendingPeriod) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/plaid/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spending_period: period }),
      })

      const result = await response.json()

      if (response.status === 404) {
        setHasConnectedAccount(false)
        return
      }

      if (!response.ok) {
        if (response.status === 202) {
          setError('Transactions are still being processed. Please refresh in a moment.')
        } else {
          setError('Your bank connection has expired. Please reconnect your account.')
          setHasConnectedAccount(false)
        }
        return
      }

      setHasConnectedAccount(true)
      setData(result)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError('Failed to connect to your bank. Please try again.')
      setHasConnectedAccount(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(spendingPeriod)
  }, [])

  useEffect(() => {
    if (hasConnectedAccount) {
      fetchAnalytics(spendingPeriod)
    }
  }, [spendingPeriod])

  const handlePlaidSuccess = () => {
    setError(null)
    fetchAnalytics(spendingPeriod)
  }

  if (error || !data) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <div className="relative z-10">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-8 lg:px-8">
            {error && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-center text-lg text-muted-foreground">{error}</p>
              </div>
            )}
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
          <BankConnectionChecker>
            <div className="space-y-6">
              {/* Header with Summary Stats */}
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl font-serif font-semibold text-foreground">Analytics</h1>
                  <p className="text-lg text-muted-foreground">Financial insights and trends</p>
                </div>
                <div className="text-sm text-muted-foreground">Last 30 Days</div>
              </div>

              {/* Summary Stat Cards */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-serif text-foreground">
                      ${data.summaryStats.totalSpent.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-serif text-foreground">
                      ${data.summaryStats.totalIncome.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Saved</CardTitle>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <PiggyBank className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-serif text-foreground">
                      ${data.summaryStats.totalSaved.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Percent className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-serif text-foreground">
                      {data.summaryStats.savingsRate}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Hero Chart - Spending Trend */}
            <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-serif font-semibold">Spending Trend</CardTitle>
                  <CardDescription>Your spending over time</CardDescription>
                </div>
                <Select value={spendingPeriod} onValueChange={setSpendingPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1w">1 Week</SelectItem>
                    <SelectItem value="1m">1 Month</SelectItem>
                    <SelectItem value="6m">6 Months</SelectItem>
                    <SelectItem value="1y">1 Year</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pt-4">
                <ChartContainer
                  config={{
                    amount: {
                      label: "Spending",
                      color: "var(--primary)",
                    },
                  }}
                  className="aspect-auto h-[350px] w-full"
                >
                  <LineChart data={data.dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      axisLine={true}
                      tick={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value}`}
                      className="text-xs"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value, payload) => {
                            if (payload && payload[0]) {
                              const data = payload[0].payload
                              // Prefer label from backend, else format date
                              if (data.label) return data.label
                              return `${data.month} ${data.day}`
                            }
                            return value
                          }}
                          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spending']}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--color-amount)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown & Income vs Expenses */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Category Breakdown */}
              <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif font-semibold">Category Breakdown</CardTitle>
                  <CardDescription>Where your money goes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Circular visualization */}
                    <div className="flex items-center justify-center py-4">
                      <div className="relative w-48 h-48">
                        {/* Simple ring chart using conic gradient */}
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            background: `conic-gradient(
                              ${data.categoryBreakdown.map((cat, i) => {
                                const previousPercentages = data.categoryBreakdown
                                  .slice(0, i)
                                  .reduce((sum, c) => sum + c.percentage, 0)
                                const start = previousPercentages
                                const end = previousPercentages + cat.percentage
                                return `${cat.color} ${start}% ${end}%`
                              }).join(', ')}
                            )`
                          }}
                        >
                          <div className="absolute inset-4 rounded-full bg-card flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-3xl font-bold font-serif">
                                ${data.categoryBreakdown.reduce((sum, cat) => sum + cat.amount, 0).toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">Total</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-3">
                      {data.categoryBreakdown.map((cat) => (
                        <div key={cat.category} className="flex items-center justify-between group cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {cat.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold font-serif text-foreground">
                              ${cat.amount.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({cat.percentage}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Income vs Expenses */}
              <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif font-semibold">Income vs Expenses</CardTitle>
                  <CardDescription>Monthly cash flow comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-primary"></div>
                        <span className="font-medium">Income</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-destructive"></div>
                        <span className="font-medium">Expenses</span>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="h-[280px] flex items-end justify-between gap-3">
                      {data.incomeVsExpenses.map((monthData) => {
                        const maxAmount = 6000
                        const incomeHeight = (monthData.income / maxAmount) * 100
                        const expenseHeight = (monthData.expenses / maxAmount) * 100
                        const netAmount = monthData.income - monthData.expenses

                        return (
                          <div key={monthData.month} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="w-full relative h-full flex items-end justify-center gap-1.5">
                              <div className="relative flex-1">
                                <div
                                  className="w-full bg-primary rounded-t-lg transition-all group-hover:opacity-80"
                                  style={{ height: `${incomeHeight * 2.2}px` }}
                                />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-2 py-1 rounded text-xs whitespace-nowrap">
                                  ${monthData.income.toLocaleString()}
                                </div>
                              </div>
                              <div className="relative flex-1">
                                <div
                                  className="w-full bg-destructive rounded-t-lg transition-all group-hover:opacity-80"
                                  style={{ height: `${expenseHeight * 2.2}px` }}
                                />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-2 py-1 rounded text-xs whitespace-nowrap">
                                  ${monthData.expenses.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-semibold text-foreground">{monthData.month}</div>
                              <div className={`text-xs font-medium ${netAmount > 0 ? 'text-primary' : 'text-destructive'}`}>
                                {netAmount > 0 ? '+' : ''}${netAmount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Progress */}
            <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-serif font-semibold">Budget Progress</CardTitle>
                    <CardDescription>Track your spending limits</CardDescription>
                  </div>
                  <Link href="/budget">
                    <Button variant="outline" size="sm">
                      <Target className="h-4 w-4 mr-2" />
                      Manage Budgets
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {data.budgetProgress.filter(b => b.hasBudget).length === 0 ? (
                  // No budgets set - show CTA
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No budgets set yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      Set monthly spending limits for your categories to track your progress and stay on budget.
                    </p>
                    <Link href="/budget">
                      <Button>
                        <Target className="h-4 w-4 mr-2" />
                        Set Up Your First Budget
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {data.budgetProgress.filter(b => b.hasBudget).map((budget) => {
                      const remaining = (budget.budget || 0) - budget.spent
                      const isOverBudget = budget.percentage > 100
                      const isNearLimit = budget.percentage > 90

                      return (
                        <Card
                          key={budget.category}
                          className={`border-border/50 transition-all hover:shadow-md hover:-translate-y-1 ${
                            isOverBudget
                              ? 'bg-destructive/5 border-destructive/20'
                              : isNearLimit
                              ? 'bg-orange-500/5 border-orange-500/20'
                              : 'bg-background/50'
                          }`}
                        >
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-foreground">{budget.category}</CardTitle>
                            <Badge
                              variant={isOverBudget || isNearLimit ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {budget.percentage}%
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Spent</span>
                                <span className="font-semibold font-serif">
                                  ${budget.spent.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Budget</span>
                                <span className="font-semibold font-serif">
                                  ${(budget.budget || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all rounded-full ${
                                    isOverBudget
                                      ? 'bg-destructive'
                                      : isNearLimit
                                      ? 'bg-orange-500'
                                      : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                />
                              </div>
                              <p className={`text-xs font-medium ${
                                remaining < 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }`}>
                                {remaining >= 0
                                  ? `$${remaining.toLocaleString()} remaining`
                                  : `$${Math.abs(remaining).toLocaleString()} over budget`
                                }
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </BankConnectionChecker>
        </main>
      </div>
    </div>
  )
}
