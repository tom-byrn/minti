"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PencilSimple as PencilSimpleIcon, Trash as TrashIcon, Plus as PlusIcon, Check as CheckIcon, House as HouseIcon, Car as CarIcon, Airplane as AirplaneIcon, Backpack as BackpackIcon, GraduationCap as GraduationCapIcon, Heart as HeartIcon, Gift as GiftIcon, Briefcase as BriefcaseIcon, FirstAid as FirstAidIcon, PiggyBank as PiggyBankIcon, Target as TargetIcon } from "@phosphor-icons/react"
import type { GoalWithProgress } from "@/lib/goals/types"

const iconMap: Record<string, typeof HouseIcon> = {
  House: HouseIcon,
  Car: CarIcon,
  Airplane: AirplaneIcon,
  Backpack: BackpackIcon,
  GraduationCap: GraduationCapIcon,
  Heart: HeartIcon,
  Gift: GiftIcon,
  Briefcase: BriefcaseIcon,
  FirstAid: FirstAidIcon,
  PiggyBank: PiggyBankIcon,
}

interface GoalCardProps {
  goal: GoalWithProgress
  onEdit: (goal: GoalWithProgress) => void
  onDelete: (goal: GoalWithProgress) => void
  onContribute: (goal: GoalWithProgress) => void
}

export function GoalCard({ goal, onEdit, onDelete, onContribute }: GoalCardProps) {
  const Icon = goal.icon ? iconMap[goal.icon] || TargetIcon : TargetIcon
  const color = goal.color || '#7DB87D'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDeadlineStatus = () => {
    if (goal.isCompleted) return null
    if (goal.progress.daysUntilDeadline === null) return null

    if (goal.progress.daysUntilDeadline < 0) {
      return <Badge variant="destructive">Overdue</Badge>
    }
    if (goal.progress.daysUntilDeadline <= 30) {
      return <Badge variant="secondary">{goal.progress.daysUntilDeadline} days left</Badge>
    }
    return null
  }

  const getOnTrackIndicator = () => {
    if (goal.isCompleted || goal.progress.isOnTrack === null) return null

    if (goal.progress.isOnTrack) {
      return (
        <span className="text-xs text-primary flex items-center gap-1">
          <CheckIcon className="h-3 w-3" weight="bold" />
          On track
        </span>
      )
    }
    return (
      <span className="text-xs text-orange-500">
        Behind schedule
      </span>
    )
  }

  return (
    <Card className={`transition-all hover:shadow-md hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur ${goal.isCompleted ? 'opacity-75' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 flex-1 min-w-0">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="h-6 w-6" style={{ color }} weight="thin" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
                {goal.isCompleted && (
                  <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                    <CheckIcon className="h-3 w-3 mr-1" weight="bold" />
                    Completed
                  </Badge>
                )}
                {getDeadlineStatus()}
              </div>

              {goal.category && (
                <p className="text-sm text-muted-foreground mb-3">{goal.category}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-end justify-between text-sm">
                  <div>
                    <span className="text-2xl font-bold font-serif text-foreground">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      of {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color }}>
                    {goal.progress.percentage}%
                  </span>
                </div>

                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all rounded-full"
                    style={{
                      width: `${goal.progress.percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {goal.progress.remaining > 0 ? (
                      <>
                        {formatCurrency(goal.progress.remaining)} to go
                        {goal.progress.monthlyNeeded && !goal.isCompleted && (
                          <span className="mx-2">·</span>
                        )}
                        {goal.progress.monthlyNeeded && !goal.isCompleted && (
                          <span>{formatCurrency(goal.progress.monthlyNeeded)}/mo needed</span>
                        )}
                      </>
                    ) : (
                      <span className="text-primary font-medium">Goal reached!</span>
                    )}
                  </div>
                  {getOnTrackIndicator()}
                </div>

                {goal.deadline && (
                  <div className="text-sm text-muted-foreground">
                    Deadline: {formatDate(goal.deadline)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!goal.isCompleted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onContribute(goal)}
                title="Add contribution"
              >
                <PlusIcon className="h-4 w-4" weight="thin" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <PencilSimpleIcon className="h-4 w-4 mr-2" weight="thin" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(goal)} className="text-destructive">
                  <TrashIcon className="h-4 w-4 mr-2" weight="thin" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
