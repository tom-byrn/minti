import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FinancialGoalUpdate } from '@/lib/database.types'
import { calculateGoalProgress, type GoalWithProgress } from '@/lib/goals/types'

interface RouteParams {
  params: Promise<{ goalId: string }>
}

// GET: Fetch a single goal
export async function GET(request: Request, { params }: RouteParams) {
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

    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching goal:', error)
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const goalWithProgress: GoalWithProgress = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount || 0,
      deadline: data.deadline,
      category: data.category,
      color: data.color,
      icon: data.icon,
      isCompleted: data.is_completed || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      progress: calculateGoalProgress({
        targetAmount: data.target_amount,
        currentAmount: data.current_amount || 0,
        deadline: data.deadline,
        createdAt: data.created_at,
      }),
    }

    return NextResponse.json(goalWithProgress)
  } catch (error) {
    console.error('Error in GET /api/goals/[goalId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update a goal
export async function PUT(request: Request, { params }: RouteParams) {
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
    const { name, targetAmount, currentAmount, deadline, category, color, icon, isCompleted } = body

    const update: FinancialGoalUpdate = {
      ...(name !== undefined && { name }),
      ...(targetAmount !== undefined && { target_amount: targetAmount }),
      ...(currentAmount !== undefined && { current_amount: currentAmount }),
      ...(deadline !== undefined && { deadline }),
      ...(category !== undefined && { category }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(isCompleted !== undefined && { is_completed: isCompleted }),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('financial_goals')
      .update(update)
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating goal:', error)
      return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const goalWithProgress: GoalWithProgress = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount || 0,
      deadline: data.deadline,
      category: data.category,
      color: data.color,
      icon: data.icon,
      isCompleted: data.is_completed || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      progress: calculateGoalProgress({
        targetAmount: data.target_amount,
        currentAmount: data.current_amount || 0,
        deadline: data.deadline,
        createdAt: data.created_at,
      }),
    }

    return NextResponse.json(goalWithProgress)
  } catch (error) {
    console.error('Error in PUT /api/goals/[goalId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a goal
export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting goal:', error)
      return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/goals/[goalId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
