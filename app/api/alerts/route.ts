import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch all alerts for the user
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

    // Fetch alerts from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Mark alerts as read or dismiss them
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertIds, action } = await request.json()

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({ error: 'alertIds array is required' }, { status: 400 })
    }

    if (action === 'read') {
      const { error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('user_id', user.id)
        .in('id', alertIds)

      if (error) {
        console.error('Error marking alerts as read:', error)
        return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 })
      }

      return NextResponse.json({ updated: alertIds.length })
    }

    if (action === 'read_all') {
      const { error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) {
        console.error('Error marking all alerts as read:', error)
        return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 })
      }

      return NextResponse.json({ updated: 'all' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in PATCH /api/alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete specific alerts
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertIds } = await request.json()

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({ error: 'alertIds array is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('user_id', user.id)
      .in('id', alertIds)

    if (error) {
      console.error('Error deleting alerts:', error)
      return NextResponse.json({ error: 'Failed to delete alerts' }, { status: 500 })
    }

    return NextResponse.json({ deleted: alertIds.length })
  } catch (error) {
    console.error('Error in DELETE /api/alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
