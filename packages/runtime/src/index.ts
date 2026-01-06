/**
 * @chittyos/chittycontext
 *
 * Structured ChittyOS Runtime Context System
 *
 * Context is:
 * - Tied to ChittyID (who)
 * - Typed (what kind of operation)
 * - Tracked for provenance (where it came from)
 * - Scored based on outcomes (trust/quality)
 * - Linked to ChittyDNA (user patterns)
 *
 * ChittyConnect uses context to route requests intelligently.
 * Context reputation becomes an asset over time.
 */

// ============================================================
// Context Types - Structured by operation type
// ============================================================

export type ContextType =
  | 'session'        // Ephemeral per-session context
  | 'conversation'   // AI conversation context
  | 'workflow'       // Approval/provisioning workflow
  | 'transaction'    // Financial/ledger transaction
  | 'identity'       // Authentication/authorization
  | 'agent'          // Agent execution context
  | 'mcp'            // MCP tool invocation
  | 'system'         // Internal system operations

export type ContextStatus =
  | 'active'         // Currently in progress
  | 'completed'      // Successfully completed
  | 'failed'         // Failed with error
  | 'pending'        // Waiting for external input
  | 'promoted'       // Elevated trust/authority
  | 'demoted'        // Reduced trust/authority
  | 'archived'       // Historical, no longer active

export type ContextGrade =
  | 'A'   // Excellent - high trust, consistent success
  | 'B'   // Good - reliable, minor issues
  | 'C'   // Average - acceptable, needs monitoring
  | 'D'   // Poor - unreliable, frequent issues
  | 'F'   // Failed - untrustworthy, restricted

// ============================================================
// Core Context Interface
// ============================================================

export interface ChittyContext {
  // Identity
  id: string                 // Unique context ID
  chittyId: string           // The entity's ChittyID (who)
  type: ContextType          // What kind of context

  // Status & Lifecycle
  status: ContextStatus
  grade: ContextGrade
  trustScore: number         // 0-100, accumulated from outcomes

  // Temporal
  createdAt: string
  updatedAt: string
  expiresAt?: string

  // Provenance Chain
  parentContextId?: string   // Parent context (nesting)
  rootContextId?: string     // Original root context
  depth: number              // Nesting depth

  // Session/Request Info
  sessionId: string
  requestId: string

  // ChittyDNA Integration
  dnaFingerprint?: string    // Link to ChittyDNA pattern
  preferences?: Record<string, any>  // Resolved preferences

  // Metadata
  source: string             // Origin service
  userAgent?: string
  ipHash?: string
  tags?: string[]

  // Outcome Tracking
  outcomes: ContextOutcome[]
}

export interface ContextOutcome {
  id: string
  timestamp: string
  type: 'success' | 'error' | 'warning' | 'info'
  action: string
  resource: string
  details?: Record<string, any>
  scoreImpact: number        // -10 to +10
}

// ============================================================
// Specialized Context Types
// ============================================================

export interface ConversationContext extends ChittyContext {
  type: 'conversation'
  conversationId: string
  messageCount: number
  provider?: string
  model?: string
  totalTokens: number
}

export interface WorkflowContext extends ChittyContext {
  type: 'workflow'
  workflowId: string
  workflowType: string
  currentStep: string
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: string
  completedAt?: string
  result?: any
  error?: string
}

export interface AgentContext extends ChittyContext {
  type: 'agent'
  agentId: string
  agentType: string
  toolsUsed: string[]
  delegations: string[]
}

export interface TransactionContext extends ChittyContext {
  type: 'transaction'
  transactionId: string
  transactionType: string
  amount?: number
  currency?: string
  counterpartyId?: string
}

// ============================================================
// Environment
// ============================================================

export interface ContextEnv {
  CHITTY_KV: KVNamespace
  CHITTY_TASKS?: Queue<any>
}

// ============================================================
// ChittyID
// ============================================================

export const SYSTEM_CHITTY_ID = '01-X-SYS-0000-0-0000-S-X'

