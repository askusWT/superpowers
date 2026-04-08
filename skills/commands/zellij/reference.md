# Zellij Reference

Use this helper when the primary skill needs more detail about commands, modes, config fields, or layout snippets.

## Config Discovery

Check these in order when grounding advice:

1. `--config-dir <DIR>`
2. `ZELLIJ_CONFIG_DIR`
3. `--config <FILE>`
4. `ZELLIJ_CONFIG_FILE`
5. default config locations such as `~/.config/zellij/config.kdl`

Useful companion paths:

- `~/.config/zellij/layouts/`
- repo-managed config paths in a dotfiles repo

## Common CLI

### Sessions

```bash
zellij
zellij -s work
zellij ls
zellij attach work
zellij attach -c work
zellij kill-session work
zellij delete-session work
zellij kill-all-sessions
zellij delete-all-sessions
```

### Layouts and Config

```bash
zellij -l dev
zellij --layout ~/.config/zellij/layouts/dev.kdl
zellij --config ~/.config/zellij/config.kdl
zellij --config-dir ~/.config/zellij
```

### New Panes or Editors

```bash
zellij run -- htop
zellij run -f -- lazygit
zellij run --cwd ~/Projects -- btop
zellij edit README.md
zellij edit --line-number 42 path/to/file
```

### Session Actions

```bash
zellij action new-pane
zellij action new-tab
zellij action go-to-next-tab
zellij action toggle-fullscreen
zellij action detach
```

## Common Subcommands

| Command | Purpose |
|---------|---------|
| `zellij attach` | attach to or create a session |
| `zellij ls` | list running and exited sessions |
| `zellij run` | open a pane running a command |
| `zellij edit` | open a file in a new pane |
| `zellij action` | control an active session |
| `zellij options` | change runtime options |
| `zellij plugin` | load a plugin |
| `zellij pipe` | pipe data to plugins |
| `zellij setup` | helper/setup utilities |
| `zellij convert-config` | migrate older config syntax |
| `zellij convert-layout` | migrate older layout syntax |
| `zellij convert-theme` | migrate older theme syntax |

## High-Value Flags

| Flag | Meaning |
|------|---------|
| `-s`, `--session <NAME>` | session name |
| `-l`, `--layout <LAYOUT>` | layout name or file |
| `-n`, `--new-session-with-layout <LAYOUT>` | force a new session with a layout |
| `-c`, `--config <FILE>` | config file path |
| `--config-dir <DIR>` | config directory |
| `--max-panes <N>` | pane limit |
| `-d`, `--debug` | debug mode |
| `--data-dir <DIR>` | plugin/data directory |

## Useful `zellij run` Flags

| Flag | Meaning |
|------|---------|
| `-c`, `--close-on-exit` | close pane when command exits |
| `--cwd <DIR>` | working directory |
| `-d`, `--direction <DIR>` | split direction |
| `-f`, `--floating` | floating pane |
| `--height`, `--width` | pane size |
| `-x`, `-y` | floating pane position |
| `-i`, `--in-place` | replace current pane |
| `-n`, `--name <NAME>` | pane title |
| `--pinned` | pin floating pane |
| `-s`, `--start-suspended` | wait for confirmation |
| `--stacked` | create a stacked pane |

## Modes

Zellij commonly uses these input modes:

| Mode | Purpose |
|------|---------|
| `normal` | default operations |
| `locked` | pass-through to terminal |
| `pane` | pane management |
| `resize` | pane resizing |
| `move` | pane movement |
| `tab` | tab management |
| `scroll` | scrollback navigation |
| `search` | search in scrollback |
| `entersearch` | enter the search query |
| `renametab` | rename a tab |
| `renamepane` | rename a pane |
| `session` | session manager controls |
| `tmux` | tmux-style compatibility mode |

If `clear-defaults true` is set, none of the usual defaults are guaranteed. Read the actual `keybinds` section.

## Common Runtime Actions

These are useful when the user needs to manipulate the current session programmatically:

- `NewPane`
- `CloseFocus`
- `ToggleFullscreen`
- `ToggleFloatingPanes`
- `SwitchToMode`
- `NewTab`
- `CloseTab`
- `GoToNextTab`
- `GoToPreviousTab`
- `MoveFocus`
- `Resize`
- `Detach`
- `Quit`
- `EditScrollback`
- `LaunchOrFocusPlugin`
- `Run`

## Top-Level `config.kdl` Fields Worth Checking

These options explain a large share of user issues:

| Option | Why it matters |
|--------|----------------|
| `default_shell` | determines what new panes launch |
| `default_cwd` | changes startup working directory |
| `pane_frames` | controls pane borders |
| `theme` | active theme selection |
| `default_layout` | startup layout |
| `default_mode` | initial input mode |
| `mouse_mode` | mouse behavior |
| `scroll_buffer_size` | scrollback size |
| `copy_command` | clipboard integration |
| `copy_clipboard` | clipboard target |
| `copy_on_select` | auto-copy behavior |
| `scrollback_editor` | editor used for scrollback |
| `layout_dir` | custom layout directory |
| `theme_dir` | custom theme directory |
| `session_serialization` | resurrection enablement |
| `pane_viewport_serialization` | visible viewport persistence |
| `scrollback_lines_to_serialize` | serialized scrollback volume |
| `serialization_interval` | save frequency |
| `disable_session_metadata` | metadata writes |
| `support_kitty_keyboard_protocol` | keyboard protocol support |
| `stacked_resize` | stacking behavior during resize |
| `show_startup_tips` | startup tips |
| `show_release_notes` | release notes display |
| `advanced_mouse_actions` | advanced pointer behavior |
| `max_panes` | pane ceiling |
| `post_command_discovery_hook` | resurrection command rewrite hook |

## Layout Patterns

### Simple split layout

```kdl
layout {
    pane
    pane split_direction="vertical" {
        pane
        pane
    }
}
```

### Tabbed workspace layout

```kdl
layout {
    tab name="editor" {
        pane
    }
    tab name="git" {
        pane command="lazygit"
    }
    tab name="monitor" {
        pane split_direction="vertical" {
            pane command="btop"
            pane
        }
    }
}
```

### Stacked panes

```kdl
pane stacked=true {
    pane name="editor" expanded=true
    pane name="tests"
    pane name="logs" command="tail" {
        args "-f" "app.log"
    }
}
```

## Resurrection Notes

Key points when users ask why sessions come back differently than expected:

- `session_serialization true` enables resurrection state
- pane viewport serialization is separate from session serialization
- restored command panes may wait for confirmation before re-running
- `--force-run-commands` skips the resurrection confirmation prompt
- `post_command_discovery_hook` can rewrite serialized commands before reuse

## Troubleshooting Prompts

When the issue is unclear, ask for:

- current `config.kdl`
- relevant layout file
- exact startup command
- `zellij --version`
- `zellij ls` output
- whether the behavior is in a fresh session or a resurrected one
