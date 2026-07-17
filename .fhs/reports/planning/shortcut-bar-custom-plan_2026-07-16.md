# V42 快捷列優化方案書 — 月曆入列 + 查看檔期掣取消 + 快捷列自訂系統

> **日期**：2026-07-16（S180）
> **需求方**：Fat Mo（直接指示）
> **規劃**：Fable 5（本檔）；**執行**：sonnet subagent（T2 模板派工）
> **分支**：`claude/v42-shortcut-bar-optimize-5cf31c`（已 merge `claude/monthly-calendar-empty-slots-09a3fb`，含 S179 月曆 v2 全部代碼）

## 一、需求原文與拆解

1. 將快捷列現有「修改」掣改為「月曆」（查看檔期）→ 月曆入快捷列，預設取代「修改」位置
2. 上方（訂單總覽頁頂）「查看檔期」獨立掣取消
3. 快捷列可自訂：手機**長按**進入編輯模式（可增加/減少/替代快捷鍵）；Desktop 觸發方式由 AI 設計 → 定案：**右鍵 bar** 或 **hover 出現 ✎ 掣**

## 二、已驗證事實（執行者不必重查）

- 快捷列 = `.fhs-top-bar__actions`（desktop 喺 top bar；手機 <768px CSS 變 Threads 式底部導覽，見 CSS ~L1881）
- 五粒模式掣：`modeCreateBtn/modeEditBtn/modeReviewBtn/modeFinanceBtn/modeSystemBtn`（HTML ~L3780-3789），**contract-critical ID 不可刪**（S150 F6.1）
- `switchMode()` 每次切換執行 `btn.style.cssText=''`（~L5958）→ **顯示/隱藏必須用 class（`.sb-hidden`），唔可以用 inline style**（會被抹走）
- 「查看檔期」掣 = `#btnViewMoldCal`（HTML ~L3825，S179 加入），CSS 塊喺 ~L3436；全檔僅呢兩個引用點
- 月曆開啟函式：`window.openMoldCalendar(opts)`（~L16890），view 模式呼叫 `openMoldCalendar({bindMode:'view'})`
- 底部導覽指示器：`initBottomNavIndicator()`（~L13045），用 `ctrl.querySelector('button.active')` 定位
- `showToast(msg, duration)` 存在（~L7328）；sprite 有 `icon-calendar`、`icon-check`、`icon-plus`、`icon-edit`
- **改前計數已做**（兩檔全部 =1）：`class="fhs-top-bar__actions"`、`id="btnViewMoldCal"`、`#btnViewMoldCal {`、`.ba-label { line-height: 1; }`、`ctrl.querySelector('button.active')`、`window.initBottomNavIndicator = initBottomNavIndicator;`、`initBottomNavIndicator();`

## 三、設計定案

### 3.1 配置模型
- Registry（6 項，順序 = 預設顯示順序）：`create(新增)/edit(修改)/calendar(月曆)/review(訂單)/finance(財務)/system(系統)`
- 預設顯示：`['create','calendar','review','finance','system']`（「修改」預設隱藏，可經編輯模式加返）
- 持久化：`localStorage['fhsShortcutBarV1']` = key 陣列（兼排序）；讀取時過濾未知 key＋去重，<2 項回退預設
- 最少保留 **2** 粒（防清空 bar）；隱藏 = 加 `.sb-hidden` class，按鈕**保留喺 DOM**（ID 合約不破）

### 3.2 觸發
- **手機**：pointer 長按 600ms（`pointerType!=='mouse'`；移動 >10px / pointerup / pointercancel 取消）；進入時 `navigator.vibrate(30)`（有先震）
- **Desktop**：右鍵 bar（`contextmenu` + preventDefault，同時吸收 Android 長按產生嘅 contextmenu 防雙觸發）。**（S180 修訂 2026-07-16：取消 hover ✎ 掣方案，Desktop 只保留右鍵觸發，`#sbEditTrigger` 已移除；重排錨點改用 `#sbAddBtn`）**
- **防誤觸**：進入編輯後 350ms 內嘅 click 一律吞掉（長按鬆手會產生 click）

