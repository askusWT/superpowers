# NixOS Unified Configuration Conflict Resolver

**Purpose**: Systematic resolution of configuration conflicts in nixos-unified + flake-parts architectures, focusing on module imports, overlays, and option definitions.

## Core Principles

1. **Module System Awareness**: Understand nixos-unified's auto-import and module merging behavior
2. **Option Conflict Detection**: Identify and resolve option definition conflicts systematically
3. **Overlay Integration**: Handle overlay conflicts and package version mismatches
4. **Incremental Resolution**: Resolve conflicts step-by-step with validation at each stage

## Conflict Detection

### Phase 1: Option Conflict Analysis

```bash
# 1. Check for option conflicts
nix flake check 2>&1 | grep -E "(option|defined|multiple)"
nix eval .#homeConfigurations.m4rknewt0n.options --show-trace 2>&1 | grep -i conflict

# 2. Identify duplicate definitions
nix eval .#homeConfigurations.m4rknewt0n.config --show-trace 2>&1 | grep -E "(already|defined|multiple)"

# 3. Check module import issues
just modules-order
grep -R "import.*modules/" modules/ | sort | uniq -c | sort -nr
```

### Phase 2: Module System Conflicts

```bash
# 1. Check for circular imports
find modules/ -name '*.nix' -exec grep -l "import.*\.\./\.\./" {} \;

# 2. Identify duplicate module definitions
find modules/ -name 'default.nix' | xargs grep -l "config\."

# 3. Check nixCats integration conflicts
grep -R "nixCats" modules/ | grep -v "homeModule"
```

### Phase 3: Overlay Conflicts

```bash
# 1. Check overlay application order
nix eval .#legacyPackages.x86_64-linux --apply 'pkgs: builtins.attrNames pkgs'

# 2. Test specific overlays
nix eval .#legacyPackages.x86_64-linux.bat --apply 'pkg: pkg.version'
nix eval .#legacyPackages.x86_64-linux.windsurf --apply 'pkg: pkg.version'

# 3. Check for overlay conflicts
nix eval .#overlays --apply 'overlays: builtins.attrNames overlays'
```

## Resolution Strategies

### Strategy 1: Option Definition Conflicts

```bash
# 1. Locate conflicting definitions
nix eval .#homeConfigurations.m4rknewt0n.config.programs.zsh --show-trace

# 2. Check module priority
grep -R "programs\.zsh" modules/ | grep -v "disabled"

# 3. Resolve with mkIf or mkMerge
# Example resolution pattern:
{
  programs.zsh = lib.mkIf (config.penguin.enable) {
    enable = true;
    # ... zsh configuration
  };
}
```

### Strategy 2: Module Import Conflicts

```bash
# 1. Map import dependencies
find modules/ -name '*.nix' -exec grep -H "^import" {} \; | sort

# 2. Check for duplicate imports
grep -R "import.*me\.nix" modules/
grep -R "import.*desktop\.nix" modules/

# 3. Consolidate imports
# Use modules/home/default.nix as central import point
```

### Strategy 3: Overlay Conflicts

```bash
# 1. Identify overlay conflicts
nix eval .#legacyPackages.x86_64-linux.bat --apply 'pkg: pkg.src'

# 2. Check overlay precedence
nix eval .#overlays.bat-extras-skip-tests

# 3. Resolve overlay ordering
# Ensure overlays are applied in correct order in modules/flake-parts/overlays.nix
```

## Common Conflict Patterns and Solutions

### Pattern 1: Home Manager Option Conflicts

```nix
# Problem: Multiple modules define the same option
# modules/home/me.nix
{
  programs.git.userName = "m4rknewt0n";
}

# modules/penguin/git.nix
{
  programs.git.userName = "different";
}

# Solution: Use conditional definitions
{
  programs.git = {
    userName = lib.mkDefault "m4rknewt0n";
    userEmail = lib.mkDefault "default@example.com";
  };
}

# Or use mkIf for platform-specific
{
  programs.git = lib.mkIf config.penguin.enable {
    userName = "m4rknewt0n";
    userEmail = "penguin@example.com";
  };
}
```

### Pattern 2: Package Version Conflicts

```nix
# Problem: Multiple overlays modify the same package
# overlays/windsurf-fix.nix
final: prev: {
  windsurf = prev.windsurf.override { /* ... */ };
}

# overlays/bat-extras-skip-tests.nix
final: prev: {
  bat = prev.bat.override { /* ... */ };
}

# Solution: Use composeExtensions or prioritize
{
  overlays = [
    (import ../overlays/windsurf-fix.nix)
    (import ../overlays/bat-extras-skip-tests.nix)
  ];
}
```

### Pattern 3: Module Import Conflicts

```nix
# Problem: Circular or duplicate imports
# modules/home/default.nix
{
  imports = [
    ./me.nix
    ./desktop.nix
  ];
}

# modules/penguin/default.nix
{
  imports = [
    ../home/me.nix  # Duplicate import
    ./desktop.nix
  ];
}

# Solution: Centralize imports
{
  imports = [
    # Core modules (imported once)
    ../home/me.nix
    ../home/desktop.nix

    # Platform-specific modules
    ./crostini-integration.nix
  ];
}
```

## Repository-Specific Conflict Resolution

### Home Manager Integration Conflicts

```bash
# 1. Check nixCats module conflicts
nix eval .#homeConfigurations.m4rknewt0n.config.nixCats --show-trace

# 2. Verify homeManager.sharedModules
nix eval .#homeConfigurations.m4rknewt0n.config.home-manager.sharedModules

# 3. Resolve nixCats import
# Ensure only one nixCats.homeModule import exists
grep -R "nixCats\.homeModule" modules/
```

