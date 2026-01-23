/**
 * Rate Limiting Utility
 * Provides in-memory rate limiting for API routes
 * Can be upgraded to use Redis/Upstash for production multi-instance deployments
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyPrefix?: string // Optional prefix for cache keys
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Note: This is cleared on server restart and doesn't work across multiple instances
// For production, consider using Upstash Redis
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  signup: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 requests per minute
  login: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  stripeCheckout: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  stripeWebhook: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute (Stripe sends many)
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute (general)
  search: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 searches per minute
}

/**
 * Gets the client identifier from the request
 * Uses IP address as the primary identifier
 */
function getClientKey(request: NextRequest, prefix: string = ''): string {
  // Try to get real IP from various headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  let ip = 'unknown'

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    ip = forwardedFor.split(',')[0].trim()
  } else if (realIp) {
    ip = realIp
  } else if (cfConnectingIp) {
    ip = cfConnectingIp
  }

  // Create a unique key combining prefix and IP
  return `${prefix}:${ip}`
}

/**
 * Checks if a request should be rate limited
 * Returns the result with remaining requests info
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{
  success: boolean
  remaining: number
  resetTime: number
  limit: number
}> {
  const key = getClientKey(request, config.keyPrefix || 'default')
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // No existing entry or expired, create new one
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
      limit: config.maxRequests,
    }
  }

  // Entry exists and is still valid
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    }
  }

  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  }
}

/**
 * Rate limiting middleware that returns 429 if limit exceeded
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, config)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      }
    )
  }

  return null
}

/**
 * Creates rate limit response headers
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
  }
}

/**
 * Higher-order function to wrap an API route with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(request, config)

    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Get rate limit info for headers
    const result = await checkRateLimit(request, config)

    const response = await handler(request)

    // Add rate limit headers to response
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', result.limit.toString())
    headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString())
    headers.set('X-RateLimit-Reset', result.resetTime.toString())

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

/**
 * Clears rate limit for a specific key (useful for testing)
 */
export function clearRateLimit(request: NextRequest, prefix: string = 'default'): void {
  const key = getClientKey(request, prefix)
  rateLimitStore.delete(key)
}

/**
 * Gets current rate limit status without incrementing (useful for debugging)
 */
export function getRateLimitStatus(
  request: NextRequest,
  config: RateLimitConfig
): { remaining: number; resetTime: number } | null {
  const key = getClientKey(request, config.keyPrefix || 'default')
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < Date.now()) {
    return null
  }

  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  }
}
