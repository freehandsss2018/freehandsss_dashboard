# V39 Prototype-First Rebuild — Phase 0 Contract Freeze
**日期**：2026-04-07
**階段**：PHASE 0（純分析，NO-TOUCH）
**來源**：Freehandsss_Dashboard/freehandsss_dashboardV36.html（4213 lines）+ Triple_Sync_Field_Map.md V45.7.4
**授權狀態**：等待 Fat Mo 核准後進入 Phase 1 (ui-designer)

> 本文件是 V39 重建的**契約底線**。Phase 1-3 所有輸出必須逐條符合。
> 任何違反者 = 直接 FAIL，不得進入 hookup。

---

## 1. 不可變 HTML ID 清單（Contract-Critical IDs）

以下 ID 被 `captureFormState()`、`restoreFormState()`、`generate()`、`syncToAirtable()`、webhook payload 直接 `getElementById()` 引用。**任何新建 HTML 必須保留相同 ID 命名與語義**。

### 1.1 訂單主控 / 模式切換
| ID | 型別 | 用途 | 引用點 |
|---|---|---|---|
| `formContainer` | `<div>` | captureFormState 掃描邊界（只抓此容器內的 input/select） | V36:2807 |
| `orderIdDisplay` | `<input>` | 訂單 ID 顯示/輸入 | captureFormState, payload.Order_ID |
| `searchOrderId` | `<input>` | 舊單搜尋（captureFormState **排除**此欄） | V36:2866 (NOT captured) |
| `modeCreateBtn` / `modeEditBtn` / `modeReviewBtn` | `<button>` | 三大模式切換 | switchMode() |
| `editModeContainer` / `reviewModeContainer` | `<div>` | 模式子容器 | — |
| `fetchStatus` | `<p>` | 讀單狀態顯示 | — |
| `searchSuggestions` | `<div>` | 模糊搜尋下拉 | handleFuzzySearch() |
| `roleLingBtn` / `roleFatBtn` | `<button>` | Ling/Fat 角色切換 | setRole() |

### 1.2 Fat Mo 專屬設定（可隱藏，但不可拔除）
| ID | 用途 |
|---|---|
| `idStatusDot` / `idStatusText` | ID 狀態指示燈 |
| `fatmoConfigPanel` | Fat Mo 配置面板（沙盒/序號） |
| `btnIdModeRandom` / `btnIdModeSeq` | ID 模式 |
| `seqSetRow` / `nextSeqIdInput` | 序號設定 |
| `configSyncStatus` | 同步狀態 |
| `sandboxBanner` / `sandboxToggleBtn` | 沙盒模式 |
| `qaCenter` / `qaLog` / `qaDocPanel` / `toggleDocBtn` | QA 測試中心 |

### 1.3 客戶基本資料
| ID | 型別 | captureFormState key |
|---|---|---|
| `momName` | input text | momName |
| `appDate` | input date | appDate |
| `babyAgeMonths` | input number | babyAgeMonths |
| `babyAgeWarning` | div | — (UI only) |
| `appTimeHour` | select | appTimeHour |
| `appTimeAmPm` | select | appTimeAmPm |

### 1.4 Category P (立體擺設) — 主開關 + 子項
| ID | 說明 |
|---|---|
| `enableP` | 主開關（checkbox） |
| `contentP` | 子內容容器 |
| `pSubCat` | 子類別（木框/玻璃瓶） |
| `limbContainer` | **動態生成**肢體選單容器 |
| `pEngraving` | 刻字 |
| `woodStyle`, `baseColor` | 木框子選項（動態生成） |
| `en_parent`, `box_parent`, `en_elder`, `box_elder` | 成人/大寶子區塊 |
| `adultWoodForceHint` | 成人+木框強制 P 模式提示 |
| `pricingEngineUI`, `suggestedPrice`, `drawingCost`, `pricingLogicDetails` | 報價引擎 UI |

