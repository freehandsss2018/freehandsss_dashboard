# A2 Implementation Plan — PGC-ODAT v3 Lite
# 訂單總覽子項目成本與利潤稽核（折中方案）
> 版本：v3 Lite（已決定）
> 決策日期：2026-05-27
> 決策記錄：`.fhs/notes/decisions.md`（2026-05-27 條目）
> 決策人：Fat Mo ✅

---

## 一、方案摘要

採「全域預載快取 + 按需稽核 Toggle + 對賬試算 Modal」架構（PGC-ODAT v3 Lite）：

| 元件 | 說明 |
|------|------|
| **Preload（v2 核心）** | init() 時非同步載入 products.sku/suggested_price/cost → flat Map，TTL 30 min |
| **Toggle（v2 核心）** | CSS class 切換（`body.fhs-audit-on`），不重 render，< 50 ms |
| **Desktop 財務子列** | `<tr class="audit-fin">` SKU建議價/利潤 + 免責註腳 |
| **Mobile 💰 Drawer** | per-item drawer，點 💰 icon 展開，不全展開 |
| **💡 對賬 Modal（v3.A）** | 每行右側 💡 icon → modal 顯示 SKU價/實付推估/可能差異原因 |

**捨棄項目**：
- ❌ v3.B（nested Map）— YAGNI，products 表無 tier_json/effective_date
- ❌ v3.C（Hybrid sync / user_preferences 表）— 單人系統，localStorage 足夠

---

## 二、漸進三階段策略

| Phase | 顯示內容 | 啟動條件 |
|-------|---------|---------|
| **P1（現在）** | SKU建議價 + SKU建議利潤 + 灰色註腳「📋 不含整單優惠/折讓」 | 本次實作 |
| **P2（半年內）** | 加「實付分攤」欄 | 訂單折扣規則完善後 |
| **P3（成熟後）** | 加「差異欄」+ 自動歸因（Tier/Adjustment/手工折讓） | products 表加 tier_json 後 |

---

## 三、七階段實施計畫

### Phase 0 — 規劃與授權

- [ ] `database-reviewer` 審查：products select RLS（anon 是否可讀 sku/suggested_price/cost）
- [ ] 確認 `preloadSuggestedPrices()` 查詢語法安全（無注入風險）
- [ ] Fat Mo `/execute` 授權 Phase 1 動工
- **Gate**：database-reviewer PASS + /execute 授權
- **回滾**：N/A（純規劃）

---

### Phase 1 — V41 開發版實作（全部在 freehandsss_dashboardV41.html）

| Step | 位置 | 動作 |
|------|------|------|
| 1.1 | global 變數區（~line 5837） | 宣告 `let fhsSuggestedPriceMap = {}; let fhsPriceMapLoadedAt = 0;` |
| 1.2 | helper 函式區 | 新增 `preloadSuggestedPrices()`（async，TTL check，失敗 degrade） |
| 1.3 | `init()` | 呼叫 `preloadSuggestedPrices()`（非 await，fire-and-forget） |
| 1.4 | `mapOrder()` | item return 補 `Product_SKU: it.product_sku \|\| ''` |
| 1.5 | helper 函式區 | 新增 `toggleAuditMode()`（切 body class，localStorage 寫入，不 re-render） |
| 1.6 | CSS 區 | `.audit-fin { display:none; } body.fhs-audit-on .audit-fin { display:flex; }` |
| 1.7 | 篩選列 HTML | 插入 `#fhsToggleAuditBtn` 按鈕 + `onclick="toggleAuditMode()"` |
| 1.8 | `renderReviewTable` Desktop | items 渲染注入 `<tr class="audit-fin">` SKU建議價/利潤 + 缺 SKU fallback（`—`） |
| 1.9 | `renderReviewTable` Mobile | acc-item-card 右側加 💰 icon + drawer div（預設 `display:none`） |
| 1.10 | helper 函式區 | 新增 `toggleItemDrawer(itemKey)`（CSS slideDown） |
| 1.11 | 各渲染行 | 加 💡 icon + `onclick="openAuditModal(itemKey)"` |
| 1.12 | HTML body 底部 | 新增 `<dialog id="auditCalcModal">` 結構 |
| 1.13 | helper 函式區 | 新增 `openAuditModal(itemKey)`：計算 SKU建議價/實付推估/差異原因清單 |

- **Gate**：本地 Chrome 手動測試（toggle/drawer/modal）+ NaN guard 確認
- **回滾**：`git checkout freehandsss_dashboardV41.html`

---

### Phase 2 — 防禦驗證

