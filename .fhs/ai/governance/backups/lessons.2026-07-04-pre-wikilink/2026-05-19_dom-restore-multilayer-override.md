---
name: DOM Restore 多層覆蓋陷阱
description: restoreFormState 之後有 _injectFinancials 最終注入，0 值條件判斷需每層統一處理
type: feedback
---

## 教訓：DOM Restore 三層覆蓋順序

修復「balance/deposit 顯示 0 而非 placeholder」時，先後修了三個地方才找到根本：

1. **n8n path**（line 4924）：`data.Balance || ''` ✓
2. **restoreFormState 迴圈**（line 4732）：`_isFinField && 0 → ''` ✓
3. **`_injectFinancials()`**（line 5154）：最後執行，`dbDep != null` 允許 0 通過 → 覆蓋前兩層 ← **真正 root cause**

**Why:** `_injectFinancials` 是特意設計在 restoreFormState 之後執行（「Fix B」），確保 DB 值最終獲勝。但 `dbDep != null` 條件對 0 為 true，導致 0 被強制寫入 DOM，覆蓋所有之前的 `|| ''` 修復。

**How to apply:** 每次修改財務欄位的 restore 邏輯，必須同時搜尋 `_injectFinancials`，確認最後注入點也同步修改。關鍵字：`dbDep`、`dbBal`、`_injectFinancials`。

---

## 教訓：cloneNode(true) 會複製所有 ID

`v40InitDrawerMirrors()` 用 `cloneNode(true)` 把 `fatmoConfigPanel` 和 `qaCenter` 複製到 iPhone Drawer，clone 保留所有子元素 ID → duplicate form field id 警告。

**Fix:** clone 後立即執行 `el.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))`。Drawer 是純視覺鏡像，不需要 ID。

---

## 教訓：evalSimpleMath 中 0 的 falsy 陷阱

`depositVal = dRaw ? (evalSimpleMath(dRaw) || Number(dRaw) || 0) : 0`

當 `dRaw = "0"`：
- `evalSimpleMath("0")` 返回 `0`（數字，falsy）
- `Number("0")` 返回 `0`（falsy）
- 最終仍得 `0` ← 正確！

但要注意 `evalSimpleMath` 對空字串返回 `NaN`，對純數字也返回正確數值（包括 0）。
