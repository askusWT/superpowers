# Design Spec: Zellij Superpowers Skill

**Date:** 2026-03-12
**Status:** Approved
**Version Target:** 7.x
**Review Date:** 2026-03-12

## Summary

Turn the draft Zellij notes into a reusable global Superpowers skill so every supported agent can discover the same Zellij guidance through `superpowers-agent`.

## Problem

The current Zellij material lives as ad-hoc docs in `nixconfig/docs/codex/` and is not discoverable as a shared skill. It also mixes reusable guidance with machine-specific paths and personal defaults.

## Solution

Create a new global skill at `skills/commands/zellij/` in `~/Projects/superpowers-hardened/` with:

- `SKILL.md` as the primary workflow-oriented entry point
- `reference.md` as the heavier command/config reference
- `skill.json` for alias-based discovery via `superpowers-agent`

The skill should be generic first:

- remove machine-specific paths
- warn agents to inspect the user's actual `config.kdl` and layout files before assuming bindings
- separate runtime actions from persistent config/layout changes
- keep exhaustive syntax in `reference.md`

## Repository Rule Update

Update `nixconfig/ARCHITECTURE.md` so `Workflow Essentials` states that shared skills for all agents are created, installed, and managed through `superpowers-agent`.

Add a matching note to `nixconfig/docs/context/news.md` for future agents.

## Validation

- `jq empty skills/commands/zellij/skill.json`
- `superpowers-agent find-skills | rg -i zellij`
- `superpowers-agent path superpowers:commands/zellij`