export function validateChittyId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  const parts = id.split('-')
  if (parts.length < 4) return false
  if (!/^\d{2}$/.test(parts[0])) return false
  if (!/^[A-Z]$/.test(parts[1])) return false
  return true
}

export function parseChittyId(id: string) {
  if (!validateChittyId(id)) return null
  const parts = id.split('-')
  return {
    version: parts[0],
    group: parts[1],
    location: parts[2],
    sequence: parts[3],
    tier: parts[4],
    yearMonth: parts[5],
    checksum: parts[6],
    suffix: parts[7]
  }
}

export function getChittyIdGroup(id: string): string | null {
  const parsed = parseChittyId(id)
  if (!parsed) return null
  const groups: Record<string, string> = {
    'U': 'user', 'S': 'service', 'D': 'device',
    'A': 'admin', 'O': 'organization', 'X': 'system'
  }
  return groups[parsed.group] || 'unknown'
}

export function isSystemChittyId(id: string): boolean {
  return parseChittyId(id)?.group === 'X'
}

export function extractChittyId(request: Request, body?: any): string | null {
  const header = request.headers.get('X-Chitty-ID')
  if (header && validateChittyId(header)) return header

  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    if (validateChittyId(token)) return token
  }

  if (body?.chittyId && validateChittyId(body.chittyId)) return body.chittyId
  return null
}

// ============================================================
// Context Factory
// ============================================================

export function createContext(
  chittyId: string,
  type: ContextType,
  options: Partial<ChittyContext> = {}
): ChittyContext {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  return {
    id,
    chittyId,
    type,
    status: 'active',
    grade: 'C',
    trustScore: 50,
    createdAt: now,
    updatedAt: now,
    depth: options.parentContextId ? (options.depth || 0) + 1 : 0,
    sessionId: options.sessionId || crypto.randomUUID(),
    requestId: options.requestId || crypto.randomUUID(),
    source: options.source || 'unknown',
    outcomes: [],
    ...options,
    rootContextId: options.rootContextId || (options.parentContextId ? undefined : id)
  }
}

export function createFromRequest(
  chittyId: string,
  request: Request,
  type: ContextType = 'session',
  options: Partial<ChittyContext> = {}
): ChittyContext {
  return createContext(chittyId, type, {
    sessionId: request.headers.get('X-Session-ID') || crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    source: 'api',
    userAgent: request.headers.get('User-Agent') || undefined,
    ipHash: hashIp(request.headers.get('CF-Connecting-IP')),
    ...options
  })
}

export function createChildContext(
  parent: ChittyContext,
  type: ContextType,
  options: Partial<ChittyContext> = {}
): ChittyContext {
  return createContext(parent.chittyId, type, {
    parentContextId: parent.id,
    rootContextId: parent.rootContextId || parent.id,
    sessionId: parent.sessionId,
    depth: parent.depth + 1,
    dnaFingerprint: parent.dnaFingerprint,
    preferences: parent.preferences,
    ...options
  })
}

// ============================================================
// Lifecycle Management
// ============================================================

export function recordOutcome(
  ctx: ChittyContext,
  outcome: Omit<ContextOutcome, 'id' | 'timestamp'>
): ChittyContext {
  const newOutcome: ContextOutcome = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...outcome
  }

  let newScore = Math.max(0, Math.min(100, ctx.trustScore + outcome.scoreImpact))
  const newGrade = calculateGrade(newScore)

  return {
    ...ctx,
    trustScore: newScore,
    grade: newGrade,
    updatedAt: new Date().toISOString(),
    outcomes: [...ctx.outcomes, newOutcome]
  }
}

export function calculateGrade(score: number): ContextGrade {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 50) return 'C'
  if (score >= 25) return 'D'
  return 'F'
}

export function promoteContext(ctx: ChittyContext, reason: string): ChittyContext {
  return recordOutcome(ctx, {
    type: 'success', action: 'promote', resource: ctx.id,
    details: { reason }, scoreImpact: 10
  })
}

