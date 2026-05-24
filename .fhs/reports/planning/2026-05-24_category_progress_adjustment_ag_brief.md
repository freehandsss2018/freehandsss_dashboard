# AG 執行簡報 — Category-Aware Progress & Adjustment Amount (v4)

**出具方**：Claude Code (A3)
**日期**：2026-05-24
**授權**：Fat Mo 明確發出 `/execute`
**依據**：
- 計畫：`.fhs/reports/planning/a2_implementation_plan.md` (v4)
- 審查：本 session database-reviewer 稽核報告（R1 WARN / R2 PASS / R3 WARN / R4 BLOCK）

---

## 任務摘要

為 FHS Dashboard 新增：
1. **Category-Aware 進度下拉**：立體擺設 / 鎖匙扣 / 純銀吊飾 各有不同進度選項
2. **item_status ENUM 擴充**：加入 `需進行補打`、`已book日期`、`已取模`、`待交收`
3. **補打調整金額 (adjustment_amount)**：訂單層新欄位，行內輸入 + Edit 表單 + Airtable 同步

> **注意**：`adjustment_amount` 欄位**已存在** Supabase `orders` 表（`NUMERIC(10,2) DEFAULT 0`，建於 `0001_initial_schema.sql`），無需新建欄位 migration。

---

## 執行清單（4 個 Phase）

---

### Phase 1 — Supabase Migration（新建）

**檔案**：`supabase/migrations/0015_item_status_enum_extension.sql`

```sql
-- Extend item_status ENUM with new statuses for Category-Aware Progress
ALTER TYPE item_status ADD VALUE IF NOT EXISTS '需進行補打';
ALTER TYPE item_status ADD VALUE IF NOT EXISTS '已book日期';
ALTER TYPE item_status ADD VALUE IF NOT EXISTS '已取模';
ALTER TYPE item_status ADD VALUE IF NOT EXISTS '待交收';
```

> ⚠️ 需在 Supabase SQL Editor 手動執行。ENUM ADD VALUE 不可回滾，`IF NOT EXISTS` 確保冪等。

---

### Phase 2 — 前端修改（兩個 HTML 文件同步）

**文件**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

以下所有行號以 `freehandsss_dashboardV41.html` 為準。`current.html` 需做**完全相同**的修改。

---

#### 2A — `_sanitizeItemStatus` `_valid` Set（**BLOCK R1 必修，與 ENUM migration 同批**）

**位置**：line 3395

**現有代碼**：
```javascript
var _valid = new Set(['待製作', '製作中', '完成', '已取件']);
```

**改為**：
```javascript
var _valid = new Set(['待製作', '製作中', '完成', '已取件', '需進行補打', '已book日期', '已取模', '待交收']);
```

> 理由：ENUM migration 後若此 Set 未更新，用戶選擇新狀態後 `_sanitizeItemStatus` 會靜默轉為 `'待製作'`，造成功能性失效且無錯誤提示。

---

#### 2B — `reconstructOrderFromSupabase` select 查詢加入 `adjustment_amount`

**位置**：line 5140

**現有代碼**（select 字串末尾）：
```
...select=order_id,customer_name,appointment_at,deposit,balance,additional_fee,final_sale_price,raw_form_state&limit=1
```

**改為**：
```
...select=order_id,customer_name,appointment_at,deposit,balance,additional_fee,additional_fee,adjustment_amount,final_sale_price,raw_form_state&limit=1
```

同時在 `_synth` 物件（約 line 5185 附近）加入：
```javascript
adjustment: (_row.adjustment_amount ?? 0),
```

並在函式末段（financial injection 區，約 line 5313 附近）加入：
```javascript
const adjEl = document.getElementById('adjustment');
if (adjEl) {
    adjEl.value = _row.adjustment_amount > 0 ? _row.adjustment_amount : '';
    const adjWrapper = document.getElementById('adjustment-wrapper');
    if (adjWrapper) adjWrapper.style.display = _row.adjustment_amount > 0 ? 'block' : 'none';
}
```

---

#### 2C — Edit 表單新增 `#adjustment` 輸入欄

**位置**：財務結算區（`#deposit` 欄位附近，約 line 2880）