### 1.5 Category K (鎖匙扣) — 嬰兒/大寶/家庭三區 × 4 部位
**必保留**（40 IDs）：
```
enableK, contentK
k_baby_sec_en, k_baby_sec_box
k_{lh|rh|lf|rf}_en / _box / _qty / _top / _bot      (4 部位 × 5 = 20)
k_elder_sec_en, k_elder_sec_box
k_e_{lh|rh|lf|rf}_en / _box / _qty / _top / _bot    (4 部位 × 5 = 20)
k_family_en, k_family_box, k_family_combo, k_family_qty, k_family_top, k_family_bot
fam_p1_wrap, fam_p1_lbl, fam_p1_sel
fam_p2_wrap, fam_p2_lbl, fam_p2_sel
```

### 1.6 Category M (吊飾) — 嬰兒/大寶兩區 × 4 部位
**必保留**（30 IDs）：
```
enableM, contentM
m_baby_sec_en, m_baby_sec_box
m_{lh|rh|lf|rf}_en / _box / _qty / _color / _eng    (4 部位 × 5 = 20)
m_elder_sec_en, m_elder_sec_box
m_e_{lh|rh|lf|rf}_en / _box / _qty / _color / _eng  (4 部位 × 5 = 20)
```

### 1.7 Category W (配件)
| ID | 說明 |
|---|---|
| `enableW` / `contentW` | 主開關與容器 |
| `w_wool_en` / `w_wool_qty` | 羊毛氈啟用與數量 |

### 1.8 金額欄位
| ID | payload 欄位 |
|---|---|
| `deposit` | Deposit |
| `balance` | Balance |
| `additional` | Additional_Fee |

### 1.9 訊息預覽
| ID | 說明 |
|---|---|
| `output-preview-a` | textarea — 手模擺設訊息（payload.Full_Order_Text 組合來源） |
| `output-preview-b` | textarea — 金屬產品訊息（payload.Full_Order_Text 組合來源） |
| `preview-box-a` / `preview-box-b` | 預覽容器 |
| `no-preview-msg` | 空狀態訊息 |

### 1.10 底部動作列 & Sync
| ID | 說明 |
|---|---|
| `bottomActionBar` | 底部動作列容器 |
| `btnCopyA` / `btnCopyB` | 複製訊息按鈕 |
| `syncBtn` | **關鍵**：Sync to Airtable 按鈕（onclick="syncToAirtable()"） |

### 1.11 Review / 全域核對
| ID | 說明 |
|---|---|
| `reviewYear`, `reviewMonth`, `reviewStatus`, `reviewBatch`, `reviewSearch` | 篩選控制 |
| `reviewTable`, `reviewTableBody` | 資料表 |
| `reviewLoading`, `reviewCountBadge` | 狀態顯示 |
| `batch-input-{orderId}-{index}`, `status-select-{orderId}-{index}`, `save-indicator-{orderId}` | 動態生成（格式必須保留） |

### 1.12 Modal / Loader / Toast
| ID | 說明 |
|---|---|
| `deleteConfirmModal`, `deleteModalOrderId`, `confirmDeleteBtn` | 刪除確認 |
| `globalLoader`, `loaderText` | 全域 loader |
| `toast` | 複製完成 toast |

---

## 2. captureFormState 契約（最高真理）

**位置**：V36:2805-2830

```js
function captureFormState() {
    const state = {};
    const container = document.getElementById('formContainer');  // ⚠️ 必須存在
    if (!container) return JSON.stringify({});

    // ⚠️ 關鍵：掃描 formContainer 範圍內所有 input/select
    container.querySelectorAll('input, select').forEach(el => {
        let key = el.id;
        // ⚠️ 動態肢體選單使用 data-who + data-part 組合 key
        if (!key && el.classList.contains('limb-sel')) {
            key = `limb_sel_${el.getAttribute('data-who')}_${el.getAttribute('data-part')}`;
        }
        if (key) {
            if (key === 'nextSeqIdInput') return;  // 排除 Fat Mo 設定
            if (el.type === 'checkbox' || el.type === 'radio') {
                state[key] = el.checked;
            } else {
                state[key] = el.value;
            }
        }
    });
    return JSON.stringify(state);
}
```

