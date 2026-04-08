---
name: zellij
description: Use when working with Zellij sessions, panes, tabs, layouts, config.kdl, keybindings, plugins, or troubleshooting terminal workspaces
metadata:
  when_to_use: when the user asks about Zellij sessions, panes, tabs, layouts, config.kdl, keybindings, plugins, runtime actions, or troubleshooting terminal workspace behavior
  version: 1.0.0
  languages: all
---

# Zellij Helper

## Overview

Zellij advice is only reliable when it is grounded in the user's actual configuration. The same action can have different bindings or no binding at all when `clear-defaults true` is enabled.

**Core principle:** separate temporary runtime actions from persistent config/layout changes, and inspect the user's current `config.kdl` and layout files before assuming defaults.

## When to Use

**Use when:**
- The user needs help with sessions, attach/resurrect flow, panes, tabs, floating panes, or stacked panes
- The user asks about `config.kdl`, layouts, themes, plugins, or runtime actions
- The user wants keybinding help and may have custom modes or `clear-defaults true`
- The user is troubleshooting shell, editor, clipboard, layout, or resurrection behavior in Zellij

**Don't use when:**
- The question is really about `tmux`, `screen`, or a generic shell problem unrelated to Zellij
- You can answer the request from the user's pasted config directly without broader Zellij guidance

## Workflow

1. **Identify the scope first**
   - Runtime session issue
   - Persistent config/layout change
   - Plugin or mode question
   - Troubleshooting
2. **Inspect local config before assuming defaults**
   - `~/.config/zellij/config.kdl`
   - `~/.config/zellij/layouts/`
   - repo-managed equivalents in a dotfiles repo
3. **Check whether `clear-defaults` is enabled**
   - If it is, only explicitly defined keybinds exist
4. **Prefer the smallest change that solves the request**
   - one-off CLI command for current session needs
   - `zellij action ...` for controlling an active session
   - `config.kdl` or layout edits only for persistent behavior
5. **Load the heavy reference only when needed**
   - See `@reference.md` for commands, modes, config options, and layout snippets

## Quick Reference

| Goal | Start Here |
|------|------------|
| Start or name a session | `zellij`, `zellij -s work` |
| Attach or create | `zellij attach -c work` |
| List sessions | `zellij ls` |
| Load a layout | `zellij -l dev` or `zellij --layout path/to/layout.kdl` |
| Run a command in a pane | `zellij run -- htop` |
| Edit a file in a pane | `zellij edit path/to/file` |
| Inspect config | `~/.config/zellij/config.kdl` |
| Inspect layouts | `~/.config/zellij/layouts/` |

## Runtime vs Persistent Changes

**Use runtime commands when:**
- The user wants to manipulate the current session
- The user needs a quick pane, tab, floating pane, or command launcher
- The user is scripting an existing session with `zellij action`

**Use config or layout edits when:**
- The user wants stable startup behavior
- The user wants custom keybindings or modes
- The user wants reusable workspace layouts
- The user wants session restoration, theme, shell, or plugin defaults

## Common Mistakes

**Assuming default keybindings**
- Many setups customize modes heavily or clear defaults entirely.
- Fix: inspect `keybinds` and `clear-defaults` first.

**Hardcoding machine-specific paths**
- Shells, editors, and layout directories vary across systems.
- Fix: prefer `$HOME`, config-dir flags, or the user's existing paths.

**Editing config for one-off actions**
- Not every need requires a persistent layout or binding change.
- Fix: reach for CLI commands or `zellij action` first.

**Confusing layout names with file paths**
- Layout loading can use a built-in/layout-dir name or an explicit file path.
- Fix: confirm whether the user means `-l <name>` or `--layout <path>`.

**Forgetting resurrection behavior**
- Restored command panes may wait for confirmation before running.
- Fix: account for resurrection prompts and `--force-run-commands` when relevant.

## Troubleshooting Checklist

1. Check the installed version: `zellij --version`
2. Check session state: `zellij ls`
3. Verify config resolution: `--config`, `--config-dir`, `ZELLIJ_CONFIG_DIR`
4. Verify referenced shell/editor/copy commands exist
5. Verify layout files exist where the config expects them
6. If keybindings are wrong, inspect the active `keybinds` block before suggesting fixes
