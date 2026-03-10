# NixOS Unified Flake Lock Recovery for Complex Input Chains

**Purpose**: Systematic recovery and repair of flake.lock files in nixos-unified + flake-parts architectures with complex input following and dependency chains.

## Core Principles

1. **Input Chain Awareness**: Understand complex input following patterns in nixos-unified
2. **Incremental Recovery**: Recover locks step-by-step to minimize disruption
3. **Dependency Preservation**: Maintain existing custom overlays and pinned inputs
4. **Validation-First**: Validate each recovery step before proceeding

## Pre-Recovery Assessment

### Phase 1: Lock File Analysis

```bash
# 1. Check lock file status
ls -la flake.nix flake.lock
git status flake.lock

# 2. Analyze input structure
nix flake metadata --json | jq '.locks.nodes | keys | length'
nix flake metadata | grep -A 20 "Inputs:"

# 3. Identify critical inputs
nix flake metadata | grep -E "(nixpkgs|home-manager|nixos-unified)"
```

### Phase 2: Dependency Mapping

```bash
# 1. Map input following chains
nix flake metadata --json | jq '.locks.nodes | to_entries | map(select(.value.inputs))'

# 2. Check for custom overlays/pins
grep -n "url.*github" flake.nix
grep -n "follows.*=" flake.nix

# 3. Identify pinned versions
grep -A 5 -B 5 "nixpkgs-bat" flake.nix
grep -A 5 -B 5 "zen-browser" flake.nix
```

## Recovery Strategies

### Strategy 1: Conservative Recovery (Preferred)

```bash
# 1. Backup current state
cp flake.lock flake.lock.backup.$(date +%Y%m%d-%H%M%S)
git add flake.lock.backup.*

# 2. Attempt selective update
nix flake update --update-input nixpkgs
nix flake update --update-input home-manager

# 3. Test critical paths
nix eval .#homeConfigurations.m4rknewt0n.activationPackage.drvPath
just check

# 4. Update remaining inputs if successful
nix flake update
```

### Strategy 2: Staged Recovery

```bash
# 1. Group inputs by dependency level
# Core inputs
nix flake update --update-input nixpkgs
nix flake update --update-input nixos-unified
nix flake update --update-input flake-parts

# Tooling inputs
nix flake update --update-input home-manager
nix flake update --update-input treefmt-nix
nix flake update --update-input flake-utils

# Software inputs
nix flake update --update-input nix-index-database
nix flake update --update-input catppuccin
nix flake update --update-input nixGL

# Custom/development inputs
nix flake update --update-input nil
nix flake update --update-input zjstatus
nix flake update --update-input zen-browser
```

### Strategy 3: Full Recovery (Last Resort)

```bash
# 1. Complete lock regeneration
rm flake.lock
nix flake update

# 2. Restore custom pins if needed
# Edit flake.nix to re-add any specific commits if necessary
```

## Input-Specific Recovery Procedures

### Core System Inputs

```bash
# 1. Nixpkgs (most critical)
nix flake update --update-input nixpkgs
nix eval .#legacyPackages.x86_64-linux.hello --show-trace

# 2. Home Manager
nix flake update --update-input home-manager
nix eval .#homeConfigurations.m4rknewt0n.options --show-trace

# 3. NixOS Unified
nix flake update --update-input nixos-unified
nix eval .#nixosConfigurations --apply 'builtins.attrNames' --show-trace
```

### Pinned Inputs Recovery

```bash
# 1. Bat pin (critical for Dockerfile syntax)
# Check if pin is still needed
nix eval .#legacyPackages.x86_64-linux.bat.version
# If issue persists, keep the pin in flake.nix

# 2. Zen Browser
nix flake update --update-input zen-browser
nix build .#legacyPackages.x86_64-linux.zen-browser --dry-run

# 3. Claude Desktop
nix flake update --update-input claude-desktop
nix eval .#packages.x86_64-linux.claude-desktop --show-trace
```

### Development Tool Inputs

```bash
# 1. Nixd LSP
nix flake update --update-input nil
nix eval .#devShells.x86_64-linux.default --show-trace

# 2. Treefmt
nix flake update --update-input treefmt-nix
nix fmt . --dry-run

# 3. Zellij status bar
nix flake update --update-input zjstatus
nix eval .#legacyPackages.x86_64-linux.zjstatus --show-trace
```

## Validation and Testing

### Phase 1: Basic Validation

```bash
# 1. Fast evaluation check
nix eval .#homeConfigurations.m4rknewt0n.activationPackage.drvPath --show-trace

# 2. Input consistency check
nix flake check --offline

# 3. Metadata validation
nix flake metadata
```

### Phase 2: Functional Testing

