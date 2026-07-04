# Lesson — cl-flow-runner 雙 API 故障：Cloudflare 擋 Node https + Gemini 過載

> 對應 learnings.md 教訓：「cl-flow runner Perplexity 推理模型靜默空白」 [[learnings]]

**日期**：2026-06-23（Session 116）
**範疇**：基礎設施 / `/cl-flow` 規劃管道 / 外部 API 韌性

---

## 症狀

執行 `/cl-flow`（full 模式）時 runner 連續失敗：
- **Perplexity (A1)**：`socket hang up`，3 次 withRetry 全敗，FATAL。
- **Gemini (A2)**：`This model is currently experiencing high demand`（`gemini-3.5-flash` 過載）。

兩者同時出事，full 模式無法產出任何 artifact（`Promise.all` 只要 PX 拋錯即整體 reject，連已成功的 Gemini 結果也不寫檔）。

---

## 根因

### PX socket hang up = Cloudflare client fingerprinting
- 直接 `curl` 打 `api.perplexity.ai` + `sonar-reasoning-pro` + `max_tokens:8000` → **HTTP 200，20s 正常回應**。
- 同一 payload 改 Node `https.request` 或 python `urllib` → **socket hang up / RemoteDisconnected**（連線被 server 主動 reset，非 client timeout，180s 未到）。
- 結論：Perplexity 前置 **Cloudflare 對 client 的 TLS/HTTP 指紋做 fingerprinting**，reset 非瀏覽器類客戶端（Node/urllib），只放行 curl。與 reference memory「Supabase Management API 必用 curl 非 python-urllib（urllib 觸 Cloudflare 1010）」**同一機制**。
- 加劇因子：`sonar-reasoning-pro` 是推理模型，長 `<think>` 階段**靜默無數據流**（非串流），更易被中間層當 idle 連線 reset。
- 加 `User-Agent`/`Accept` header 無效（指紋是 TLS/HTTP2 層，非 header 層）。

### Gemini high demand = 單一模型過載
- `gemini-3.5-flash`（最新）尖峰過載；`gemini-2.5-flash` probe 200/1s 正常。

---

## 修法（皆已驗證生效）

1. **Gemini**：改 `.env GEMINI_A2_MODEL_DEFAULT=gemini-2.5-flash`（runner line 21 讀此 env，**不改代碼**，符合 Preference #6「模型切換一律透過 .env」）。
2. **PX**：`scripts/cl-flow-runner.js` 的 `callPerplexity` 從 `https.request` 改走 **curl 子程序**（`spawnSync('curl', [...,'--data','@tmpFile'])`，body 寫臨時 JSON 檔，finally unlink）。改後 FULL 模式 `px-report.md`（9436 bytes）正常產出。

---

## 通用規則（防再犯）

- **任何打 Cloudflare 前置 API（Perplexity / Supabase Management API …）的腳本，一律用 curl，勿用 Node https / python-urllib**——會被指紋 reset，且症狀（socket hang up / 1010）難一眼看出是指紋問題。
- 診斷套路：**先 curl probe 同 payload**；curl 成功而 Node/urllib 失敗 = 幾乎必為 Cloudflare 指紋，不要再去調 timeout/header/retry。
- 外部 model「high demand/過載」**先 probe 替代 model id 再切 .env**，不改代碼（Preference #6 + #7）。
- runner `Promise.all([PX, AG])` 的脆弱點：任一拋錯則全棄。PX 不穩時可用 `--quick`（跳 PX，AG only）先拿 A2，A1 另以 curl 補。

---

## 關聯
- reference memory: `reference_supabase_mcp_dropout_workaround.md`（curl 非 urllib，同源）
- learnings #24（sonar-reasoning-pro 反覆出事：Session 110 空白內容 + 本次 socket hang up）
- Preference #6（模型切換走 .env）、#7（endpoint 先 probe）
