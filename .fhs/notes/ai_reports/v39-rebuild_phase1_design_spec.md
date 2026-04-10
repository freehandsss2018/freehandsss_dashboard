# V39 Rebuild Phase 1 Design Specification
**Version**: V39 Phase 1
**Date**: 2026-04-08
**Role**: ui-designer (FHS Edition)
**Status**: COMPLETE — ready for frontend-developer Phase 2

> This document is the sole legitimate design input for the frontend-developer in Phase 2.
> No V36/V37/V38 visual styles or CSS class names may be referenced.
> All Contract-Critical IDs are sourced from Phase 0 Contract Freeze document.

---

## 1. DESIGN TOKENS

### 1.1 Color Palette

Design philosophy: warm off-white base, deep ink text, coral orange as primary.
Deliberately departs from V36 color trio: #457B9D blue / #E63946 red / #52B788 green.
Target aesthetic: warm, premium handcraft studio.

```css
:root {
  /* BRAND */
  --fhs-primary:         #C9714A;   /* coral orange — primary CTA */
  --fhs-primary-light:   #F0D4C4;   /* pale coral — hover bg */
  --fhs-primary-dark:    #A0512E;   /* deep coral — pressed state */

  /* SURFACE */
  --fhs-bg:              #FAF7F4;   /* page background — warm white */
  --fhs-surface:         #FFFFFF;   /* card background */
  --fhs-surface-raised:  #F5F0EB;   /* nested section background */
  --fhs-surface-sunken:  #EDE8E2;   /* input background */

  /* BORDER */
  --fhs-border:          #DDD5CC;   /* general borders */
  --fhs-border-focus:    #C9714A;   /* focus ring = primary */
  --fhs-border-subtle:   #EDE8E2;   /* dividers */

  /* SEMANTIC */
  --fhs-accent:          #7B6FA0;   /* violet — mode pills, badges */
  --fhs-accent-light:    #E8E4F4;
  --fhs-warning:         #D4A017;   /* amber — sandbox, baby age warning */
  --fhs-warning-light:   #FDF3D0;
  --fhs-success:         #4A9E7B;   /* sage green — sync OK, ID valid */
  --fhs-success-light:   #D4EDE4;
  --fhs-danger:          #B94040;   /* deep red — delete, error */
  --fhs-danger-light:    #F5DADA;

  /* TEXT */
  --fhs-text-primary:    #1A1614;   /* near-black */
  --fhs-text-secondary:  #5C504A;   /* mid warm gray */
  --fhs-text-muted:      #9C8E86;   /* placeholder, hints */
  --fhs-text-inverse:    #FFFFFF;   /* on dark buttons */
  --fhs-text-accent:     #C9714A;   /* emphasis = primary */
}

/* Sandbox mode override — amber warns of non-production state */
body.sandbox-mode {
  --fhs-primary:       #D4A017;
  --fhs-primary-light: #FDF3D0;
  --fhs-primary-dark:  #A07A10;
  --fhs-border-focus:  #D4A017;
}

/* Fat Mo role — accent shifts to steel blue for config panels */
body.role-fat {
  --fhs-accent:       #4A7B9E;
  --fhs-accent-light: #D4E4F0;
}
```
### 1.2 Typography

```css
:root {
  /* FONT FAMILY */
  --fhs-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                   "Helvetica Neue", Arial, sans-serif;
  --fhs-font-mono: "SF Mono", "Fira Code", Consolas, monospace;

  /* SIZE SCALE — rem, base 16px */
  --fhs-text-xs:   0.6875rem;  /* 11px — labels, status dots */
  --fhs-text-sm:   0.8125rem;  /* 13px — hints, secondary text */
  --fhs-text-base: 1rem;       /* 16px — form inputs: REQUIRED for iPhone no-zoom */
  --fhs-text-lg:   1.125rem;   /* 18px — card sub-titles */
  --fhs-text-xl:   1.25rem;    /* 20px — card titles */
  --fhs-text-2xl:  1.5rem;     /* 24px — pricing numbers */
  --fhs-text-3xl:  2rem;       /* 32px — hero price display */

  /* WEIGHT SCALE */
  --fhs-weight-normal:   400;
  --fhs-weight-medium:   500;
  --fhs-weight-semibold: 600;
  --fhs-weight-bold:     700;

  /* LINE HEIGHT */
  --fhs-leading-tight:   1.25;
  --fhs-leading-snug:    1.375;
  --fhs-leading-normal:  1.5;
  --fhs-leading-relaxed: 1.625;
}
```

### 1.3 Spacing System (4px base grid)

```css
:root {
  --fhs-space-1:   0.25rem;   /*  4px */
  --fhs-space-2:   0.5rem;    /*  8px */
  --fhs-space-3:   0.75rem;   /* 12px */
  --fhs-space-4:   1rem;      /* 16px */
  --fhs-space-5:   1.25rem;   /* 20px */
  --fhs-space-6:   1.5rem;    /* 24px */
  --fhs-space-8:   2rem;      /* 32px */
  --fhs-space-10:  2.5rem;    /* 40px */
  --fhs-space-12:  3rem;      /* 48px */
  --fhs-space-16:  4rem;      /* 64px */
}
```

### 1.4 Border Radius

```css
:root {
  --fhs-radius-sm:   0.25rem;   /*  4px — small details */
  --fhs-radius-md:   0.5rem;    /*  8px — inputs */
  --fhs-radius-lg:   0.875rem;  /* 14px — cards */
  --fhs-radius-xl:   1.25rem;   /* 20px — drawer top corners, modal */
  --fhs-radius-full: 9999px;    /* pill / toggle / badge */
}
```

### 1.5 Shadows

```css
:root {
  --fhs-shadow-card:     0 1px 3px rgba(26,22,20,0.08), 0 1px 2px rgba(26,22,20,0.06);
  --fhs-shadow-elevated: 0 4px 12px rgba(26,22,20,0.10), 0 2px 4px rgba(26,22,20,0.06);
  --fhs-shadow-drawer:   4px 0 24px rgba(26,22,20,0.18);
  --fhs-shadow-modal:    0 8px 32px rgba(26,22,20,0.22);
  --fhs-shadow-toast:    0 4px 16px rgba(26,22,20,0.14);
}
```

### 1.6 Transitions

