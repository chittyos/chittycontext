# ChittyContext Cloudflare Queues Architecture

## ChittyCanon Queue Design

Following ChittyOS canonical structure, queues are namespaced per-context and follow the pattern:
```
{service}-{operation}-{context}
```

All queues are created in the context's configured Cloudflare account, ensuring proper isolation and access control.

## Standard Queues

### 1. Secret Distribution Queue
**Name**: `chittycontext-secret-distribution-{context}`
**Purpose**: Async distribution of secrets to multiple services
**Consumer**: Worker that processes secret distribution jobs
**Binding**: `CHITTYCONTEXT_SECRET_DISTRIBUTION`

**Message Format**:
```json
{
  "contextName": "work",
  "operation": "distribute_secrets",
  "services": ["cloudflare", "github", "neon"],
  "secrets": [
    {
      "service": "cloudflare",
      "worker": "chittyos-platform-prod",
      "secretName": "API_TOKEN",
      "vaultItem": "my-cf-token",
      "vaultField": "token"
    }
  ],
  "timestamp": "2025-10-12T14:45:00Z",
  "userId": "chittyid-peo-..."
}
```

### 2. Registry Sync Queue
**Name**: `chittycontext-registry-sync-{context}`
**Purpose**: Periodic sync with ChittyRegistry
**Consumer**: Worker that syncs service configurations
**Binding**: `CHITTYCONTEXT_REGISTRY_SYNC`

**Message Format**:
```json
{
  "operation": "sync_registry",
  "services": ["chittyauth", "chittygov"],
  "contextName": "work",
  "timestamp": "2025-10-12T14:45:00Z"
}
```

### 3. Vault Operations Queue
**Name**: `chittycontext-vault-ops-{context}`
**Purpose**: Handle 1Password vault operations
**Consumer**: Worker for vault creation, secret storage, rotation
**Binding**: `CHITTYCONTEXT_VAULT_OPS`

**Message Format**:
```json
{
  "operation": "create_vault|store_secret|rotate_secret",
  "vaultName": "ChittyContext-work",
  "itemName": "my-secret",
  "data": {
    "account_id": "...",
    "token": "..."
  },
  "timestamp": "2025-10-12T14:45:00Z"
}
```

### 4. Context Operations Queue
**Name**: `chittycontext-context-ops-{context}`
**Purpose**: Handle context switching and configuration updates
**Consumer**: Worker for context management
**Binding**: `CHITTYCONTEXT_CONTEXT_OPS`

**Message Format**:
```json
{
  "operation": "switch_context|update_config",
  "contextName": "work",
  "changes": {},
  "timestamp": "2025-10-12T14:45:00Z"
}
```

### 5. ChittyChain Blockchain Queue
**Name**: `chittychain-blockchain-queue-{context}`
**Purpose**: Async blockchain minting and ChittyChain storage
**Consumer**: Blockchain queue consumer in ChittyRouter
**Binding**: `BLOCKCHAIN_QUEUE`

**Message Format**:
```json
{
  "chittyId": "CHITTY-EVNT-00001-A1B2",
  "priority": "high|medium|low",
  "timestamp": "2025-10-12T14:45:00Z",
  "probability": 0.99,
  "operation": "mint|verify|store",
  "metadata": {
    "entityType": "EVNT",
    "contextName": "work"
  }
}
```

## Queue Creation Commands

```bash
# Standard queues
ctx queues create --context work

# With blockchain queue
ctx queues create --context work --blockchain

# With custom queues
ctx queues create --context work --custom "queue1,queue2"

# Legacy wrangler commands (not recommended)
# Secret Distribution Queue
wrangler queues create chittycontext-secret-distribution-work

# Registry Sync Queue
wrangler queues create chittycontext-registry-sync-work

# Vault Operations Queue
wrangler queues create chittycontext-vault-ops-work

# Context Operations Queue
wrangler queues create chittycontext-context-ops-work

# Blockchain Queue
wrangler queues create chittychain-blockchain-queue-work
```

## Wrangler.toml Bindings

Generate bindings for your wrangler.toml:

```bash
ctx queues bindings --context work
```

Output:
```toml
[[queues.consumers]]
queue = "chittycontext-secret-distribution-work"
max_batch_size = 10
max_batch_timeout = 30

[[queues.consumers]]
queue = "chittychain-blockchain-queue-work"
max_batch_size = 10
max_batch_timeout = 30

[[queues.producers]]
binding = "BLOCKCHAIN_QUEUE"
queue = "chittychain-blockchain-queue-work"
```

## API Endpoint (Future)

Planned API endpoint for queue management:
```
POST https://context.chitty.cc/api/queue/create
Authorization: Bearer {CHITTY_ID_TOKEN}

{
  "contextName": "work",
  "options": {
    "blockchain": true,
    "custom": ["custom-queue-1"]
  }
}
```

This will enable programmatic queue creation with proper ChittyID authentication.

## Integration with ChittyContext

The CLI will send messages to these queues instead of blocking on operations:

```javascript
// Instead of awaiting distribution
await secretsManager.distributeToCloudflare(...)

// Queue the operation
await queueClient.send('chittycontext-secret-distribution', {
  operation: 'distribute_secrets',
  contextName: currentContext,
  secrets: [...],
});

console.log('✅ Queued secret distribution job');
```

## Benefits

1. **Non-blocking CLI** - Commands return immediately
2. **Retry logic** - Failed operations automatically retry
3. **Rate limiting** - Avoid hitting API limits
4. **Audit trail** - All operations logged
5. **Scalability** - Handle batch operations efficiently
