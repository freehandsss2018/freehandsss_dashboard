# handoff 便攜塊 — 已證實驗證明細封存（2026-08-03 輪轉）

> 來源：`.fhs/memory/handoff.md` 便攜塊「🔬 驗證」欄。
> 依 `commit.md` P0.7.1 體積預算（動態段 ≤4,000 bytes）輪轉搬出。
> 輪轉當日實測動態段 8,159 bytes（超預算 2 倍），本檔封存 2026-08-01/02 批次之已證實項；
> 便攜塊只留一行摘要 + 本檔連結。**未刪除任何內容，全文如下。**

---

## [D52/D53/D54/exec5409/IG看門狗/agent_dashboard建立] 驗證摘要（2026-08-01/02）

六項皆已個別完成 `node --test`／live REST／browser 實測／斷網模擬／`/fhs-check` 全綠／fresh-context 獨立覆核並部署 production（三關驗證 PASS），詳細驗證步驟全文見 decisions.md D52-D54、Changelog.md 2026-08-01/02 對應條目、FHS_System_Logic_Overview.md §10.23 與 §11.11-13。

## [agent_dashboard team 發佈]（2026-08-02）

`/upload-web team` 前置 `/fhs-check` 全綠（4 PASS 1 SKIP）→ `node scripts/agent_dashboardV42.js` 重新生成零勘誤 → 部署三關驗證 PASS（HTTP 204／107,218 bytes remote=local／SHA256 C9DC0681…B7F35），公開網址 https://yanhei.synology.me/agent_dashboardV42.html。

生成時偵測到既有健檢異常 3 項（handoff.md／learnings.md 過肥、一個孤兒 lesson 檔），非本次部署造成，列入待辦。

## [n8n 財務備援 webhook 修復 D55]（2026-08-02）

直接 RPC 呼叫排除 Supabase 側後，用 n8n API（`GET /api/v1/executions`）查得該 workflow 近 50 筆執行記錄 100% `status=error`（Task Runner disconnect，`N8N_RUNNERS_MAX_OLD_SPACE_SIZE` 記憶體提示）；`GET` workflow 定義核對 connections 確認觸發鏈僅 `FO Webhook` → `Financial Aggregator`(Code node + require axios) → `Respond with JSON`，其餘孤兒節點非路徑內。

修復：Code node 換原生 httpRequest node，GET → 只換一個節點 → PUT 外科手術式部署，前後 diff 確認 9 節點僅 `Financial Aggregator` 變動。

驗證：連續 3 次直接 curl webhook 皆 HTTP 200 + 一致 6,420 bytes 完整 JSON（對比修復前 100% 空/error）；n8n 執行記錄核實對應 4 筆 execution 皆 `status=success`。純 n8n 節點類型替換，未觸碰 Supabase schema／RPC／成本定價欄位。

---

## 同批輪轉出去的「✅ 已定決策」明細

- **[D52]** V42 財務 RPC 崩潰修復（`get_financial_charts()` trend 子查詢空月 json_agg null 拋 22023）——migration 0085 COALESCE 防禦。全文見 decisions.md D52。
- **[exec 5409]** n8n IG watchdog pairedItem 崩潰修復。全文見 Changelog.md 2026-08-02 條目。
- **[IG看門狗 Phase A+B+C]** 自動開單防重複 + thread 訊息檢視（BLOCKER 級 XSS 防禦）+ 學習規則系統，過程揪出 3 個安全問題已修。全文見 Changelog.md 2026-08-01 條目、FHS_System_Logic_Overview.md §11.11-11.13。
- **[agent_dashboard zone 建立]** IG 看門狗學習記錄 zone 加入既有名冊頁。全文見 Changelog.md 2026-08-02 條目。
- **[S190 canva-auto]** 三條鐵律全文見 Changelog.md 2026-08-01 條目。
- **[S189 及之前]** D51 等歷史決策全文見 Changelog.md。
- **[D53 全站 fetch 逾時保護 + D54 `_igwMaybeLinkNewOrder` 漏 export]** 兩者同批部署 production。全文見 Changelog.md 2026-08-02 條目、decisions.md D53/D54。