```css
:root {
  --fhs-ease-out:    cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --fhs-ease-in:     cubic-bezier(0.55, 0.055, 0.675, 0.19);
  --fhs-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  --fhs-duration-fast:   150ms;
  --fhs-duration-normal: 250ms;
  --fhs-duration-slow:   350ms;

  --fhs-transition-fast:   all 150ms  cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --fhs-transition-normal: all 250ms  cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --fhs-transition-slow:   all 350ms  cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### 1.7 Layout Constants

```css
:root {
  --fhs-header-height:     56px;
  --fhs-bottom-bar-height: 72px;
  --fhs-drawer-width:      min(88vw, 360px);
  --fhs-content-padding:   1rem;    /* 16px side padding */
  --fhs-card-gap:          1rem;    /* 16px between cards */

  /* Safe area — required for iPhone notch and home bar */
  --fhs-safe-top:    env(safe-area-inset-top, 0px);
  --fhs-safe-bottom: env(safe-area-inset-bottom, 0px);
  --fhs-safe-left:   env(safe-area-inset-left, 0px);
  --fhs-safe-right:  env(safe-area-inset-right, 0px);
}
```

---
## 2. COMPONENT LIBRARY SPEC

### 2.1 Card

CSS class: .fhs-card  DO NOT use .card or .form-group (V36 legacy — banned)

Background: var(--fhs-surface)
Border-radius: var(--fhs-radius-lg)
Box-shadow: var(--fhs-shadow-card)
Padding: var(--fhs-space-5)
Margin-bottom: var(--fhs-card-gap)
Border: 1px solid var(--fhs-border-subtle)

.fhs-card-header: flex row, align-items center, gap space-3
  margin-bottom space-4, padding-bottom space-3, border-bottom 1px border-subtle
  .fhs-card-icon: 24x24px, color primary
  .fhs-card-title: font-size lg, weight semibold, color text-primary

Active state (JS: card has non-empty inputs): border-left 3px solid primary
Error state (JS: validation fail): border-left 3px solid danger
### 2.2 Toggle Switch (Category Enable)

CSS: .fhs-toggle-wrap (row), .fhs-toggle-input (hidden checkbox), .fhs-toggle (track)
Thumb is CSS ::after on .fhs-toggle — NOT a separate element.

Track (.fhs-toggle):
  width 48px, height 28px, border-radius full
  background: surface-sunken [off] / primary [on via :checked sibling]
  border: 1.5px solid border
  transition: background 250ms ease-out

Track ::after (thumb):
  24x24? No: width 20px, height 20px, border-radius 50%
  position absolute, top 3px, left 3px [off] / left 23px [on]
  background: white, box-shadow 0 1px 4px rgba(0,0,0,0.18)
  transition: left 250ms cubic-bezier(0.34,1.56,0.64,1) [spring]

CSS rule pattern:
  .fhs-toggle-input { opacity:0; position:absolute; width:0; height:0; }
  .fhs-toggle-input:checked ~ .fhs-toggle { background: var(--fhs-primary); border-color: var(--fhs-primary); }
  .fhs-toggle-input:checked ~ .fhs-toggle::after { left: 23px; }

Tap target: .fhs-toggle-wrap min-height 44px, display flex, align-items center, gap space-3

Sizes: default 48x28 (category level) / .fhs-toggle-sm 40x24 (section level) / .fhs-toggle-xs 32x20 (limb level)

CRITICAL restoreFormState contract:
  el.checked = val;
  el.dispatchEvent(new Event("change", {bubbles:true}));
  el.dispatchEvent(new Event("input",  {bubbles:true}));

### 2.3 Section Accordion (contentP/K/M/W)

CSS: .fhs-accordion-body, toggled by .active class via toggleAddon()

Collapsed (no .active):
  max-height:0; overflow:hidden; opacity:0; transform:translateY(-4px)

Expanded (.active):
  max-height:2000px; opacity:1; transform:translateY(0)
  transition: max-height 350ms ease-out, opacity 250ms ease-out, transform 250ms ease-out

Style: background surface-raised, border-radius md, padding space-4, margin-top space-3, border 1px border

CRITICAL: JS toggleAddon(contentId, checkboxEl) must toggle .active, dispatch change+input, then call generate()

### 2.4 Nested Part-Details Accordion

CSS: .fhs-part-box  DO NOT use .part-details (V36 legacy — banned)

margin-left space-4, border-left 2px solid border
padding space-3 (all sides), padding-left space-4
background surface, border-radius 0 md md 0, margin-top space-2
Same max-height collapse, transition duration-normal 250ms

Sub-section header (.fhs-subsec-row):
  display flex, align-items center, min-height 44px, gap space-2
  font-size sm, weight medium, color text-secondary, text-transform uppercase, letter-spacing 0.04em

### 2.5 Input Field

CSS: .fhs-input, .fhs-select, .fhs-label, .fhs-field

Base (.fhs-input):
  display block, width 100%, height 48px
  padding 0 space-4
  background surface-sunken, border 1.5px solid border, border-radius md
  font-size: 1rem  [16px — MANDATORY: prevents iOS Safari zoom on focus]
  font-family sans, color text-primary, caret-color primary
  transition border-color+background+box-shadow 150ms ease-out

:focus: border-color border-focus, background surface, outline none, box-shadow 0 0 0 3px primary-light
::placeholder: color text-muted
:disabled: opacity 0.45, cursor not-allowed

.fhs-label: display block, font-size sm, weight medium, color text-secondary, margin-bottom space-1
.fhs-field: margin-bottom space-4
.fhs-select: + appearance none, SVG chevron via background-image at right space-4, padding-right space-10
.fhs-input-mono: font-family mono  [for orderIdDisplay]
.fhs-input-currency: text-align right  [for deposit, balance, additional]

### 2.6 Mini-Col Layout (qty / top / bot)

CSS: .fhs-mini-col (3-col), .fhs-mini-col-2 (2-col)

Recommended structure (wrap each column to avoid subgrid dependency):
  <div class="fhs-mini-col">
    <div class="fhs-mini-col-col">
      <span class="fhs-mini-label">數量</span>
      <input id="k_lh_qty" class="fhs-input" ...>
    </div>
    <div class="fhs-mini-col-col">
      <span class="fhs-mini-label">上排</span>
      <input id="k_lh_top" class="fhs-input" ...>
    </div>
    <div class="fhs-mini-col-col">
      <span class="fhs-mini-label">下排</span>
      <input id="k_lh_bot" class="fhs-input" ...>
    </div>
  </div>

.fhs-mini-col: display grid, grid-template-columns 64px 1fr 1fr, gap space-2, align-items end
.fhs-mini-col-2: grid-template-columns 64px 1fr
.fhs-mini-col-col: display flex, flex-direction column, gap space-1
.fhs-mini-label: font-size xs, color text-muted, text-transform uppercase, letter-spacing 0.06em, text-align center
qty input: text-align center, font-weight semibold
### 2.7 Bottom Action Bar

CSS: .fhs-bottom-bar

position fixed, bottom 0, left 0, right 0
height calc(72px + var(--fhs-safe-bottom))
padding-bottom var(--fhs-safe-bottom)
padding-inline space-4
display flex, align-items center, gap space-3
background rgba(250,247,244,0.92)
backdrop-filter blur(12px) saturate(1.4)
-webkit-backdrop-filter blur(12px) saturate(1.4)
border-top 1px solid border-subtle
z-index 100

.fhs-btn-sync (#syncBtn):
  flex 1, height 52px
  background primary, color white, border none, border-radius lg
  font-size base, font-weight semibold, letter-spacing 0.02em
  :active: background primary-dark, transform scale(0.97), transition fast

.fhs-btn-delete:
  width 52px, height 52px, flex none
  background danger-light, color danger, border none, border-radius md
  display none by default
  body.mode-edit .fhs-btn-delete { display: flex; align-items:center; justify-content:center }

### 2.8 Drawer Panel

CSS: .fhs-drawer, .fhs-drawer-backdrop

Drawer:
  position fixed, top 0, left 0, bottom 0
  width var(--fhs-drawer-width)  [min(88vw, 360px)]
  z-index 200
  overflow-y auto, -webkit-overflow-scrolling touch, overscroll-behavior contain
  background surface, border-radius 0 xl xl 0, box-shadow shadow-drawer
  padding-top calc(safe-top + space-4), padding-bottom calc(safe-bottom + space-8)
  padding-inline space-5

Closed: transform translateX(-100%), visibility hidden
  transition: transform 350ms ease-out, visibility 0ms delay-350ms

Open (body.fhs-drawer-open aside, or aside.fhs-drawer--open):
  transform translateX(0), visibility visible
  transition: transform 350ms ease-out, visibility 0ms delay-0ms

Backdrop (.fhs-drawer-backdrop):
  position fixed, inset 0, z-index 199
  background rgba(26,22,20,0.45)
  opacity 0, pointer-events none  [closed]
  opacity 1, pointer-events auto  [open]
  transition: opacity 250ms ease-out

Drawer section separator (.fhs-drawer-section):
  border-top 1px solid border-subtle, padding-top space-5, margin-top space-5

.fhs-drawer-section-title:
  font-size xs, weight bold, color text-muted
  text-transform uppercase, letter-spacing 0.08em, margin-bottom space-3

Visibility rules:
  body.role-ling #fatmoConfigPanel { display: none; }
  body.role-fat  #fatmoConfigPanel { display: block; }
  body.role-ling #qaCenter { display: none; }
  body.role-fat  #qaCenter { display: block; }

### 2.9 Mode Pill Tabs

CSS: .fhs-mode-tabs, .fhs-mode-tab, .fhs-mode-tab.active

.fhs-mode-tabs: display flex, background surface-sunken, border-radius full, padding 3px, gap 2px

.fhs-mode-tab:
  flex 1, height 36px, border-radius full, border none
  font-size sm, weight medium
  cursor pointer, transition all 250ms ease-out
  Inactive: background transparent, color text-secondary
  Active: background surface, color text-primary, weight semibold, box-shadow shadow-card

Active tab mode color dot (::before pseudo):
  width 6px, height 6px, border-radius full, margin-right space-1
  modeCreateBtn active: dot color success
  modeEditBtn active: dot color accent
  modeReviewBtn active: dot color warning

### 2.10 Role Badge

Drawer buttons (.fhs-role-btn):
  width 100%, height 44px, border-radius md
  border 1.5px solid border, font-size sm, weight medium
  Ling inactive: bg surface-sunken, color text-muted
  Ling active (body.role-ling #roleLingBtn): bg primary-light, color primary-dark, border-color primary
  Fat active (body.role-fat #roleFatBtn): bg accent-light, color accent, border-color accent

Header compact dots (.fhs-role-dot):
  width 28px, height 28px, border-radius full, font-size xs, weight bold
  Same active/inactive color logic at compact scale

### 2.11 Toast (#toast)

CSS: .fhs-toast, .fhs-toast-visible, .fhs-toast--success, .fhs-toast--error

position fixed
bottom calc(72px + safe-bottom + space-4)
left 50%, transform translateX(-50%) translateY(8px)
z-index 300
min-width 220px, max-width calc(100vw - 32px)
padding space-3 space-5, background text-primary, color white
border-radius full, font-size sm, weight medium, text-align center
box-shadow shadow-toast
opacity 0, pointer-events none  [hidden]
transition: opacity 250ms ease-spring, transform 250ms ease-spring

.fhs-toast-visible: opacity 1, transform translateX(-50%) translateY(0)
Auto-dismiss: JS removes .fhs-toast-visible after 2000ms

Variants: .fhs-toast--success bg success / .fhs-toast--error bg danger

### 2.12 Delete Confirm Modal (#deleteConfirmModal)

CSS: .fhs-modal-backdrop, .fhs-modal-sheet

Backdrop: position fixed, inset 0, z-index 250, background rgba(26,22,20,0.55)
  display flex, align-items flex-end  [sheet slides from bottom]
  opacity 0 [hidden] / opacity 1 [shown], transition 250ms ease-out

Sheet (.fhs-modal-sheet):
  width 100%, max-width 480px, margin 0 auto
  background surface, border-radius xl xl 0 0
  padding space-6 space-5, padding-bottom calc(space-6 + safe-bottom)
  box-shadow shadow-modal
  transform translateY(100%) [hidden] / translateY(0) [shown]
  transition: transform 350ms cubic-bezier(0.34,1.56,0.64,1)

Drag handle (.fhs-modal-handle): 36x4px, bg border, border-radius full, margin 0 auto space-5
.fhs-modal-title: font-size xl, weight semibold, color danger
#deleteModalOrderId: font-family mono, font-size sm, color text-muted
#confirmDeleteBtn: height 52px, width 100%, bg danger, color white, border-radius lg, weight semibold
Cancel btn: height 52px, width 100%, bg surface-sunken, color text-secondary

### 2.13 Global Loader (#globalLoader)

CSS: .fhs-loader, .fhs-loader-active

position fixed, inset 0, z-index 400
background rgba(250,247,244,0.85), backdrop-filter blur(4px)
display none [default] / display flex [.fhs-loader-active]
flex-direction column, align-items center, justify-content center, gap space-4

Spinner (.fhs-loader-spinner):
  40x40px, border 3px solid border, border-top-color primary, border-radius 50%
  animation: fhs-spin 0.8s linear infinite
  @keyframes fhs-spin { to { transform: rotate(360deg) } }

#loaderText: font-size sm, color text-secondary, weight medium
---

## 3. ANNOTATED DOM SKELETON

All contract-critical IDs marked [CONTRACT].
Event handler names are verbatim from Phase 0 — do NOT rename.

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover">
  <!-- viewport-fit=cover: enables env(safe-area-inset-*) -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#FAF7F4">
  <title>FHS Dashboard</title>
  <link rel="stylesheet" href="fhs-v39.css">
</head>

<body class="role-ling mode-create">
<!-- Body classes managed by JS:
     Role:   role-ling | role-fat
     Mode:   mode-create | mode-edit | mode-review
     Other:  sandbox-mode, fhs-drawer-open -->

<!-- === LAYER 1: DRAWER (z-index 200) === -->
<aside id="fhs-drawer" class="fhs-drawer" aria-hidden="true">

  <div class="fhs-drawer-header">
    <span class="fhs-drawer-title">FHS</span>
    <button class="fhs-drawer-close">x</button>
  </div>

  <!-- [CONTRACT] sandboxBanner -->
  <div id="sandboxBanner" class="fhs-sandbox-banner" hidden>
    SANDBOX MODE
  </div>

  <div class="fhs-drawer-section">
    <p class="fhs-drawer-section-title">操作角色</p>
    <div class="fhs-role-row">
      <!-- [CONTRACT] roleLingBtn -->
      <button id="roleLingBtn" class="fhs-role-btn" onclick="setRole('ling')">L 令狐</button>
      <!-- [CONTRACT] roleFatBtn -->
      <button id="roleFatBtn" class="fhs-role-btn" onclick="setRole('fat')">F 肥貓</button>
    </div>
  </div>

  <!-- [CONTRACT] fatmoConfigPanel — hidden when role-ling -->
  <div id="fatmoConfigPanel" class="fhs-drawer-section">
    <p class="fhs-drawer-section-title">Fat Mo 配置</p>
    <!-- [CONTRACT] btnIdModeRandom, btnIdModeSeq -->
    <button id="btnIdModeRandom" onclick="setIdMode('random')">亂數</button>
    <button id="btnIdModeSeq"    onclick="setIdMode('sequential')">序號</button>
    <!-- [CONTRACT] seqSetRow, nextSeqIdInput (excluded from captureFormState) -->
    <div id="seqSetRow" hidden>
      <label for="nextSeqIdInput">下一序號</label>
      <input id="nextSeqIdInput" class="fhs-input" type="number">
    </div>
    <!-- [CONTRACT] configSyncStatus -->
    <p id="configSyncStatus"></p>
    <!-- [CONTRACT] sandboxToggleBtn -->
    <button id="sandboxToggleBtn" onclick="toggleSandbox()">OFF</button>
  </div>

  <!-- [CONTRACT] reviewModeContainer -->
  <div id="reviewModeContainer" class="fhs-drawer-section">
    <p class="fhs-drawer-section-title">全域核對
      <span id="reviewCountBadge" class="fhs-badge"></span><!-- [CONTRACT] -->
    </p>
    <!-- [CONTRACT] reviewYear, reviewMonth, reviewStatus, reviewBatch, reviewSearch -->
    <select id="reviewYear"   class="fhs-input" onchange="fetchGlobalReview()"></select>
    <select id="reviewMonth"  class="fhs-input" onchange="fetchGlobalReview()"></select>
    <select id="reviewStatus" class="fhs-input" onchange="fetchGlobalReview()"></select>
    <input  id="reviewBatch"  class="fhs-input" oninput="fetchGlobalReview()">
    <input  id="reviewSearch" class="fhs-input" type="search" oninput="fetchGlobalReview()">
    <!-- [CONTRACT] reviewLoading, reviewTable, reviewTableBody -->
    <p id="reviewLoading" hidden>載入中...</p>
    <table id="reviewTable"><tbody id="reviewTableBody"></tbody></table>
    <!-- Dynamic IDs written by JS:
         batch-input-{orderId}-{index}
         status-select-{orderId}-{index}
         save-indicator-{orderId} -->
  </div>

  <!-- [CONTRACT] qaCenter, qaLog, qaDocPanel, toggleDocBtn -->
  <div id="qaCenter" class="fhs-drawer-section">
    <p class="fhs-drawer-section-title">QA 中心</p>
    <button id="toggleDocBtn" onclick="toggleDoc()">文件</button>
    <div id="qaDocPanel" hidden></div>
    <div id="qaLog"></div>
  </div>

</aside>

<div id="fhs-drawer-backdrop" class="fhs-drawer-backdrop"></div>

<!-- === LAYER 2: STICKY HEADER (z-index 50) === -->
<header id="fhs-header" class="fhs-header">
  <button id="fhs-drawer-trigger" class="fhs-menu-btn" aria-label="選單">
    <span class="fhs-hamburger"></span>
  </button>
  <!-- [CONTRACT] modeCreateBtn, modeEditBtn, modeReviewBtn -->
  <div class="fhs-mode-tabs">
    <button id="modeCreateBtn" class="fhs-mode-tab active" onclick="switchMode('create')">新單</button>
    <button id="modeEditBtn"   class="fhs-mode-tab"        onclick="switchMode('edit')">更新</button>
    <button id="modeReviewBtn" class="fhs-mode-tab"        onclick="switchMode('review')">核對</button>
  </div>
  <!-- Compact role dots in header (supplementary visual only) -->
  <div class="fhs-header-role">
    <button class="fhs-role-dot" onclick="setRole('ling')">L</button>
    <button class="fhs-role-dot" onclick="setRole('fat')">F</button>
  </div>
</header>

<!-- === LAYER 3: EDIT MODE SEARCH BAR (z-index 40, shown only in mode-edit) === -->
<!-- [CONTRACT] editModeContainer, searchOrderId, fetchStatus, searchSuggestions -->
<div id="editModeContainer" class="fhs-edit-search-bar">
  <input id="searchOrderId" class="fhs-input fhs-input-search"
         placeholder="輸入訂單號 FHS-XXXX"
         oninput="handleFuzzySearch()">
  <button class="fhs-btn-sm" onclick="fetchOldOrder()">讀取</button>
  <p id="fetchStatus" class="fhs-status-text"></p>
  <div id="searchSuggestions" class="fhs-suggestions"></div>
</div>

<!-- === LAYER 4: MAIN SCROLL === -->
<main class="fhs-main">

  <!-- [CONTRACT] formContainer — captureFormState() scans THIS container only -->
  <div id="formContainer">

    <!-- ── CARD 1: 客戶資訊 ── -->
    <section class="fhs-card" data-card="customer">
      <div class="fhs-card-header">
        <span class="fhs-card-icon">👤</span>
        <span class="fhs-card-title">客戶資訊</span>
      </div>
      <!-- [CONTRACT] idInputGroup, idStatusDot, orderIdDisplay -->
      <div class="fhs-id-row" id="idInputGroup">
        <span id="idStatusDot" class="fhs-id-dot"></span>
        <input id="orderIdDisplay" class="fhs-input fhs-id-display"
               disabled onblur="onIdInputBlur()">
      </div>
      <!-- [CONTRACT] idStatusText -->
      <p id="idStatusText" class="fhs-id-status-text">系統自動生成</p>

      <!-- [CONTRACT] momName -->
      <div class="fhs-field-group">
        <label class="fhs-label" for="momName">聯絡人稱呼</label>
        <input id="momName" class="fhs-input" type="text"
               placeholder="待定" oninput="generate()">
      </div>

      <!-- [CONTRACT] appDate -->
      <div class="fhs-field-group">
        <label class="fhs-label" for="appDate">約定日期</label>
        <input id="appDate" class="fhs-input" type="date" onchange="generate()">
      </div>

      <!-- [CONTRACT] babyAgeMonths, babyAgeWarning -->
      <div class="fhs-field-group">
        <label class="fhs-label" for="babyAgeMonths">嬰兒月齡</label>
        <input id="babyAgeMonths" class="fhs-input" type="number"
               placeholder="例如：4" min="0" oninput="generate()">
      </div>
      <div id="babyAgeWarning" class="fhs-warning-banner" hidden></div>

      <!-- [CONTRACT] appTimeHour, appTimeAmPm -->
      <div class="fhs-field-row">
        <div class="fhs-field-group fhs-field-grow">
          <label class="fhs-label">預約時間</label>
          <select id="appTimeHour" class="fhs-input" onchange="generate()"></select>
        </div>
        <div class="fhs-field-group">
          <label class="fhs-label">&nbsp;</label>
          <select id="appTimeAmPm" class="fhs-input" onchange="updateTimeOptions()">
            <option value="上午">上午</option>
            <option value="下午">下午</option>
          </select>
        </div>
      </div>
    </section>

    <!-- ── CARD 2: 產品選擇 ── -->
    <section class="fhs-card" data-card="products">
      <div class="fhs-card-header">
        <span class="fhs-card-icon">🎨</span>
        <span class="fhs-card-title">產品選擇</span>
      </div>

      <!-- Category P: 立體擺設 -->
      <div class="fhs-toggle-wrap">
        <label class="fhs-toggle-input-wrap">
          <!-- [CONTRACT] enableP -->
          <input type="checkbox" id="enableP" class="fhs-toggle-input"
                 onchange="toggleAddon('contentP', this)">
          <span class="fhs-toggle"></span>
        </label>
        <span class="fhs-category-label">🖼️ 立體擺設</span>
      </div>
      <!-- [CONTRACT] contentP -->
      <div id="contentP" class="fhs-accordion-body">
        <div class="fhs-field-group">
          <!-- [CONTRACT] pSubCat -->
          <label class="fhs-label">款式</label>
          <select id="pSubCat" class="fhs-input"
                  onchange="renderLimbGrid(); generate();">
            <option value="木框款式">木框款式</option>
            <option value="玻璃瓶款式">玻璃瓶款式</option>
          </select>
        </div>
        <!-- [CONTRACT] limbContainer — dynamic limb grid rendered by renderLimbGrid() -->
        <!-- Dynamic: limb-sel elements with data-who + data-part — required by captureFormState -->
        <div id="limbContainer" class="fhs-limb-grid"></div>
        <!-- [CONTRACT] pEngraving -->
        <div class="fhs-field-group">
          <label class="fhs-label">底板刻字</label>
          <input id="pEngraving" class="fhs-input" placeholder="待定"
                 oninput="generate()">
        </div>
        <!-- Dynamic: woodStyle, baseColor injected by renderLimbGrid() when pSubCat=木框 -->

        <!-- [CONTRACT] en_parent, box_parent -->
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <label class="fhs-toggle-input-wrap">
            <input type="checkbox" id="en_parent" class="fhs-toggle-input fhs-toggle-input-sm"
                   onchange="togglePart('box_parent', this)">
            <span class="fhs-toggle fhs-toggle-sm"></span>
          </label>
          <span class="fhs-section-label">成人部位</span>
        </div>
        <div id="box_parent" class="fhs-part-details"></div>

        <!-- [CONTRACT] en_elder, box_elder -->
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <label class="fhs-toggle-input-wrap">
            <input type="checkbox" id="en_elder" class="fhs-toggle-input fhs-toggle-input-sm"
                   onchange="togglePart('box_elder', this)">
            <span class="fhs-toggle fhs-toggle-sm"></span>
          </label>
          <span class="fhs-section-label">大寶部位</span>
        </div>
        <div id="box_elder" class="fhs-part-details"></div>

        <!-- [CONTRACT] adultWoodForceHint -->
        <div id="adultWoodForceHint" class="fhs-force-hint" hidden></div>
      </div>

      <!-- Category K: 鎖匙扣 -->
      <div class="fhs-toggle-wrap">
        <label class="fhs-toggle-input-wrap">
          <!-- [CONTRACT] enableK -->
          <input type="checkbox" id="enableK" class="fhs-toggle-input"
                 onchange="toggleAddon('contentK', this)">
          <span class="fhs-toggle"></span>
        </label>
        <span class="fhs-category-label">🔑 鎖匙扣</span>
      </div>
      <!-- [CONTRACT] contentK -->
      <div id="contentK" class="fhs-accordion-body">

        <!-- Baby section -->
        <!-- [CONTRACT] k_baby_sec_en, k_baby_sec_box -->
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <label class="fhs-toggle-input-wrap">
            <input type="checkbox" id="k_baby_sec_en" class="fhs-toggle-input fhs-toggle-input-sm"
                   checked onchange="toggleAddon('k_baby_sec_box', this)">
            <span class="fhs-toggle fhs-toggle-sm"></span>
          </label>
          <span class="fhs-section-label">嬰兒</span>
        </div>
        <div id="k_baby_sec_box" class="fhs-part-details active">
          <!-- 4 limbs: lh rh lf rf -->
          <!-- [CONTRACT] k_lh_en, k_lh_box, k_lh_qty, k_lh_top, k_lh_bot -->
          <div class="fhs-toggle-wrap fhs-toggle-xs">
            <input type="checkbox" id="k_lh_en" class="fhs-toggle-input fhs-toggle-input-xs"
                   onchange="togglePart('k_lh_box', this)">
            <span class="fhs-toggle fhs-toggle-xs"></span>
            <span class="fhs-limb-label">左手</span>
          </div>
          <div id="k_lh_box" class="fhs-part-details fhs-mini-cols">
            <div class="fhs-mini-col"><label>數量</label><input id="k_lh_qty" class="fhs-input" type="number" value="1" min="1" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>上排</label><input id="k_lh_top" class="fhs-input" maxlength="6" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>下排</label><input id="k_lh_bot" class="fhs-input" maxlength="8" oninput="generate()"></div>
          </div>
          <!-- [CONTRACT] k_rh_en, k_rh_box, k_rh_qty, k_rh_top, k_rh_bot -->
          <div class="fhs-toggle-wrap fhs-toggle-xs">
            <input type="checkbox" id="k_rh_en" class="fhs-toggle-input fhs-toggle-input-xs"
                   onchange="togglePart('k_rh_box', this)">
            <span class="fhs-toggle fhs-toggle-xs"></span>
            <span class="fhs-limb-label">右手</span>
          </div>
          <div id="k_rh_box" class="fhs-part-details fhs-mini-cols">
            <div class="fhs-mini-col"><label>數量</label><input id="k_rh_qty" class="fhs-input" type="number" value="1" min="1" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>上排</label><input id="k_rh_top" class="fhs-input" maxlength="6" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>下排</label><input id="k_rh_bot" class="fhs-input" maxlength="8" oninput="generate()"></div>
          </div>
          <!-- [CONTRACT] k_lf_en/box/qty/top/bot -->
          <div class="fhs-toggle-wrap fhs-toggle-xs">
            <input type="checkbox" id="k_lf_en" class="fhs-toggle-input fhs-toggle-input-xs"
                   onchange="togglePart('k_lf_box', this)">
            <span class="fhs-toggle fhs-toggle-xs"></span>
            <span class="fhs-limb-label">左腳</span>
          </div>
          <div id="k_lf_box" class="fhs-part-details fhs-mini-cols">
            <div class="fhs-mini-col"><label>數量</label><input id="k_lf_qty" class="fhs-input" type="number" value="1" min="1" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>上排</label><input id="k_lf_top" class="fhs-input" maxlength="6" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>下排</label><input id="k_lf_bot" class="fhs-input" maxlength="8" oninput="generate()"></div>
          </div>
          <!-- [CONTRACT] k_rf_en/box/qty/top/bot -->
          <div class="fhs-toggle-wrap fhs-toggle-xs">
            <input type="checkbox" id="k_rf_en" class="fhs-toggle-input fhs-toggle-input-xs"
                   onchange="togglePart('k_rf_box', this)">
            <span class="fhs-toggle fhs-toggle-xs"></span>
            <span class="fhs-limb-label">右腳</span>
          </div>
          <div id="k_rf_box" class="fhs-part-details fhs-mini-cols">
            <div class="fhs-mini-col"><label>數量</label><input id="k_rf_qty" class="fhs-input" type="number" value="1" min="1" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>上排</label><input id="k_rf_top" class="fhs-input" maxlength="6" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>下排</label><input id="k_rf_bot" class="fhs-input" maxlength="8" oninput="generate()"></div>
          </div>
        </div><!-- end k_baby_sec_box -->

        <!-- Elder section -->
        <!-- [CONTRACT] k_elder_sec_en, k_elder_sec_box -->
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <input type="checkbox" id="k_elder_sec_en" class="fhs-toggle-input fhs-toggle-input-sm"
                 onchange="toggleAddon('k_elder_sec_box', this)">
          <span class="fhs-toggle fhs-toggle-sm"></span>
          <span class="fhs-section-label">大寶</span>
        </div>
        <div id="k_elder_sec_box" class="fhs-part-details">
          <!-- [CONTRACT] k_e_lh/rh/lf/rf _en/_box/_qty/_top/_bot -->
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="k_e_lh_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('k_e_lh_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">左手</span></div>
          <div id="k_e_lh_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="k_e_lh_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>上排</label><input id="k_e_lh_top" class="fhs-input" maxlength="6" oninput="generate()"></div><div class="fhs-mini-col"><label>下排</label><input id="k_e_lh_bot" class="fhs-input" maxlength="8" oninput="generate()"></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="k_e_rh_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('k_e_rh_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">右手</span></div>
          <div id="k_e_rh_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="k_e_rh_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>上排</label><input id="k_e_rh_top" class="fhs-input" maxlength="6" oninput="generate()"></div><div class="fhs-mini-col"><label>下排</label><input id="k_e_rh_bot" class="fhs-input" maxlength="8" oninput="generate()"></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="k_e_lf_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('k_e_lf_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">左腳</span></div>
          <div id="k_e_lf_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="k_e_lf_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>上排</label><input id="k_e_lf_top" class="fhs-input" maxlength="6" oninput="generate()"></div><div class="fhs-mini-col"><label>下排</label><input id="k_e_lf_bot" class="fhs-input" maxlength="8" oninput="generate()"></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="k_e_rf_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('k_e_rf_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">右腳</span></div>
          <div id="k_e_rf_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="k_e_rf_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>上排</label><input id="k_e_rf_top" class="fhs-input" maxlength="6" oninput="generate()"></div><div class="fhs-mini-col"><label>下排</label><input id="k_e_rf_bot" class="fhs-input" maxlength="8" oninput="generate()"></div></div>
        </div><!-- end k_elder_sec_box -->

        <!-- Family combo -->
        <!-- [CONTRACT] k_family_en, k_family_box, k_family_combo, fam_p1/p2 -->
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <input type="checkbox" id="k_family_en" class="fhs-toggle-input fhs-toggle-input-sm"
                 onchange="toggleAddon('k_family_box', this)">
          <span class="fhs-toggle fhs-toggle-sm"></span>
          <span class="fhs-section-label">家庭套裝</span>
        </div>
        <div id="k_family_box" class="fhs-part-details">
          <select id="k_family_combo" class="fhs-input"
                  onchange="updateFamilyParts(); generate();">
            <option value="S1_B">S1 (嬰兒)</option>
            <option value="S2_BB">S2 (嬰兒+嬰兒)</option>
            <option value="S2_BE">S2 (嬰兒+大寶)</option>
          </select>
          <div id="fam_p1_wrap" class="fhs-mini-col">
            <label id="fam_p1_lbl">部位1</label>
            <select id="fam_p1_sel" class="fhs-input" onchange="generate()"></select>
          </div>
          <div id="fam_p2_wrap" class="fhs-mini-col">
            <label id="fam_p2_lbl">部位2</label>
            <select id="fam_p2_sel" class="fhs-input" onchange="generate()"></select>
          </div>
          <div class="fhs-mini-cols">
            <div class="fhs-mini-col"><label>數量</label><input id="k_family_qty" class="fhs-input" type="number" value="1" min="1" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>上排</label><input id="k_family_top" class="fhs-input" maxlength="8" oninput="generate()"></div>
            <div class="fhs-mini-col"><label>下排</label><input id="k_family_bot" class="fhs-input" maxlength="8" oninput="generate()"></div>
          </div>
        </div>
      </div><!-- end contentK -->

      <!-- Category M: 吊飾 -->
      <div class="fhs-toggle-wrap">
        <label class="fhs-toggle-input-wrap">
          <!-- [CONTRACT] enableM -->
          <input type="checkbox" id="enableM" class="fhs-toggle-input"
                 onchange="toggleAddon('contentM', this)">
          <span class="fhs-toggle"></span>
        </label>
        <span class="fhs-category-label">💎 吊飾</span>
      </div>
      <!-- [CONTRACT] contentM -->
      <div id="contentM" class="fhs-accordion-body">
        <!-- Baby M section -->
        <!-- [CONTRACT] m_baby_sec_en, m_baby_sec_box -->
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <input type="checkbox" id="m_baby_sec_en" class="fhs-toggle-input fhs-toggle-input-sm"
                 checked onchange="toggleAddon('m_baby_sec_box', this)">
          <span class="fhs-toggle fhs-toggle-sm"></span>
          <span class="fhs-section-label">嬰兒</span>
        </div>
        <div id="m_baby_sec_box" class="fhs-part-details active">
          <!-- [CONTRACT] m_lh/rh/lf/rf _en/_box/_qty/_color/_eng -->
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_lh_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_lh_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">左手</span></div>
          <div id="m_lh_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_lh_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_lh_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_rh_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_rh_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">右手</span></div>
          <div id="m_rh_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_rh_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_rh_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_lf_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_lf_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">左腳</span></div>
          <div id="m_lf_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_lf_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_lf_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div><div class="fhs-mini-col"><label>刻字</label><input id="m_lf_eng" class="fhs-input" maxlength="1" oninput="generate()"></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_rf_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_rf_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">右腳</span></div>
          <div id="m_rf_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_rf_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_rf_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div><div class="fhs-mini-col"><label>刻字</label><input id="m_rf_eng" class="fhs-input" maxlength="1" oninput="generate()"></div></div>
        </div>
        <!-- Elder M section -->
        <!-- [CONTRACT] m_elder_sec_en, m_elder_sec_box -->
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <input type="checkbox" id="m_elder_sec_en" class="fhs-toggle-input fhs-toggle-input-sm"
                 onchange="toggleAddon('m_elder_sec_box', this)">
          <span class="fhs-toggle fhs-toggle-sm"></span>
          <span class="fhs-section-label">大寶</span>
        </div>
        <div id="m_elder_sec_box" class="fhs-part-details">
          <!-- [CONTRACT] m_e_lh/rh/lf/rf _en/_box/_qty/_color/_eng -->
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_e_lh_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_e_lh_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">左手</span></div>
          <div id="m_e_lh_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_e_lh_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_e_lh_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_e_rh_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_e_rh_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">右手</span></div>
          <div id="m_e_rh_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_e_rh_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_e_rh_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_e_lf_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_e_lf_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">左腳</span></div>
          <div id="m_e_lf_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_e_lf_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_e_lf_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div><div class="fhs-mini-col"><label>刻字</label><input id="m_e_lf_eng" class="fhs-input" maxlength="1" oninput="generate()"></div></div>
          <div class="fhs-toggle-wrap fhs-toggle-xs"><input type="checkbox" id="m_e_rf_en" class="fhs-toggle-input fhs-toggle-input-xs" onchange="togglePart('m_e_rf_box',this)"><span class="fhs-toggle fhs-toggle-xs"></span><span class="fhs-limb-label">右腳</span></div>
          <div id="m_e_rf_box" class="fhs-part-details fhs-mini-cols"><div class="fhs-mini-col"><label>數量</label><input id="m_e_rf_qty" class="fhs-input" type="number" value="1" oninput="generate()"></div><div class="fhs-mini-col"><label>顏色</label><select id="m_e_rf_color" class="fhs-input" onchange="generate()"><option value="銀色">銀色</option><option value="金色">金色</option><option value="玫瑰金">玫瑰金</option></select></div><div class="fhs-mini-col"><label>刻字</label><input id="m_e_rf_eng" class="fhs-input" maxlength="1" oninput="generate()"></div></div>
        </div>
      </div><!-- end contentM -->

      <!-- Category W: 配件 -->
      <div class="fhs-toggle-wrap">
        <label class="fhs-toggle-input-wrap">
          <!-- [CONTRACT] enableW -->
          <input type="checkbox" id="enableW" class="fhs-toggle-input"
                 onchange="toggleAddon('contentW', this)">
          <span class="fhs-toggle"></span>
        </label>
        <span class="fhs-category-label">🧸 配件</span>
      </div>
      <!-- [CONTRACT] contentW -->
      <div id="contentW" class="fhs-accordion-body">
        <div class="fhs-toggle-wrap fhs-toggle-sm">
          <!-- [CONTRACT] w_wool_en -->
          <input type="checkbox" id="w_wool_en" class="fhs-toggle-input fhs-toggle-input-sm"
                 onchange="generate()">
          <span class="fhs-toggle fhs-toggle-sm"></span>
          <span class="fhs-section-label">羊毛氈公仔</span>
        </div>
        <div class="fhs-mini-cols">
          <!-- [CONTRACT] w_wool_qty -->
          <div class="fhs-mini-col"><label>數量</label><input id="w_wool_qty" class="fhs-input" type="number" value="1" min="1" oninput="generate()"></div>
        </div>
      </div><!-- end contentW -->

    </section><!-- end CARD 2 -->

    <!-- ── CARD 3: 即時報價 ── -->
    <section class="fhs-card" data-card="pricing">
      <div class="fhs-card-header">
        <span class="fhs-card-icon">💡</span>
        <span class="fhs-card-title">系統建議報價</span>
      </div>
      <!-- [CONTRACT] pricingEngineUI, suggestedPrice, drawingCost, pricingLogicDetails -->
      <div id="pricingEngineUI" class="fhs-pricing-engine">
        <div class="fhs-pricing-main">
          <span class="fhs-pricing-label">建議售價</span>
          <span class="fhs-pricing-value">$<span id="suggestedPrice">0</span></span>
        </div>
        <!-- Fat Mo only -->
        <div class="fhs-pricing-cost fat-only">
          <span class="fhs-pricing-label">畫圖成本</span>
          <span class="fhs-pricing-value-sm">$<span id="drawingCost">0</span></span>
        </div>
        <!-- [CONTRACT] adultWoodForceHint -->
        <div id="adultWoodForceHint" class="fhs-force-hint" hidden></div>
        <!-- [CONTRACT] pricingLogicDetails -->
        <div id="pricingLogicDetails" class="fhs-pricing-log"></div>
      </div>
    </section>

    <!-- ── CARD 4: 金額 ── -->
    <section class="fhs-card" data-card="financials">
      <div class="fhs-card-header">
        <span class="fhs-card-icon">💰</span>
        <span class="fhs-card-title">金額</span>
      </div>
      <!-- [CONTRACT] deposit, balance, additional -->
      <div class="fhs-field-row">
        <div class="fhs-field-group fhs-field-grow">
          <label class="fhs-label" for="deposit">已付訂金 ($)</label>
          <input id="deposit" class="fhs-input" type="number" placeholder="0"
                 oninput="generate()">
        </div>
        <div class="fhs-field-group fhs-field-grow">
          <label class="fhs-label" for="balance">產品尾數 ($)</label>
          <input id="balance" class="fhs-input" type="number" placeholder="0"
                 oninput="generate()">
        </div>
      </div>
      <div class="fhs-field-group">
        <label class="fhs-label" for="additional">附加費 ($)</label>
        <input id="additional" class="fhs-input" type="number" placeholder="0"
               oninput="generate()">
      </div>
    </section>

    <!-- ── CARD 5: 訊息預覽 ── -->
    <section class="fhs-card" data-card="preview">
      <div class="fhs-card-header">
        <span class="fhs-card-icon">📱</span>
        <span class="fhs-card-title">IG 訊息預覽</span>
      </div>
      <!-- [CONTRACT] no-preview-msg -->
      <div id="no-preview-msg" class="fhs-empty-state">請先選擇產品以生成訊息</div>
      <!-- [CONTRACT] preview-box-a, output-preview-a, btnCopyA -->
      <div id="preview-box-a" class="fhs-preview-box" hidden>
        <div class="fhs-preview-label">🖼️ 手模擺設</div>
        <textarea id="output-preview-a" class="fhs-preview-textarea" readonly></textarea>
        <button id="btnCopyA" class="fhs-copy-btn" onclick="copyMessageA()">📋 複製</button>
      </div>
      <!-- [CONTRACT] preview-box-b, output-preview-b, btnCopyB -->
      <div id="preview-box-b" class="fhs-preview-box" hidden>
        <div class="fhs-preview-label">⚙️ 金屬產品</div>
        <textarea id="output-preview-b" class="fhs-preview-textarea" readonly></textarea>
        <button id="btnCopyB" class="fhs-copy-btn" onclick="copyMessageB()">📋 複製</button>
      </div>
    </section>

    <!-- Scroll padding for bottom action bar -->
    <div class="fhs-scroll-pad"></div>

  </div><!-- end formContainer -->
</main>

<!-- === LAYER 5: BOTTOM ACTION BAR (sticky, z-index 30) === -->
<!-- [CONTRACT] bottomActionBar, syncBtn -->
<div id="bottomActionBar" class="fhs-bottom-bar">
  <div class="fhs-bottom-summary">
    <div class="fhs-summary-item">
      <span class="fhs-summary-label">建議售價</span>
      <span class="fhs-summary-value" id="barSuggestedPrice">$0</span>
    </div>
    <div class="fhs-summary-item fat-only">
      <span class="fhs-summary-label">成本</span>
      <span class="fhs-summary-value" id="barDrawingCost">$0</span>
    </div>
    <div class="fhs-summary-item">
      <span class="fhs-summary-label">附加費</span>
      <span class="fhs-summary-value" id="barAdditional">$0</span>
    </div>
  </div>
  <button id="syncBtn" class="fhs-sync-btn" onclick="syncToAirtable()">
    🚀 同步 Airtable
  </button>
</div>

<!-- === MODALS & OVERLAYS === -->
<!-- [CONTRACT] deleteConfirmModal, deleteModalOrderId, confirmDeleteBtn -->
<div id="deleteConfirmModal" class="fhs-modal" hidden>
  <div class="fhs-modal-card">
    <p class="fhs-modal-title">確認刪除？</p>
    <p class="fhs-modal-body">訂單：<strong id="deleteModalOrderId"></strong></p>
    <div class="fhs-modal-actions">
      <button class="fhs-btn-ghost" onclick="document.getElementById('deleteConfirmModal').hidden=true">取消</button>
      <button id="confirmDeleteBtn" class="fhs-btn-danger" onclick="executeDeleteOrder()">確認刪除</button>
    </div>
  </div>
</div>

<!-- [CONTRACT] globalLoader, loaderText -->
<div id="globalLoader" class="fhs-loader-overlay" hidden>
  <div class="fhs-loader-spinner"></div>
  <p id="loaderText" class="fhs-loader-text">FHS 智能中樞正在工作中...</p>
</div>

<!-- [CONTRACT] toast -->
<div id="toast" class="fhs-toast" hidden>已複製！</div>

</body>
</html>
```