### 契約死線
1. **所有表單 input/select 必須包在 `#formContainer` 內**（否則不會被抓）
2. **動態肢體選單必須同時具備 `class="limb-sel"` + `data-who` + `data-part`**
3. **不得新增非預期的 ID**（Update_Note 差異比對會誤判為變動）
4. **Ling Au 搜尋框的 ID 必須是 `searchOrderId`**（captureFormState 不抓此欄位，restoreFormState 明確排除）
5. **Fat Mo 設定欄位 ID 必須是 `nextSeqIdInput`**（被明確排除）

---

## 3. restoreFormState 契約（Edit 模式 100% 還原）

**位置**：V36:2832-2960+

**三步流程（必保留順序）**：
1. **步驟 1**：還原所有靜態 ID 欄位（checkbox/radio 還原 checked，其餘還原 value），並 dispatch `change` + `input` 事件觸發 UI 聯動
2. **步驟 2**：強制套用 `enableP/K/M` → `contentP/K/M` 的 `active` class
3. **步驟 3**：重新渲染動態 DOM（`renderLimbGrid()`, `updateFamilyParts()`）後才還原 `limb_sel_*` 動態欄位

### 契約死線
- `enableP/K/M` 必須是 checkbox，對應 `contentP/K/M` 的 `.active` class 顯示控制
- 動態子元件（limb grid / family parts / P/K/M 子區塊）必須能透過 dispatchEvent('change') 被正確還原
- 防呆邏輯必須保留：字串前綴 `=` 剝除、多層 JSON 反序列化

---

## 4. Webhook Payload 契約（Sync 核心）

**位置**：V36:3219-3267（syncToAirtable）
**Endpoint**：`https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b`
**對齊文件**：`n8n/Triple_Sync_Field_Map.md` §2.1 / §2.2

```js
const payload = {
    "action": currentMode,  // "create" | "edit" | "delete"
    "Order_ID": ...,
    "Customer_Name": getElementById("momName").value || "待定",
    "Appointment_Date": rawDate || null,
    "Deposit": Number(getElementById("deposit").value) || 0,
    "Balance": Number(getElementById("balance").value) || 0,
    "Additional_Fee": Number(getElementById("additional").value) || 0,
    "System_Total_Cost": window.fhsCurrentPricingMeta.System_Total_Cost,
    "System_Final_Sale_Price": window.fhsCurrentPricingMeta.System_Final_Sale_Price,
    "System_Additional_Fee": window.fhsCurrentPricingMeta.System_Additional_Fee,
    "Full_Order_Text": (#output-preview-a.value + "\n\n" + #output-preview-b.value).trim(),
    "Clean_Order_Text": (split by 🖼️ + ⚙️, trim),
    "Raw_Form_State": captureFormState() + 注入 __FHS_* / __System_* 欄位,
    "Update_Note": (edit 模式下的差異摘要),
    "Order_Items_List": orderItemsArray
};
```

### 契約死線
1. **15 個頂層欄位 key 一字不改**
2. **`Raw_Form_State` 必須是 stringified JSON**（n8n Input Normalizer 依賴此格式）
3. **`__FHS_Quote_Mode` / `__FHS_Quote_HasAdult` / `__System_Total_Cost` / `__System_Final_Sale_Price` / `__System_Additional_Fee` 五個注入欄位必保留**
4. **`Order_Items_List` 每個 item 必須有 `Order_Item_Key`（如 `TEMP_P_MAIN`, `TEMP_K_${part_id}`, `TEMP_K_FAM`）**
5. **`window.fhsCurrentPricingMeta` / `window.fhsCurrentPricingItems` 全域變數不得重新命名**
6. **前端利潤計算為最高真理**（AGENTS.md 硬規則）—— n8n 不得重算

---

## 5. 關鍵全域變數（State 依賴）

