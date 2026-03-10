---
name: Flake Lock Recovery
description: Systematic recovery and repair of flake.lock files in nixos-unified + flake-parts architectures with complex input following and dependency chains
when_to_use: when flake.lock is corrupted, inconsistent, or when encountering lock file conflicts during nix flake update
version: 1.0.0
languages: nix,bash,json
helpers:
  - scripts/recover-lock.sh
  - scripts/validate-lock.sh
---

# Flake Lock Recovery

## Overview

Systematic recovery and repair of flake.lock files in nixos-unified + flake-parts architectures. Handles complex input following, dependency chain conflicts, and corruption scenarios with validation-first recovery strategies.

**Core principle:** Lock files are critical infrastructure - recover systematically, never delete blindly.

**Announce at start:** "I'm using the Flake Lock Recovery skill to systematically repair the lock file."

## When to Use

**Lock File Issues Covered:**

- Corrupted or malformed flake.lock files
- Version conflicts between inputs
- Missing or unreachable input sources
- Circular dependency issues in lock files
- Inconsistent lock states after failed updates
- Lock file conflicts during merges

**Symptoms that trigger this skill:**

- `error: unable to download 'https://...': 404`
- `error: NAR hash mismatch`
- `error: lock file contains duplicate entries`
- `nix flake update` hangs or fails
- `nix flake lock` reports conflicts

## Recovery Process Framework

### Phase 1: Assessment (5 minutes)

**Goal:** Understand the lock file state and identify specific issues

```bash
# Backup current lock file
cp flake.lock flake.lock.backup.$(date +%Y%m%d_%H%M%S)

# Check lock file validity
./scripts/validate-lock.sh flake.lock

# Identify problematic inputs
nix flake metadata --json | jq '.locks.nodes | to_entries[] | select(.value.locked == false)'
```

**Key Questions:**

1. Is the lock file syntactically valid JSON?
2. Which inputs are failing?
3. Are there version conflicts?
4. Is this a corruption or update issue?

### Phase 2: Targeted Recovery (15 minutes)

**Goal:** Apply specific recovery strategies based on the issue type

**For unreachable inputs:**

```bash
# Update specific input to working version
nix flake lock --update-input problematic-input

# Or remove and re-add the input
nix flake metadata --json | jq -r '.locks.nodes.problematic.locked.url'
# Edit flake.nix to use working URL, then relock
```

**For version conflicts:**

```bash
# Force update conflicting inputs
nix flake update specific-input

# Or use override to pin working versions
# Edit flake.nix inputs to pin working versions
```

**For corruption:**

```bash
# Remove corrupted lock file
rm flake.lock

# Regenerate from scratch
nix flake lock
```

### Phase 3: Validation (5 minutes)

**Goal:** Ensure recovery was successful and system is stable

```bash
# Validate new lock file
./scripts/validate-lock.sh flake.lock

# Test basic operations
nix flake check
nix build .#package

# Verify no regressions
git diff flake.lock  # Review changes
```

## nixconfig-Specific Recovery Patterns

### Input Chain Dependencies

**Problem:** Complex input chains where one failure cascades

**File:** `flake.nix`

```nix
# ❌ Problematic - indirect dependency fails
inputs = {
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  home-manager = {
    url = "github:nix-community/home-manager";
    inputs.nixpkgs.follows = "nixpkgs";
  };
  nixCats.url = "github:BirdeeHub/nixCats";
  # nixCats depends on something that fails
};

# ✅ Recovery - pin working versions
inputs = {
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  home-manager = {
    url = "github:nix-community/home-manager/release-24.05";  # Pin version
    inputs.nixpkgs.follows = "nixpkgs";
  };
  nixCats.url = "github:BirdeeHub/nixCats/v1.2";  # Pin version
};
```

### Flake-Parts Integration Issues

**Problem:** flake-parts modules cause lock conflicts

**File:** `modules/flake-parts/*.nix`

```bash
# Check for conflicting module definitions
statix check modules/flake-parts/

# Validate module structure
nix eval .#checks.x86_64-linux.statix
```

### Platform-Specific Lock Issues

**Problem:** Different lock states for different systems

