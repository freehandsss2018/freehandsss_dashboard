---
name: systematic-debugging
source: https://github.com/obra/superpowers
vendor_date: 2026-05-09
description: Four-phase root cause investigation. NO FIXES WITHOUT ROOT CAUSE FIRST. Use for any bug, test failure, or unexpected behavior.
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures / Bugs in production / Unexpected behavior
- Performance problems / Build failures / Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes that didn't work

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully** — Don't skip past errors; read stack traces completely
2. **Reproduce Consistently** — Can you trigger it reliably? What are exact steps?
3. **Check Recent Changes** — Git diff, recent commits, new dependencies, config changes
4. **Gather Evidence in Multi-Component Systems** — Add diagnostic instrumentation at each component boundary; log what enters and exits each layer; run once to gather evidence BEFORE analyzing

5. **Trace Data Flow** — Where does bad value originate? Trace backward up the call stack until you find the source. Fix at source, not at symptom.

### Phase 2: Pattern Analysis

1. Find working examples of similar code in the same codebase
2. Compare against reference implementations completely (read every line)
3. Identify every difference, however small
4. Understand all dependencies and assumptions

### Phase 3: Hypothesis and Testing

1. Form a single, specific hypothesis: "I think X is the root cause because Y"
2. Make the SMALLEST possible change to test the hypothesis — one variable at a time
3. Verify: Did it work? YES → Phase 4. NO → form NEW hypothesis (don't add more fixes on top)

### Phase 4: Implementation

1. Create a failing test case first (use `systematic-debugging` + `test-driven-development` together)
2. Implement single fix — address root cause only; no "while I'm here" improvements
3. Verify fix works and no other tests broken
4. **If 3+ fixes failed → STOP. Question the architecture, not the symptom.**

## Red Flags — STOP and Follow Process

If you catch yourself thinking any of these, return to Phase 1:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- **"One more fix attempt" (when already tried 2+)**

## Quick Reference

| Phase | Key Question | Cannot Skip Because |
|-------|-------------|---------------------|
| **1. Root Cause** | What AND why? | Without this, you're guessing |
| **2. Pattern** | What works vs. broken? | Prevents solving wrong problem |
| **3. Hypothesis** | What specifically? | One change, testable theory |
| **4. Implement** | Fix source, not symptom | Prevents recurrence |

## Real-World Impact

- Systematic approach: 15-30 min to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