| 變數 | 用途 | 依賴點 |
|---|---|---|
| `window.fhsCurrentPricingItems` | 當前報價項目陣列 | payload 注入、hasAdult 判斷 |
| `window.fhsCurrentPricingMeta` | 當前報價 meta（Total_Cost, Final_Sale_Price, Additional_Fee） | payload 注入 |
| `lastFetchedState` | Edit 模式基準快照 | Update_Note 差異比對 |
| `editTargetOrderId` | Edit 模式目標訂單 ID | payload.Order_ID |
| `currentMode` | 'create' / 'edit' / 'review' | payload.action |
| `systemConfig` | 全域配置（last_id, mode） | Fat Mo 設定 |
| `isDevMode` | 沙盒模式旗標 | getWebhookUrl 重導 |
| `orderID` | 新單 ID fallback | — |

---

## 6. 事件綁定契約（onclick / onchange）

### 6.1 必保留的 inline handlers
| Handler | 綁定 ID | 函式 |
|---|---|---|
| `setRole('ling'/'fat')` | roleLingBtn, roleFatBtn | 角色切換 |
| `toggleSandbox()` | sandboxToggleBtn | 沙盒 |
| `switchMode('create'/'edit'/'review')` | 三大模式按鈕 | 模式切換 |
| `setIdMode('random'/'sequential')` | btnIdMode* | ID 模式 |
| `onIdInputBlur()` | orderIdDisplay `onblur` | ID 驗證 |
| `handleFuzzySearch()` | searchOrderId `oninput` | 模糊搜尋 |
| `generate()` | 幾乎所有 input 的 `onchange/oninput` | 實時報價 |
| `toggleAddon('contentP/K/M', this)` | enableP/K/M `onchange` | 主區塊顯隱 |
| `togglePart('box_xxx', this)` | 子區塊 checkbox | 子區塊顯隱 |
| `renderLimbGrid()` | pSubCat `onchange` | 動態肢體渲染 |
| `updateFamilyParts()` | k_family_combo `onchange` | 家庭組合 |
| `updateTimeOptions()` | appTimeAmPm `onchange` | 時間選項 |
| `copyMessageA()` / `copyMessageB()` | btnCopyA/B | 複製訊息 |
| `syncToAirtable()` | syncBtn `onclick` | **主 Sync** |
| `fetchOldOrder()` | Edit 模式讀單按鈕 | 讀舊單 |
| `fetchGlobalReview()` | Review 篩選 `onchange` | 全域查詢 |

### 6.2 死線
- 所有 handler 名稱不得重新命名（否則 payload 產出斷鏈）
- `generate()` 是實時報價核心，每個影響報價的 input 都要掛（必要時用 event delegation 但契約結果需相同）
- `syncBtn.onclick` 必須仍是 `syncToAirtable()`（不可改成 async/await 宣告方式以外的替代品）

---

## 7. 歷史失敗教訓（2026-04-06 Governance Reset）

**引用**：`Changelog.md` GOVERNANCE RESET, `handoff.md` 決策記錄

- 舊 V37/V38/V39 prototype 被正式封存至 archive/，原因：
  1. 介面品質不佳
  2. 功能完整度未達標
  3. 架構噪音（legacy style block, patch-style CSS, !important 氾濫）
- V36.2.2 是當前**唯一** Stable Baseline
- 新 V37 已從 V36 複製建立，但 `captureFormState` 與 Webhook 提交邏輯尚未重實作
- V39 AOM（2026-04-05）建立過一次原型，後續被標記為不合格

**不可重蹈覆轍**：
- 禁止繼承 V36/V37/V38 任何 CSS class 命名或結構
- 禁止複製 `.card` / `.form-group` / `.part-details` 等舊 DOM pattern 當新設計起點
- 禁止 patch-style CSS / `!important` 堆疊
- 禁止讓 desktop dashboard layout 主導 iPhone 體驗

---

## 8. 新建 V39 的「結構不可動、視覺可全換」邊界

