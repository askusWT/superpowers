---
name: project-memory
description: Set up and maintain a structured project memory system in docs/project_notes/ that tracks bugs with solutions, architectural decisions, key project facts, and work history. Use this skill when asked to "set up project memory", "track our decisions", "log a bug fix", "update project memory", or "initialize memory system".
---

# Project Memory
z

## When to Use

Invoke this skill when:

- Starting a new project that will accumulate knowledge over time
- The project already has recurring bugs or decisions that should be documented
- The user asks to "set up project memory" or "track our decisions"
- Encountering a problem that feels familiar ("didn't we solve this before?")
- Before proposing an architectural change (check existing decisions first)
  
## Core Capabilities

### 1. Initial Setup - Create Memory Infrastructure

When invoked for the first time in a project, create the following structure:

docs/
└── project_notes/
    ├── bugs.md         # Bug log with solutions
    ├── decisions.md    # Architectural Decision Records
    ├── key_facts.md    # Project configuration and constants
    └── issues.md       # Work log with ticket references

**Directory naming rationale:** Using `docs/project_notes/` instead of `memory/makes it look like standard engineering organization, not AI-specific tooling.

### 2. Configure AGENTS.md - Memory-Aware Behavior

Add or update the following section in the project's `AGENTS.md` file:

## Project Memory System

### Memory-Aware Protocols

**Before proposing architectural changes:**
- Check `docs/project_notes/decisions.md` for existing decisions
- Verify the proposed approach doesn't conflict with past choices

**When encountering errors or bugs:**
- Search `docs/project_notes/bugs.md` for similar issues
- Apply known solutions if found
- Document new bugs and solutions when resolved

**When looking up project configuration:**
- Check `docs/project_notes/key_facts.md` for credentials, ports, URLs
- Prefer documented facts over assumptions

###
**Check for other agents:**
- check root for CLAUDE.md, GEMINI.md or other agent files
- insert a requirement to check AGENTS.md for project memory instructions