---
name: Dashboard try-catch swallows variable errors silently
description: syncToAirtable() try-catch block silently catches ReferenceError from TDZ, causing empty Order_Items_List — always declare variables before try
type: feedback
---

Dashboard `syncToAirtable()` has a `try { ... } catch (err) { console.warn(...) }` block that silently swallows errors and continues sending the order with empty items.

**Why:** V45.7.5 incident — `const currentOrderId` was declared AFTER the try-catch but used INSIDE the try. JavaScript TDZ threw `ReferenceError`, catch swallowed it, `orderItemsArray` stayed `[]`. Every Dashboard order sent 0 items to n8n. Took multiple debug sessions to discover because the error was invisible.

**How to apply:** When editing `syncToAirtable()` or similar functions with try-catch, ensure ALL variables used inside the try block are declared BEFORE the try. Never trust the catch block to surface errors — it logs a generic warning and continues.
