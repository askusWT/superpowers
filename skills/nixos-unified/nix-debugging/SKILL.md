---
name: Nix Debugging
description: Systematic resolution of Nix evaluation failures using error classification, isolation techniques, and targeted fixes
when_to_use: when encountering infinite recursion, attribute not found, type errors, or evaluation failures in Nix expressions
version: 1.0.0
languages: nix,bash
helpers:
  - scripts/classify-error.sh
  - scripts/debug-evaluation.sh
---

# Nix Debugging

## Overview

Comprehensive Nix debugging framework that combines error classification, systematic isolation, and targeted resolution patterns. This skill provides both automated tools and manual workflows for resolving the most common Nix evaluation failures.

**Core principle:** Every evaluation error has a systematic resolution path - panic less, debug more.

**Announce at start:** "I'm using the Nix Debugging skill to resolve this systematically."

## When to Use

**Error Types Covered:**

- Infinite recursion detected
- Attribute not found
- Type mismatch errors
- Undefined variable errors
- Function call errors
- String interpolation failures
- Module import issues
- Flake evaluation failures

**Symptoms that trigger this skill:**

- `error: infinite recursion encountered`
- `error: attribute 'X' missing`
- `error: expression does not evaluate to a function`
- `error: undefined variable 'X'`
- `nix eval` or `nix flake check` failures
- Build failures due to evaluation errors

## Quick Start Commands

### Automated Debugging

```bash
# Full systematic debugging workflow
./scripts/debug-evaluation.sh .#failingAttribute

# Classify a specific error
./scripts/debug-evaluation.sh --phase triage .#failingAttribute

# Isolate failing component
./scripts/debug-evaluation.sh --phase isolate .#failingAttribute

# Get resolution guidance
./scripts/debug-evaluation.sh --phase resolve .#failingAttribute
```

### Error Classification

```bash
# Classify error from command output
nix eval .#failing 2>&1 | ./scripts/classify-error.sh

# Classify error from file
./scripts/classify-error.sh -f error.log

# Verbose classification with guidance
echo "error: infinite recursion encountered" | ./scripts/classify-error.sh -v
```

## Systematic Debugging Process

### Phase 1: Error Triage (30 seconds)

**Goal:** Classify error and gather initial context

```bash
# Get full error context with trace
nix eval --show-trace .#failingAttribute

# For flakes: check specific outputs
nix flake check --show-trace
```

**Key Questions:**

1. What error class? (recursion/attribute/type/scope)
2. What file/line? (trace shows exact location)
3. What inputs? (what values caused the failure)

**Automated:** `./scripts/debug-evaluation.sh --phase triage TARGET`

### Phase 2: Isolation (2 minutes)

**Goal:** Isolate failing expression from full configuration

**For Infinite Recursion:**

```bash
# Isolate problematic definition
nix eval --show-trace --expr '
  let
    pkgs = import <nixpkgs> {};
    # Copy only the failing expression here
  in yourFailingExpression
'

# Test with minimal inputs
nix eval --expr 'yourFunction minimalInput'
```

**For Attribute Errors:**

```bash
# Test attribute path step by step
nix eval --expr '(import ./flake.nix).outputs'
nix eval --expr '(import ./flake.nix).outputs.homeManagerConfigurations'
nix eval --expr '(import ./flake.nix).outputs.homeManagerConfigurations.m4rknewt0n'
```

**Automated:** `./scripts/debug-evaluation.sh --phase isolate TARGET`

### Phase 3: Resolution

**Goal:** Apply targeted fixes based on error classification

#### Infinite Recursion Fixes

**Pattern 1: Self-referencing let-bindings**

```nix
# ❌ BAD - infinite recursion
let
  system = system;
in system

# ✅ GOOD - use function parameter
{ pkgs, system, ... }:
{
  inherit system;
}
```

**Pattern 2: Circular module dependencies**

```nix
# ❌ BAD - modules reference each other
{
  imports = [ ./module-a.nix ./module-b.nix ];
}
# module-a.nix imports module-b, module-b.nix imports module-a

# ✅ GOOD - extract common dependencies
{
  imports = [ ./common-deps.nix ./module-a.nix ./module-b.nix ];
}
```

#### Attribute Path Fixes

**Pattern 1: Missing flake outputs**

```nix
# ❌ BAD - attribute not found
nix eval .#nonexistentOutput

# ✅ GOOD - check available outputs first
nix eval .#outputs  # List all available
nix eval .#homeManagerConfigurations.m4rknewt0n  # Use correct path
```

**Pattern 2: Nested attribute access**

```nix
# ❌ BAD - assuming structure
config.programs.neovim.plugins

# ✅ GOOD - verify structure exists
builtins.attrNames config.programs.neovim
# or use optional chaining with defaults
config.programs.neovim.plugins or []
```

#### Type Mismatch Fixes

**Pattern 1: List vs Set confusion**

```nix
# ❌ BAD - passing list where set expected
[ item1 item2 ]  # When function expects { name = ...; }

# ✅ GOOD - correct type
{ name = "item1"; }  # or convert list to set
```

