---
name: justfile
description: Use when working with Justfiles, recipe syntax, settings, modules, parameters, or just CLI troubleshooting
metadata:
  when_to_use: when the user asks about writing or editing a justfile, understanding just syntax, designing recipes, or debugging just invocation and discovery behavior
  version: 1.0.0
  languages: all
---

# Justfile Helper

## Overview

Advice about `just` is only reliable when it is grounded in the repo's existing `justfile` and workflow. The syntax comes from `just`, but which recipes should exist and what they should run comes from the project.

**Core principle:** inspect the current `justfile` first, then make the smallest recipe or setting change that solves the user's workflow.

## When to Use

**Use when:**
- The user needs help writing or editing a `justfile`
- The user asks about recipe syntax, variables, parameters, modules, settings, or invocation
- The user wants to debug `just` discovery, quoting, argument passing, or shell behavior
- The user wants examples of common `just` patterns

**Don't use when:**
- The request is really about `make`, `task`, or generic shell scripting with no `just` component
- The answer is entirely repo-specific workflow and does not need `just` syntax guidance

## Workflow

1. **Ground in the current repo first**
   - Inspect `justfile`, `Justfile`, or `.justfile`
   - Check `just --list` or `just --summary` before assuming recipe names
   - Read any repo docs that define workflow expectations
2. **Identify the real problem**
   - Syntax question
   - Recipe design
   - Invocation or discovery issue
   - Quoting, parameters, or shell behavior
   - Refactor or cleanup
3. **Prefer the smallest safe change**
   - Add or adjust one recipe before restructuring the file
   - Keep project naming and existing conventions
   - Move large shell logic into scripts when the recipe stops being readable
4. **Separate syntax from project policy**
   - Use `just` syntax from the reference
   - Keep commands, tools, and default recipes aligned with the repo's actual workflow
5. **Load the heavy reference only when needed**
   - See `@reference.md` for the full upstream syntax and feature reference

## Quick Reference

| Goal | Start Here |
|------|------------|
| List recipes | `just --list` |
| Show a concise recipe list | `just --summary` |
| Run the default recipe | `just` |
| Run a named recipe | `just <recipe>` |
| Check what file `just` is using | inspect `justfile`, `Justfile`, or `.justfile` in the current directory tree |
| Need exact syntax or settings details | `@reference.md` |

## Common Mistakes

**Assuming `make` semantics**
- `just` is a command runner, not a build system.
- Fix: use `just` patterns directly instead of importing `make` habits blindly.

**Guessing recipe names**
- Repos often use custom task names and conventions.
- Fix: inspect the current file and list recipes before suggesting commands.

**Using recipes for large shell programs**
- Complex shell logic becomes hard to read and maintain inside recipes.
- Fix: prefer a checked-in script or a focused shebang recipe when logic grows.

**Changing project workflow when only syntax help was needed**
- A valid `just` pattern may still be wrong for the repo.
- Fix: preserve the existing workflow unless the user wants to redesign it.

## Troubleshooting Checklist

1. Check the installed version: `just --version`
2. Check recipe discovery: `just --list`
3. Check the current file name and location: `justfile`, `Justfile`, or `.justfile`
4. Confirm the working directory and whether `just` is finding a parent `justfile`
5. Confirm the external tools used by the recipe actually exist
6. If syntax is unclear or edge-case behavior matters, load `@reference.md`