### 3.3 編輯模式行為
- bar 加 `.sb-editing`：dashed outline、`[data-sb-key]` 掣 wiggle 動畫 + 右上角 ✕ 紅 badge（CSS `::after`，`pointer-events:none`）
- **capture-phase click 攔截**（bar 上 `addEventListener('click', fn, true)` + `stopPropagation`）→ 編輯模式下按掣唔會觸發 inline `onclick`（唔會切模式）
- 撳快捷鍵 = 移除（剩 2 粒時 `showToast` 拒絕）；撳 `#sbAddBtn`（＋加入）= 開 `#sbPalette` 列出未顯示快捷鍵，撳項目即加入；撳 `#sbDoneBtn`（✓完成）/ Esc / 撳 bar 同 palette 以外 = 退出
- 編輯期間隱藏 nav indicator；`updateBottomNavIndicator` 嘅 selector 改為 `button.active:not(.sb-hidden)`（防 active 模式掣被隱藏時 indicator 量到 0 寬）
- 「替代」= 移除 + 加入 組合達成，唔另做拖拉排序（排序 = 加入次序，存入 config）

### 3.4 唔郁嘅嘢（禁區）
- 五粒 mode 掣嘅 ID 同 inline `onclick` 原樣保留；`switchMode()` 本體只字不改
- `#v41-supabase-toggle`（如 JS 有搬入 bar）不納入 registry、不受編輯影響
- 表單內「約定日期」行嘅 `.mc-trigger-btn`（bindMode:'form' 入口一）原樣保留
- `openMoldCalendar` 本體不改

## 四、精確改動清單（兩檔各一次，內容完全相同）

**檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html` 同 `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

### E1 — 快捷列 HTML（錨：整個 `.fhs-top-bar__actions` div 塊，~L3780）

舊（原文完整 10 行，由 `<div class="fhs-top-bar__actions">` 到對應 `</div>` 及外層 `</div>`）替換為：

```html
        <div class="fhs-top-bar__actions">
            <!-- 模式切換按鈕：contract-critical IDs 保留（S150 F6.1：icon+label 結構，手機底部導覽用） -->
            <!-- S180：快捷列可自訂（手機長按/Desktop右鍵或✎），顯示與排序由 initShortcutBar() 按 localStorage['fhsShortcutBarV1'] 控制；預設隱「修改」顯「月曆」 -->
            <button id="modeCreateBtn" data-sb-key="create" onclick="switchMode('create')"><svg class="ba-icon" width="20" height="20"><use href="#icon-plus"/></svg><span class="ba-label">新增</span></button>
            <button id="modeEditBtn" data-sb-key="edit" onclick="switchMode('edit')"><svg class="ba-icon" width="20" height="20"><use href="#icon-edit"/></svg><span class="ba-label">修改</span></button>
            <button id="modeCalendarBtn" data-sb-key="calendar" onclick="openMoldCalendar({bindMode:'view'})" title="查看取模檔期"><svg class="ba-icon" width="20" height="20"><use href="#icon-calendar"/></svg><span class="ba-label">月曆</span></button>
            <button id="modeReviewBtn" data-sb-key="review" onclick="switchMode('review')"><svg class="ba-icon" width="20" height="20"><use href="#icon-list"/></svg><span class="ba-label">訂單</span></button>
            <!-- Financial Overview 模式按鈕（V40.2 整合版） -->
            <button id="modeFinanceBtn" data-sb-key="finance" onclick="switchMode('finance')"><svg class="ba-icon" width="20" height="20"><use href="#icon-wallet"/></svg><span class="ba-label">財務</span></button>
            <!-- 系統監控按鈕（V46.1） -->
            <button id="modeSystemBtn" data-sb-key="system" onclick="switchMode('system')" title="系統狀態監控"><svg class="ba-icon" width="20" height="20"><use href="#icon-settings"/></svg><span class="ba-label">系統</span></button>
            <!-- S180 快捷列編輯工具：✎ 只喺 desktop hover 現身；＋/完成 只喺編輯模式現身 -->
            <button id="sbEditTrigger" type="button" title="自訂快捷列（右鍵亦可）"><svg class="ba-icon" width="16" height="16"><use href="#icon-edit"/></svg></button>
            <button id="sbAddBtn" type="button" title="加入快捷鍵"><svg class="ba-icon" width="20" height="20"><use href="#icon-plus"/></svg><span class="ba-label">加入</span></button>
            <button id="sbDoneBtn" type="button" title="完成編輯"><svg class="ba-icon" width="20" height="20"><use href="#icon-check"/></svg><span class="ba-label">完成</span></button>
        </div>
    </div>

    <!-- S180 快捷列編輯調色盤（列出未顯示嘅快捷鍵，JS 動態填充） -->
    <div id="sbPalette" role="menu" aria-label="加入快捷鍵"></div>
```

