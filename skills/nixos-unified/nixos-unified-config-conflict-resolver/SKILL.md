---
name: NixOS Unified Config Conflict Resolver
description: Systematic resolution of configuration conflicts in nixos-unified + flake-parts architectures, focusing on module imports, overlays, and option definitions
when_to_use: when resolving conflicting option definitions, duplicate imports, overlay precedence issues, or module-system collisions in nixos-unified repositories
version: 1.0.0
languages: nix,bash
---

# NixOS Unified Config Conflict Resolver

## Overview

Systematic resolution of configuration conflicts in nixos-unified + flake-parts repositories. Focuses on option collisions, duplicate imports, overlay precedence, and host-specific module interactions without falling back to generic Nix advice.

**Core principle:** Resolve configuration conflicts by identifying the competing definitions first, then narrowing scope until one module, overlay, or import edge owns the behavior.

**Announce at start:** "I'm using the NixOS Unified Config Conflict Resolver skill to resolve configuration conflicts systematically."

Replace `<host>` with the real home or system configuration name for the target repository.

## Core Principles

1. **Module system awareness**: Understand nixos-unified autowiring, import boundaries, and option merging before changing code.
2. **Single-owner resolution**: Every contested option should end with one clear owner and one deliberate override strategy.
3. **Overlay discipline**: Validate overlay ordering and package overrides separately from module issues.
4. **Incremental verification**: Re-check after each narrowing step with repo-native validation commands.

## Conflict Detection

### Phase 1: Option Conflict Analysis

```bash
# Check for option collisions and repeated definitions
nix flake check 2>&1 | grep -E "(option|defined|multiple)"
nix eval .#homeConfigurations.<host>.options --show-trace 2>&1 | grep -i conflict
nix eval .#homeConfigurations.<host>.config --show-trace 2>&1 | grep -E "(already|defined|multiple)"

# Inspect import ordering
just modules-order
grep -R "import.*modules/" modules/ | sort | uniq -c | sort -nr
```

### Phase 2: Module System Conflicts

```bash
# Look for circular or duplicated imports
find modules/ -name '*.nix' -exec grep -l "import.*\.\./\.\./" {} \;
find modules/ -name 'default.nix' | xargs grep -l "config\."

# If Home Manager imports are involved, ensure inputs.nixCats.homeModule is only imported in approved locations
grep -R "nixCats\.homeModule" modules/
```

### Phase 3: Overlay Conflicts

```bash
# Inspect overlay surface and test affected packages
nix eval .#legacyPackages.x86_64-linux --apply 'pkgs: builtins.attrNames pkgs'
nix eval .#legacyPackages.x86_64-linux.bat --apply 'pkg: pkg.version'
nix eval .#legacyPackages.x86_64-linux.windsurf --apply 'pkg: pkg.version'
nix eval .#overlays --apply 'overlays: builtins.attrNames overlays'
```

## Resolution Strategies

### Strategy 1: Option Definition Conflicts

```bash
# Locate the contested option
nix eval .#homeConfigurations.<host>.config.programs.zsh --show-trace
grep -R "programs\.zsh" modules/ | grep -v "disabled"
```

```nix
# Prefer a single owner plus a deliberate merge strategy
{
  programs.zsh = lib.mkIf config.penguin.enable {
    enable = true;
  };
}
```

### Strategy 2: Module Import Conflicts

```bash
# Map and consolidate imports before editing behavior
find modules/ -name '*.nix' -exec grep -H '^import' {} \; | sort
grep -R "import.*me\.nix" modules/
grep -R "import.*desktop\.nix" modules/
```

### Strategy 3: Overlay Precedence Conflicts

```bash
# Trace package ownership and overlay ordering
nix eval .#legacyPackages.x86_64-linux.bat --apply 'pkg: pkg.src'
nix eval .#overlays.bat-extras-skip-tests
```

## Common Conflict Patterns

### Pattern 1: Home Manager Option Conflicts

```nix
# Problem: multiple modules define the same option
{
  programs.git.userName = "example-user";
}

{
  programs.git.userName = "different-user";
}

# Resolution: one owner, defaults where appropriate
{
  programs.git = {
    userName = lib.mkDefault "example-user";
    userEmail = lib.mkDefault "user@example.com";
  };
}

# Or gate platform-specific settings explicitly
{
  programs.git = lib.mkIf config.penguin.enable {
    userName = "example-user";
    userEmail = "user@example.com";
  };
}
```

### Pattern 2: Package Version Conflicts

```nix
{
  overlays = [
    (import ../overlays/windsurf-fix.nix)
    (import ../overlays/bat-extras-skip-tests.nix)
  ];
}
```

### Pattern 3: Duplicate or Circular Imports

```nix
{
  imports = [
    ./me.nix
    ./desktop.nix
  ];
}
```

Use one central import spine such as `modules/home/default.nix`, and remove duplicates from leaf modules.

## Repository-Specific Checks

### Home Manager Import Conflicts

```bash
nix eval .#homeConfigurations.<host>.config.home-manager.sharedModules
grep -R "nixCats\.homeModule" modules/
```

### Crostini / Penguin Conflicts

```bash
grep -R "programs\." modules/penguin/ | grep -v "disabled"
nix eval .#homeConfigurations.<host>.config.programs.zsh --show-trace
nix eval .#homeConfigurations.<host>.config.xdg --show-trace
```

### Development Environment Conflicts

```bash
nix eval .#devShells.x86_64-linux.default --show-trace
nix fmt . --dry-run 2>&1 | grep -E "(conflict|error)"
```

Repo-specific helper example; use only if the target repository provides this script.

```bash
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py . --idle-timeout 1.0
```

## Resolution Workflow

### Step 1: Identify the Collision

```bash
rg -n "programs\.|services\.|home\.file|xdg\." modules/
just modules-order
```

### Step 2: Measure Blast Radius

```bash
nix eval .#homeConfigurations.<host>.config.home.packages --show-trace
nix eval .#legacyPackages.x86_64-linux --apply 'pkgs: [ pkgs.bat pkgs.neovim ]'
```

### Step 3: Apply the Narrowest Fix

- Prefer `mkIf`, `mkMerge`, or `mkDefault` over deleting behavior blindly.
- Move duplicate imports to one canonical parent module.
- Keep overlays merged through the repo's existing overlay plumbing.

### Step 4: Verify

```bash
just lint
just deep-lint-changed
just check
```

## Remember

- Never edit `flake.nix` outputs to resolve a conflict.
- Avoid generic internet snippets that bypass nixos-unified module structure.
- Resolve module ownership first, package ownership second.
- If the conflict involves host-specific logic, validate both shared and host modules before concluding the fix.

This skill prevents cascading configuration breakage by forcing a repo-grounded workflow for conflict detection, ownership analysis, and targeted resolution.
