---
name: Home Manager Workflows
description: Systematic configuration management patterns for Home Manager in nixos-unified architectures
when_to_use: when managing Home Manager configurations, testing changes, or troubleshooting configuration issues
version: 1.0.0
languages: nix,bash
helpers:
  - scripts/update-config.sh
  - scripts/test-config.sh
---

# Home Manager Workflows

## Overview

Systematic configuration management patterns for Home Manager in nixos-unified + flake-parts architectures. Provides workflows for updating, testing, and troubleshooting Home Manager configurations with safety and validation.

**Core principle:** Configuration changes should be tested systematically before activation.

**Announce at start:** "I'm using the Home Manager Workflows skill to systematically manage the configuration."

## When to Use

**Configuration Scenarios Covered:**

- Updating Home Manager modules and options
- Testing configuration changes before activation
- Troubleshooting configuration conflicts
- Managing multi-host Home Manager setups
- Rolling back problematic changes
- Optimizing configuration performance

**Symptoms that trigger this skill:**

- `home-manager switch` fails with errors
- Configuration changes cause unexpected behavior
- Need to test changes across multiple hosts
- Configuration becomes slow or bloated
- Need to rollback from broken state

## Workflow Framework

### Phase 1: Assessment (5 minutes)

**Goal:** Understand current configuration state and identify change requirements

```bash
# Check current Home Manager generation
home-manager generations

# Validate current configuration
./scripts/test-config.sh

# Check for configuration issues
statix check modules/home/
```

**Key Questions:**

1. What specific changes are needed?
2. Which modules/options are affected?
3. Are there cross-module dependencies?
4. What's the impact on different hosts?

### Phase 2: Isolated Testing (10 minutes)

**Goal:** Test changes in isolation before full activation

**For module changes:**

```bash
# Test specific module
./scripts/test-config.sh --module modules/home/me.nix

# Dry run activation
home-manager switch --dry-run
```

**For option changes:**

```bash
# Test option evaluation
nix eval .#homeManagerConfigurations.m4rknewt0n.config.programs.neovim.enable

# Check option conflicts
home-manager build --cores 1  # Slower but catches issues
```

### Phase 3: Safe Activation (5 minutes)

**Goal:** Apply changes with rollback capability

```bash
# Backup current generation info
home-manager generations > generations.backup

# Apply changes
home-manager switch

# Verify activation
./scripts/test-config.sh --post-activation
```

## nixconfig-Specific Patterns

### Multi-Host Configuration Management

**Problem:** Same configuration needs to work across different hosts (Crostini, NixOS)

**File:** `configurations/home/m4rknewt0n.nix`

```nix
# Host-aware configuration
{ config, lib, pkgs, nixCats, ... }:

let
  isCrostini = builtins.getEnv "CONTAINER" == "lxc";
  isNixOS = builtins.pathExists /etc/NIXOS;
in
{
  # Common configuration
  programs.neovim = {
    enable = true;
    # ... common settings
  };

  # Host-specific overrides
  programs.chromium = lib.mkIf (!isCrostini) {
    enable = true;
  };

  # Crostini-specific
  programs.sommelier = lib.mkIf isCrostini {
    enable = true;
  };
}
```

### Module Organization Patterns

**File:** `modules/home/default.nix`

```nix
# Clean module imports
{ config, lib, pkgs, nixCats, ... }:

{
  imports = [
    ./shared-config.nix    # Common settings
    ./me.nix              # User-specific
    ./desktop.nix         # Desktop environment
    ./programs-dev.nix    # Development tools
    ./programs-gui.nix    # GUI applications
  ];

  # Cross-module coordination
  programs.neovim = {
    enable = true;
    extraPackages = with pkgs; [
      # Packages from other modules
    ];
  };
}
```

### Configuration Testing Strategies

**Automated testing:**

```bash
# Run smoke tests
just smoke-test

# Test specific functionality
./scripts/test-config.sh --smoke neovim
./scripts/test-config.sh --smoke chromium
```

**Manual verification:**

```bash
# Check generated config
home-manager build
cat result/home-files/.config/neovim/init.lua

# Test in isolated environment
nix-shell -p home-manager --run "home-manager --flake .#test-config"
```

## Automated Workflow Scripts

### update-config.sh

Configuration update script with safety checks:

```bash
./scripts/update-config.sh [OPTIONS] [MODULE]

OPTIONS:
    --dry-run         Show what would change without applying
    --backup          Create backup before changes
    --test            Run tests after update
    --rollback        Rollback to previous generation
    --module FILE     Update specific module
```

### test-config.sh

Comprehensive configuration testing:

