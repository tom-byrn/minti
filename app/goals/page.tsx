"use client"

import { useEffect, useState } from 'react'
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WarningCircle as WarningCircleIcon, Target as TargetIcon, Plus as PlusIcon, ArrowsClockwise as ArrowsClockwiseIcon } from "@phosphor-icons/react"
import { GoalCard } from "@/components/goals/goal-card"
import { GoalFormDialog } from "@/components/goals/goal-form-dialog"
import { ContributeDialog } from "@/components/goals/contribute-dialog"
import { GoalsSummary } from "@/components/goals/goals-summary"
import type { GoalWithProgress, GoalInput } from "@/lib/goals/types"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />
}

function GoalCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-5">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-16 mb-1" />
        <Skeleton className="h-4 w-28" />
      </CardContent>
    </Card>
  )
}

function GoalsPageSkeleton() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 lg:px-8">
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-serif font-semibold text-foreground">Goals</h1>
                <p className="text-lg text-muted-foreground">Track your financial goals</p>
              </div>
              <Skeleton className="h-9 w-32" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <GoalCardSkeleton />
              <GoalCardSkeleton />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [goals, setGoals] = useState<GoalWithProgress[]>([])

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null)

  const fetchGoals = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/goals')
      const result = await response.json()

      if (!response.ok) {
        setError('Failed to fetch goals. Please try again.')
        return
      }

      setGoals(result)
    } catch (err) {
      console.error('Error fetching goals:', err)
      setError('Failed to load goals. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchGoals(true)
  }

  const handleCreateGoal = () => {
    setSelectedGoal(null)
    setFormDialogOpen(true)
  }

  const handleEditGoal = (goal: GoalWithProgress) => {
    setSelectedGoal(goal)
    setFormDialogOpen(true)
  }

  const handleDeleteGoal = async (goal: GoalWithProgress) => {
    if (!confirm(`Are you sure you want to delete "${goal.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete goal')
      }

      await fetchGoals(true)
    } catch (err) {
      console.error('Error deleting goal:', err)
    }
  }

  const handleContributeClick = (goal: GoalWithProgress) => {
    setSelectedGoal(goal)
    setContributeDialogOpen(true)
  }

  const handleSaveGoal = async (input: GoalInput) => {
    if (selectedGoal) {
      // Update existing goal
      const response = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to update goal')
      }
    } else {
      // Create new goal
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to create goal')
      }
    }

    await fetchGoals(true)
  }

  const handleContribute = async (goalId: string, amount: number) => {
    const response = await fetch(`/api/goals/${goalId}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })

    if (!response.ok) {
      throw new Error('Failed to add contribution')
    }

    await fetchGoals(true)
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  if (loading) {
    return <GoalsPageSkeleton />
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <div className="relative z-10">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-8 lg:px-8">
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <WarningCircleIcon className="h-12 w-12 text-destructive" weight="thin" />
              <p className="text-center text-lg text-muted-foreground">{error}</p>
              <Button onClick={() => fetchGoals()} variant="outline">
                Try again
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const activeGoals = goals.filter((g) => !g.isCompleted)
  const completedGoals = goals.filter((g) => g.isCompleted)

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
                <h1 className="text-4xl font-serif font-semibold text-foreground">Goals</h1>
                <p className="text-lg text-muted-foreground">Track progress toward your financial goals</p>
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
                <Button onClick={handleCreateGoal} className="gap-2">
                  <PlusIcon className="h-4 w-4" weight="thin" />
                  New Goal
                </Button>
              </div>
            </div>

            {goals.length === 0 ? (
              // Empty state
              <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <TargetIcon className="h-16 w-16 text-muted-foreground/50 mb-4" weight="thin" />
                  <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Set financial goals to track your progress toward saving for an emergency fund,
                    vacation, new car, or anything else important to you.
                  </p>
                  <Button onClick={handleCreateGoal}>
                    <PlusIcon className="h-4 w-4 mr-2" weight="thin" />
                    Create Your First Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Cards */}
                <GoalsSummary goals={goals} />

                {/* Active Goals */}
                {activeGoals.length > 0 && (
                  <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-2xl font-serif font-semibold">Active Goals</CardTitle>
                      <CardDescription>Goals you're currently working toward</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {activeGoals.map((goal) => (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={handleEditGoal}
                            onDelete={handleDeleteGoal}
                            onContribute={handleContributeClick}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Completed Goals */}
                {completedGoals.length > 0 && (
                  <Card className="border-border/50 bg-card/60 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-muted-foreground">
                        Completed Goals ({completedGoals.length})
                      </CardTitle>
                      <CardDescription>Goals you've achieved</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {completedGoals.map((goal) => (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={handleEditGoal}
                            onDelete={handleDeleteGoal}
                            onContribute={handleContributeClick}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <GoalFormDialog
        goal={selectedGoal}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSave={handleSaveGoal}
      />

      <ContributeDialog
        goal={selectedGoal}
        open={contributeDialogOpen}
        onOpenChange={setContributeDialogOpen}
        onContribute={handleContribute}
      />
    </div>
  )
}