（注意：舊塊結尾嘅 `</div>\n    </div>` 已包含喺新塊，palette div 插喺 top bar 之後。）

### E2 — 取消「查看檔期」掣（錨：~L3824-3825 兩行）

```html
            <!-- 取模排程中心 B（S159/S170/D29，本次僅落地B）：獨立入口，唔綁定任何表單欄位 -->
            <button type="button" id="btnViewMoldCal" onclick="openMoldCalendar({bindMode:'view'})"><svg class="ba-icon" width="14" height="14" style="vertical-align:middle;"><use href="#icon-calendar"/></svg>查看檔期</button>
```
→ 替換為單行註解：
```html
            <!-- 取模排程中心 B（S159/S170/D29）：S180 起入口移至快捷列「月曆」掣（modeCalendarBtn），原「查看檔期」獨立掣已取消 -->
```

### E3 — 刪 `#btnViewMoldCal` CSS 塊（錨：`#btnViewMoldCal {` 起 14 行，~L3436-3449）

整塊刪除（替換為空），前後嘅 `.mc-trigger-btn` 規則同 `@media (max-width: 768px)` 塊不動。

### E4 — 新增 CSS（錨：`        .ba-icon { font-size: 14px; line-height: 1; }\n        .ba-label { line-height: 1; }`，~L1650-1651，緊接其後插入）

```css

        /* ===== S180 快捷列自訂（手機長按 / Desktop 右鍵或 hover ✎ 進入編輯） ===== */
        .fhs-top-bar__actions { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .fhs-top-bar__actions button { position: relative; }
        .fhs-top-bar__actions button.sb-hidden { display: none !important; }
        #sbAddBtn, #sbDoneBtn { display: none; }
        .fhs-top-bar__actions.sb-editing #sbAddBtn:not(.sb-hidden),
        .fhs-top-bar__actions.sb-editing #sbDoneBtn { display: inline-flex; }
        #sbEditTrigger { display: none; padding: 6px 8px; opacity: 0.55; }
        @media (hover: hover) and (pointer: fine) {
            .fhs-top-bar__actions:not(.sb-editing):hover #sbEditTrigger { display: inline-flex; }
            #sbEditTrigger:hover { opacity: 1; }
        }
        .fhs-top-bar__actions.sb-editing {
            outline: 2px dashed var(--fhs-accent);
            outline-offset: 2px;
        }
        .fhs-top-bar__actions.sb-editing button[data-sb-key] {
            animation: sb-wiggle 0.35s ease-in-out infinite alternate;
        }
        .fhs-top-bar__actions.sb-editing button[data-sb-key]::after {
            content: '\2715';
            position: absolute;
            top: -5px; right: -3px;
            width: 16px; height: 16px;
            line-height: 16px;
            text-align: center;
            font-size: 9px;
            font-weight: 700;
            border-radius: 50%;
            background: var(--fhs-danger);
            color: #fff;
            z-index: 2;
            pointer-events: none;
        }
        .fhs-top-bar__actions.sb-editing .fhs-nav-indicator { display: none !important; }
        @keyframes sb-wiggle {
            from { transform: rotate(-1.5deg); }
            to   { transform: rotate(1.5deg); }
        }
        #sbPalette {
            display: none;
            position: fixed;
            top: 56px; right: 16px;   /* Desktop：top bar 下方 */
            z-index: 2100;
            flex-direction: column;
            gap: 4px;
            min-width: 168px;
            padding: 8px;
            background: var(--fhs-bg-surface);
            border: 1px solid var(--fhs-border);
            border-radius: var(--radius-lg);
            box-shadow: 0 8px 32px rgba(44, 36, 22, 0.16);
        }
        #sbPalette.is-open { display: flex; }
        #sbPalette .sb-pal-item {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 12px;
            border: 1px solid var(--fhs-border);
            border-radius: var(--radius-md);
            background: var(--fhs-bg-elevated);
            color: var(--fhs-text-primary);
            font-size: 13px; font-weight: 600;
            cursor: pointer;
            text-align: left;
        }
        #sbPalette .sb-pal-item:hover { background: var(--fhs-bg-surface); border-color: var(--fhs-accent); }
        @media (max-width: 767px) {
            #sbPalette {
                top: auto;
                left: 16px; right: 16px;
                bottom: calc(84px + env(safe-area-inset-bottom, 0px));   /* 貼喺底部導覽列上方 */
            }
        }
```

