import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FinancialGoalInsert } from '@/lib/database.types'
import { calculateGoalProgress, type GoalWithProgress } from '@/lib/goals/types'

// GET: Fetch all goals for the user
export async function GET() {
  try {
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching goals:', error)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    // Transform to GoalWithProgress
    const goalsWithProgress: GoalWithProgress[] = (data || []).map((goal) => ({
      id: goal.id,
      userId: goal.user_id,
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount || 0,
      deadline: goal.deadline,
      category: goal.category,
      color: goal.color,
      icon: goal.icon,
      isCompleted: goal.is_completed || false,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
      progress: calculateGoalProgress({
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount || 0,
        deadline: goal.deadline,
        createdAt: goal.created_at,
      }),
    }))

    return NextResponse.json(goalsWithProgress)
  } catch (error) {
    console.error('Error in GET /api/goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new goal
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, targetAmount, currentAmount, deadline, category, color, icon } = body

    if (!name || !targetAmount) {
      return NextResponse.json({ error: 'Name and target amount are required' }, { status: 400 })
    }

    if (targetAmount <= 0) {
      return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 })
    }

    const goal: FinancialGoalInsert = {
      user_id: user.id,
      name,
      target_amount: targetAmount,
      current_amount: currentAmount || 0,
      deadline: deadline || null,
      category: category || null,
      color: color || null,
      icon: icon || null,
      is_completed: false,
    }

    const { data, error } = await supabase
      .from('financial_goals')
      .insert(goal)
      .select()
      .single()

    if (error) {
      console.error('Error creating goal:', error)
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
    }

    // Return with progress calculated
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

    return NextResponse.json(goalWithProgress, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