```bash
# Check platform-specific outputs
nix flake show | grep -E "(x86_64-linux|aarch64-darwin)"

# Ensure consistent locking across platforms
nix flake lock --override-input system "x86_64-linux"
```

## Automated Recovery Scripts

### recover-lock.sh

Comprehensive recovery script that attempts multiple strategies:

```bash
./scripts/recover-lock.sh [OPTIONS] [FLAKE_DIR]

OPTIONS:
    --force          Force recovery even if lock seems OK
    --backup         Create timestamped backup
    --strategy STRAT Use specific strategy (update|recreate|pin)
    --input NAME     Focus recovery on specific input
```

### validate-lock.sh

Validation script that checks lock file integrity:

```bash
./scripts/validate-lock.sh [LOCK_FILE]

CHECKS:
    ✓ JSON syntax validity
    ✓ Input URL reachability
    ✓ Hash consistency
    ✓ No duplicate entries
    ✓ Version compatibility
```

## Common Recovery Scenarios

### Scenario 1: GitHub Repository Moved

**Symptoms:** `error: unable to download 'https://api.github.com/repos/old-org/repo/...'`

**Recovery:**

```bash
# Find new repository location
# Edit flake.nix inputs to use new URL
# Run: nix flake lock --update-input moved-repo
```

### Scenario 2: Branch Deleted

**Symptoms:** `error: unable to download 'https://.../branch-that-no-longer-exists'`

**Recovery:**

```bash
# Change to stable branch/tag in flake.nix
# Run: nix flake update
```

### Scenario 3: Hash Mismatch After Update

**Symptoms:** `error: NAR hash mismatch`

**Recovery:**

```bash
# Clear nix store for affected input
nix store delete /nix/store/*-source-hash

# Regenerate lock
nix flake lock --update-input problematic-input
```

### Scenario 4: Circular Dependencies

**Symptoms:** Lock process hangs indefinitely

**Recovery:**

```bash
# Identify circular inputs
nix flake metadata --json | jq '.locks.nodes | recurse | select(.inputs | contains(["parent"]))'

# Break cycle by pinning one input
# Edit flake.nix to use absolute URLs instead of follows
```

## Integration with nixconfig Workflow

### Using just Commands

```bash
# Quick validation
just check          # Includes flake.lock validation
just lint           # Check for syntax issues

# Backup before recovery
cp flake.lock flake.lock.backup

# After recovery
just check          # Verify recovery worked
```

### Git Integration

```bash
# Commit recovery with clear message
git add flake.lock
git commit -m "fix: recover flake.lock from corruption

- Identified unreachable input: problematic-repo
- Updated to working version/commit
- Validated with nix flake check
- No functional changes to configuration"
```

## Prevention Strategies

### Regular Maintenance

```bash
# Weekly: Update and validate
nix flake update
just check

# Monthly: Clean old lock backups
find . -name "flake.lock.backup.*" -mtime +30 -delete
```

### CI/CD Integration

```bash
# In GitHub Actions
- run: nix flake check
- run: nix flake lock --no-update-lock-file  # Validate lock is up to date
```

## Red Flags - STOP and Re-evaluate

- "I'll just delete flake.lock" → This destroys reproducible builds
- "Lock files don't matter" → They ensure reproducible deployments
- "I'll pin everything to avoid updates" → Prevents security updates
- "This is too complex to fix" → Use the systematic recovery process
- "It works on my machine" → Test on target deployment environment

**All of these mean: Stop, use systematic recovery, preserve reproducibility.**

## Verification Checklist

Before declaring lock recovery complete:

- [ ] `nix flake check` passes without errors
- [ ] All inputs are reachable and downloadable
- [ ] `nix flake metadata` shows no locked=false inputs
- [ ] No hash mismatches during evaluation
- [ ] Lock file is valid JSON with no duplicates
- [ ] System builds successfully on target platform
- [ ] CI/CD pipelines pass with new lock
- [ ] Backup of old lock file preserved
- [ ] Changes documented in commit message

## Helper Scripts

### recover-lock.sh

Automated recovery script with multiple strategies for different failure modes.

### validate-lock.sh

Comprehensive validation script that checks all aspects of lock file integrity.