---

## 4. CARD-BY-CARD LAYOUT SPEC

### Card 1 — 客戶資訊

**Visual hierarchy:**
- ID row (orderIdDisplay + status dot) at top — compact, muted tone
- idStatusText below ID in text-muted, font-size xs
- momName: largest input, bold placeholder
- appDate: full-width date picker
- babyAgeMonths: number input with unit suffix "個月"
- babyAgeWarning: amber banner, appears below age input when triggered
- Time row: two selects side by side (hour left-grow, AM/PM fixed-width right)

**Spacing:** card padding space-5, field-group gap space-4, field-row gap space-3

**Edit mode difference:**
- orderIdDisplay shows fetched order ID, non-editable
- idStatusText shows "更新模式" in primary color
- All fields pre-filled from restoreFormState()

**Empty state:** all placeholders visible, idStatusText = "系統自動生成"

---

### Card 2 — 產品選擇

**Visual hierarchy:**
- Four category toggles stacked with separator lines between them
- Each toggle row: 44px height, toggle left + emoji label right
- Expanded accordion: slides in smoothly, child sections indented 16px
- Section toggles (sm size): 40px height, muted background
- Limb toggles (xs size): 36px height, tight packing
- Mini-cols grid: 3 equal columns, gap space-2, inputs font-size sm

