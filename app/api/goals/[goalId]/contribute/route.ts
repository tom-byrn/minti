import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateGoalProgress, type GoalWithProgress } from '@/lib/goals/types'

interface RouteParams {
  params: Promise<{ goalId: string }>
}

// POST: Add a contribution to a goal
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { goalId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    // First, get the current goal
    const { data: goal, error: fetchError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Calculate new amount
    const newAmount = (goal.current_amount || 0) + amount
    const isCompleted = newAmount >= goal.target_amount

    // Update the goal
    const { data: updatedGoal, error: updateError } = await supabase
      .from('financial_goals')
      .update({
        current_amount: newAmount,
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating goal:', updateError)
      return NextResponse.json({ error: 'Failed to add contribution' }, { status: 500 })
    }

    const goalWithProgress: GoalWithProgress = {
      id: updatedGoal.id,
      userId: updatedGoal.user_id,
      name: updatedGoal.name,
      targetAmount: updatedGoal.target_amount,
      currentAmount: updatedGoal.current_amount || 0,
      deadline: updatedGoal.deadline,
      category: updatedGoal.category,
      color: updatedGoal.color,
      icon: updatedGoal.icon,
      isCompleted: updatedGoal.is_completed || false,
      createdAt: updatedGoal.created_at,
      updatedAt: updatedGoal.updated_at,
      progress: calculateGoalProgress({
        targetAmount: updatedGoal.target_amount,
        currentAmount: updatedGoal.current_amount || 0,
        deadline: updatedGoal.deadline,
        createdAt: updatedGoal.created_at,
      }),
    }

    return NextResponse.json(goalWithProgress)
  } catch (error) {
    console.error('Error in POST /api/goals/[goalId]/contribute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
