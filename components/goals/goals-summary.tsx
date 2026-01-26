"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target as TargetIcon, Trophy as TrophyIcon, TrendUp as TrendUpIcon, Calendar as CalendarIcon } from "@phosphor-icons/react"
import type { GoalWithProgress } from "@/lib/goals/types"

interface GoalsSummaryProps {
  goals: GoalWithProgress[]
}

export function GoalsSummary({ goals }: GoalsSummaryProps) {
  const activeGoals = goals.filter((g) => !g.isCompleted)
  const completedGoals = goals.filter((g) => g.isCompleted)

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0)
  const overallProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  const goalsOnTrack = activeGoals.filter((g) => g.progress.isOnTrack === true).length
  const goalsWithDeadlines = activeGoals.filter((g) => g.deadline).length
  const upcomingDeadlines = activeGoals.filter(
    (g) => g.progress.daysUntilDeadline !== null && g.progress.daysUntilDeadline > 0 && g.progress.daysUntilDeadline <= 30
  ).length

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TargetIcon className="h-5 w-5 text-primary" weight="thin" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif text-foreground">
            {activeGoals.length}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {completedGoals.length > 0 && `${completedGoals.length} completed`}
          </p>
        </CardContent>
      </Card>

      <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Progress</CardTitle>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendUpIcon className="h-5 w-5 text-primary" weight="thin" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif text-foreground">
            {formatCurrency(totalCurrent)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            of {formatCurrency(totalTarget)} ({overallProgress}%)
          </p>
        </CardContent>
      </Card>

      <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">On Track</CardTitle>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrophyIcon className="h-5 w-5 text-primary" weight="thin" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif text-foreground">
            {goalsOnTrack}/{goalsWithDeadlines}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            goals with deadlines
          </p>
        </CardContent>
      </Card>

      <Card className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</CardTitle>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 text-primary" weight="thin" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif text-foreground">
            {upcomingDeadlines}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            in the next 30 days
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
