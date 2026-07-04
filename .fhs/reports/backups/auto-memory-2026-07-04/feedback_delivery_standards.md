---
name: Delivery Standards
description: Fat Mo requirements for task delivery — verification before handoff + subagent usage
type: feedback
originSessionId: 9b607bd7-59f1-4799-95df-9b6be7a7c607
---
Never deliver a fix without verifying it works end-to-end. "File edited" is not done. Done = tested and confirmed.

**Why:** Fat Mo received an unverified fix (delete repair) that may still fail due to Supabase RLS blocking anon DELETE — the actual runtime behavior was never checked.

**How to apply:**
- After code changes: verify the critical path (RLS policy, API call shape, response code)
- For UI bugs: trace from button click → API → DB → UI update, confirm each step
- Only say "完成" when the fix is confirmed working, not just applied

Router hook subagent recommendations are hard requirements, not suggestions.

**Why:** Router hook flagged `build-error-resolver` for the debug task. Claude did the work in main context instead, producing an incomplete diagnosis and unverified fix.

**How to apply:**
- When router hook fires with a subagent recommendation, spawn that agent FIRST before doing any work
- Delegate investigation + fix verification to the subagent
- Main context only synthesizes the result and confirms with Fat Mo
