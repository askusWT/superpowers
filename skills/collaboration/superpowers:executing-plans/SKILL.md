---
name: Executing Plans
description: Execute plans in batches with review checkpoints
when_to_use: When implementing a plan that needs systematic execution and quality control
version: 1.0.0
languages: markdown
---

# Executing Plans

## Overview

A systematic execution framework that breaks plans into manageable batches with review checkpoints at each stage. Ensures progress is tracked, quality is maintained, and risks are identified early.

**Core principle:** Execute in batches, review before proceeding, track progress visibly.

**Announce at start:** "I'm using the Executing Plans skill to implement this systematically."

## When to Use

**Trigger Conditions:**

- Large implementation tasks requiring step-by-step execution
- Plans with multiple dependencies between tasks
- Quality-critical implementations requiring checkpoints
- Long-running tasks that need progress visibility
- Complex workflows requiring careful sequencing

## Process

### Phase 1: Plan Analysis (5 minutes)

**Goal:** Understand the plan structure and dependencies

1. **Review the plan:**
   - Read the complete plan document
   - Identify all tasks and their order
   - Note dependencies between tasks
   - Highlight critical paths

2. **Create batch breakdown:**
   - Group related tasks into batches
   - Ensure each batch is self-contained
   - Identify dependencies between batches
   - Mark any parallelizable work

### Phase 2: Batch Execution (10-15 minutes per batch)

**Goal:** Execute one batch at a time with full attention

**Execution Pattern:**

1. **Clear context:**
   - Set up working environment
   - Install necessary dependencies
   - Verify prerequisites

2. **Execute batch tasks:**
   - Work through tasks in order
   - Test each task before moving on
   - Handle errors immediately

3. **Document progress:**
   - Update plan with completed items
   - Note any deviations from plan
   - Capture lessons learned

### Phase 3: Review Checkpoint (5-10 minutes)

**Goal:** Validate batch completion and quality

**Review Checklist:**

- All tasks in batch completed?
- Tests passing for batch functionality?
- Documentation updated?
- Dependencies satisfied?
- No unexpected side effects?

**Decision Points:**

- **Continue:** If all checks pass, proceed to next batch
- **Refactor:** If issues found, fix before continuing
- **Replan:** If batch reveals fundamental problems, revise plan

### Phase 4: Progress Tracking (Ongoing)

**Goal:** Maintain visibility into overall progress

**Tracking Methods:**

1. **Visual tracking:**
   - Progress bars for each batch
   - Task completion status
   - Remaining work estimate

2. **Documentation:**
   - Update plan with completed items
   - Log any deviations
   - Note lessons learned

3. **Communication:**
   - Report progress at checkpoints
   - Flag any blockers early
   - Manage stakeholder expectations

### Phase 5: Completion Review (10 minutes)

**Goal:** Final validation and cleanup

**Final Checklist:**

- All batches completed?
- All tests passing?
- Documentation complete?
- No TODOs or FIXMEs?
- Code reviewed?
- Ready for deployment?

## Best Practices

**During Execution:**

1. **Focus on one batch:** Don't switch context between batches
2. **Test frequently:** Validate work as you go, not at the end
3. **Document as you go:** Update plan and documentation in real-time
4. **Handle errors immediately:** Don't accumulate issues
5. **Track progress visibly:** Make progress clear to all stakeholders

**During Reviews:**

1. **Be thorough:** Check all aspects of the batch
2. **Be honest:** Flag issues even if they're minor
3. **Be decisive:** Make clear go/no-go decisions
4. **Document decisions:** Record why you chose to continue or fix

## Common Pitfalls

**Avoid:**

- Skipping review checkpoints
- Executing multiple batches without review
- Not updating documentation
- Ignoring errors until the end
- Working in isolation without progress updates

**Red Flags:**

- "I'll fix that later" without tracking
- Skipping tests during execution
- No visible progress tracking
- Documentation lagging behind work

## Batch Structure Example

```
Batch 1: Setup and Configuration (10 min)
- [ ] Install dependencies
- [ ] Configure environment
- [ ] Set up build system
- [ ] Run initial tests

Batch 2: Core Implementation (20 min)
- [ ] Implement feature X
- [ ] Implement feature Y
- [ ] Add validation logic
- [ ] Test core functionality

Batch 3: Integration and Polish (15 min)
- [ ] Integrate with other systems
- [ ] Add error handling
- [ ] Performance optimization
- [ ] Final testing
```

## Error Handling

**When Errors Occur:**

1. **Stop execution:** Don't continue with broken code
2. **Isolate the issue:** Determine if it's batch-specific or systemic
3. **Fix immediately:** Address the root cause
4. **Re-test:** Verify the fix works
5. **Re-evaluate:** Check if the error affects other batches

**Error Categories:**

- **Batch-specific:** Fix and continue
- **Plan error:** Revise plan and continue
- **Fundamental issue:** Stop and reassess approach

## Output

After completing this skill, you will have:

1. Plan executed in manageable batches
2. Quality checkpoints at each stage
3. Complete progress documentation
4. Validated implementation ready for review

**Next Steps:** Review the implementation and move to testing or deployment.
