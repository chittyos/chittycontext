# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ChittyContext** is a universal multi-account and persona management CLI tool for the ChittyOS ecosystem. It enables seamless context switching across multiple platforms (Cloudflare, GitHub, Google, Notion, Neon, 1Password, AI services) for developers working with multiple accounts, organizations, and workflows.

**Location**: `/Users/nb/.claude/projects/-/CHITTYOS/chittyos-core/tools/chittycontext`

## Commands

### Development Setup
```bash
# Install dependencies
npm install

# Global installation (creates 'chittycontext' and 'ctx' commands)
npm link

# Run tests
npm test
```

### Usage Commands
```bash
# Initialize configuration (also registers with ChittyRegistry)
chittycontext init
# or
ctx init

# Create contexts
chittycontext create work
chittycontext create personal
chittycontext create litigation --from work

# Switch contexts
chittycontext use work

# Show current status
chittycontext status

# List all contexts
chittycontext list

# ChittyRegistry integration
chittycontext registry sync                    # Sync with ChittyRegistry
chittycontext registry discover                # Discover available services
chittycontext registry pull chittyauth         # Pull service configuration
chittycontext registry register                # Manual registration

# Cloudflare account management
chittycontext cf add chittyos --account-id <id> --token <token>
chittycontext cf add chittyos --account-id <id> --token-from-1password "op://..."
chittycontext cf use chittyos
chittycontext cf list

# GitHub account management
chittycontext gh add chittycorp --token <token>
chittycontext gh add chittycorp --token-from-1password "op://..."
chittycontext gh use chittycorp

# Google identity management
chittycontext google add nb@chittycorp.com --credentials ~/path/to/creds.json
chittycontext google use nb@chittycorp.com

# Export environment variables
eval $(chittycontext env)              # Bash/Zsh
chittycontext env --shell fish | source # Fish shell
```

## Architecture

### Core Components

**`bin/chittycontext.js`** - CLI entry point
- Uses `commander` for command-line parsing
- Provides both `chittycontext` and `ctx` aliases
- Handles all user-facing commands and error reporting

**`lib/context-manager.js`** - Core business logic
- Manages contexts and account configurations
- Uses `conf` package for persistent storage at `~/.config/chittycontext/config.json`
- Handles 1Password CLI integration for secure secret fetching
- Generates environment variables for active context

**`lib/display.js`** - Display utilities
- Status formatting with `chalk` for colored output
- Context and account list formatting
- Service-specific display logic with icons

### Configuration Schema

Configuration stored at: `~/.config/chittycontext/config.json`

```json
{
  "current": "work",
  "contexts": {
    "work": {
      "cloudflare": "chittyos",
      "github": "chittycorp",
      "google": "nb@chittycorp.com",
      "notion": null,
      "neon": "chittyos-prod"
    }
  },
  "accounts": {
    "cloudflare": {
      "chittyos": {
        "account_id": "0bc21e3a...",
        "token": "...",
        "token_source": "1password:op://..."
      }
    },
    "github": {...},
    "google": {...}
  }
}
```

### Environment Variable Mapping

When switching contexts, ChittyContext exports environment variables:

- **Cloudflare**: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`
- **GitHub**: `GITHUB_TOKEN`
- **Google**: `GOOGLE_APPLICATION_CREDENTIALS`
- **Neon**: `DATABASE_URL`, `NEON_DATABASE_URL`

## Key Design Patterns

### 1Password Integration
- Tokens can be stored in 1Password and referenced with `op://vault/item/field` syntax
- Uses `op read` command from 1Password CLI to fetch secrets at runtime
- Token sources are tracked in config (`1password:...` or `direct`)

### Context Switching
- Each context is a named collection of service account mappings
- Switching context updates the `current` pointer in config
- Environment variables are generated based on current context
- Contexts can be cloned using `--from` flag

### Multi-Service Support
Currently supports:
- Cloudflare (account ID + API token)
- GitHub (personal access token)
- Google (OAuth credentials path)
- Notion (workspace)
- Neon (database connection string)
- 1Password (vault)
- AI services (OpenAI, Anthropic)

## Integration with ChittyOS

### Wrangler Integration
ChittyContext exports `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` which Wrangler automatically detects:

```bash
chittycontext use work
eval $(chittycontext env)
wrangler whoami          # Uses work account
wrangler deploy          # Deploys to work account
```

