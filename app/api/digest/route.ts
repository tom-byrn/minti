import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Fetch the most recent digests (last 8 weeks)
    const { data: digests, error } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching digests:', error)
      return NextResponse.json({ error: 'Failed to fetch digests' }, { status: 500 })
    }

    return NextResponse.json(digests || [])
  } catch (error) {
    console.error('Error in GET /api/digest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