### E5 — indicator selector 修正（錨：`const activeBtn = ctrl.querySelector('button.active');`，~L13059）

→ `const activeBtn = ctrl.querySelector('button.active:not(.sb-hidden)');`

### E6 — JS 模組（錨：`        window.initBottomNavIndicator = initBottomNavIndicator;`，~L13075，緊接其後插入）

```js

        /* ================================================================
           S180 快捷列自訂系統（Fat Mo 2026-07-16）
           - 顯示/排序存 localStorage['fhsShortcutBarV1']；預設隱「修改」顯「月曆」
           - 手機：長按 600ms 進入編輯；Desktop：右鍵 bar 或 hover ✎
           - 編輯模式：撳快捷鍵=移除（最少保留2粒）、＋=加入、✓/Esc/撳出面=完成
           - 顯示/隱藏用 class（switchMode 會抹 inline style，見 ~L5958）
           ================================================================ */
        (function() {
            const SB_KEY = 'fhsShortcutBarV1';
            const SB_MIN = 2;
            const SB_REGISTRY = [
                { key: 'create',   id: 'modeCreateBtn',   label: '新增', icon: 'icon-plus' },
                { key: 'edit',     id: 'modeEditBtn',     label: '修改', icon: 'icon-edit' },
                { key: 'calendar', id: 'modeCalendarBtn', label: '月曆', icon: 'icon-calendar' },
                { key: 'review',   id: 'modeReviewBtn',   label: '訂單', icon: 'icon-list' },
                { key: 'finance',  id: 'modeFinanceBtn',  label: '財務', icon: 'icon-wallet' },
                { key: 'system',   id: 'modeSystemBtn',   label: '系統', icon: 'icon-settings' }
            ];
            const SB_DEFAULT = ['create', 'calendar', 'review', 'finance', 'system'];
            let sbEditing = false;
            let sbEnteredAt = 0;

            function sbLoad() {
                try {
                    const raw = JSON.parse(localStorage.getItem(SB_KEY) || 'null');
                    if (!Array.isArray(raw)) return SB_DEFAULT.slice();
                    const seen = {};
                    const valid = raw.filter(function(k) {
                        if (seen[k]) return false;
                        seen[k] = true;
                        return SB_REGISTRY.some(function(r) { return r.key === k; });
                    });
                    return valid.length >= SB_MIN ? valid : SB_DEFAULT.slice();
                } catch (e) { return SB_DEFAULT.slice(); }
            }
            function sbSave(keys) {
                try { localStorage.setItem(SB_KEY, JSON.stringify(keys)); } catch (e) {}
            }
            function sbBar() { return document.querySelector('.fhs-top-bar__actions'); }
            function sbApply() {
                const bar = sbBar();
                if (!bar) return;
                const keys = sbLoad();
                SB_REGISTRY.forEach(function(r) {
                    const btn = document.getElementById(r.id);
                    if (btn) btn.classList.toggle('sb-hidden', keys.indexOf(r.key) === -1);
                });
                // 按 config 順序重排（只移動節點，contract ID 不變；工具掣恆喺尾）
                const anchor = document.getElementById('sbEditTrigger');
                keys.forEach(function(k) {
                    const reg = SB_REGISTRY.filter(function(r) { return r.key === k; })[0];
                    const btn = reg && document.getElementById(reg.id);
                    if (btn && anchor) bar.insertBefore(btn, anchor);
                });
                const addBtn = document.getElementById('sbAddBtn');
                if (addBtn) addBtn.classList.toggle('sb-hidden', keys.length >= SB_REGISTRY.length);
                if (window.updateBottomNavIndicator) window.updateBottomNavIndicator();
            }
            function sbClosePalette() {
                const pal = document.getElementById('sbPalette');
                if (pal) pal.classList.remove('is-open');
            }
            function sbRenderPalette() {
                const pal = document.getElementById('sbPalette');
                if (!pal) return;
                const keys = sbLoad();
                const hidden = SB_REGISTRY.filter(function(r) { return keys.indexOf(r.key) === -1; });
                if (!hidden.length) { sbClosePalette(); return; }
                pal.innerHTML = hidden.map(function(r) {
                    return '<button type="button" class="sb-pal-item" data-sb-add="' + r.key + '">'
                        + '<svg class="ba-icon" width="16" height="16"><use href="#' + r.icon + '"/></svg>'
                        + '<span>' + r.label + '</span></button>';
                }).join('');
            }
            function sbEnter() {
                if (sbEditing) return;
                const bar = sbBar();
                if (!bar) return;
                sbEditing = true;
                sbEnteredAt = Date.now();
                bar.classList.add('sb-editing');
                if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
                if (window.updateBottomNavIndicator) window.updateBottomNavIndicator();
            }
            function sbExit() {
                if (!sbEditing) return;
                sbEditing = false;
                const bar = sbBar();
                if (bar) bar.classList.remove('sb-editing');
                sbClosePalette();
                if (window.updateBottomNavIndicator) window.updateBottomNavIndicator();
            }
            function initShortcutBar() {
                const bar = sbBar();
                const pal = document.getElementById('sbPalette');
                if (!bar || bar._sbBound) return;
                bar._sbBound = true;

                // 編輯模式下 capture 攔截所有掣（先過 inline onclick，唔會誤切模式）
                bar.addEventListener('click', function(e) {
                    if (!sbEditing) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (Date.now() - sbEnteredAt < 350) return;   // 長按鬆手嘅 click 吞掉
                    const btn = e.target.closest('button');
                    if (!btn) return;
                    if (btn.id === 'sbDoneBtn') { sbExit(); return; }
                    if (btn.id === 'sbAddBtn') {
                        if (pal && pal.classList.contains('is-open')) { sbClosePalette(); }
                        else { sbRenderPalette(); if (pal) pal.classList.add('is-open'); }
                        return;
                    }
                    if (!btn.hasAttribute('data-sb-key')) return;
                    const keys = sbLoad();
                    const key = btn.getAttribute('data-sb-key');
                    if (keys.indexOf(key) === -1) return;
                    if (keys.length <= SB_MIN) {
                        if (typeof showToast === 'function') showToast('至少要保留 ' + SB_MIN + ' 個快捷鍵');
                        return;
                    }
                    sbSave(keys.filter(function(k) { return k !== key; }));
                    sbApply();
                    if (pal && pal.classList.contains('is-open')) sbRenderPalette();
                }, true);

                // 調色盤：撳項目 = 加入
                if (pal) pal.addEventListener('click', function(e) {
                    const item = e.target.closest('[data-sb-add]');
                    if (!item) return;
                    const keys = sbLoad();
                    const k = item.getAttribute('data-sb-add');
                    if (keys.indexOf(k) === -1) keys.push(k);
                    sbSave(keys);
                    sbApply();
                    sbRenderPalette();
                });

                // 手機：長按 600ms 進入編輯（移動 >10px 取消；mouse 唔算長按）
                let lpTimer = null, lpX = 0, lpY = 0;
                function lpCancel() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }
                bar.addEventListener('pointerdown', function(e) {
                    if (sbEditing || e.pointerType === 'mouse') return;
                    lpX = e.clientX; lpY = e.clientY;
                    lpCancel();
                    lpTimer = setTimeout(sbEnter, 600);
                });
                bar.addEventListener('pointermove', function(e) {
                    if (lpTimer && (Math.abs(e.clientX - lpX) > 10 || Math.abs(e.clientY - lpY) > 10)) lpCancel();
                });
                ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev) { bar.addEventListener(ev, lpCancel); });

                // Desktop：右鍵 bar 進入編輯（Android 長按觸發嘅 contextmenu 一併食咗，防雙重觸發）
                bar.addEventListener('contextmenu', function(e) { e.preventDefault(); if (!sbEditing) sbEnter(); });

                // Desktop：hover ✎ 掣
                const trigger = document.getElementById('sbEditTrigger');
                if (trigger) trigger.addEventListener('click', function(e) { e.stopPropagation(); sbEnter(); });

                // 完成：Esc / 撳 bar 同調色盤以外
                document.addEventListener('keydown', function(e) { if (e.key === 'Escape') sbExit(); });
                document.addEventListener('click', function(e) {
                    if (!sbEditing) return;
                    if (e.target.closest('.fhs-top-bar__actions') || e.target.closest('#sbPalette')) return;
                    sbExit();
                });

                sbApply();
            }
            window.initShortcutBar = initShortcutBar;
        })();
```

