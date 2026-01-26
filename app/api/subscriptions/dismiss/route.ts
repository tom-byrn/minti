import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Dismiss a detected subscription
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
    const { detectedSubscriptionId } = body

    if (!detectedSubscriptionId) {
      return NextResponse.json({ error: 'Detected subscription ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dismissed_subscriptions')
      .insert({
        user_id: user.id,
        detected_subscription_id: detectedSubscriptionId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error dismissing subscription:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Subscription already dismissed' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to dismiss subscription' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/subscriptions/dismiss:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Undismiss a subscription (restore it)
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
    const detectedSubscriptionId = searchParams.get('detectedSubscriptionId')

    if (!detectedSubscriptionId) {
      return NextResponse.json({ error: 'Detected subscription ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('dismissed_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('detected_subscription_id', detectedSubscriptionId)

    if (error) {
      console.error('Error undismissing subscription:', error)
      return NextResponse.json({ error: 'Failed to undismiss subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/subscriptions/dismiss:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get all dismissed subscription IDs
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
      .from('dismissed_subscriptions')
      .select('detected_subscription_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching dismissed subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch dismissed subscriptions' }, { status: 500 })
    }

    const dismissedIds = data.map((d) => d.detected_subscription_id)
    return NextResponse.json(dismissedIds)
  } catch (error) {
    console.error('Error in GET /api/subscriptions/dismiss:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