**Accordion behavior:**
- Category level: max-height transition 350ms ease-out
- Section level: max-height transition 250ms ease-out
- Limb detail: max-height transition 150ms ease

**Empty state (all toggles off):** single muted message "尚未選擇任何產品"

**Edit mode:** pre-filled by restoreFormState() — no visual difference from create

---

### Card 3 — 即時報價

**Visual hierarchy:**
- Big suggested price ($XXXX) centered, font-size 2xl, weight bold, color primary
- Fat Mo only: cost row below in smaller size, color text-secondary
- pricingLogicDetails: scrollable log area, font-size xs, monospace feel, max-height 80px

**Update behavior:** live-updates on any generate() call (reactive)

**Empty state:** suggestedPrice = 0, pricingLogicDetails = "請選擇對象、產品與數量以計算報價。"

**adultWoodForceHint:** danger color banner when adult + 木框 combination detected

---

### Card 4 — 金額

**Visual hierarchy:**
- deposit + balance: side by side equal columns
- additional: full width below
- All type="number", placeholder="0"
- No validation UI (server validates)

**Edit mode:** pre-filled from fetched order data

---

### Card 5 — 訊息預覽

**Visual hierarchy:**
- no-preview-msg: centered empty state, text-muted, icon 💬
- Each preview-box: label chip + textarea (readonly, font-size 13px, min-height 120px) + copy button
- btnCopyA/B: full-width below textarea, outline style with copy icon