### E7 — init 掛鉤（錨：DOMContentLoaded 塊 ~L13184-13187）

```js
        document.addEventListener('DOMContentLoaded', () => {
            initSegmentedControls();
            initBottomNavIndicator();
        });
```
→
```js
        document.addEventListener('DOMContentLoaded', () => {
            initSegmentedControls();
            initBottomNavIndicator();
            initShortcutBar();
        });
```

### E8 — Changelog.md

檔頭最新條目之上按既有格式加一條（版本延續現有編號慣例），內容三點：月曆入快捷列（預設取代「修改」）、review 頁「查看檔期」掣取消、快捷列自訂系統（長按/右鍵/✎ + localStorage）。

## 五、驗收條件（機械判定）

1. **三步計數**（每檔）：`grep -c 'id="modeCalendarBtn"'` =1；`grep -c 'id="btnViewMoldCal"'` =0；`grep -c '#btnViewMoldCal {'` =0；`grep -c 'id="sbPalette"'` =1；`grep -c 'initShortcutBar();'` =1；`grep -c 'fhsShortcutBarV1'` ≥3；兩檔 `git diff --stat` 行數相若（±5）
2. **運行證據（playwright / Browser pane 開本地檔）**：
   a. 開頁零新增 console error
   b. 預設快捷列顯示 新增/月曆/訂單/財務/系統，冇「修改」；撳「月曆」→ `#moldCalOverlay.is-open` 出現且係 view 模式（唔回填 `#appDate`）
   c. 訂單總覽模式頁頂**冇**「查看檔期」掣
   d. Desktop：右鍵快捷列 → `.sb-editing` class 出現、掣有 ✕ badge、「＋加入」「✓完成」現身；撳「＋」→ palette 列出「修改」；撳「修改」項 → 修改掣出現喺列尾；撳一粒現有掣 → 消失；✓ 退出後 reload → localStorage 配置保持
   e. 375px 視窗：快捷列喺底部、編輯模式正常、palette 貼喺導覽列上方彈出
   f. 編輯模式下撳任何模式掣**唔會**切換模式（`currentMode` 不變）
