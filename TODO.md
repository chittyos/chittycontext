# ChittyContext TODO - Completion Tasks

**Status**: Functional prototype → Production-ready
**Estimated Time**: 30-45 minutes
**Branch**: `feature/chittycontext-manager`

---

## Critical Path (Required for "Complete")

### 1. Install & Test Dependencies ⏱️ 5min
```bash
cd /Users/nb/.claude/projects/-/CHITTYOS/chittyos-core/tools/chittycontext
npm install
```

**Verify**:
- `commander` installed and working
- `chalk` installed and working
- `conf` installed and working
- `inquirer` installed (or remove if unused)

### 2. Basic Smoke Tests ⏱️ 10min
```bash
# Initialize
./bin/chittycontext.js init

# Create context
./bin/chittycontext.js create work

# List contexts
./bin/chittycontext.js list

# Show status
./bin/chittycontext.js status
```

**Fix any runtime errors discovered**

### 3. Cloudflare Integration Test ⏱️ 10min
```bash
# Add account (without 1Password first)
./bin/chittycontext.js cf add test \
  --account-id 0bc21e3a5a9de1a4cc843be9c3e98121 \
  --token dummy-token-for-testing

# List accounts
./bin/chittycontext.js cf list

# Switch account
./bin/chittycontext.js cf use test

# Check status shows correct account
./bin/chittycontext.js status
```

### 4. Environment Export Test ⏱️ 5min
```bash
# Export env vars
./bin/chittycontext.js env

# Verify output format
# Should see: export CLOUDFLARE_ACCOUNT_ID="..."

# Test in subshell
(eval $(./bin/chittycontext.js env) && echo $CLOUDFLARE_ACCOUNT_ID)
```

### 5. 1Password Integration Test ⏱️ 10min
```bash
# Ensure op CLI works
op whoami

# Test fetch from 1Password
op read "op://ChittyOS/Cloudflare ChittyOS/token"

# Add account with 1Password
./bin/chittycontext.js cf add chittyos \
  --account-id 0bc21e3a5a9de1a4cc843be9c3e98121 \
  --token-from-1password "op://ChittyOS/Cloudflare ChittyOS/token"
```

**Fix error handling if 1Password fails**

---

## Code Quality Improvements (Optional but Recommended)

### Error Handling
- [ ] Add try/catch for missing `op` CLI
- [ ] Validate 1Password item format before fetch
- [ ] Better error messages for missing config
- [ ] Handle corrupt config.json gracefully

### Cleanup
- [ ] Remove `inquirer` from package.json if unused
- [ ] OR implement interactive prompts for `chittycontext init`
- [ ] Add input validation (account names, tokens)
- [ ] Enforce config file permissions (chmod 600)

### Documentation
- [ ] Add examples of actual working commands
- [ ] Document tested vs untested features
- [ ] Add troubleshooting section with real errors

---

## Installation Verification

### Global Installation
```bash
cd /Users/nb/.claude/projects/-/CHITTYOS/chittyos-core/tools/chittycontext
npm link

# Verify global command works
chittycontext --version
ctx --version  # Test alias
```

### Shell Integration
```bash
# Add to ~/.zshrc
echo 'eval $(chittycontext env 2>/dev/null || true)' >> ~/.zshrc
source ~/.zshrc
```

---

## Known Issues (From Bullshit Audit)

1. **No runtime testing** - Code written but not executed
2. **Dependencies not installed** - npm install not run yet
3. **inquirer imported but unused** - Remove or implement
4. **No 1Password validation** - op read can fail silently
5. **Config permissions not enforced** - Claimed 600, not set
6. **Environment export untested** - May not work in all shells

---

## Success Criteria

✅ All commands run without errors
✅ Config file created at `~/.config/chittycontext/config.json`
✅ Context switching works
✅ Environment export produces valid shell commands
✅ 1Password integration fetches tokens
✅ Global install via `npm link` works
✅ README examples actually work

---

## Files Modified/Created

**Core Files**:
- `bin/chittycontext.js` - CLI entry point
- `lib/context-manager.js` - Core logic
- `lib/display.js` - Display utilities
- `package.json` - Dependencies
- `README.md` - Documentation
- `TODO.md` - This file

**Config Location**: `~/.config/chittycontext/config.json`

---

## Quick Start for New Session

```bash
# Navigate to project
cd /Users/nb/.claude/projects/-/CHITTYOS/chittyos-core/tools/chittycontext

# Ensure on correct branch
git branch --show-current  # Should be: feature/chittycontext-manager

# Install dependencies
npm install

# Run first test
./bin/chittycontext.js init

# If that works, proceed with smoke tests above
```

---

## Bullshit Score Targets

**Current**: 35/100 (functional prototype)
**After Completion**: ≤15/100 (production-ready)

**Reduction Plan**:
- Install deps: -10 points
- Smoke tests pass: -5 points
- Environment export works: -3 points
- 1Password integration tested: -2 points

---

## Integration with Main Task

**Context**: This is a side quest from blockchain queue consumer work.

**Main Task Status**:
- ✅ Blockchain queue consumer implemented
- ✅ Wrangler.toml configured
- ⚠️ Needs testing + queue creation (requires working Cloudflare auth)

**Why ChittyContext Helps**:
- Solves Cloudflare multi-account auth issues
- Enables queue creation with correct account
- Provides foundation for all multi-account scenarios

**Next After ChittyContext Complete**:
1. Use ChittyContext to fix Cloudflare auth
2. Create blockchain-queue via wrangler
3. Test blockchain queue consumer end-to-end