### Shell Integration
Add to `~/.zshrc`:
```bash
# Auto-load context on shell start
eval $(chittycontext env 2>/dev/null || true)

# Aliases
alias ctx='chittycontext'
alias ctx-work='chittycontext use work && eval $(chittycontext env)'
alias ctx-personal='chittycontext use personal && eval $(chittycontext env)'
```

## Dependencies

- **commander** (^11.0.0) - CLI framework
- **chalk** (^5.3.0) - Terminal styling
- **inquirer** (^9.2.0) - Interactive prompts (currently unused)
- **conf** (^12.0.0) - Configuration management
- **dotenv** (^16.0.0) - Environment variable loading

## ChittyRegistry Integration

ChittyContext automatically registers itself with ChittyRegistry on `init` and provides service discovery capabilities.

### Features
- **Auto-registration**: Registers as `cli-tool` service type during initialization
- **Service discovery**: Query ChittyRegistry for available services
- **Configuration pull**: Retrieve service endpoints and capabilities
- **Environment export**: Include service URLs in environment variables

### Commands
```bash
# Discover all available ChittyOS services
ctx registry discover

# Pull specific service configuration
ctx registry pull chittyauth       # Authentication service
ctx registry pull chittygov        # Governance/compliance service

# Sync registration status
ctx registry sync

# Manual re-registration
ctx registry register

# Export env vars including service endpoints
ctx env-services
```

### Governance Integration (ChittyGov)

When integrated with ChittyGov, ChittyContext provides governance-aware context management:

**Business Entity Association**:
- Map contexts to business entities (ChittyCorp LLC, personal, etc.)
- Service approval status per context
- Compliance requirements enforcement

**Use Cases**:
```bash
# Litigation context - only approved services
ctx create litigation
ctx registry pull chittygov
ctx use litigation

# Corporate context - ChittyCorp LLC services only
ctx create chittycorp
ctx cf use chittyos-prod
ctx gh use chittycorp

# Personal context - separate from corporate
ctx create personal
ctx cf use personal-account
```

### Environment Variable Mapping

Service configurations pulled from ChittyRegistry are automatically exported:

```bash
# Standard context env vars
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
GITHUB_TOKEN=...

# Service discovery env vars (from registry)
CHITTYAUTH_URL=https://auth.chitty.cc
CHITTYAUTH_API_ENDPOINT=https://auth.chitty.cc/api
CHITTYGOV_URL=https://gov.chitty.cc
CHITTYREGISTRY_URL=https://registry.chitty.cc
```

## ChittyID Compliance

- All ChittyRegistry operations require valid `CHITTY_ID_TOKEN`
- Token must be set in `.env` file
- Environment variables: `CHITTY_ID_TOKEN`, `CHITTY_ID_SERVICE`, `REGISTRY_SERVICE`
- `.env` is gitignored for security

## Common Workflows

### Multi-Account Cloudflare Development
```bash
# Work on ChittyOS production services
ctx use work
wrangler deploy --env production

# Switch to personal projects
ctx use personal
wrangler deploy
```

### Legal Case Context
```bash
# Create litigation-specific context
ctx create litigation
ctx use litigation
ctx cf use chittyos-legal
ctx google use legal@chittycorp.com
```

## Testing Strategy

Tests are located in `lib/*.test.js` and can be run with:
```bash
npm test  # Uses Node.js built-in test runner
```

Expected test coverage areas:
- Context creation, switching, and deletion
- Account management (add, use, list)
- Environment variable generation
- 1Password integration
- Error handling

## Security Considerations

- Config file at `~/.config/chittycontext/config.json` should have restrictive permissions
- Tokens stored in config file (not ideal - prefer 1Password integration)
- Full tokens are never displayed in output (only truncated previews)
- 1Password CLI integration recommended for production use

## Known Issues & TODOs

From `TODO.md`:
1. `inquirer` dependency is imported but unused (consider removing or implementing interactive prompts)
2. Config file permissions (mode 600) are not enforced programmatically
3. No validation for 1Password CLI availability before attempting `op read`
4. Limited error handling for corrupt config.json
5. Environment export tested only in bash/zsh (fish support exists but untested)

## ChittyID Integration

ChittyContext respects ChittyOS compliance requirements:
- Uses `.env` for ChittyID service configuration (`CHITTY_ID_TOKEN`, `CHITTYID_SERVICE_URL`)
- `.env` is gitignored
- `.env.example` provides template for required variables