3. 五粒 mode 掣 ID 同 inline onclick 原樣（`grep -c "modeEditBtn" ` 數量不跌）；`switchMode` 函式 diff 零改動

## 五之二、追加：約定日期／取模時間 欄位簡化（Fat Mo 2026-07-16 拍板，AskUserQuestion 二選一定案）

### 問題
`freehandsss_dashboardV42.html:4146`（HTML.4146）「約定日期」欄位同時存在兩套日曆機制：瀏覽器原生 `<input type="date">` 內置日曆圖示（右上）+ 自訂 `.mc-trigger-btn`（S159/S170/D29 加，開 `openMoldCalendar({bindMode:'form'})` 睇檔期）。因 `input[type=date]` 係 `.form-group` 內 `width:100%` block 元素，`.mc-trigger-btn` 冇位擺同一行，跌落第二行 → 視覺上「兩個calendar」。

### 定案
- **約定日期**：只留自訂月曆。隱藏原生日曆圖示、`input` 改 `readonly`（防手動打亂格式），成個欄位包一層 wrapper，撳欄位任何位置（或右側品牌日曆圖示）都開 `openMoldCalendar({bindMode:'form',triggerEl:wrapper})`——**保留** S159/D29 嘅撳日揀檔期功能，淨係唔再兩套機制並存
- **取模時間**：唔動功能，淨係跟新約定日期風格做視覺一致化（順手 polish，唔強制）

### 精確改動（兩檔 freehandsss_dashboardV42.html + Freehandsss_dashboard_current.html，內容一致）

**E9 — HTML（錨：`<div class="form-group"><label>約定日期</label>...</div>`，全行，HTML.4146）**

