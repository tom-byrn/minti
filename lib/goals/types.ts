export interface GoalInput {
  name: string
  targetAmount: number
  currentAmount?: number
  deadline?: string | null
  category?: string | null
  color?: string | null
  icon?: string | null
}

export interface GoalProgress {
  percentage: number                // current / target * 100
  remaining: number                 // target - current
  daysUntilDeadline: number | null
  monthlyNeeded: number | null      // remaining / months until deadline
  isOnTrack: boolean | null         // current pace will meet deadline
}

export interface GoalWithProgress {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  category: string | null
  color: string | null
  icon: string | null
  isCompleted: boolean
  createdAt: string | null
  updatedAt: string | null
  progress: GoalProgress
}

// Available goal colors
export const GOAL_COLORS = [
  { name: 'Green', value: '#7DB87D' },
  { name: 'Blue', value: '#5B8DEF' },
  { name: 'Purple', value: '#9B87F5' },
  { name: 'Orange', value: '#F5A623' },
  { name: 'Pink', value: '#F56565' },
  { name: 'Teal', value: '#38B2AC' },
] as const

// Available goal icons
export const GOAL_ICONS = [
  'House',
  'Car',
  'Airplane',
  'Backpack',
  'GraduationCap',
  'Heart',
  'Gift',
  'Briefcase',
  'FirstAid',
  'PiggyBank',
] as const

// Helper to calculate goal progress
export function calculateGoalProgress(goal: {
  targetAmount: number
  currentAmount: number
  deadline: string | null
  createdAt: string | null
}): GoalProgress {
  const percentage = Math.min(
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
    100
  )
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)

  let daysUntilDeadline: number | null = null
  let monthlyNeeded: number | null = null
  let isOnTrack: boolean | null = null

  if (goal.deadline) {
    const deadlineDate = new Date(goal.deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = deadlineDate.getTime() - today.getTime()
    daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (daysUntilDeadline > 0 && remaining > 0) {
      const monthsRemaining = daysUntilDeadline / 30.44
      monthlyNeeded = Math.round((remaining / monthsRemaining) * 100) / 100

      // Calculate if on track based on progress since creation
      if (goal.createdAt) {
        const createdDate = new Date(goal.createdAt)
        const totalDays = Math.ceil(
          (deadlineDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const daysElapsed = totalDays - daysUntilDeadline
        const expectedProgress = daysElapsed / totalDays
        const actualProgress = goal.currentAmount / goal.targetAmount
        isOnTrack = actualProgress >= expectedProgress * 0.9 // 10% buffer
      }
    } else if (daysUntilDeadline <= 0) {
      isOnTrack = remaining === 0
    }
  }

  return {
    percentage,
    remaining,
    daysUntilDeadline,
    monthlyNeeded,
    isOnTrack,
  }
}
