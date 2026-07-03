# Phase 3 完成記錄：n8n 三腦介接規格交付

**日期**: 2026-07-03
**Flow ID**: 2026-07-03-0014
**依據**: `artifacts/2026-07-03-0014/cl-final-plan-v2.md`（v2.3）Phase 3.1
**執行者**: Claude (A3, Desktop Code 分頁 via VSCode ext session)
**授權**: Fat Mo `/execute Phase 3`

---

## 一、任務範圍（Verdict 已批准）

Phase 3.1 — 產出 `.fhs/reports/planning/fhs_n8n_3brain_spec.md`，強制內嵌節點圖、檔案契約、寫入所有權規則、四項歷史地雷、成本表。

**不含**（依計劃分工，非本次範圍）：
- Phase 3.2 Fat Mo 人手駁接（獨立新 workflow）——AI 不代為建置
- Phase 3.3 對等驗收——需 workflow 建成後才能執行

## 二、執行內容與誠實揭露

產出 `fhs_n8n_3brain_spec.md`，包含：

1. **§零 前提聲明**——明確區分「已證實」與「未證實」項目，不假裝 P10 已完成驗證
   - Perplexity Cloudflare 繞過 = 已證實（引用 `cl-flow-runner.js` 現有生產代碼註解為證）
   - Anthropic/OpenAI 是否同樣被擋 = **未測**，計劃原文字「P10 已前測」實為誤述，本次已更正並要求 Fat Mo 駁接前先跑最小驗證（§五）
   - n8n Execute Command 容器是否有 curl 二進制 = 未驗證，列入駁接檢查清單首項

2. **§一 節點圖**：Trigger（手動+Telegram）→ A2 Gemini → A3 Claude → A1 GPT → Write state.json → Telegram 通知
3. **§二 檔案契約**：`artifacts/{flow_id}/` 五檔案 + state.json 狀態機（`a2_status/a3_status/a1_status`，與既有 2 腦 runner 的 `px_status/ag_status/cl_status` 區隔，避免欄位混淆）
4. **§三 寫入所有權規則**：n8n 只建自有新 flow_id 資料夾，`awaiting_cl_review` 後永不回寫
5. **§四 四項歷史地雷**：Cloudflare（含未證實部分誠實標註）/S121 PUT body 四欄/S129 emoji/S127 contentType+timeout
6. **§五 最小驗證步驟**：3 個 API 最小 ping 請求範例（curl for Perplexity 已知通路；HTTP Request 原生節點測試 Anthropic/OpenAI）
7. **§六 System Prompt 範例**：三腦角色邊界，含 A3「本草案非最終裁決」的硬約束提示
8. **§七 成本表**：延用計劃原表
9. **§八 Fat Mo 駁接檢查清單**：7 項可勾選步驟
10. **§九 與現有 runner 關係**：明確兩者不互斥，依情境選用

## 三、影響檔案清單

| 動作 | 路徑 |
|---|---|
| [NEW] | `.fhs/reports/planning/fhs_n8n_3brain_spec.md` |
| [MODIFY] | `docs/repo-map.md`（新增條目） |

## 四、關鍵設計決策記錄

**A3 裁決權不外包給 API**——3-brain pipeline 中的 Claude API 只產草案（`a3-draft.md`），真正的 `cl-final-plan.md` 仍由 Desktop Code 分頁的 Claude（訂閱側）讀取三份產物後裁決。此界線防止「API 端自己審自己」的治理漏洞，與 v2.2/v2.3 一貫的「hook 守護側才有裁決/寫入權」原則一致。

## 五、後續與未完成

- Phase 3.2/3.3 待 Fat Mo 實際駁接 workflow 後執行，P10-A/B/C 結果需回填 `fhs_v0_desktop_probe.md`
- 若 Anthropic/OpenAI 任一被 Cloudflare 擋，需在 workflow 內改用 Execute Command + curl（規格已預留寫法範例）

---

【交付前雙紀律自檢】
驗收：純規劃任務——本規格為文件交付物，無可執行程式碼；「待 /execute Phase 3.2/3.3；驗收於 Fat Mo 駁接完成後」
Subagent：前置評估 general-purpose，Phase 3.1 為單一結構化文件產出，內容需緊扣既有計劃與歷史 pitfall 語境，直接處理更精確 → ❌ 未使用 subagent