改前（全行）：
```html
<div class="form-group"><label>約定日期</label><input type="date" id="appDate" onchange="generate()"><button type="button" class="mc-trigger-btn" onclick="openMoldCalendar({bindMode:'form',triggerEl:this})" title="查看月曆"><svg class="ba-icon" width="14" height="14" style="vertical-align:middle;"><use href="#icon-calendar"/></svg></button></div>
```
改後：
```html
<div class="form-group">
    <label>約定日期</label>
    <div class="date-field-wrap" onclick="openMoldCalendar({bindMode:'form',triggerEl:this})" title="撳開月曆揀日（可睇檔期）">
        <input type="date" id="appDate" onchange="generate()" readonly>
        <svg class="ba-icon date-field-icon" width="16" height="16"><use href="#icon-calendar"/></svg>
    </div>
</div>
```

**E10 — CSS（錨：`.mc-trigger-btn { ... }` 整塊，CSS~3497，直接替換為新規則；全檔 `.mc-trigger-btn` 只此一處引用，改埋 HTML 後可安全整塊換走）**

```css
.date-field-wrap { position: relative; cursor: pointer; }
.date-field-wrap input[type="date"] {
    cursor: pointer;
    padding-right: 40px;
    background-color: #FFFFFF;
}
.date-field-wrap input[type="date"]::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
}
.date-field-wrap .date-field-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--fhs-accent);
    pointer-events: none;
}
```

**E11 — 取模時間視覺一致化（低風險 polish，不改行為）**：`<div class="form-group"><label>取模時間</label>` 區塊（HTML~4147-4155）維持 `<select>` 結構同 `onchange`/`onchange="updateTimeOptions()"` 邏輯完全不變；僅需檢查同 `.grid-2-col` 現有間距/圓角是否已同新 `.date-field-wrap` 視覺語言（邊框色/圓角半徑）一致，如有明顯落差可微調 `select` CSS padding/border-radius 對齊，**不得改動任何 `id`/`onchange`/JS 邏輯**。

### 驗收條件（機械判定）
1. 三步計數（兩檔）：`grep -c 'class="date-field-wrap"'` =1；`grep -c 'class="mc-trigger-btn"'` =0（HTML引用）；`grep -c '\.mc-trigger-btn {'` =0（CSS定義，全部移除）；`grep -c 'readonly>' \| grep appDate` 確認 `#appDate` 有 `readonly`
2. 運行證據：開頁零新增 console error；「約定日期」欄位只顯示**一個**日曆圖示（品牌 icon-calendar，右側）；撳欄位任何位置（含撳 input 本身）→ `#moldCalOverlay` 以 `mc-anchored` 模式喺欄位下方展開（bindMode='form'）；揀日子後回填 `#appDate.value` 正確且觸發 `generate()`；手動打字入 `#appDate`（keyboard type）**無效**（readonly 生效）
3. Desktop 錨定位置零重疊：popup 唔會遮住 appDate 本身（沿用既有 `_moldCalPositionAnchored` 邏輯，`trigger` 改傳 wrapper div，`avoidRect` 仍以 `#appDate` 本身 `getBoundingClientRect()` 計算，行為不變）
4. 375px 手機視窗：欄位無跌行、圖示對齊正常
5. 「取模時間」兩個 `<select>` 之 `id`/`onchange`/選項邏輯 diff 零改動（`git diff` 節選證明），僅允許 CSS 視覺數值調整

## 五之三、BUG 修復：表單模式（bindMode='form'）月曆明細 row 撳唔到（Fat Mo 2026-07-16 回報 + AskUserQuestion 確認）

### 根因
`freehandsss_dashboardV42.html:16926` `bookingRowHtml(b)` 淨係 `window._moldCal.bindMode === 'view'` 先幫每行加 `mc-row-link` class、`onclick="_moldCalOpenOrder(...)"`、尾嘅「›」箭嘴。喺「新增/修改」表單撳「約定日期」揭開嘅月曆（`bindMode:'form'`）入面，撳日子睇到嘅明細 row 冇綁任何 click 事件——外觀同 view 模式睇落一樣，但撳落去乜都冇反應。經 AskUserQuestion 確認 Fat Mo 中招嘅正正係 form 模式入口。

已本地實測排除嘅可能性：`_moldCalOpenOrder`/`openOrderModal` 本身、`globalOrders` 快取完整性——用 localhost 靜態伺服器 + 43 張真實 Supabase 訂單測試，view 模式（含同一張 07001011/Eugenia 訂單）撳一撳就開到 modal，證明問題只喺 form 模式冇綁 handler，唔關 openOrderModal 查表事。

