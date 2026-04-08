---
name: shell-config-test
description: Inspect Home Manager shell config output before building, to catch sequencing errors early
when_to_use: when debugging plugin load order, initExtra placement, or module dependency issues in Home Manager shell configurations
version: 1.0.0
languages: nix, zsh
---

# Shell Config Test

Inspect Home Manager shell config output before building, to catch sequencing errors early.

## When to Use

- Debugging plugin load order, initExtra placement, or module dependency issues
- Validating that HM will generate the zshrc you expect
- Deciding whether a change requires a full build or can be validated with eval alone

## When NOT to Use

- Syntax errors — just use `zsh -n`
- Standalone snippets (aliases, functions) — paste into a running shell
- Runtime-only bugs (plugin fetch failures, missing PATH entries) — eval shows text, not execution

## The Technique

HM assembles shell config as plain Nix strings. `nix eval` returns the fully merged output with real sequencing, no build, no activation, no artifacts.

```bash
nix eval .#homeConfigurations.m4rknewt0n.config.programs.zsh.initContent --show-trace
```

This is the exact `.zshrc` body HM will write. It picks up working-tree changes without a commit.

## Decision Guide

| Symptom | Technique | Why |
|---------|-----------|-----|
| Parse error | `zsh -n` on the snippet | Fastest catch |
| Wrong plugin order | `nix eval` on `initContent` | Shows real HM sequencing |
| Plugin won't load | `nix eval` to verify it's emitted, then `just agent-run` to test runtime | Eval confirms presence, build confirms execution |
| Not sure what changed | Diff two `nix eval` outputs (before/after edit) | Isolates the delta |

## Rules

1. **ZDOTDIR simulation tests a static copy, not HM output.** It gives false confidence for ordering bugs.
2. **Eval inspects, build confirms.** If the eval output looks right but the shell still breaks, the issue is runtime (PATH, plugin fetch, missing binary) — not sequencing.
3. **Never run raw `nix build` or `nix run` in this repo.** Use `just lint`, `just check`, or `just agent-run`.
4. **Never edit Nix store symlinks.** They're read-only.
