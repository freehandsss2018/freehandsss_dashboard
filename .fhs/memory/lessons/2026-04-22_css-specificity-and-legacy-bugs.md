---
name: CSS Specificity Trap + V37 Legacy Bugs (V40 Session)
description: Two critical bugs found in V40 functional testing — inline style specificity trap causing invisible modal, and V37 Admin_Notes always saving empty string
type: feedback
---

## Lesson 1: CSS Specificity — Inline Style Blocks Class Override

**Rule:** Never use inline `style="opacity:0; pointer-events:none"` on modals/overlays if you intend to toggle visibility via CSS class (`.active { opacity:1; pointer-events:auto }`). CSS classes **cannot** override inline styles.

**Why:** The V40 delete modal was invisible and click-through even after `classList.add('active')`. Root cause: opacity and pointer-events were set in inline style attribute (leftover from Tailwind migration). JS added `.active` class but `opacity:1` in the class couldn't win over `opacity:0` in the inline style.

**Fix applied:** Remove opacity/pointer-events from inline style. Put `#deleteConfirmModal { opacity:0; pointer-events:none }` in CSS. Let `.active` class override freely.

**How to apply:** Whenever modal/overlay visibility is controlled by JS class toggle, ensure the default hidden state is in CSS (not inline style). Same applies to `transform` animations — remove from inline style so CSS class can control them.

---

## Lesson 2: V37 Admin_Notes Legacy Bug — `saveInlineEdit()` ID vs Value

**Rule:** `saveInlineEdit(recordId, field, elementId, itemIndex)` expects **element ID** (string) as 3rd param, not the element value.

**Why:** In V37/current.html, the global audit center's Admin_Notes textarea uses:
```
onblur="saveInlineEdit('${o.id}', 'Admin_Notes', this.value)"
```
`this.value` passes the text content. Inside `saveInlineEdit`, `document.getElementById(this.value)` returns `null`, so the value is read as `''`. Every Admin_Notes edit silently saved an empty string to Airtable.

**Fix applied in V40:**
```html
<textarea id="notes-input-${o.id}" onblur="saveInlineEdit('${o.id}', 'Admin_Notes', 'notes-input-${o.id}')">
```

**How to apply:** This bug exists in V37/current.html too. Should be backported. Always verify `saveInlineEdit` call signatures against function signature when touching the global audit center.

---

## Lesson 3: Subagent Static Analysis Has False Positives — Verify with Grep

**Rule:** When a code-reviewer subagent flags a pattern as "still present," do a direct `grep` on the actual file before trusting the verdict on complex, multi-thousand-line files.

**Why:** During Round 2 review, subagent flagged `.fat-mo-mode` as still present. Direct grep confirmed the pattern was gone — subagent was reading an older snapshot or hitting context limits. Blind trust would have caused unnecessary rework.

**How to apply:** For files > 2000 lines, always verify critical assertions (especially pass/fail gates) with direct file search before acting on subagent output.

---

## Lesson 4: Drawer Mirror — `cloneNode` Result Can Only Have One Parent

**Rule:** When mirroring DOM sections via `cloneNode(true)` into multiple destinations, each `clone` call creates a single node. If you `appendChild` to two parents, the node moves to the second (DOM detaches from first).

**Why:** `v40InitDrawerMirrors()` had a bug where QA clone was appended to `settingsDst` AND `qaDst`. DOM moved the clone to `qaDst`, leaving `settingsDst` empty. Symptoms: Settings drawer tab showing blank content.

**Fix:** Remove the erroneous `settingsDst.appendChild(clone)` line — one clone per destination, or call `cloneNode` separately for each.

**How to apply:** Each drawer tab needs its own `cloneNode(true)` call from the source.