**Copy feedback:** toast pops up for 2s on copy action

---

## 5. DRAWER BEHAVIOR SPEC

```
Open triggers:
  - Tap #fhs-drawer-trigger (hamburger)
  - Left-edge swipe right (touch: touchstart x < 20px, swipe right > 60px)

Close triggers:
  - Tap #fhs-drawer-backdrop
  - Right-swipe on drawer (touchstart in drawer, swipe left > 60px)
  - Tap close button inside drawer

Animation:
  Open:  translateX(-100%) → translateX(0)    duration 280ms  easing cubic-bezier(0.4,0,0.2,1)
  Close: translateX(0)     → translateX(-100%) duration 220ms  easing cubic-bezier(0.4,0,1,1)

Backdrop:
  opacity 0 → 0.5   same duration as open
  opacity 0.5 → 0   same duration as close
  background: rgba(0,0,0,0.5)

Dimensions:
  Width: min(80vw, 320px)
  Height: 100vh (100dvh with dvh support)
  Left: 0, Top: 0

Z-index stack:
  Loader overlay:    z-300
  Drawer:            z-200
  Backdrop:          z-190
  Header:            z-50
  Bottom bar:        z-30
  Main content:      z-1

Scroll:
  Drawer itself: overflow-y auto (drawer content can scroll independently)
  Body scroll: locked (overflow hidden on body) when drawer open

Body class: 'fhs-drawer-open' added on open, removed on close
aria-hidden: toggled on #fhs-drawer
```

