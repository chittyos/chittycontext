# ChittyContext - Universal Account & Persona Manager

**Manage multiple accounts and switch contexts across Cloudflare, GitHub, Google, and more.**

## Quick Start

```bash
# Install
cd /Users/nb/.claude/projects/-/CHITTYOS/chittyos-core/tools/chittycontext
npm install
npm link

# Initialize
chittycontext init

# Create work context
chittycontext create work

# Add Cloudflare account
chittycontext cf add chittyos \
  --account-id 0bc21e3a5a9de1a4cc843be9c3e98121 \
  --token-from-1password "op://ChittyOS/cloudflare-chittyos/token"

# Switch context
chittycontext use work

# Check status
chittycontext status
```

## Features

### Multi-Platform Support
- **Cloudflare**: Multiple accounts with API tokens
- **GitHub**: Organizations and personal accounts
- **Google**: Multiple workspace identities
- **Notion**: Workspace switching
- **Neon**: Database project management
- **1Password**: Vault integration
- **AI Services**: OpenAI, Anthropic API keys

### Context Switching
```bash
# Create contexts for different workflows
chittycontext create work
chittycontext create personal
chittycontext create litigation

# Switch between them
chittycontext use work          # All accounts switch to work
chittycontext use personal      # All accounts switch to personal
```

### Service-Specific Management
```bash
# Cloudflare
chittycontext cf add chittyos --account-id XXX --token YYY
chittycontext cf use chittyos
chittycontext cf list

# GitHub
chittycontext gh add chittycorp --token-from-1password "op://..."
chittycontext gh use chittycorp

# Google
chittycontext google add nb@chittycorp.com --credentials ~/creds.json
chittycontext google use nb@chittycorp.com
```

### Environment Export
```bash
# Export env vars for current context
eval $(chittycontext env)

# Fish shell
chittycontext env --shell fish | source

# See what would be exported
chittycontext env --shell bash
```

## Configuration

Config stored in: `~/.config/chittycontext/config.json`

```json
{
  "current": "work",
  "contexts": {
    "work": {
      "cloudflare": "chittyos",
      "github": "chittycorp",
      "google": "nb@chittycorp.com",
      "neon": "chittyos-prod"
    },
    "personal": {
      "cloudflare": "personal",
      "github": "personal",
      "google": "personal@gmail.com"
    }
  },
  "accounts": {
    "cloudflare": {
      "chittyos": {
        "account_id": "0bc21e...",
        "token": "...",
        "token_source": "1password:..."
      }
    },
    "github": {...},
    "google": {...}
  }
}
```

## Commands

### Context Management
```bash
chittycontext use <context>              # Switch context
chittycontext status                     # Show current status
chittycontext list                       # List all contexts
chittycontext create <name>              # Create context
chittycontext create <name> --from work  # Clone context
chittycontext delete <name>              # Delete context
```

### Cloudflare
```bash
chittycontext cf add <name> --account-id <id> --token <token>
chittycontext cf add <name> --token-from-1password "op://..."
chittycontext cf use <account>
chittycontext cf list
```

### GitHub
```bash
chittycontext gh add <name> --token <token>
chittycontext gh add <name> --token-from-1password "op://..."
chittycontext gh use <account>
```

### Google
```bash
chittycontext google add <email> --credentials <path>
chittycontext google use <email>
```

### Environment
```bash
chittycontext env                     # Bash/Zsh
chittycontext env --shell fish        # Fish shell
eval $(chittycontext env)            # Apply to current shell
```

## Integration with ChittyOS

### Wrangler Integration
```bash
# Switch to ChittyOS account
chittycontext use work

# Wrangler now uses correct account
wrangler whoami
wrangler queues list
wrangler deploy
```

### Shell Integration
Add to `~/.zshrc`:
```bash
# Load ChittyContext for current shell
eval $(chittycontext env 2>/dev/null || true)

# Alias for quick switching
alias ctx='chittycontext'
alias ctx-work='chittycontext use work && eval $(chittycontext env)'
alias ctx-personal='chittycontext use personal && eval $(chittycontext env)'
```

## 1Password Integration

ChittyContext integrates with 1Password CLI to fetch secrets securely:

```bash
# Store token in 1Password first
op item create --category=Login \
  --title="Cloudflare ChittyOS" \
  --vault="ChittyOS" \
  token=<your-token>

# Add account with 1Password reference
chittycontext cf add chittyos \
  --account-id 0bc21e3a5a9de1a4cc843be9c3e98121 \
  --token-from-1password "op://ChittyOS/Cloudflare ChittyOS/token"
```

## Use Cases

### Multi-Account Cloudflare Development
```bash
# Work on ChittyOS services
chittycontext use work
wrangler deploy --env production

# Switch to personal projects
chittycontext use personal
wrangler deploy
```

### Legal Case Management
```bash
# Create litigation-specific context
chittycontext create litigation
chittycontext use litigation

# Configure for case work
chittycontext cf use chittyos-legal
chittycontext google use legal@chittycorp.com
chittycontext neon use litigation-db
```

### Team Collaboration
```bash
# Share context definitions (not secrets)
chittycontext create team-shared
# Team members add their own credentials
chittycontext cf add shared-account --token-from-1password "..."
```

## Aliases

Short alias available: `ctx`

```bash
ctx use work
ctx status
ctx cf list
```

## Security

- Tokens stored in `~/.config/chittycontext/config.json` (mode 600)
- Supports 1Password CLI for secret management
- Never logs or displays full tokens
- Config file excluded from git by default

## Troubleshooting

### Token not applied
```bash
# Check current context
chittycontext status

# Ensure environment is loaded
eval $(chittycontext env)

# Verify Cloudflare auth
wrangler whoami
```

### 1Password fetch fails
```bash
# Ensure 1Password CLI is installed
op --version

# Sign in to 1Password
op signin

# Test fetch
op read "op://ChittyOS/item/field"
```

## License

MIT - ChittyOS Project