**Pattern 2: String vs Path**

```nix
# ❌ BAD - string interpolation issues
"${./config}"  # When ./config is a path

# ✅ GOOD - explicit conversion
toString ./config
# or use path operations
./config + "/file"
```

## nixconfig-Specific Examples

### Home Manager Module Import Errors

**File:** `modules/home/default.nix`

```nix
# ❌ Common error - wrong import path
imports = [ ./nonexistent-module.nix ];

# ✅ Fix - check actual file structure
ls modules/home/  # Verify file exists
imports = [ ./shared-config.nix ./me.nix ];  # Use correct paths
```

### Flake Output Errors

**File:** `flake.nix`

```nix
# ❌ Common error - missing homeManagerConfigurations
{
  outputs = { self, nixpkgs, home-manager, ... }: {
    # Missing homeManagerConfigurations output
    packages.x86_64-linux.default = ...;
  };
}

# ✅ Fix - add missing output
{
  outputs = { self, nixpkgs, home-manager, nixCats, ... }: {
    homeManagerConfigurations."m4rknewt0n" = home-manager.lib.homeManagerConfiguration {
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      extraSpecialArgs = { inherit nixCats; };
      modules = [ ./configurations/home/m4rknewt0n.nix ];
    };
  };
}
```

### Module System Errors

**File:** `modules/home/me.nix`

```nix
# ❌ Common error - wrong module signature
{ config, pkgs, ... }: {
  # Missing nixCats import
  programs.neovim.plugins = with nixCats.plugins; [ ... ];
}

# ✅ Fix - correct module signature
{ config, pkgs, nixCats, ... }: {
  programs.neovim.plugins = with nixCats.plugins; [ ... ];
}
```

## Tool Integration

### Using just Commands

```bash
# Quick validation during debugging
just check          # Run nix flake check
just lint           # Run statix for semantic issues
just deep-lint      # Run nixd LSP diagnostics
```

### statix Integration

```bash
# Find semantic issues that cause evaluation errors
statix check
statix fix  # Auto-fix common issues
```

### alejandra Formatting

```bash
# Format while debugging to avoid syntax issues
alejandra .  # Format all Nix files
```

## Cross-Platform Considerations

### NixOS vs non-NixOS

```nix
# ❌ BAD - assuming NixOS-specific modules
{ config, lib, ... }:
{
  # systemd.services only exists on NixOS
  systemd.services.my-service = ...;
}

# ✅ GOOD - platform detection
{ config, lib, pkgs, ... }:
{
  # Only on NixOS
  config.users = if lib.versionAtLeast config.system.nixos.version "23.11"
    then { users.myuser = ...; }
    else {};

  # Works everywhere
  home.packages = [ pkgs.my-package ];
}
```

### Crostini/ChromeOS Specific

```nix
# Handle sandbox and path issues
{
  # Crostini has restricted paths
  home.sessionPath = [ "$HOME/.local/bin" ];

  # Use noSandbox for problematic builds
  nixpkgs.config.allowUnfree = true;
  nixpkgs.config.permittedInsecurePackages = [ "package-name" ];
}
```

## Pressure Scenarios for Testing

### Scenario 1: Infinite Recursion Panic

**Situation:** Production deployment, flake check shows infinite recursion, 5 minutes to deploy
**Wrong:** Comment out code, deploy broken version
**Right:** Use isolation technique, find recursion point, fix dependency cycle

### Scenario 2: Missing Attribute in CI

**Situation:** GitHub Actions failing, attribute not found, team waiting for fix
**Wrong:** Add placeholder attribute, ship broken config
**Right:** Use attribute triage, verify output structure, fix import path

### Scenario 3: Type Mismatch Under Pressure

**Situation:** Client demo in 10 minutes, nix eval shows type error
**Wrong:** Cast to any, ignore type safety
**Right:** Use typeOf debugging, identify mismatch, apply correct type conversion

## Verification Checklist

Before declaring evaluation error fixed:

- [ ] Error completely resolved (no more trace output)
- [ ] `nix flake check` passes without warnings
- [ ] `just check` passes all validations
- [ ] Fix works on target platform (NixOS/non-NixOS)
- [ ] No new evaluation errors introduced
- [ ] Related attributes still accessible
- [ ] Type safety maintained throughout

## Red Flags - STOP and Re-evaluate

- "I'll just disable this check" → You're hiding the problem
- "It works on my machine" → Test on target platform
- "Type safety isn't critical here" → Types prevent runtime failures
- "I'll fix it later" → Evaluation errors only get worse
- "This is too complex to debug" → Use isolation, simplify

**All of these mean: Stop, apply systematic debugging, don't ship broken Nix.**

## Helper Scripts

### classify-error.sh

Classifies errors into systematic categories and provides targeted guidance.

### debug-evaluation.sh

Runs the complete systematic debugging workflow with phases for triage, isolation, and resolution.

## Integration with Sub-skills

This main skill provides the high-level workflow, while the `evaluation-errors` sub-skill provides detailed examples and additional helper scripts for specific error patterns.