---

## 6. MODE SYSTEM

### Create Mode (`body.mode-create`)
- Header center: "新單" + green pill
- modeCreateBtn: active state (primary bg, white text)
- editModeContainer: hidden
- orderIdDisplay: disabled, showing auto-generated ID
- syncBtn label: "🚀 同步建立"
- Card 1 border-left accent: none (neutral)

### Edit Mode (`body.mode-edit`)
- Header center: "更新單" + amber pill
- modeEditBtn: active state
- editModeContainer: visible below header (search bar)
- orderIdDisplay: shows fetched order ID (disabled)
- idStatusText: "更新模式" in amber
- All cards: pre-filled via restoreFormState()
- syncBtn label: "🔄 同步更新"
- Card 1 border-left: amber (--fhs-warning)

### Review Mode (`body.mode-review`)
- Header center: "全域核對" + blue pill
- modeReviewBtn: active state
- Main formContainer: hidden
- Drawer auto-opens to reviewModeContainer section
- Or: reviewModeContainer expands inline below header (alternative)
- syncBtn: hidden in review mode
- Bottom bar: shows only filter summary

---

## 7. MOBILE UX RULES

**Tap targets:**
- All interactive elements: min-height 44px, min-width 44px
- Mini-col inputs (qty/top/bot): min-height 44px even if visually compact
- Bottom syncBtn: height 56px, full width minus padding
- Toggle wraps: min-height 44px via flex align-items center