### 定案
`_moldCalOpenOrder` 喺任何 bindMode 都只係「關月曆 + 開該單 read-only 詳情 modal」，唔會影響底下正編輯緊嘅表單草稿（`openOrderModal` 開嘅係疊喺上面嘅 modal，唔係 mode 切換/導航）。故**兩個入口統一都可以撳 row 跳去該單**，唔再按 bindMode 分岔。

### 精確改動（兩檔 freehandsss_dashboardV42.html + Freehandsss_dashboard_current.html，內容一致）

**E12 — `bookingRowHtml` 函式（錨：`function bookingRowHtml(b) { ... }` 整個函式，~HTML.16926）**

改前：
```js
function bookingRowHtml(b) {
    var isView = window._moldCal.bindMode === 'view';
    var open = isView ? ' onclick="_moldCalOpenOrder(\'' + esc(b.orderId) + '\')"' : '';
    return '<div class="mc-row' + (isView ? ' mc-row-link' : '') + '"' + open + '>'
        + '<span class="mc-row-t' + (b.slot === 'tbd' ? ' mc-row-tbd' : '') + '">' + esc(b.timeLabel) + '</span>'
        + '<span class="mc-row-who">' + esc(b.name) + '</span>'
        + '<span class="mc-row-oid">' + esc(b.orderId) + '</span>'
        + statusChip(b.status)
        + (isView ? '<span class="mc-row-go">›</span>' : '')
        + '</div>';
}
```
改後：
```js
function bookingRowHtml(b) {
    // S180 修復：撳 row 跳去該單詳情兩個入口（view/form）統一開放，唔再按 bindMode 分岔
    // （form 模式：淨係開一個疊喺上面嘅 read-only 詳情 modal，唔影響底下正編輯緊嘅草稿表單）
    return '<div class="mc-row mc-row-link" onclick="_moldCalOpenOrder(\'' + esc(b.orderId) + '\')">'
        + '<span class="mc-row-t' + (b.slot === 'tbd' ? ' mc-row-tbd' : '') + '">' + esc(b.timeLabel) + '</span>'
        + '<span class="mc-row-who">' + esc(b.name) + '</span>'
        + '<span class="mc-row-oid">' + esc(b.orderId) + '</span>'
        + statusChip(b.status)
        + '<span class="mc-row-go">›</span>'
        + '</div>';
}
```

### 驗收條件（機械判定）
1. `grep -c 'var isView = window._moldCal.bindMode'` =0（兩檔，確認舊分岔邏輯已移除）；`grep -A2 'function bookingRowHtml' <file>` 顯示新版本
2. 運行證據：表單入面撳「約定日期」開月曆（bindMode='form'）→ 撳一個有預約嘅日子 → 明細 row 顯示「›」箭嘴 → 撳 row → 月曆關閉 + `#fhsOrderModal` 開啟顯示該單詳情，且底下嘅新增/修改表單草稿內容不變（表單欄位值 reload 前後一致，證明冇被清空/導航走）
3. view 模式（快捷列「月曆」/查看檔期舊入口）行為不變，同步一次回歸測試

### 已知限制（記錄不即改，超出本次修復範圍）
本次調查過程中發現：`_moldCalOpenOrder`→`openOrderModal` 依賴 `globalOrders`（訂單總覽快取）已完整載入先揾到該單；`sbFetchGlobalReview` 有 `limit:200` 同 confirmed_at 篩選，理論上生產環境訂單量夠大時，某啲單有機會漏喺快取之外，令撳落 row 出現「揾唔到」靜默失效（`console.warn('[FHS Modal] order not found:'...)`，非本次回報症狀但屬同一功能面嘅潛在脆弱點）。留待日後獨立評估是否要加「快取搵唔到就即時補抓單一張」嘅 fallback，本次唔擴大範圍處理。

## 六、風險與對策

| 風險 | 對策（已內建） |
|---|---|
| switchMode 抹 inline style | 顯隱一律用 `.sb-hidden` class |
| 長按鬆手產生 click 誤刪掣 | 進入編輯 350ms 內 click 吞掉 |
| Android 長按同時觸發 contextmenu | contextmenu preventDefault + sbEditing guard |
| active 模式掣被隱藏 → indicator 0 寬 | E5 selector 加 `:not(.sb-hidden)` |
| localStorage 髒數據 | sbLoad 過濾+去重+<2 回退預設 |
| bar 清空 | SB_MIN=2 + toast 提示 |
