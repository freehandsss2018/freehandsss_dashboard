# Lesson: 架構衛生稽核 — PX+AG 四報告合併 Verdict
**日期**：2026-04-07
**類型**：流程最佳化 + 知識沉澱

---

## 核心教訓

### 1. PX/AG 報告時效性問題
PX 與 AG 在 2026-04-07 產出的報告，仍引用 2026-04-06 稽核前的舊狀態（如 README v1.3.1、repo-map 重複條目、v39-aom.md 仍在 commands/）。
**教訓**：/cl-flow 執行前，A1/A2 需先讀 handoff.md 與最新稽核報告確認現況，避免產出過時聲明。報告中 7 項聲明失準（已全部解決），只有 5 項真正有效。

### 2. 即時磁碟核查是 /cl-flow 的必要步驟
在對比 A1/A2 計畫與實際磁碟狀態後，發現大量「已完成」的重疊項目。
**教訓**：/cl-flow Verdict 前必做磁碟核查（Glob + Grep），不可純依報告文字產出結論。

### 3. products.js vs products.json 架構澄清
- `Freehandsss_Dashboard/products.js` — `window.productCache` JS 格式，無任何 HTML 引用，是廢棄遺留檔案
- `Freehandsss_Dashboard/products.json` — 本地靜態副本，非 live 資料
- n8n 真正讀取的快取在 NAS `.n8n/data/products.json`（由 FHS_System_CacheSync 維護）
- Dashboard V36 報價全靠 hardcoded 階梯價，不依賴任何本地快取
**教訓**：products.js 可安全封存；products.json 僅供開發查閱，不影響生產。

### 4. .mcp.json 應加入 .gitignore
MCP server config 含 n8n API 憑證，不應版控。已加入 .gitignore。

---

## 有效執行清單（本次 session 完成）
- ✅ Maintenance_Tools/test_audit_0695346.py 刪除
- ✅ Maintenance_Tools/v33_original_script.js → archive/
- ✅ .gitignore 加入 .mcp.json
- ✅ repo-map.md、Freehandsss_Dashboard/README.md、Changelog.md 同步更新

## 遺留（下次 session）
- products.js → archive/（確認無引用，可一行指令完成）