```bash
# 1. Core package availability
nix eval .#legacyPackages.x86_64-linux.bat --show-trace
nix eval .#legacyPackages.x86_64-linux.neovim --show-trace

# 2. Home Manager configuration
nix eval .#homeConfigurations.m4rknewt0n.config.home.packages --show-trace

# 3. Overlay functionality
nix eval .#legacyPackages.x86_64-linux.windsurf --show-trace
```

### Phase 3: Integration Testing

```bash
# 1. Full flake check
just check

# 2. Build critical components
nix build .#homeConfigurations.m4rknewt0n.activationPackage --dry-run
nix build .#legacyPackages.x86_64-linux.neovim --dry-run

# 3. Smoke test essential programs
just smoke-test
```

## Crisis Recovery Patterns

### When Evaluation Fails

```bash
# 1. Isolate problematic input
for input in $(nix flake metadata --json | jq -r '.locks.nodes | keys[]'); do
  echo "Testing input: $input"
  nix flake update --update-input "$input" || echo "Failed: $input"
done

# 2. Test with minimal inputs
# Temporarily comment out problematic inputs in flake.nix
nix flake update
# Gradually re-enable inputs
```

### When Input Following Breaks

```bash
# 1. Check following chains
nix flake metadata --json | jq '.locks.nodes.home-manager.inputs'

# 2. Force specific follows
nix flake update --override-input home-manager nixpkgs
nix flake update --override-input nix-darwin nixpkgs

# 3. Restore following after recovery
nix flake update home-manager nix-darwin
```

### When Custom Overlays Fail

```bash
# 1. Test overlay isolation
nix eval .#legacyPackages.x86_64-linux.bat --apply 'pkg: pkg.version'

# 2. Check overlay application
nix eval .#overlays.bat-extras-skip-tests

# 3. Rebuild overlay if needed
# Edit overlays/bat-extras-skip-tests.nix
```

## Repository-Specific Recovery

### Home Manager Integration

```bash
# 1. Test nixCats integration
nix eval .#homeConfigurations.m4rknewt0n.config.nixCats --show-trace

# 2. Check module imports
nix eval .#homeConfigurations.m4rknewt0n.config.home-manager.sharedModules

# 3. Verify user configuration
nix eval .#homeConfigurations.m4rknewt0n.config.home.username
```

### Crostini/Penguin Modules

```bash
# 1. Test penguin module loading
nix eval .#homeConfigurations.m4rknewt0n.config.programs.zsh

# 2. Check crostini integration
nix eval .#homeConfigurations.m4rknewt0n.config.xdg.mimeApps

# 3. Verify custom scripts
nix eval .#legacyPackages.x86_64-linux.crostini-integration
```

### Development Environment

```bash
# 1. Test devshell
nix eval .#devShells.x86_64-linux.default --show-trace

# 2. Check formatters
nix fmt . --dry-run

# 3. Verify LSP integration
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py . --idle-timeout 1.0
```

## Prevention Strategies

### Regular Maintenance

```bash
# 1. Scheduled updates (weekly)
nix flake update
just check
git add flake.lock
git commit -m "Weekly flake update"

# 2. Monitor input health
nix flake metadata | grep -E "(warning|error)"

# 3. Track breaking changes
# Subscribe to release notifications for key inputs
```

### Lock File Hygiene

```bash
# 1. Commit lock changes promptly
git add flake.lock && git commit -m "Update flake.lock"

# 2. Tag stable states
git tag -a "stable-$(date +%Y%m%d)" -m "Stable flake state"

# 3. Document known issues
# Update CHANGELOG.md with any input-related problems
```

### Backup and Recovery

```bash
# 1. Automatic backups
cp flake.lock .backup/flake.lock.$(date +%Y%m%d-%H%M%S)

# 2. Git-based recovery
git log --oneline flake.lock | head -10
git checkout HEAD~5 -- flake.lock  # Restore previous version

# 3. Critical state preservation
git tag "critical-recovery-$(date +%Y%m%d)" flake.lock
```

## Integration with Existing Tools

### Justfile Integration

```bash
# Use existing just commands for recovery validation
just check              # Full validation
just smart-derivation-check  # Fast validation
just deep-lint-changed   # LSP validation
```

### Secret Management

```bash
# Ensure no secrets in lock recovery process
just secret-check
gitleaks detect --verbose
```

### Repository Documentation

```bash
# Update recovery documentation
echo "$(date): Flake lock recovery performed" >> docs/recovery.log
git add docs/recovery.log && git commit -m "Document recovery"
```

This systematic approach to flake lock recovery prevents the cascade failures seen in the repository history by providing structured, incremental recovery methods specifically adapted to the complex input chains in nixos-unified architectures.
