# 實施計畫 — Audit Ledger 成本顯示修復（方案 1，顯示層）

> **日期**：2026-06-13 | **模式**：規劃（NO-TOUCH，未寫任何業務碼）
> **前置**：診斷報告 `2026-06-13_audit_ledger_cost_display.md`
> **資料源裁決依據**：Supabase live（30 orders / 79 items）

---

## 0. 資料源最終裁決（v2 地基）

| 來源 | 覆蓋率 | reconcile total_cost | 裁決 |
|---|---|---|---|
| `orders.total_cost` | 30/30 | — | ✅ 唯一成本真理 |
| `orders.handmodel/keychain/necklace_cost`（訂單層類別）| **30/30** | 26/30（4單−$20）| ✅ **可靠成本結構** |
| `order_items.subtotal_cost / item_base_cost`（item層）| 57/79（72%）全有或全無 | ❌ 多單=$0 | 🟡 僅作 per-item 選配 |
| `order_items` 四欄 | 7/79（9%）| ❌ | ❌ 禁作成本真理 |

**關鍵教訓**：item 層成本（含 subtotal_cost）稀疏不可靠；成本結構必須取自**訂單層類別欄**。

---

## 1. v1 草案（初稿，已被自我批評推翻）

- ② 區改用 `order_items.subtotal_cost` 作每件成本，item 加總對賬
- 前端重算運費扣減 (n-1)×$20 / ×$35 顯示
- 立體擺設加靜態註腳「繪圖$60 + 物料$150」

## 2. 自我批評（3 弱點，全部 live data 實證）

1. **【致命】v1 假設 item `subtotal_cost` 可靠 → live 查詢當場推翻**：sum_sub 對多單=$0
   （0600723 整單 item 成本全 $0，訂單層卻 handmodel$210+keychain$1000）。
   只靠讀碼會中招；必須以 live data 驗證資料源。→ v2 改用訂單層類別欄。
2. **v1 在前端重算 (n-1)×$20 扣減 = 複製 n8n 成本邏輯到顯示層**（PX 報告已警告
   前端硬編碼技術債），規則一改即漂移。→ v2 改用「相減導出差額並標記」，零公式重算。
3. **v1 立體擺設靜態 $60+$150 = 無中生有**，DB 該列沒有此拆分，Pricing Bible 一改即腐。
   → v2 只顯示 DB 實有值 + 誠實標「明細未逐項記錄」，不發明數字。

## 3. v2（定稿設計）

### ② 成本快照鏈 — 重構
**主結構＝訂單層類別分解（可靠）**
```
② 成本快照（n8n 記帳）
  手模成本                    $210   ← orders.handmodel_cost
  鎖匙扣成本（已含運費扣減）   $1,000 ← orders.keychain_cost
  吊飾成本（已含運費扣減）     $0     ← orders.necklace_cost
  ═══════════════════════
  總成本                      $1,210
  運費共享扣減（n8n）         (−$20)  ← 導出：類別和 − total_cost
  ───────────────────────
  total_cost                  $1,190  ✓  ← orders.total_cost（真理）
```
- 三類別任一非零才顯示該行
- 差額（類別和 − total_cost）若 >0：標「運費共享扣減」（問題 E 誠實呈現），非錯誤
- costMatch = 差額屬已知扣減範圍（或為 0）

**per-item 清單＝次要（品名/數量/類別 + 選配金額）**
- 每件顯示 specification/product_sku + category tag + qty
- per-item 金額：`subtotal_cost > 0` 才顯示，否則「—（明細未記錄）」
- 四欄細項：僅 `four_sum ≈ subtotal_cost` 時可展開，否則隱藏

### 資料來源標記（provenance）
每個金額附極小來源標：`total_cost` / `類別欄` / `item明細` — 讓操作員與未來維護者一眼分辨真理欄 vs 選配欄。把「資料不可靠」轉為透明度功能。

### ①③④ 區
- 不變（Session 102 已正確；③ 利潤已用 total_cost）

---

## 4. 實施步驟（僅 freehandsss_dashboardV42.html，2 函式）

| # | 位置 | 改動 |
|---|---|---|
| S1 | `loadAuditLedger()` orders fetch | select 加 `handmodel_cost,keychain_cost,necklace_cost` |
| S2 | `loadAuditLedger()` items fetch | select 加 `subtotal_cost`（四欄保留作選配判斷）|
| S3 | `buildAuditLedgerHtml()` ② 區 | 重寫：訂單層類別主結構 + 導出扣減行 + per-item 次清單 |
| S4 | `buildAuditLedgerHtml()` costMatch/flags | 改以 total_cost 對賬；移除「四欄≠total」假警報 |
| S5 | CSS | 沿用 fhsAudit_*；至多加 1 個 provenance 小標 class |

**不碰**：HTML ID、captureFormState、calculatePricing、任何寫入路徑、n8n、Supabase schema。

## 5. 驗證清單
- [ ] 06001007（木框4肢）：② 顯示手模 $210，total $210 ✓（非 $60）
- [ ] 0600723（多鎖匙扣）：類別和 $1,210 − 扣減 $20 = total $1,190 ✓
- [ ] 0600100（舊單 ??類別）：類別行顯示、per-item 標「明細未記錄」，無 $0 假象
- [ ] 無任何訂單出現假紅旗（四欄空不再觸發 costMatch fail）
- [ ] Desktop + 手機 bottom-sheet 兩態
- [ ] Live 3 單 Fat Mo 真機核對

## 6. 八維度評估（v2）
| 維度 | v2 表現 |
|---|---|
| perf 效能 | orders fetch 加 3 欄，同一往返，零新查詢；render O(items) 不變 |
| ux_mgmt 管理 | 3 行類別分解可見地加總到 total_cost，操作員一眼可核；provenance 標分辨真理欄 |
| conflict 衝突 | 僅 2 函式 1 檔；不動 ID/captureFormState/寫入路徑/n8n/schema；零撞 payment-split |
| token | 實作 ~3-5k；單檔 vanilla，無需 frontend-developer 冷啟 |
| long_term | 零公式重算、零發明數字；Task A 修好後四欄自動回填即自動增益，不需改碼 |
| responsive | 沿用 Session 102 fhsAudit_* 響應式；類別僅 3-4 行，手機 trivially fits |
| subagent/skill | finance-gatekeeper 已套；實作免 subagent；驗證 inline Supabase（已證可行）|
| history | decisions/CHANGELOG/handoff + 既有 kgov sync point + lesson 已警示 |

---
*規劃完成，未改任何業務碼。等 /execute 授權。*
