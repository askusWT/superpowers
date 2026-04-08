---
name: NixOS Unified Flake Lock Recovery
description: Systematic recovery and repair of flake.lock files in nixos-unified + flake-parts architectures with complex input following and dependency chains
when_to_use: when recovering a damaged or conflicted flake.lock in a nixos-unified repository with complex follows chains, overlays, or pinned inputs
version: 1.0.0
languages: nix,bash,json
---

# NixOS Unified Flake Lock Recovery

## Overview

Systematic recovery and repair of `flake.lock` files in nixos-unified + flake-parts repositories. Handles follows chains, pinned inputs, overlay-sensitive dependencies, and staged validation without resorting to blind deletion.

**Core principle:** Lock files are critical infrastructure. Back up first, recover incrementally, and validate after every step.

**Announce at start:** "I'm using the NixOS Unified Flake Lock Recovery skill to repair the lock file systematically."

Replace `<host>` with the real home or system configuration name for the target repository.

## Core Principles

1. **Input-chain awareness**: Inspect follows relationships before changing the lock file.
2. **Incremental recovery**: Prefer selective updates before broad regeneration.
3. **Dependency preservation**: Respect pinned inputs, overlays, and custom package sources.
4. **Validation-first recovery**: Every lock change must be followed by fast evaluation and repo-native checks.

## Pre-Recovery Assessment

### Phase 1: Lock File Analysis

```bash
ls -la flake.nix flake.lock
git status flake.lock
nix flake metadata --json | jq '.locks.nodes | keys | length'
nix flake metadata | grep -A 20 "Inputs:"
nix flake metadata | grep -E "(nixpkgs|home-manager|nixos-unified)"
```

### Phase 2: Dependency Mapping

```bash
nix flake metadata --json | jq '.locks.nodes | to_entries | map(select(.value.inputs))'
grep -n "url.*github" flake.nix
grep -n "follows.*=" flake.nix
grep -A 5 -B 5 "nixpkgs-bat" flake.nix
grep -A 5 -B 5 "zen-browser" flake.nix
```

## Recovery Strategies

### Strategy 1: Conservative Recovery (Preferred)

```bash
# Backup first
cp flake.lock "flake.lock.backup.$(date +%Y%m%d-%H%M%S)"

# Try targeted updates
nix flake update --update-input nixpkgs
nix flake update --update-input home-manager

# Validate critical paths
nix eval .#homeConfigurations.<host>.activationPackage.drvPath --show-trace
just check

# Broaden only if the targeted updates succeed
nix flake update
```

### Strategy 2: Staged Recovery

```bash
# Core inputs
nix flake update --update-input nixpkgs
nix flake update --update-input nixos-unified
nix flake update --update-input flake-parts

# Tooling inputs
nix flake update --update-input home-manager
nix flake update --update-input treefmt-nix
nix flake update --update-input flake-utils

# Software and development inputs
nix flake update --update-input nix-index-database
nix flake update --update-input catppuccin
nix flake update --update-input nixGL
nix flake update --update-input nil
nix flake update --update-input zjstatus
nix flake update --update-input zen-browser
```

### Strategy 3: Full Recovery (Last Resort)

Only use this after backing up the current lock file and confirming selective recovery failed.

```bash
rm flake.lock
nix flake update
```

If custom pins were intentionally added, re-check `flake.nix` inputs before accepting the regenerated lock.

## Input-Specific Recovery Procedures

### Core System Inputs

```bash
nix flake update --update-input nixpkgs
nix eval .#legacyPackages.x86_64-linux.hello --show-trace

nix flake update --update-input home-manager
nix eval .#homeConfigurations.<host>.options --show-trace

nix flake update --update-input nixos-unified
nix eval .#nixosConfigurations --apply 'builtins.attrNames' --show-trace
```

### Pinned Inputs

```bash
# Check whether a pin is still required before broadening updates
nix eval .#legacyPackages.x86_64-linux.bat.version

nix flake update --update-input zen-browser
nix build .#legacyPackages.x86_64-linux.zen-browser --dry-run

nix flake update --update-input claude-desktop
nix eval .#packages.x86_64-linux.claude-desktop --show-trace
```

### Development Tool Inputs

```bash
nix flake update --update-input nil
nix eval .#devShells.x86_64-linux.default --show-trace

nix flake update --update-input treefmt-nix
nix fmt . --dry-run

nix flake update --update-input zjstatus
nix eval .#legacyPackages.x86_64-linux.zjstatus --show-trace
```

## Validation and Testing

### Phase 1: Basic Validation

```bash
nix eval .#homeConfigurations.<host>.activationPackage.drvPath --show-trace
nix flake check --offline
nix flake metadata
```

### Phase 2: Functional Testing

```bash
nix eval .#legacyPackages.x86_64-linux.bat --show-trace
nix eval .#legacyPackages.x86_64-linux.neovim --show-trace
nix eval .#homeConfigurations.<host>.config.home.packages --show-trace
nix eval .#legacyPackages.x86_64-linux.windsurf --show-trace
```

### Phase 3: Integration Testing

```bash
just check
nix build .#homeConfigurations.<host>.activationPackage --dry-run
nix build .#legacyPackages.x86_64-linux.neovim --dry-run
just smoke-test
```

## Crisis Recovery Patterns

### When Evaluation Fails

```bash
for input in $(nix flake metadata --json | jq -r '.locks.nodes | keys[]'); do
  echo "Testing input: $input"
  nix flake update --update-input "$input" || echo "Failed: $input"
done
```

If one input repeatedly breaks evaluation, isolate it before attempting a broader lock rewrite.

### When Input Following Breaks

```bash
nix flake metadata --json | jq '.locks.nodes.home-manager.inputs'
nix flake update --override-input home-manager nixpkgs
nix flake update --override-input nix-darwin nixpkgs
nix flake update home-manager nix-darwin
```

### When Custom Overlays Fail

```bash
nix eval .#legacyPackages.x86_64-linux.bat --apply 'pkg: pkg.version'
nix eval .#overlays.bat-extras-skip-tests
```

## Repository-Specific Checks

### Home Manager Integration

```bash
nix eval .#homeConfigurations.<host>.config.home-manager.sharedModules
nix eval .#homeConfigurations.<host>.config.home.username
```

If imports are involved, confirm `inputs.nixCats.homeModule` only appears where the template expects it.

### Crostini / Penguin Modules

```bash
nix eval .#homeConfigurations.<host>.config.programs.zsh
nix eval .#homeConfigurations.<host>.config.xdg.mimeApps
nix eval .#legacyPackages.x86_64-linux.crostini-integration
```

### Development Environment

```bash
nix eval .#devShells.x86_64-linux.default --show-trace
nix fmt . --dry-run
```

Repo-specific helper example; use only if the target repository provides this script.

```bash
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py . --idle-timeout 1.0
```

## Hygiene After Recovery

```bash
just lint
just deep-lint-changed
just check
```

Optional secret hygiene if the repo already uses these tools:

```bash
just secret-check
gitleaks detect --verbose
```

This skill prevents destructive lock-file thrash by enforcing a backup-first, input-aware, validation-heavy recovery workflow tailored to nixos-unified repositories.