在 `已付訂金/全數` 和後續欄位之後，新增：
```html
<div id="adjustment-wrapper" style="display:none; margin-top:8px;">
    <label>補打費用 ($)</label>
    <input type="number" id="adjustment" placeholder="0" min="0" step="1"
           style="width:100%; padding:6px; border:none; border-bottom:1px solid #ccc; outline:none;">
</div>
```

---

#### 2D — `sbSyncOrder` orderRow 加入 `adjustment_amount`（**BLOCK R4 前端端**）

**位置**：line 8706–8717（orderRow 物件）

在 `final_sale_price` 行之後加入：
```javascript
adjustment_amount: payload.Adjustment_Amount || 0,
```

即：
```javascript
const orderRow = {
    order_id:          effectiveOrderId,
    customer_name:     payload.Customer_Name || '',
    appointment_at:    payload.Appointment_Date || null,
    deposit:           payload.Deposit  || 0,
    balance:           payload.Balance  || 0,
    additional_fee:    payload.Additional_Fee || 0,
    adjustment_amount: payload.Adjustment_Amount || 0,   // ← 新增
    final_sale_price:  payload.System_Final_Sale_Price || 0,
    full_order_text:   payload.Full_Order_Text || '',
    raw_form_state:    rawFormObj,
    ...(mode === 'create' ? { confirmed_at: new Date().toISOString().slice(0, 10) } : {})
};
```

---

#### 2E — `payload` 加入 `Adjustment_Amount`

**位置**：`syncToAirtable` / payload 建構處（約 line 5646 附近，`Deposit` 欄旁）

```javascript
"Adjustment_Amount": document.getElementById("adjustment") ? Number(document.getElementById("adjustment").value) || 0 : 0,
```

---

#### 2F — `renderReviewTable` 進度下拉分流 + 補打金額動態輸入框

**位置**：line 6426 開始的 `renderReviewTable` 函式

找到渲染進度下拉的 `<select>` 生成邏輯（約 line 6695–6701），目前應為一組統一選項。

**改為按 Category 分流**：
```javascript
// Category-aware status options
const _cat = item.Category || '';
let _statusOptions;
if (_cat.includes('立體擺設')) {
    _statusOptions = ['待製作', '已book日期', '已取模', '製作中', '待交收', '完成', '已取件'];
} else if (_cat.includes('鎖匙扣') || _cat.includes('吊飾') || _cat.includes('純銀')) {
    _statusOptions = ['待製作', '製作中', '需進行補打', '完成', '已取件'];
} else {
    _statusOptions = ['待製作', '製作中', '完成', '已取件'];
}
```

**補打金額行內輸入框**（在 Process_Status select 同一 td 內）：
```javascript
// Dynamic adjustment input (shown only when status = '需進行補打')
const _curStatus = window._getItemStatus(o.id, item) || '';
const _showAdj = _curStatus === '需進行補打';
// Append after status select:
`<div class="adjustment-input-wrapper" id="adj-wrapper-${o.id}-${index}"
      style="display:${_showAdj ? 'flex' : 'none'}; margin-top:4px; align-items:center; gap:4px;">
  <span style="color:#888; font-size:12px;">$</span>
  <input type="number" class="adjustment-amount-input"
         id="adj-input-${o.id}-${index}"
         value="${o.Adjustment_Amount || ''}"
         placeholder="補打金額"
         style="border:none; border-bottom:1px solid #ccc; outline:none; width:80px; font-size:13px;"
         onblur="saveAdjustmentAmount('${o.id}', this.value)">
</div>`
```

**CSS（加入 `<style>` 區）**：
```css
.adjustment-input-wrapper { transition: all 0.2s ease; }
```

**`onchange` handler（在 Process_Status select 上）** — 新增切換邏輯：
```javascript
onchange="saveInlineEdit('${o.id}', 'Process_Status', 'status-select-${o.id}-${index}', ${index}); 
          var _adj = document.getElementById('adj-wrapper-${o.id}-${index}');
          if (_adj) _adj.style.display = this.value === '需進行補打' ? 'flex' : 'none';"
```

---

#### 2G — 新增 `saveAdjustmentAmount` 函式

