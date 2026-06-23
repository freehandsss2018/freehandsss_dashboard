# 完成記錄 — IG 漏單看門狗 v3：訂號主鍵偵測

**日期**：2026-06-23（Session 116）
**Flow**：artifacts/2026-06-23-0257（cl-final-plan v2）
**授權**：Fat Mo `/execute`（情況 2 = 合併通知）

---

## 任務

偵測「IG 對話裡談成/確認的訂單，是否真的建進 Supabase orders」。比對主鍵＝訂單編號，反轉納入商家自發的 V42 確認文本為主訊號。三分類＋只情況 2/3 通知＋圖片收據方案 A 佐證。

## 已完成（代碼 + 測試）

| 項目 | 檔案 | 狀態 |
|------|------|------|
| 訂號偵測單一真源 | `scripts/ig-watchdog/lib/order-match.mjs` [NEW] | ✅ |
| 單元測試 15 案 | `lib/order-match.test.mjs` [NEW] | ✅ 15/15 |
| diff-guard 防漂移 | `lib/order-match.diffguard.test.mjs` [NEW] | ✅ 1/1 |
| n8n 生成器改造 | `build_n8n_workflow.cjs` [MODIFY] | ✅ 內嵌 lib + 反轉商家訊息 + 雙側對照 |
| 操作文件 | `SOP.md` [MODIFY] | ✅ v3 行為說明 |
| repo-map | `docs/repo-map.md` [MODIFY] | ✅ |
| CHANGELOG | `Changelog.md` [MODIFY] | ✅ |

## 關鍵技術決定

- **訂號真實格式（live 校準 31 單）**：leading-0 的 7–8 位純數字（`06xxxxx`/`05xxxxx`/`06001xxx`），**非假設的 FHS- 前綴**。錨定 `/(?<!\d)0\d{6,7}(?!\d)/`，天然防撞 HK 電話/金額/日期。
- **報價判定樹**：V42 制式文本＝成交豁免；鬆散裸號需正面成交語意（已收訂金/已落單/確認）且無負面詞（報價/草稿/暫定）才採信。
- **弱訊號桶**：成交語意但無訂號 → 不即時警報（避免 noise），明示為覆蓋邊界（無號漏單歸 Phase 2）。
- **單一真源**：build 內嵌 lib 原始碼（strip export），diff-guard 測試斷言逐字一致，根治 match.mjs/cjs 雙處漂移。
- **方案 A 收據**：只標記 hasReceipt 布林（photos metadata），零下載零 OCR，守 OOM + 隱私紅線。
- **唯讀**：零寫業務表，不觸 captureFormState/raw_form_state/確收三欄/HTML ID。付款證據 🔴🟡⚪ 保留為 Phase 2。

## 驗收

- 單元 15/15 + diff-guard 1/1 + 既有套件無回歸（全套 35/35 PASS）。
- 6 情況功能模擬全部正確：V42命中→靜默；鬆散命中→通知；查無→通知；報價→抑制；無號→弱訊號；電話→防撞。

## ⏳ 未完成（待 Fat Mo 授權的部署 Phase）

部署為 hard-to-reverse + 影響每日真實通知，依計畫 Phase 3 須先拋棄式測試，故 STOP 待授權：
1. `build_n8n_workflow.cjs` 已生成 `n8n_workflow_built.json`（本地）。
2. 拋棄式副本端到端測試（真實資料，測完即刪，零殘留）。
3. PUT 上正式 workflow D4LK6VrQbiXlju0V + 重掛 7 個 Google Drive credential（ID `zQHavrW0ElfaKGxG` 已知，learning #12 可 API 補回）。
4. 首次真實 Cron 排程驗證收到 v3 格式 Telegram。

## 附帶修復

- `.env` Gemini 模型切 gemini-2.5-flash；`cl-flow-runner.js` PX 改 curl（Cloudflare 指紋）。已記 decisions.md / lessons / auto-memory。