- [ ] `tdd-guide` 啟動，寫 `scripts/repair/test_preload.js`：
  - 驗證 490 SKU 載入完整、suggested_price 非 null
  - 模擬 SKU 缺失 → fallback `—` 顯示
  - 模擬 Map 未載入 → spinner 顯示
- [ ] `tdd-guide` 寫 `scripts/repair/test_audit_toggle.js`：
  - toggle on/off CSS class 正確
  - localStorage 正確寫入/讀取
- [ ] `.fhs/notes/pitfalls.yaml` 新增 **P8 — preload-map-race-condition**
- **Gate**：兩腳本均 PASS
- **回滾**：N/A

---

### Phase 2.5 — Code Review Gate

- [ ] 啟動 `code-reviewer` 審查 V41 diff
- 檢查項：HTML ID 未動 / API key 未洩 / 財務真理守護未違反 / captureFormState 未動
- **Gate**：code-reviewer PASS verdict
- **回滾**：FAIL → 回 Phase 1 修補

---

### Phase 3 — UX 驗收（Playwright MCP）

- [ ] Desktop 1920px：toggle 開/關、財務子列批次色繼承、💡 modal 開啟/關閉
- [ ] Mobile 750px：💰 drawer 展開/收合、modal ESC 關閉
- [ ] 邊界：羊毛氈加購配件 → 顯示「—」非 NaN
- [ ] 邊界：preload 尚未完成 → spinner 顯示
- **Gate**：Fat Mo 實機驗收（iPhone Safari）
- **回滾**：UX FAIL → 回 Phase 1.8/1.9

---

### Phase 4 — /execute 授權同步

- [ ] Fat Mo 輸入 `/execute V41 → current 同步`
- [ ] 先備份：`cp current.html current.html.bak`
- [ ] cp V41 → current.html（繞 Hook R1 既有方式）
- [ ] verify diff = 0（byte 數對齊）
- **Gate**：byte 數一致
- **回滾**：`cp current.html.bak current.html`

---

### Phase 5 — 記憶層同步

- [ ] `handoff.md` 加 Session 31 條目
- [ ] `CHANGELOG.md` 加版本標
- [ ] `docs/repo-map.md` 加 `scripts/repair/test_preload.js` + `scripts/repair/test_audit_toggle.js`
- [ ] `/commit` → `node scripts/Sync_Notion_Brain.js`
- **Gate**：5 個檔案寫入 + commit 完成

---

### Phase 6 — 持續觀察

- 觀察一週實際使用體驗
- 若 Map 30 min TTL 觸發重整頻繁 → 調整至 60 min
- 若手機 drawer 動畫卡頓（低端設備）→ 降回 instant show
- 若 P2 折扣規則完善 → 啟動 Phase 2（實付分攤欄）計畫

---

## 四、防禦規格（preloadSuggestedPrices 必實作）

```javascript
async function preloadSuggestedPrices() {
    const TTL = 30 * 60 * 1000; // 30 min
    if (Date.now() - fhsPriceMapLoadedAt < TTL) return; // cache valid
    try {
        if (!isSupabaseRead()) return;
        const rows = await sbFetch('products', { select: 'sku,suggested_price,cost' });
        if (!rows || rows.length === 0) return;
        rows.forEach(r => {
            if (r.sku) fhsSuggestedPriceMap[r.sku] = {
                price: Number(r.suggested_price || 0),
                cost:  Number(r.cost || 0)
            };
        });
        fhsPriceMapLoadedAt = Date.now();
    } catch (e) {
        // degrade gracefully — toggle 按鈕完全隱藏
        const btn = document.getElementById('fhsToggleAuditBtn');
        if (btn) btn.style.display = 'none';
    }
}
```

**渲染端防禦**：
```javascript
const entry = fhsSuggestedPriceMap[sku];
if (!entry) return '<span style="color:#999" title="未列入價目表">—</span>';
```

---

## 五、Subagent 啟動矩陣

| Phase | Subagent | 任務 |
|-------|---------|------|
| 0 | `database-reviewer` | products select RLS + 查詢安全性 |
| 2 | `tdd-guide` | test_preload.js + test_audit_toggle.js |
| 2.5 | `code-reviewer` | V41 diff PASS/FAIL gate |
| 3 | Playwright MCP | Desktop + Mobile E2E |

---

## 六、待辦 — 舊計畫檔案問題

> ⚠️ handoff.md 第 770 行記錄的「立體擺設款式管理 UI 整合」計畫（含 R1/R2 高風險點）已被本計畫覆蓋。
> 若需救回，請指示 Fat Mo，可從 git log 找回舊版本。
> 若已放棄「立體擺設款式管理」計畫，請告知以清理 handoff 待辦 #5。
