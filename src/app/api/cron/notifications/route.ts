import { NextRequest, NextResponse } from 'next/server'
import { processNotifications } from '@/lib/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cron endpoint to process pending notifications
 * Should be called every minute via Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process pending notifications
    const result = await processNotifications(50)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron notifications error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process notifications',
    }, { status: 500 })
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
