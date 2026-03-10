# NixOS Unified REPL Debugging for Complex Template Contexts

**Purpose**: Systematic debugging approach for nixos-unified + flake-part architectures with auto-imports, host-aware configs, and complex input chains.

## Core Principles

1. **Context-Aware Analysis**: Understand nixos-unified's autowiring and auto-import patterns
2. **Layered Evaluation**: Debug from inputs → outputs → modules → specific attributes
3. **Tool Integration**: Leverage justfile, nixd, statix, and alejandra effectively
4. **Systematic Isolation**: Break down complex template contexts into testable components

## Debugging Workflow

### Phase 1: Context Assessment

```bash
# 1. Check flake health and input structure
just io
nix flake metadata --json | jq '.locks.nodes | keys'

# 2. Verify nixos-unified autowiring
nix eval .#nixosConfigurations --apply 'builtins.attrNames' --show-trace
nix eval .#homeConfigurations --apply 'builtins.attrNames' --show-trace

# 3. Check module auto-imports
find modules/ -name '*.nix' | grep -E '(default|home)' | head -5
```

### Phase 2: REPL-Based Investigation

#### 2.1 Input and Output Analysis

```nix
# Enter nix repl
nix repl

# Load the flake
:lf .

# Check available outputs
outputs
builtins.attrNames outputs

# Examine home configurations
outputs.homeConfigurations
builtins.attrNames outputs.homeConfigurations

# Check specific configuration
outputs.homeConfigurations.m4rknewt0n.activationPackage
```

#### 2.2 Module System Debugging

```nix
# Debug module imports
outputs.homeConfigurations.m4rknewt0n.config.home.packages

# Trace module evaluation
outputs.homeConfigurations.m4rknewt0n.config.home.file
outputs.homeConfigurations.m4rknewt0n.options

# Check nixCats integration
outputs.homeConfigurations.m4rknewt0n.config.nixCats
```

#### 2.3 Input Chain Analysis

```nix
# Examine input following
inputs.nixpkgs.legacyPackages.x86_64-linux
inputs.home-manager
inputs.nixos-unified

# Check overlay applications
inputs.nixpkgs.legacyPackages.x86_64-linux.bat
```

### Phase 3: Error Isolation

#### 3.1 Attribute-Specific Debugging

```bash
# Isolate problematic attributes
nix eval .#homeConfigurations.m4rknewt0n.config.home.packages --show-trace
nix eval .#homeConfigurations.m4rknewt0n.config.programs --show-trace

# Test specific modules
nix eval .#homeConfigurations.m4rknewt0n.config.xdg.userDirs --show-trace
```

#### 3.2 Module Import Issues

```bash
# Check module file syntax
nix-instantiate --parse modules/home/default.nix --eval
nix-instantiate --parse modules/penguin/default.nix --eval

# Verify module structure
nix eval .#homeConfigurations.m4rknewt0n.config.home-manager.users --show-trace
```

#### 3.3 Overlay and Package Issues

```bash
# Test overlay applications
nix eval .#legacyPackages.x86_64-linux.bat --show-trace
nix build .#legacyPackages.x86_64-linux.neovim --dry-run

# Check input following
nix eval .#inputs.nixpkgs.legacyPackages.x86_64-linux.python3 --show-trace
```

## Common nixos-unified Patterns and Debugging

### Auto-Import Debugging

```nix
# Check what modules are auto-imported
outputs.homeConfigurations.m4rknewt0n.config.home-manager.sharedModules

# Verify nixCats integration
outputs.homeConfigurations.m4rknewt0n.config.nixCats.utils
```

### Host-Aware Configuration Issues

```nix
# Check host detection
outputs.homeConfigurations.m4rknewt0n.config.home.username
outputs.homeConfigurations.m4rknewt0n.config.home.homeDirectory

# Debug platform-specific modules
outputs.homeConfigurations.m4rknewt0n.pkgs.stdenv.hostPlatform
```

### Flake-Parts Integration

