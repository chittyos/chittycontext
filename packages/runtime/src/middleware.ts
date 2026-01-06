/**
 * Hono middleware for ChittyContext
 */

import type { Context, Next } from 'hono'
import {
  ChittyContext,
  ContextType,
  ContextEnv,
  extractChittyId,
  createFromRequest,
  createAuditEvent,
  logAudit,
  saveContext,
  SYSTEM_CHITTY_ID
} from './index'

declare module 'hono' {
  interface ContextVariableMap {
    chittyContext: ChittyContext
  }
}

export interface ContextMiddlewareOptions {
  publicPaths?: string[]
  allowAnonymous?: boolean
  systemChittyId?: string
  enableAuditLog?: boolean
  contextType?: ContextType
}

const DEFAULT_OPTIONS: ContextMiddlewareOptions = {
  publicPaths: ['/health', '/api/v1/status', '/.well-known'],
  allowAnonymous: false,
  systemChittyId: SYSTEM_CHITTY_ID,
  enableAuditLog: true,
  contextType: 'session'
}

export function chittyContextMiddleware(options: ContextMiddlewareOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return async (c: Context<{ Bindings: ContextEnv }>, next: Next) => {
    const path = new URL(c.req.url).pathname

    // Skip public paths
    if (opts.publicPaths?.some(p => path.startsWith(p))) {
      c.set('chittyContext', createFromRequest(opts.systemChittyId!, c.req.raw, 'system'))
      return next()
    }

    // Extract ChittyID
    let body: any
    try {
      const clone = c.req.raw.clone()
      if (c.req.header('Content-Type')?.includes('application/json')) {
        body = await clone.json()
      }
    } catch {}

    const chittyId = extractChittyId(c.req.raw, body)

    if (!chittyId) {
      if (opts.allowAnonymous) {
        c.set('chittyContext', createFromRequest(opts.systemChittyId!, c.req.raw, opts.contextType!))
      } else {
        return c.json({
          error: 'ChittyID required',
          message: 'Provide X-Chitty-ID header or chittyId in request body',
          code: 'CHITTY_ID_REQUIRED'
        }, 401)
      }
    } else {
      c.set('chittyContext', createFromRequest(chittyId, c.req.raw, opts.contextType!))
    }

    const ctx = c.get('chittyContext')

    try {
      await next()

      if (opts.enableAuditLog && c.env?.CHITTY_KV) {
        const event = createAuditEvent(ctx, 'api.request', c.req.method, path, {
          status: c.res.status >= 400 ? 'error' : 'success'
        })
        logAudit(c.env, event).catch(console.error)
      }
    } catch (err: any) {
      if (opts.enableAuditLog && c.env?.CHITTY_KV) {
        const event = createAuditEvent(ctx, 'api.request', c.req.method, path, {
          status: 'error', errorMessage: err.message
        })
        logAudit(c.env, event).catch(console.error)
      }
      throw err
    }

    c.header('X-Request-ID', ctx.requestId)
    c.header('X-Chitty-ID', ctx.chittyId)
    c.header('X-Context-ID', ctx.id)
  }
}

export function requireChittyGroup(allowedGroups: string[]) {
  return async (c: Context, next: Next) => {
    const ctx = c.get('chittyContext')
    if (!ctx?.chittyId) return c.json({ error: 'ChittyID required' }, 401)

    const group = ctx.chittyId.split('-')[1]
    if (!allowedGroups.includes(group)) {
      return c.json({
        error: 'Unauthorized group',
        code: 'UNAUTHORIZED_GROUP'
      }, 403)
    }
    return next()
  }
}

export function rateLimitByChittyId(options: { maxRequests: number; windowSeconds: number }) {
  return async (c: Context<{ Bindings: ContextEnv }>, next: Next) => {
    const ctx = c.get('chittyContext')
    if (!ctx?.chittyId || !c.env?.CHITTY_KV) return next()

    const key = `ratelimit:${ctx.chittyId}`
    const current = await c.env.CHITTY_KV.get(key)
    const count = current ? parseInt(current, 10) : 0

    if (count >= options.maxRequests) {
      return c.json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: options.windowSeconds
      }, 429)
    }

    await c.env.CHITTY_KV.put(key, String(count + 1), { expirationTtl: options.windowSeconds })
    return next()
  }
}

export function requireAuthenticated() {
  return async (c: Context, next: Next) => {
    const ctx = c.get('chittyContext')
    if (!ctx?.chittyId || ctx.chittyId.split('-')[1] === 'X') {
      return c.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401)
    }
    return next()
  }
}

export function withConversation() {
  return async (c: Context, next: Next) => {
    const ctx = c.get('chittyContext')
    if (!ctx) return next()

    const conversationId = c.req.query('conversationId') || c.req.header('X-Conversation-ID') || crypto.randomUUID()
    c.set('chittyContext', { ...ctx, conversationId } as any)

    await next()
    c.header('X-Conversation-ID', conversationId)
  }
}
