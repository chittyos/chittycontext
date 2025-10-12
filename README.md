# ChittyContext

> Universal multi-account and persona management for developers working with multiple cloud services, organizations, and workflows.

[![npm version](https://badge.fury.io/js/@chittyos%2Fcontext.svg)](https://www.npmjs.com/package/@chittyos/context)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

🔐 **Secrets Management**
- Create and manage 1Password vaults per context
- Store secrets securely in 1Password
- Automatically distribute secrets to:
  - Cloudflare Workers (via `wrangler secret put`)
  - GitHub repositories (via `gh secret set`)
  - Neon projects
- Rotate secrets with automatic distribution
- Sync all secrets with one command

☁️ **Multi-Account Management**
- **Cloudflare**: Multiple accounts with seamless switching
- **GitHub**: Organizations and personal accounts
- **Google**: Multiple workspace identities
- **Notion**: Workspace switching
- **Neon**: Database project management
- **AI Services**: OpenAI, Anthropic API keys

🔄 **Context Switching**
- Create named contexts (work, personal, litigation, etc.)
- Switch between contexts instantly
- Clone contexts to create variations
- Each context maintains its own account mappings

🌐 **ChittyOS Integration**
- Auto-registers with ChittyRegistry
- Service discovery from registry
- Pull service configurations automatically
- Governance integration (ChittyGov)

## Installation

### Global Installation (Recommended)

```bash
npm install -g @chittyos/context
```

### Local Installation

```bash
npm install @chittyos/context
```

## Quick Start

```bash
# Initialize
chittycontext init

# Create a work context
chittycontext create work

# Add Cloudflare account
chittycontext cf add chittyos \
  --account-id your-account-id \
  --token-from-1password "op://ChittyOS/Cloudflare/token"

# Switch to work context
chittycontext use work

# Export environment variables
eval $(chittycontext env)

# Verify
wrangler whoami
```

## Commands

### Context Management

```bash
chittycontext init                       # Initialize configuration
chittycontext create <name>              # Create new context
chittycontext create <name> --from work  # Clone from existing
chittycontext use <context>              # Switch context
chittycontext list                       # List all contexts
chittycontext status                     # Show current status
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

### Secrets & Vault Management

```bash
# Create vault for context
chittycontext vault create work

# List all vaults
chittycontext vault list

# Store secret in 1Password
chittycontext vault store ChittyContext-work my-cf-token \
  --cloudflare-account-id abc123 \
  --cloudflare-token mytoken

# Configure secret distribution
chittycontext secrets configure work cloudflare \
  --worker chittyos-platform-prod \
  --secret-name API_TOKEN \
  --vault-item my-cf-token \
  --vault-field token

# Sync all secrets to services
chittycontext secrets sync work
```

### ChittyRegistry Integration

```bash
chittycontext registry sync              # Check registration
chittycontext registry discover          # Discover services
chittycontext registry pull chittyauth   # Pull service config
chittycontext env-services               # Export with service URLs
```

### Environment Export

```bash
# Bash/Zsh
eval $(chittycontext env)

# Fish
chittycontext env --shell fish | source

# See what would be exported
chittycontext env
```

## Use Cases

### Multi-Account Cloudflare Development

```bash
# Work on ChittyOS production
ctx use work
wrangler deploy --env production

# Switch to personal projects
ctx use personal
wrangler deploy
```

### Legal Case Management

```bash
# Create litigation context
ctx create litigation
ctx use litigation
ctx cf use chittyos-legal
ctx google use legal@chittycorp.com

# All commands now use litigation accounts
```

### Secret Rotation

```bash
# Update token in 1Password, then sync
ctx secrets sync work

# Distributes to:
# - Cloudflare Workers
# - GitHub repositories
# - Neon projects
```

### Team Collaboration

```bash
# Share context structure (not secrets)
ctx create team-shared

# Each team member adds their own credentials
ctx cf add shared-account --token-from-1password "op://..."
```

## Configuration

Configuration stored in: `~/.config/chittycontext/config.json`

```json
{
  "current": "work",
  "contexts": {
    "work": {
      "cloudflare": "chittyos",
      "github": "chittycorp",
      "google": "nb@chittycorp.com"
    }
  },
  "accounts": {
    "cloudflare": {
      "chittyos": {
        "account_id": "abc123...",
        "token": "...",
        "token_source": "1password:op://..."
      }
    }
  },
  "secrets": {
    "work": {
      "cloudflare": [
        {
          "worker": "chittyos-platform-prod",
          "name": "API_TOKEN",
          "item": "my-cf-token",
          "field": "token"
        }
      ]
    }
  }
}
```

## Shell Integration

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# Auto-load context on shell start
eval $(chittycontext env 2>/dev/null || true)

# Aliases
alias ctx='chittycontext'
alias ctx-work='chittycontext use work && eval $(chittycontext env)'
alias ctx-personal='chittycontext use personal && eval $(chittycontext env)'
```

## Requirements

- **Node.js**: >= 18.0.0
- **1Password CLI**: Required for vault management ([Install](https://developer.1password.com/docs/cli/get-started/))
- **Wrangler**: Optional, for Cloudflare secret distribution
- **GitHub CLI**: Optional, for GitHub secret distribution

## Security

- Tokens stored in `~/.config/chittycontext/config.json` (mode 600)
- 1Password CLI integration for secure secret management
- Never logs or displays full tokens
- Config file excluded from git by default
- ChittyRegistry operations require valid `CHITTY_ID_TOKEN`

## Environment Variables

```bash
# Required for ChittyRegistry integration
CHITTY_ID_TOKEN=your_token_here
CHITTY_ID_SERVICE=https://id.chitty.cc
REGISTRY_SERVICE=https://registry.chitty.cc
```

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

### Secret distribution fails

```bash
# Check wrangler is configured
wrangler whoami

# Check GitHub CLI
gh auth status

# Verify 1Password connectivity
op vault list
```

## Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## License

MIT © ChittyOS

## Links

- [GitHub Repository](https://github.com/chittyos/context)
- [npm Package](https://www.npmjs.com/package/@chittyos/context)
- [ChittyOS Platform](https://chitty.cc)
- [Documentation](https://docs.chitty.cc)
- [Issues](https://github.com/chittyos/context/issues)

## Alias

Short alias available: `ctx`

```bash
ctx use work
ctx status
ctx cf list
```

---

**Built with ❤️ for the ChittyOS ecosystem**
