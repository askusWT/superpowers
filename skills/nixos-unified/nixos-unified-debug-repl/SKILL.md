---
name: NixOS Unified Debug REPL
description: Systematic debugging for nixos-unified template contexts with complex module systems and flake-parts architecture
when_to_use: when using nix repl or targeted evals to inspect nixos-unified outputs, module state, inputs, overlays, or host-specific configuration behavior
version: 1.0.0
languages: nix,bash
---

# NixOS Unified Debug REPL

## Overview

Systematic REPL and targeted-eval debugging for nixos-unified + flake-parts repositories. Focuses on outputs, module state, follows chains, and host-aware behavior without relying on guesswork.

**Core principle:** Start from flake outputs, then descend into the exact attribute that fails. Do not debug by editing blindly.

**Announce at start:** "I'm using the NixOS Unified Debug REPL skill to inspect and isolate evaluation state systematically."

Replace `<host>` with the real home or system configuration name for the target repository.

## Core Principles

1. **Context-aware analysis**: Understand autowiring, flake outputs, and host scoping before drilling into a failing attribute.
2. **Layered evaluation**: Debug inputs → outputs → modules → specific option paths.
3. **Targeted inspection**: Prefer `nix eval` or REPL queries on one attribute over broad rebuild attempts.
4. **Verification-first workflow**: Reproduce the failure in the smallest inspectable form, then verify the repaired path.

## Debugging Workflow

### Phase 1: Context Assessment

```bash
# Check flake health and discover outputs
nix flake metadata --json | jq '.locks.nodes | keys'
nix eval .#nixosConfigurations --apply 'builtins.attrNames' --show-trace
nix eval .#homeConfigurations --apply 'builtins.attrNames' --show-trace

# Check likely module entrypoints
find modules/ -name '*.nix' | grep -E '(default|home)' | head -5
```

### Phase 2: REPL-Based Investigation

#### 2.1 Output Discovery

```nix
nix repl

:lf .

outputs
builtins.attrNames outputs
outputs.homeConfigurations
builtins.attrNames outputs.homeConfigurations
outputs.homeConfigurations.<host>.activationPackage
```

#### 2.2 Module State Inspection

```nix
outputs.homeConfigurations.<host>.config.home.packages
outputs.homeConfigurations.<host>.config.home.file
outputs.homeConfigurations.<host>.options
outputs.homeConfigurations.<host>.config.home-manager.sharedModules
```

#### 2.3 Input and Overlay Inspection

```nix
inputs.nixpkgs.legacyPackages.x86_64-linux
inputs.home-manager
inputs.nixos-unified
inputs.nixpkgs.legacyPackages.x86_64-linux.bat
```

### Phase 3: Error Isolation

#### 3.1 Attribute-Specific Debugging

```bash
nix eval .#homeConfigurations.<host>.config.home.packages --show-trace
nix eval .#homeConfigurations.<host>.config.programs --show-trace
nix eval .#homeConfigurations.<host>.config.xdg.userDirs --show-trace
```

#### 3.2 Module Import Issues

```bash
nix-instantiate --parse modules/home/default.nix --eval
nix-instantiate --parse modules/penguin/default.nix --eval
nix eval .#homeConfigurations.<host>.config.home-manager.sharedModules --show-trace
```

#### 3.3 Overlay and Package Issues

```bash
nix eval .#legacyPackages.x86_64-linux.bat --show-trace
nix build .#legacyPackages.x86_64-linux.neovim --dry-run
nix eval .#inputs.nixpkgs.legacyPackages.x86_64-linux.python3 --show-trace
```

## Common nixos-unified Patterns

### Auto-Import Debugging

```nix
outputs.homeConfigurations.<host>.config.home-manager.sharedModules
```

If Home Manager imports are under suspicion, confirm `inputs.nixCats.homeModule` appears only in approved module locations.

### Host-Aware Configuration Issues

```nix
outputs.homeConfigurations.<host>.config.home.username
outputs.homeConfigurations.<host>.config.home.homeDirectory
outputs.homeConfigurations.<host>.pkgs.stdenv.hostPlatform
```

### Flake-Parts Integration

```nix
outputs.formatter
outputs.devShells
outputs.checks
outputs.formatter.x86_64-linux
```

## Tool Integration

### Verified Repo Commands

```bash
just lint
just deep-lint-changed
just check
just smoke-test
just modules-order
```

### Optional Repo-Specific Helper

Repo-specific helper example; use only if the target repository provides this script.

```bash
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py . --idle-timeout 3.0
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py modules/home/default.nix
```

### Semantic Checks

```bash
statix check
./scripts/statix-workflow.sh
```

## Debugging Patterns

### Home Manager Failures

```nix
nix repl> :lf .
nix repl> outputs.homeConfigurations.<host>.config.home-manager.sharedModules
nix repl> outputs.homeConfigurations.<host>.config.home.packages
```

### Overlay Problems

```nix
nix repl> outputs.legacyPackages.x86_64-linux.bat.version
nix repl> outputs.legacyPackages.x86_64-linux.bat.src
nix repl> outputs.legacyPackages.x86_64-linux.windsurf
```

### Crostini / Penguin Issues

```nix
nix repl> outputs.homeConfigurations.<host>.config.programs.zsh
nix repl> outputs.homeConfigurations.<host>.config.xdg.mimeApps
```

## Advanced Techniques

### Trace-Based Debugging

```nix
{
  config,
  lib,
  pkgs,
  ...
}: {
  config.home.packages = with pkgs; [
    (lib.traceValFn (x: "Package: ${x.name}") bat)
  ];
}
```

### Selective Building

```bash
nix build .#homeConfigurations.<host>.activationPackage --dry-run
nix build .#legacyPackages.x86_64-linux.neovim --dry-run
```

### Input Isolation

```bash
nix eval --impure --expr '
  let flake = builtins.getFlake (toString ./.);
  in flake.inputs.nixpkgs.legacyPackages.x86_64-linux.hello
'
```

## Verification Sequence

```bash
just lint
just deep-lint-changed
just check
```

Use this skill to turn vague evaluation failures into a repeatable inspection flow: discover outputs, isolate the failing attribute, inspect module state, and only then change code.