**Input font size:**
- All inputs and selects: font-size 16px MINIMUM (prevents iOS auto-zoom)
- Labels: font-size 14px (sm)
- Pricing value: font-size 28px (2xl)

**Scroll behavior:**
- Page scroll: -webkit-overflow-scrolling touch on main
- Bottom bar: position sticky bottom 0, padding-bottom env(safe-area-inset-bottom)
- Header: position sticky top 0, padding-top env(safe-area-inset-top)
- Keyboard avoidance: bottom bar uses position sticky (not fixed) to avoid overlapping keyboard

**Safe area insets:**
```css
.fhs-header    { padding-top: env(safe-area-inset-top, 0px); }
.fhs-bottom-bar { padding-bottom: env(safe-area-inset-bottom, 16px); }
.fhs-drawer    { padding-top: env(safe-area-inset-top, 0px);
                  padding-bottom: env(safe-area-inset-bottom, 0px); }
```

**Landscape:** Layout still functions, drawer overlay same behavior. No special landscape breakpoint needed — single column adapts naturally.

**Scroll padding:** `.fhs-scroll-pad` with height = bottom-bar height + 16px, prevents last card from being hidden under bar.

---

## 8. PHASE 2 HANDOFF NOTES (for frontend-developer)

### CSS Naming Rules
- All new classes use `fhs-` prefix
- BANNED class names (V36 legacy): `.card`, `.form-group`, `.part-details`, `.addon-content`, `.mini-col`, `.preview-box`, `.copy-btn`, `.bottom-action-bar`
- Use design tokens via CSS custom properties (`:root` vars)
- No `!important` except for utility overrides (`hidden` → `display:none !important`)

