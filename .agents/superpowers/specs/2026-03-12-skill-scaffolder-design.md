# Design Spec: Project-Local Skill Scaffolder

**Date:** 2026-03-12
**Status:** Approved
**Version Target:** 7.1.x

## Summary

Add a `superpowers-agent scaffold-skill` command that turns a draft directory centered on `SKILL.md` into a ready-to-discover skill package, defaulting to project-local output in `.agents/skills`.

## Why

Project-local skill scaffolding avoids the shared Superpowers sync/path issue during early drafting while still preserving a later promotion path into shared skills.

## Inputs

- Draft directory containing exactly one `SKILL.md`
- Optional helper markdown files such as `reference.md`
- Destination skill path such as `commands/zellij`

## Outputs

- `SKILL.md`
- copied helper markdown files
- generated `skill.json`

## Defaults

- Scope defaults to `project`
- Existing targets fail unless `--force` is provided
- Draft `skill.json` is ignored and regenerated

## Validation

- `node --test "test/**/*.test.js"`
- `node src/cli.js scaffold-skill <draft-dir> <skill-path>`
