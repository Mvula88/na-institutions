import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueNotification, processNotifications } from '@/lib/notifications'

interface SendNotificationRequest {
  recipientType: 'parent' | 'student' | 'lecturer'
  recipientId?: string
  recipientIds?: string[]
  notificationType: string
  title: string
  message: string
  channel: 'email' | 'sms' | 'both'
  processImmediately?: boolean
}

/**
 * Send notification(s) to recipients
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's institution and role
    const { data: userDataRaw } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    const userData = userDataRaw as { institution_id: string | null; role: string } | null
    if (!userData?.institution_id) {
      return NextResponse.json({ error: 'No institution associated' }, { status: 400 })
    }

    // Only institution admins can send notifications
    if (!['institution_admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: SendNotificationRequest = await request.json()
    const { recipientType, recipientId, recipientIds, notificationType, title, message, channel, processImmediately } = body

    if (!recipientType || !notificationType || !title || !message || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ids = recipientIds || (recipientId ? [recipientId] : [])
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No recipients specified' }, { status: 400 })
    }

    // Batch queue notifications for all recipients
    const queued: string[] = []
    const failed: string[] = []

    // Create notification records for batch insert
    const notificationRecords = ids.map(id => ({
      institution_id: userData.institution_id,
      recipient_type: recipientType,
      recipient_id: id,
      notification_type: notificationType,
      title,
      message,
      channel,
      status: 'pending',
      scheduled_for: new Date().toISOString(),
      created_by: user.id,
    }))

    // Batch insert all notifications
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notification_queue')
      .insert(notificationRecords as never)
      .select('id, recipient_id')

    if (insertError) {
      console.error('Error batch inserting notifications:', insertError)
      // Fallback to individual inserts
      for (const id of ids) {
        const result = await queueNotification({
          institutionId: userData.institution_id,
          recipientType,
          recipientId: id,
          notificationType,
          title,
          message,
          channel,
          createdBy: user.id,
        })

        if (result.success && result.notificationId) {
          queued.push(result.notificationId)
        } else {
          failed.push(id)
        }
      }
    } else {
      // Track successful inserts
      const insertedMap = new Map((insertedNotifications || []).map(
        (n: { id: string; recipient_id: string }) => [n.recipient_id, n.id]
      ))

      for (const id of ids) {
        const notificationId = insertedMap.get(id)
        if (notificationId) {
          queued.push(notificationId)
        } else {
          failed.push(id)
        }
      }
    }

    // Optionally process immediately
    if (processImmediately && queued.length > 0) {
      await processNotifications(queued.length)
    }

    return NextResponse.json({
      success: true,
      queued: queued.length,
      failed: failed.length,
      processedImmediately: processImmediately || false,
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get notification queue status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center
    const { data: userDataRaw2 } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    const userData = userDataRaw2 as { center_id: string | null; role: string } | null
    if (!userData?.center_id) {
      return NextResponse.json({ error: 'No center associated' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('institution_id', userData.center_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get counts by status
    const { data: countsRaw } = await supabase
      .from('notification_queue')
      .select('status')
      .eq('institution_id', userData.center_id)

    const counts = countsRaw as { status: string }[] | null

    const statusCounts = {
      pending: 0,
      scheduled: 0,
      sent: 0,
      failed: 0,
    }

    counts?.forEach((n) => {
      if (n.status in statusCounts) {
        statusCounts[n.status as keyof typeof statusCounts]++
      }
    })

    return NextResponse.json({
      success: true,
      notifications,
      counts: statusCounts,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
