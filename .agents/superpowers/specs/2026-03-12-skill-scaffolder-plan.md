# Skill Scaffolder Implementation Plan

> **For AGENTS:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Add a project-local-first `superpowers-agent scaffold-skill` command and permanent `python = python3` shell alias.

**Architecture:** The shell alias change is a small Home Manager alias update in `nixconfig`, while the CLI addition lives in Superpowers as a new command module plus focused tests. The scaffolder defaults to `.agents/skills` for the current project to keep early drafting friction low.

**Tech Stack:** Nix, JavaScript ESM, `node:test`

---

### Task 1: Add the shell alias

**Files:**
- Modify: `modules/penguin/aliases.nix`

Add `python = "python3";` to the permanent shell aliases.

### Task 2: Add the scaffolder command

**Files:**
- Create: `.agents/src/commands/scaffold-skill.js`
- Modify: `.agents/src/cli.js`

Add a new CLI command that accepts a draft directory, target skill path, optional scope, and force flag, then writes a skill package to the resolved project or shared destination.

### Task 3: Add focused tests

**Files:**
- Create: `.agents/test/scaffold-skill.test.js`

Cover happy path, missing `SKILL.md`, stale draft `skill.json`, multiple helper markdown files, and overwrite behavior.

### Task 4: Validate

**Commands:**
- `node --test "test/**/*.test.js"`
- `node src/cli.js scaffold-skill <draft-dir> <skill-path>`
- `git diff --check`