export function demoteContext(ctx: ChittyContext, reason: string): ChittyContext {
  return recordOutcome(ctx, {
    type: 'warning', action: 'demote', resource: ctx.id,
    details: { reason }, scoreImpact: -10
  })
}

export function completeContext(ctx: ChittyContext, success: boolean): ChittyContext {
  return {
    ...recordOutcome(ctx, {
      type: success ? 'success' : 'error',
      action: 'complete', resource: ctx.id,
      scoreImpact: success ? 5 : -5
    }),
    status: success ? 'completed' : 'failed'
  }
}

// ============================================================
// Storage
// ============================================================

export async function saveContext(env: ContextEnv, ctx: ChittyContext): Promise<void> {
  await env.CHITTY_KV.put(`ctx:${ctx.id}`, JSON.stringify(ctx), { expirationTtl: 86400 * 30 })
  await env.CHITTY_KV.put(`ctx:chitty:${ctx.chittyId}:${ctx.id}`, ctx.id, { expirationTtl: 86400 * 30 })
  await env.CHITTY_KV.put(`ctx:type:${ctx.type}:${ctx.id}`, ctx.id, { expirationTtl: 86400 * 30 })
  await env.CHITTY_KV.put(`ctx:session:${ctx.sessionId}:${ctx.id}`, ctx.id, { expirationTtl: 86400 * 7 })

  if (ctx.status === 'active') {
    await env.CHITTY_KV.put(`ctx:active:${ctx.chittyId}:${ctx.id}`, ctx.id, { expirationTtl: 86400 })
  }

  if (env.CHITTY_TASKS) {
    await env.CHITTY_TASKS.send({ type: 'context.save', context: ctx })
  }
}

export async function loadContext(env: ContextEnv, contextId: string): Promise<ChittyContext | null> {
  const data = await env.CHITTY_KV.get(`ctx:${contextId}`)
  return data ? JSON.parse(data) : null
}