| 層級 | 可動 | 不可動 |
|---|---|---|
| **HTML 結構** | tag 階層、class 命名、DOM 組織 | ID 名稱、data-* 屬性、input type |
| **CSS** | 全部換新（design tokens、layout system） | 不得依賴 V36 舊 class 名稱 |
| **JavaScript 業務邏輯** | 不動 | captureFormState / restoreFormState / generate / syncToAirtable / getWebhookUrl / 全域變數 |
| **事件綁定方式** | 可改為 addEventListener | 綁定的目標 ID 與 handler 函式名稱必須一致 |
| **Payload** | 完全不動 | 15 欄位 key + Raw_Form_State 結構 |
| **Webhook URL** | 不動 | 3 個 endpoint 完整保留 |

---

## 9. Phase 1-3 前置清單（給 ui-designer / frontend-developer / code-reviewer 的硬約束）

### Phase 1 (ui-designer) Input Contract
1. 本 Contract Freeze 文件（**必讀**）
2. Triple_Sync_Field_Map.md（payload 真理）
3. 禁止觸碰功能 JS / webhook / Airtable
4. 產出：iPhone-first wireframe + 資訊架構 + 抽屜互動 spec + 字排視覺系統 + DOM proposal（含所有必保留 ID 位置示意）
5. 明確聲明：每個 ID 的 container placement 與 visual grouping

### Phase 2 (frontend-developer) Input Contract
1. 本文件 + Phase 1 產出
2. 輸出靜態 HTML/CSS/JS prototype
3. **保留全部第 1 章 IDs**
4. **保留第 6.1 章所有 inline handler 語義**（可改 addEventListener，但目標 handler 名稱一致）
5. **captureFormState / restoreFormState / syncToAirtable / generate 函式定義保留**（可從 V36 直接搬過來，不得重寫邏輯）
6. **webhook fetch 呼叫使用 `TODOhookup` 註解占位**，但 payload 物件建構必須照抄第 4 章
7. 零 `<script src="products.js">`（已確認 V36 本來就沒用）

### Phase 3 (code-reviewer) Audit Checklist
- [ ] 第 1 章所有 ID 全數存在且 getElementById 可找到
- [ ] `#formContainer` 存在且包住所有表單 input
- [ ] captureFormState() 回傳的 key 集合與 V36 完全一致
- [ ] restoreFormState() 對 enableP/K/M 還原後 contentP/K/M 正確展開
- [ ] payload 物件 15 欄位 key 一字不差
- [ ] Raw_Form_State 注入 __FHS_* / __System_* 5 欄位
- [ ] syncBtn 綁定 syncToAirtable
- [ ] iPhone 16px / 44px 可觸控目標達標
- [ ] safe-area-inset 處理
- [ ] 無 V36/V37/V38 舊 class 殘留
- [ ] 無 !important 氾濫
- [ ] 無實際 fetch 連接（TODOhookup 占位）
- [ ] 無 API key 洩漏
- [ ] 單欄工作流，底部 sticky action bar

---

## 10. 執行計劃建議

```
PHASE 0 (本文件)  ✅ 完成，等待 Fat Mo 核准
  ↓
PHASE 1: ui-designer  — 產出 design spec + wireframe + DOM proposal
         （單 subagent call，輸出文件，不寫 HTML）
  ↓
PHASE 2: frontend-developer — 產出 freehandsss_dashboardV39_proto.html
         （單 subagent call，static HTML，TODOhookup 註解占位）
  ↓
PHASE 3: code-reviewer — 稽核 prototype，PASS/FAIL 報告
         （讀 only，不改檔）
  ↓
PHASE 4: Hookup（需要另一次 /execute 授權）
         將 TODOhookup 換成真實 webhook fetch、三端驗證、正式上線
```

---

**⛔ STOP — 等待 Fat Mo 核准 Phase 0 契約，才會進入 Phase 1。**

請 Fat Mo 確認：
1. 第 1 章 ID 清單是否完整？有無遺漏任何 Ling Au 常用欄位？
2. 第 4 章 payload 契約是否與當前 n8n workflow 一致？
3. 是否同意進入 Phase 1，委派 `ui-designer` subagent 產出 iPhone-first 設計 spec？