```bash
./scripts/test-config.sh [OPTIONS]

OPTIONS:
    --smoke           Run smoke tests for key programs
    --module FILE     Test specific module
    --full            Run complete test suite
    --post-activation Verify activation was successful
```

## Common Configuration Scenarios

### Scenario 1: Adding New Program

**Pattern:** Safe program addition with testing

```bash
# 1. Add to appropriate module
echo "programs.htop.enable = true;" >> modules/home/programs-dev.nix

# 2. Test the change
./scripts/test-config.sh --module modules/home/programs-dev.nix

# 3. Dry run activation
home-manager switch --dry-run

# 4. Apply changes
home-manager switch

# 5. Verify functionality
htop --version
```

### Scenario 2: Updating Package Versions

**Pattern:** Controlled package updates

```bash
# 1. Check current versions
home-manager packages | grep neovim

# 2. Update in flake.nix
# Edit inputs to use newer versions

# 3. Test rebuild
home-manager build

# 4. Switch if successful
home-manager switch
```

### Scenario 3: Resolving Configuration Conflicts

**Pattern:** Systematic conflict resolution

```bash
# 1. Identify conflict
home-manager switch 2>&1 | grep "conflict\|error"

# 2. Check module precedence
grep -r "programs.neovim" modules/home/

# 3. Resolve in appropriate module
# Use lib.mkForce or adjust priorities

# 4. Test resolution
./scripts/test-config.sh
```

### Scenario 4: Performance Optimization

**Pattern:** Configuration cleanup and optimization

```bash
# 1. Analyze current config size
home-manager build --cores 1 --max-jobs 1
du -sh result/

# 2. Check for unused options
statix check modules/home/

# 3. Remove unnecessary packages
# Review and clean modules/home/programs-*.nix

# 4. Test optimized config
./scripts/test-config.sh --full
```

## Integration with nixconfig Workflow

### Using just Commands

```bash
# Quick validation
just check          # Includes Home Manager validation
just smoke-test     # Test key programs
just lint           # Check configuration syntax

# After changes
just check          # Verify no breaking changes
just smoke-test     # Ensure programs still work
```

### Git Workflow Integration

```bash
# Commit configuration changes
git add modules/home/
git commit -m "feat: add neovim configuration

- Added neovim module with plugins
- Tested with smoke tests
- Verified on both Crostini and NixOS hosts"

# Tag releases
git tag v1.2.0-home-config
```

## Troubleshooting Common Issues

### Issue: Home Manager switch hangs

**Cause:** Usually infinite recursion or circular dependencies

**Solution:**

```bash
# Kill hanging process
pkill -f home-manager

# Debug with trace
home-manager build --show-trace

# Check for recursion
grep -r "recursion" modules/home/
```

### Issue: Programs not available after switch

**Cause:** PATH issues or activation problems

**Solution:**

```bash
# Check activation
home-manager generations | head -1

# Reload environment
exec $SHELL

# Verify program
which program-name
program-name --version
```

### Issue: Configuration works on one host but not another

**Cause:** Host-specific assumptions

**Solution:**

```bash
# Check host detection
nix eval .#homeManagerConfigurations.m4rknewt0n.config.programs.chromium.enable

# Add host-aware logic
lib.mkIf (!isCrostini) { enable = true; }
```

## Prevention Strategies

### Regular Maintenance

```bash
# Weekly: Update and test
home-manager switch
./scripts/test-config.sh --smoke

# Monthly: Clean old generations
home-manager expire-generations 30d

# Quarterly: Full configuration review
./scripts/test-config.sh --full
```

### Configuration Hygiene

```bash
# Use consistent patterns
# Document host-specific logic
# Test on all target hosts
# Keep modules focused and small
```

## Red Flags - STOP and Re-evaluate

- "I'll just edit the generated files" → Use proper configuration
- "It works after manual tweaks" → Configuration should be declarative
- "Different configs for different hosts" → Use host-aware logic
- "Too many overrides" → Simplify configuration structure
- "Activation takes too long" → Optimize or split configuration

**All of these mean: Stop, use systematic configuration management.**

## Verification Checklist

Before declaring configuration update complete:

- [ ] `home-manager switch` succeeds without errors
- [ ] `just check` passes all validations
- [ ] `just smoke-test` passes key functionality tests
- [ ] Configuration works on all target hosts
- [ ] No unexpected program behavior
- [ ] Generation can be rolled back if needed
- [ ] Documentation updated for changes

## Helper Scripts

### update-config.sh

Safe configuration update script with backup and testing.

### test-config.sh

Comprehensive configuration testing and validation.
