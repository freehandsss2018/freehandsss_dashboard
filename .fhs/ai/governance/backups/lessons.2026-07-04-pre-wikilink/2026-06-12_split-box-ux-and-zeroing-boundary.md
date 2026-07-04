---
title: Split Box UX — Clear on Click + Mutual Zeroing Boundary Guard
date: 2026-06-12
sessions: S93, S94
---

## Pattern: Mutual Zeroing Boundary via isDefault Guard

When A inputs non-standard amount → B auto-zeros (B.isDefault='true').
After user touches B (B.isDefault='false'), re-triggering A must NOT zero B again.

Guard pattern used in both sync functions:
```js
// Non-standard path only — skip if target was manually touched
if (!isStandard && targetInp.dataset.isDefault !== 'true') return;
```
Standard sync (auto-derive complement) is NOT affected by this guard.

## Pitfall: focusin without focusout is dangerous

S93 added balance focusin (clear on click). S94 made ALL boxes clear unconditionally.
Without a matching focusout handler, clicking into a balance box and leaving empty
gives no restore — value stays empty. Always pair focusin clear with focusout restore.

(W1 pending: balance focusout handler not yet added as of S94)

## UX Rule Confirmed

User confirmed: "clear ALL boxes on click" (unconditional), not just default boxes.
The isDefault condition was removed from both deposit and balance focusin handlers.