```nix
# Examine flake-parts outputs
outputs.formatter
outputs.devShells
outputs.checks

# Check treefmt integration
outputs.formatter.x86_64-linux
```

## Tool Integration

### Justfile Commands for Debugging

```bash
# Fast evaluation checks
just check                    # Full flake validation
just smart-derivation-check   # Only if .nix files changed
just deep-lint-changed        # Nixd LSP on changed files

# Module analysis
just modules-order           # Show import structure
just repo-tree              # Quick repository overview

# Build diagnostics
just lint-on-error          # Run nixd on build failure
```

### Nixd LSP Integration

```bash
# Full repository scan
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py . --idle-timeout 3.0

# Targeted file analysis
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py modules/home/default.nix
```

### Statix for Semantic Issues

```bash
# Check for common Nix issues
statix check
statix fix  # Auto-fix where possible

# Interactive workflow
./scripts/statix-workflow.sh
```

## Crisis Prevention Patterns

### Before Making Changes

1. **Baseline Check**: `just check && just deep-lint-changed`
2. **Module Impact**: `just modules-order` to understand dependencies
3. **Input Validation**: `nix flake metadata` to check input health

### During Development

1. **Incremental Validation**: `just smart-derivation-check-fast` after each change
2. **Targeted Testing**: `nix eval` for specific attributes
3. **Syntax Verification**: `nix-instantiate --parse` on new modules

### After Changes

1. **Full Validation**: `just full-check`
2. **Smoke Testing**: `just smoke-test`
3. **Backup Critical**: `just backup-critical`

## Repository-Specific Examples

### Debugging Home Manager Issues

```nix
# Common issue: nixCats integration
nix repl> :lf .
nix repl> outputs.homeConfigurations.m4rknewt0n.config.nixCats

# Check if nixCats homeModule is properly imported
nix repl> outputs.homeConfigurations.m4rknewt0n.config.home-manager.sharedModules
```

### Debugging Overlay Problems

```nix
# Test bat overlay (pinned version)
nix repl> outputs.legacyPackages.x86_64-linux.bat.version
nix repl> outputs.legacyPackages.x86_64-linux.bat.src

# Check windsurf fix overlay
nix repl> outputs.legacyPackages.x86_64-linux.windsurf
```

### Debugging Crostini-Specific Issues

```nix
# Check penguin module loading
nix repl> outputs.homeConfigurations.m4rknewt0n.config.home.packages
nix repl> outputs.homeConfigurations.m4rknewt0n.config.programs.zsh

# Verify crostini integration
nix repl> outputs.homeConfigurations.m4rknewt0n.config.xdg.mimeApps
```

## Advanced Techniques

### Trace-Based Debugging

```nix
# Add trace to problematic modules
{
  config,
  lib,
  pkgs,
  ...
}: {
  # Add this for debugging
  config.home.packages = with pkgs; [
    (lib.traceValFn (x: "Package: ${x.name}") bat)
  ];
}
```

### Selective Building

```bash
# Build only specific components
nix build .#homeConfigurations.m4rknewt0n.activationPackage
nix build .#legacyPackages.x86_64-linux.neovim

# Dry run to check paths
nix build .#homeConfigurations.m4rknewt0n.activationPackage --dry-run
```

### Input Isolation

```bash
# Test with minimal inputs
nix eval --impure --expr '
  let flake = builtins.getFlake (toString ./.);
  in flake.inputs.nixpkgs.legacyPackages.x86_64-linux.hello
'
```

## Integration with Existing Tools

### Neovim Integration

```bash
# Rebuild neovim flake separately
cd ~/Projects/neovim-flake && nix build .#markNvim

# Test neovim configuration
nix eval .#homeConfigurations.m4rknewt0n.config.programs.neovim
```

### Secret Management

```bash
# Check for secrets before debugging
just secret-check

# Validate no secrets in debug output
gitleaks detect --verbose --log-opts="-1"
```

This systematic approach prevents the crisis patterns identified in the git history by providing structured debugging methods specifically adapted to the nixos-unified + flake-parts architecture used in this repository.