export async function listContexts(
  env: ContextEnv,
  chittyId: string,
  options: { type?: ContextType; status?: ContextStatus; limit?: number } = {}
): Promise<ChittyContext[]> {
  const prefix = options.type ? `ctx:type:${options.type}:` : `ctx:chitty:${chittyId}:`
  const list = await env.CHITTY_KV.list({ prefix, limit: options.limit || 50 })

  const contexts: ChittyContext[] = []
  for (const key of list.keys) {
    const contextId = await env.CHITTY_KV.get(key.name)
    if (contextId) {
      const ctx = await loadContext(env, contextId)
      if (ctx && ctx.chittyId === chittyId && (!options.status || ctx.status === options.status)) {
        contexts.push(ctx)
      }
    }
  }
  return contexts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getActiveContext(env: ContextEnv, chittyId: string, type: ContextType): Promise<ChittyContext | null> {
  const list = await env.CHITTY_KV.list({ prefix: `ctx:active:${chittyId}:`, limit: 10 })
  for (const key of list.keys) {
    const contextId = await env.CHITTY_KV.get(key.name)
    if (contextId) {
      const ctx = await loadContext(env, contextId)
      if (ctx?.type === type && ctx.status === 'active') return ctx
    }
  }
  return null
}

// ============================================================
// ChittyConnect Routing
// ============================================================

export interface ContextRouting {
  contextId: string
  chittyId: string
  type: ContextType
  grade: ContextGrade
  trustScore: number
  preferredService?: string
  fallbackServices?: string[]
  constraints?: Record<string, any>
}

export function getContextRouting(ctx: ChittyContext): ContextRouting {
  return {
    contextId: ctx.id,
    chittyId: ctx.chittyId,
    type: ctx.type,
    grade: ctx.grade,
    trustScore: ctx.trustScore,
    preferredService: ctx.grade === 'A' || ctx.grade === 'B' ? 'premium' : ctx.grade === 'F' ? 'restricted' : 'standard',
    constraints: ctx.preferences
  }
}

// ============================================================
// ChittyDNA Integration
// ============================================================

export interface DNAPattern {
  id: string
  chittyId: string
  patternType: string
  weight: number
  lastSeen: string
  occurrences: number
}

export async function linkDNAPattern(env: ContextEnv, ctx: ChittyContext, pattern: DNAPattern): Promise<ChittyContext> {
  await env.CHITTY_KV.put(`dna:ctx:${ctx.id}`, JSON.stringify(pattern), { expirationTtl: 86400 * 90 })
  return { ...ctx, dnaFingerprint: pattern.id, updatedAt: new Date().toISOString() }
}

export async function getDNAPattern(env: ContextEnv, contextId: string): Promise<DNAPattern | null> {
  const data = await env.CHITTY_KV.get(`dna:ctx:${contextId}`)
  return data ? JSON.parse(data) : null
}

// ============================================================
// Audit
// ============================================================

export interface AuditEvent {
  id: string
  contextId: string
  chittyId: string
  timestamp: string
  eventType: string
  action: string
  resource: string
  status: 'success' | 'error' | 'pending'
  details?: Record<string, any>
}

export function createAuditEvent(ctx: ChittyContext, eventType: string, action: string, resource: string, details?: Record<string, any>): AuditEvent {
  return {
    id: crypto.randomUUID(),
    contextId: ctx.id,
    chittyId: ctx.chittyId,
    timestamp: new Date().toISOString(),
    eventType, action, resource,
    status: 'success',
    details
  }
}

export async function logAudit(env: ContextEnv, event: AuditEvent): Promise<void> {
  await env.CHITTY_KV.put(`audit:${event.contextId}:${event.id}`, JSON.stringify(event), { expirationTtl: 86400 * 30 })
  if (env.CHITTY_TASKS) {
    await env.CHITTY_TASKS.send({ type: 'audit.event', event })
  }
}

// ============================================================
// Conversations
// ============================================================

export interface ConversationMessage {
  id: string
  contextId: string
  chittyId: string
  conversationId: string
  timestamp: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  provider?: string
  model?: string
  tokenCount?: number
  toolCalls?: { name: string; args: any; result?: any }[]
}

export async function storeMessage(
  env: ContextEnv,
  ctx: ConversationContext,
  message: Omit<ConversationMessage, 'id' | 'contextId' | 'chittyId' | 'conversationId' | 'timestamp'>
): Promise<ConversationMessage> {
  const stored: ConversationMessage = {
    id: crypto.randomUUID(),
    contextId: ctx.id,
    chittyId: ctx.chittyId,
    conversationId: ctx.conversationId,
    timestamp: new Date().toISOString(),
    ...message
  }
  await env.CHITTY_KV.put(`msg:${ctx.conversationId}:${stored.id}`, JSON.stringify(stored), { expirationTtl: 86400 * 90 })

  const indexKey = `msg:${ctx.conversationId}:index`
  const existing = await env.CHITTY_KV.get(indexKey)
  const ids = existing ? JSON.parse(existing) : []
  ids.push(stored.id)
  await env.CHITTY_KV.put(indexKey, JSON.stringify(ids), { expirationTtl: 86400 * 90 })

  return stored
}

export async function getMessages(env: ContextEnv, conversationId: string, limit = 50): Promise<ConversationMessage[]> {
  const indexKey = `msg:${conversationId}:index`
  const existing = await env.CHITTY_KV.get(indexKey)
  if (!existing) return []

  const ids: string[] = JSON.parse(existing)
  const messages: ConversationMessage[] = []
  for (const id of ids.slice(-limit)) {
    const msg = await env.CHITTY_KV.get(`msg:${conversationId}:${id}`)
    if (msg) messages.push(JSON.parse(msg))
  }
  return messages
}

// ============================================================
// Utilities
// ============================================================

function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined
  return btoa(ip).slice(0, 12)
}
