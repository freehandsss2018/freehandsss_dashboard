# Lesson: Financial Restoration Consistency in Dashboard V41

## Context
When loading historical orders from Supabase (Supabase-First mode), financial fields (Deposit, Balance, Additional Fee) were often being reset to 0 or placeholders despite correct data in the database.

## Root Cause
1. **Injection Sequence**: The financial injection was happening before the general form state restoration (`restoreFormState`), causing restored default/empty values to overwrite the injected database truth.
2. **UI Sync Lag**: Even when injected, the text preview (IG Message) didn't update because `generate()` wasn't triggered automatically after programmatic value changes.
3. **Key Case Sensitivity**: Supabase keys (`deposit` vs `Deposit`) were sometimes inconsistent across legacy records.

## Solution
1. **Delayed Injection**: Moved financial injection to the absolute end of the reconstruction sequence.
2. **Manual UI Trigger**: Explicitly called `generate()` and `calculatePricing()` after injecting values into the DOM to ensure preview and engine synchronization.
3. **Nullish Coalescing**: Used `data.deposit ?? data.Deposit` pattern to handle case-insensitive payload keys.

## Prevention
Always treat financial fields as "Final Truth" from the database and ensure they are the last to be set in any state restoration logic, followed by a manual UI refresh trigger.
