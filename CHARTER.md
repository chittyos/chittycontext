# ChittyContext Charter

## Classification
- **Tier**: 3 (Service Layer)
- **Organization**: CHITTYOS
- **Domain**: N/A (CLI tool)

## Mission

ChittyContext is a **universal multi-account and persona management CLI tool** for the ChittyOS ecosystem. It enables seamless context switching across multiple platforms (Cloudflare, GitHub, Google, Notion, Neon, 1Password, AI services) for developers working with multiple accounts, organizations, and workflows.

## Scope

### IS Responsible For
- Context creation, switching, and management
- Multi-platform account management (Cloudflare, GitHub, Google, Notion, Neon)
- 1Password CLI integration for secure secret fetching
- Environment variable generation and export
- ChittyRegistry service discovery and sync
- Persona-based workflow isolation (work, personal, litigation contexts)
- Shell integration (bash, zsh, fish)

### IS NOT Responsible For
- Identity generation (ChittyID)
- Token provisioning (ChittyAuth)
- Service registration (ChittyRegister)
- Credential storage (delegates to 1Password)
- Account creation (manages existing accounts)

## Configuration

### Storage Location
`~/.config/chittycontext/config.json`

### Schema
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
    "cloudflare": { "chittyos": { "account_id": "...", "token": "..." } },
    "github": { ... }
  }
}
```

## Environment Variable Exports

| Platform | Variables |
|----------|-----------|
| Cloudflare | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` |
| GitHub | `GITHUB_TOKEN` |
| Google | `GOOGLE_APPLICATION_CREDENTIALS` |
| Neon | `DATABASE_URL`, `NEON_DATABASE_URL` |
| ChittyOS | `CHITTYAUTH_URL`, `CHITTYREGISTRY_URL` |

## CLI Commands

| Command | Purpose |
|---------|---------|
| `ctx init` | Initialize configuration |
| `ctx create <name>` | Create new context |
| `ctx use <name>` | Switch to context |
| `ctx list` | List all contexts |
| `ctx status` | Show current status |
| `ctx env` | Export environment variables |
| `ctx registry discover` | Discover ChittyOS services |
| `ctx cf/gh/google add` | Add platform accounts |

## Dependencies

| Type | Service | Purpose |
|------|---------|---------|
| Upstream | ChittyRegistry | Service discovery |
| External | 1Password CLI | Secure secret fetching |
| External | Cloudflare API | Account management |
| External | GitHub API | Token management |
| External | Google OAuth | Credential paths |
| Storage | conf package | Local config storage |

## Ownership

| Role | Owner |
|------|-------|
| Service Owner | ChittyOS |
| Technical Lead | @chittyos-infrastructure |
| Contact | tools@chitty.cc |

## Compliance

- [ ] CLAUDE.md development guide present
- [ ] ChittyRegistry integration active
- [ ] 1Password CLI integration tested
- [ ] Shell integration documented
- [ ] Config file permissions enforced (mode 600)

---
*Charter Version: 1.0.0 | Last Updated: 2026-01-13*
