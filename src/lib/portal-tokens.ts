/**
 * Portal Token Utilities
 * Secure JWT-based tokens for student, lecturer, and parent portals
 */

import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'

// Token payload structure
export interface PortalTokenPayload {
  type: 'student' | 'lecturer' | 'parent'
  entityId: string
  institutionId: string
  iat?: number
  exp?: number
}

// Decoded token with all fields
export interface DecodedPortalToken extends PortalTokenPayload {
  iat: number
  exp: number
}

// Token generation options
export interface TokenOptions {
  expiresInDays?: number
}

// Get the JWT secret (throws if not configured)
function getJwtSecret(): string {
  const secret = process.env.PORTAL_JWT_SECRET
  if (!secret) {
    throw new Error('PORTAL_JWT_SECRET is not configured')
  }
  if (secret.length < 32) {
    throw new Error('PORTAL_JWT_SECRET must be at least 32 characters')
  }
  return secret
}

/**
 * Generate a secure portal access token
 */
export function generatePortalToken(
  type: 'student' | 'lecturer' | 'parent',
  entityId: string,
  institutionId: string,
  options: TokenOptions = {}
): string {
  const { expiresInDays = 30 } = options
  const secret = getJwtSecret()

  const payload: Omit<PortalTokenPayload, 'iat' | 'exp'> = {
    type,
    entityId,
    institutionId,
  }

  return jwt.sign(payload, secret, {
    expiresIn: `${expiresInDays}d`,
    algorithm: 'HS256',
  })
}

/**
 * Verify and decode a portal token
 * Returns null if token is invalid or expired
 */
export function verifyPortalToken(token: string): DecodedPortalToken | null {
  try {
    const secret = getJwtSecret()
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as DecodedPortalToken

    // Validate required fields
    if (!decoded.type || !decoded.entityId || !decoded.institutionId) {
      return null
    }

    // Validate type
    if (!['student', 'lecturer', 'parent'].includes(decoded.type)) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}

/**
 * Decode a token without verification (for debugging)
 * DO NOT use this for authentication - only for logging/debugging
 */
export function decodeTokenUnsafe(token: string): DecodedPortalToken | null {
  try {
    return jwt.decode(token) as DecodedPortalToken | null
  } catch {
    return null
  }
}

/**
 * Hash a token for storage in database
 * We store the hash, not the token itself, for security
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a random string for token IDs
 */
export function generateTokenId(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Check if a token is about to expire (within X days)
 */
export function isTokenExpiringSoon(token: DecodedPortalToken, daysThreshold: number = 7): boolean {
  const expiresAt = new Date(token.exp * 1000)
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)
  return expiresAt <= thresholdDate
}

/**
 * Get token expiration date
 */
export function getTokenExpirationDate(token: DecodedPortalToken): Date {
  return new Date(token.exp * 1000)
}

/**
 * Get remaining days until token expires
 */
export function getTokenRemainingDays(token: DecodedPortalToken): number {
  const expiresAt = new Date(token.exp * 1000)
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Build portal URL with token
 */
export function buildPortalUrl(
  type: 'student' | 'lecturer' | 'parent',
  token: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || ''
  const path = type === 'parent' ? '/parent' : `/${type}/${token}`
  return `${base}${path}`
}

/**
 * Validate token format (quick check before verification)
 */
export function isValidTokenFormat(token: string): boolean {
  // JWT format: header.payload.signature
  const parts = token.split('.')
  if (parts.length !== 3) return false

  // Each part should be base64url encoded
  const base64urlRegex = /^[A-Za-z0-9_-]+$/
  return parts.every(part => base64urlRegex.test(part))
}

/**
 * Check if portal tokens are configured
 */
export function isPortalTokensConfigured(): boolean {
  try {
    getJwtSecret()
    return true
  } catch {
    return false
  }
}
