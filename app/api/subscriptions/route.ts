import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserSubscriptionInsert, UserSubscriptionUpdate } from '@/lib/database.types'

// GET: Fetch all user subscriptions
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
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new subscription
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
    const {
      merchantName,
      displayName,
      category,
      amount,
      billingPeriod,
      nextChargeDate,
      source,
      detectedSubscriptionId,
    } = body

    if (!merchantName || !amount || !billingPeriod || !source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const subscription: UserSubscriptionInsert = {
      user_id: user.id,
      merchant_name: merchantName,
      display_name: displayName || null,
      category: category || null,
      amount,
      billing_period: billingPeriod,
      next_charge_date: nextChargeDate || null,
      source,
      detected_subscription_id: detectedSubscriptionId || null,
      is_active: true,
    }

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert(subscription)
      .select()
      .single()

    if (error) {
      console.error('Error creating subscription:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Subscription already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update an existing subscription
export async function PUT(request: Request) {
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    const subscriptionUpdate: UserSubscriptionUpdate = {
      ...(updates.merchantName !== undefined && { merchant_name: updates.merchantName }),
      ...(updates.displayName !== undefined && { display_name: updates.displayName }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.amount !== undefined && { amount: updates.amount }),
      ...(updates.billingPeriod !== undefined && { billing_period: updates.billingPeriod }),
      ...(updates.nextChargeDate !== undefined && { next_charge_date: updates.nextChargeDate }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update(subscriptionUpdate)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subscription:', error)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a subscription
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting subscription:', error)
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