### Business Logic JS (copy verbatim from V36, do NOT rewrite)
Copy these functions exactly from V36 into the new file:
- `captureFormState()` — do not touch
- `restoreFormState()` — do not touch
- `generate()` — do not touch
- `syncToAirtable()` — wrap fetch calls with `// TODOhookup` comment only
- `getWebhookUrl()` — copy verbatim
- `toggleAddon()` / `togglePart()` — copy verbatim
- `renderLimbGrid()` / `updateFamilyParts()` / `updateTimeOptions()` — copy verbatim
- `setRole()` / `switchMode()` / `setIdMode()` — copy verbatim
- `handleFuzzySearch()` / `fetchOldOrder()` / `fetchGlobalReview()` — mark fetch with `// TODOhookup`
- All pricing calculation logic (`processTierPricing`, etc.) — copy verbatim

### TODOhookup Pattern
```js
// TODOhookup: reconnect fetch to real webhook in Phase 4
// const response = await fetch(webhookUrl, { method: 'POST', body: JSON.stringify(payload) });
// Simulated success for prototype:
await new Promise(r => setTimeout(r, 800));
alert('✅ [PROTOTYPE] 同步模擬成功');
```

### .active Class Contract
These pairs MUST work (JS toggles `.active` class):
```
enableP ↔ contentP
enableK ↔ contentK
enableM ↔ contentM
enableW ↔ contentW
k_baby_sec_en ↔ k_baby_sec_box
k_elder_sec_en ↔ k_elder_sec_box
k_family_en ↔ k_family_box
m_baby_sec_en ↔ m_baby_sec_box
m_elder_sec_en ↔ m_elder_sec_box
k_{part}_en ↔ k_{part}_box   (all 8 limb pairs)
k_e_{part}_en ↔ k_e_{part}_box
m_{part}_en ↔ m_{part}_box
m_e_{part}_en ↔ m_e_{part}_box
en_parent ↔ box_parent
en_elder ↔ box_elder
```
CSS for `.fhs-accordion-body` and `.fhs-part-details` must respond to `.active` class.

### Dynamic limb-sel Elements
`renderLimbGrid()` generates `<select>` elements. Each must have:
```html
<select class="limb-sel fhs-input" data-who="嬰兒" data-part="左手" onchange="generate()">
```
`captureFormState()` uses `data-who` + `data-part` to build the key `limb_sel_嬰兒_左手`.

### Output File
Save prototype to:
`d:\SynologyDrive\Free_handsss\freehandsss_dashboard\Freehandsss_Dashboard\freehandsss_dashboardV39_proto.html`

This is a single self-contained HTML file with inline CSS and JS.
Zero external dependencies. Zero real fetch calls. TODOhookup markers only.

---

**Phase 1 Design Spec: COMPLETE**
Status: READY FOR PHASE 2 (frontend-developer)