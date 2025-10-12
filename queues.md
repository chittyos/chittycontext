# ChittyContext Cloudflare Queues Architecture

## Queue Design

### 1. Secret Distribution Queue
**Name**: `chittycontext-secret-distribution`
**Purpose**: Async distribution of secrets to multiple services
**Consumer**: Worker that processes secret distribution jobs

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
**Name**: `chittycontext-registry-sync`
**Purpose**: Periodic sync with ChittyRegistry
**Consumer**: Worker that syncs service configurations

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
**Name**: `chittycontext-vault-ops`
**Purpose**: Handle 1Password vault operations
**Consumer**: Worker for vault creation, secret storage, rotation

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
**Name**: `chittycontext-context-ops`
**Purpose**: Handle context switching and configuration updates
**Consumer**: Worker for context management

**Message Format**:
```json
{
  "operation": "switch_context|update_config",
  "contextName": "work",
  "changes": {},
  "timestamp": "2025-10-12T14:45:00Z"
}
```

## Queue Creation Commands

```bash
# Secret Distribution Queue
wrangler queues create chittycontext-secret-distribution

# Registry Sync Queue
wrangler queues create chittycontext-registry-sync

# Vault Operations Queue
wrangler queues create chittycontext-vault-ops

# Context Operations Queue
wrangler queues create chittycontext-context-ops
```

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