### Crostini/Penguin Module Conflicts

```bash
# 1. Check for duplicate program definitions
grep -R "programs\." modules/penguin/ | grep -v "disabled"

# 2. Resolve shell conflicts
# modules/penguin/zshell.nix vs modules/home/configs.nix
nix eval .#homeConfigurations.m4rknewt0n.config.programs.zsh --show-trace

# 3. Fix XDG conflicts
nix eval .#homeConfigurations.m4rknewt0n.config.xdg --show-trace
```

### Development Environment Conflicts

```bash
# 1. Check devshell conflicts
nix eval .#devShells.x86_64-linux.default --show-trace

# 2. Resolve formatter conflicts
nix fmt . --dry-run 2>&1 | grep -E "(conflict|error)"

# 3. Check LSP integration
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py . --idle-timeout 1.0
```

## Resolution Workflow

### Step 1: Conflict Identification

```bash
# 1. Run comprehensive check
just check 2>&1 | tee conflict-check.log

# 2. Extract conflict patterns
grep -E "(option|defined|multiple|already)" conflict-check.log

# 3. Map conflict locations
grep -n "programs\." modules/home/default.nix modules/penguin/default.nix
```

### Step 2: Impact Analysis

```bash
# 1. Test affected configurations
nix eval .#homeConfigurations.m4rknewt0n.config.home.packages --show-trace

# 2. Check dependent modules
just modules-order

# 3. Verify overlay impact
nix eval .#legacyPackages.x86_64-linux --apply 'pkgs: [ pkgs.bat pkgs.neovim ]'
```

### Step 3: Resolution Implementation

```bash
# 1. Apply resolution patterns
# Use mkIf, mkDefault, mkMerge as appropriate

# 2. Test incremental changes
nix eval .#homeConfigurations.m4rknewt0n.config --show-trace

# 3. Validate resolution
just check
just deep-lint-changed
```

### Step 4: Validation and Testing

```bash
# 1. Full validation
just full-check

# 2. Smoke test critical functionality
just smoke-test

# 3. Test specific integrations
nix build .#homeConfigurations.m4rknewt0n.activationPackage --dry-run
```

## Advanced Resolution Techniques

### Using lib.mkMerge for Complex Conflicts

```nix
# Resolve multiple conflicting definitions
{
  programs.git = lib.mkMerge [
    (lib.mkIf config.penguin.enable {
      userName = "penguin-user";
      extraConfig = { init.defaultBranch = "main"; };
    })
    (lib.mkIf (!config.penguin.enable) {
      userName = "default-user";
      extraConfig = { init.defaultBranch = "master"; };
    })
  ];
}
```

### Conditional Module Loading

```nix
# Prevent module conflicts with conditional loading
{
  imports = lib.optionals config.penguin.enable [
    ./crostini-integration.nix
    ./penguin-specific.nix
  ] ++ lib.optionals (!config.penguin.enable) [
    ./standard-desktop.nix
  ];
}
```

### Overlay Composition

```nix
# Compose overlays to prevent conflicts
{
  overlays = lib.composeManyExtensions [
    (final: prev: {
      # Base overlay
    })
    (import ../overlays/bat-extras-skip-tests.nix)
    (import ../overlays/windsurf-fix.nix)
  ];
}
```

## Prevention Strategies

### Module Design Patterns

```nix
# Use proper module structure
{
  options.penguin.enable = lib.mkEnableOption "Penguin/Crostini support";

  config = lib.mkIf config.penguin.enable {
    # Penguin-specific configuration
    programs.zsh = {
      enable = true;
      # Only define options not defined elsewhere
      shellAliases = {
        # Platform-specific aliases only
      };
    };
  };
}
```

### Import Organization

```nix
# Centralize imports in default.nix files
{
  imports = [
    # Core functionality (no conflicts)
    ./assertions.nix
    ./configs.nix

    # Feature modules (use mkIf)
    ./desktop.nix
    ./me.nix
  ];
}
```

### Overlay Management

```nix
# Document overlay purpose and interactions
{
  overlays = {
    # Package-specific fixes
    bat-extras-skip-tests = import ../overlays/bat-extras-skip-tests.nix;
    windsurf-fix = import ../overlays/windsurf-fix.nix;

    # Development tools
    neovim-custom = import ../overlays/neovim-custom.nix;
  };
}
```

## Integration with Existing Tools

### Justfile Commands for Conflict Resolution

```bash
# Use existing validation commands
just check              # Detect conflicts
just deep-lint-changed  # LSP-based conflict detection
just modules-order      # Import structure analysis

# Resolution validation
just smart-derivation-check-fast  # Quick validation
just smoke-test                  # Functional testing
```

### Nixd LSP Integration

```bash
# Use LSP for real-time conflict detection
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py modules/home/default.nix
python3 ~/nixconfig/modules/penguin/zsh/python_functions/nixd_scan.py modules/penguin/default.nix
```

### Statix for Semantic Conflicts

```bash
# Check for semantic issues that lead to conflicts
statix check
statix fix  # Auto-fix where possible

./scripts/statix-workflow.sh  # Interactive conflict review
```

This systematic approach to configuration conflict resolution prevents the cascade failures and module system issues identified in the repository history by providing structured resolution methods specifically adapted to the nixos-unified + flake-parts architecture.
