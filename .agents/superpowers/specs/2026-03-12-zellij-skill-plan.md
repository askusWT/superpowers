# Zellij Skill Implementation Plan

> **For AGENTS:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Publish a reusable global `zellij` skill through `superpowers-agent` and document the shared management rule in `nixconfig`.

**Architecture:** The implementation promotes the draft notes into a real Superpowers skill directory, keeps heavier Zellij details in a helper reference file, and updates `nixconfig` guidance so future agents know shared skills must flow through `superpowers-agent`.

**Tech Stack:** Markdown, JSON, `superpowers-agent`

---

### Task 1: Create the global skill

**Files:**
- Create: `skills/commands/zellij/SKILL.md`
- Create: `skills/commands/zellij/reference.md`
- Create: `skills/commands/zellij/skill.json`

**Step 1: Write the primary skill entry point**

Author `SKILL.md` with trigger-only metadata, a grounded workflow, a quick reference, and common mistakes.

**Step 2: Write the helper reference**

Author `reference.md` with reusable command, mode, config, and layout notes that are too heavy for `SKILL.md`.

**Step 3: Add discovery metadata**

Create `skill.json` with the skill name, title, helper file list, and aliases for `zellij` and `commands/zellij`.

**Step 4: Validate the metadata**

Run: `jq empty skills/commands/zellij/skill.json`
Expected: command exits successfully with no output.

### Task 2: Document the shared-skill rule in nixconfig

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `docs/context/news.md`

**Step 1: Update workflow guidance**

Add a `Workflow Essentials` bullet stating that shared skills for all agents are created, installed, and managed through `superpowers-agent`.

**Step 2: Add a news note**

Add a dated `docs/context/news.md` entry summarizing the new shared-skill management rule.

### Task 3: Validate discovery

**Files:**
- Verify: `skills/commands/zellij/SKILL.md`
- Verify: `skills/commands/zellij/skill.json`

**Step 1: Confirm the skill is discoverable**

Run: `superpowers-agent find-skills | rg -i zellij`
Expected: output includes the new `zellij` skill.

**Step 2: Confirm direct path lookup**

Run: `superpowers-agent path superpowers:commands/zellij`
Expected: output points to `skills/commands/zellij/SKILL.md`.