在 `saveInlineEdit` 函式附近新增：
```javascript
async function saveAdjustmentAmount(orderId, value) {
    var _amt = Number(value) || 0;
    var _sbUrl = _V41_SB_URL, _sbKey = _V41_SB_ANON;
    try {
        var _res = await fetch(_sbUrl + '/rest/v1/orders?order_id=eq.' + encodeURIComponent(orderId), {
            method: 'PATCH',
            headers: { apikey: _sbKey, Authorization: 'Bearer ' + _sbKey,
                       'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ adjustment_amount: _amt })
        });
        if (_res.ok) {
            console.log('[saveAdjustmentAmount] PATCH ok:', orderId, _amt);
            // Update globalOrders in memory
            var _o = globalOrders.find(function(x){ return x.id === orderId; });
            if (_o) _o.Adjustment_Amount = _amt;
        } else {
            console.warn('[saveAdjustmentAmount] PATCH failed:', _res.status);
        }
    } catch(e) { console.warn('[saveAdjustmentAmount] error:', e.message); }
}
```

---

#### 2H — `mapOrder` / `sbFetchGlobalReview` 加入 `adjustment_amount`

找到 `sbFetchGlobalReview` 的 qs.select 字串，加入 `adjustment_amount`。

找到 `mapOrder` 函式，加入映射：
```javascript
Adjustment_Amount: row.adjustment_amount || 0,
```

---

### Phase 3 — n8n FHS_Action_MetadataUpdate（**BLOCK R4**）

**本地備份**：`n8n/FHS_Action_MetadataUpdate.json`

找到 `batch-main` 節點（id: `"batch-main"`），`jsCode` 字串中的 `fields` 物件：

**現有**：
```javascript
fields: {
    Admin_Notes: u.Admin_Notes,
    Batch_Number: u.Batch_Number,
    Process_Status: u.Process_Status
}
```

**改為**：
```javascript
fields: {
    Admin_Notes: u.Admin_Notes,
    Batch_Number: u.Batch_Number,
    Process_Status: u.Process_Status,
    Adjustment_Amount: u.Adjustment_Amount || 0
}
```

> Airtable 端 `Adjustment_Amount` 欄位 ID 為 `flda3qPXJVIug3714`（已確認存在）。Airtable PATCH 接受欄位名，無需欄位 ID。

**部署**：修改本地 JSON 後，需透過 n8n API PUT 部署至 NAS（參考 `feedback_n8n_deployment.md` 的 Windows curl UTF-8 workaround）。

---

### Phase 4 — 驗證清單

- [ ] Migration 0015 在 Supabase SQL Editor 執行成功（4 個 ADD VALUE 無錯誤）
- [ ] `_sanitizeItemStatus` 測試：`window._sanitizeItemStatus('需進行補打')` → `'需進行補打'`（非 `'待製作'`）
- [ ] 訂單總覽選擇「需進行補打」→ 補打金額輸入框滑出
- [ ] 輸入補打金額 + onblur → Supabase orders `adjustment_amount` PATCH 成功
- [ ] 重新整理後補打金額保留
- [ ] Edit 表單還原訂單：若 `adjustment_amount > 0`，`#adjustment-wrapper` 可見且值正確
- [ ] 新同步訂單 → sbSyncOrder 的 orderRow 含 `adjustment_amount`
- [ ] n8n FHS_Action_MetadataUpdate 執行後 Airtable `Adjustment_Amount` 欄位有值

---

## 高風險提醒

| 風險 | 描述 | 緩解 |
|------|------|------|
| 2A + Migration 必須同批 | 若先執行 Migration 而 2A 未更新，用戶選新狀態後靜默寫入舊值 | 在同一 commit 中完成兩者 |
| current.html 硬規則 | 修改生產版需 Fat Mo 明確授權（已授權） | `/execute` 即授權信號 |
| n8n 部署 Windows curl | 需 UTF-8 workaround，參見 `feedback_n8n_deployment.md` | 使用既有 deploy script |
| ENUM 不可回滾 | ADD VALUE 無法撤銷 | `IF NOT EXISTS` 已確保冪等 |

---

## 後效同步稽核（執行完成後觸發）

- **[A] 結構變動**：新增 `0015_*.sql` → 更新 `docs/repo-map.md`
- **[B] 制度層**：不觸發（無 AGENTS.md / commands/ 變更）
- **[C] CHANGELOG**：版本語義變更（新 ENUM + adjustment_amount 功能上線）→ 更新 `CHANGELOG.md`

---

*本報告由 A3 (Claude Code) 出具，授權 AG (Antigravity) 依照此簡報執行。執行方需在完成後更新 `.fhs/memory/handoff.md` session 條目，並附 Subagent 使用記錄。*
