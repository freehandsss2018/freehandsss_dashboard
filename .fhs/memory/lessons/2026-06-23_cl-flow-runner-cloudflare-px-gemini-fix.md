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

---

## 案例更新（2026-09-23，flow 2026-09-23-1957）：三個 fallback model 同時過載 + Fat Mo 定案標準處理程序

### 症狀
執行 `/cl-flow-fast --review --fast` 時，`.env` 讀到嘅 `GEMINI_A2_MODEL_DEFAULT=gemini-3.8-flash`＋runner 內建 fallback 鏈（`gemini-3.6-flash`／`gemini-flash-latest`）**三個 model 一齊 503 high demand**——同以往「只有最新model中招、換舊model即刻好返」嘅情況唔同，runner 內建 fallback 鏈完全失效，state.json 標 `degraded:true`。

### 診斷（唔靠 runner，直接 curl 逐個 probe Google API）
```bash
for m in gemini-3.8-flash gemini-3.6-flash gemini-flash-latest gemini-2.5-flash gemini-2.0-flash; do
  curl -s -o /tmp/probe.json -w "%{http_code}" \
    "https://generativelanguage.googleapis.com/v1beta/models/$m:generateContent?key=$GEMINI_API_KEY" \
    -H "Content-Type: application/json" -d '{"contents":[{"parts":[{"text":"ping"}]}]}'
done
```
結果：`3.8-flash`＝連線失敗、`3.6-flash`／`2.5-flash`＝200正常、`flash-latest`＝仍503、`2.0-flash`＝404已停用（Google提示改用`3.6-flash`）。**證實現存3個model同時過載係暫時性巧合撞正低潮，非runner邏輯壞或key/quota問題**——同一時間點總有其他健康model存在。

### Fat Mo 定案嘅標準處理程序（本次起固定套用，唔使每次重新判斷）
1. `/cl-flow(-fast) --review` 撞到 Gemini 過載（state.json `degraded:true` 或錯誤訊息含 "high demand"）→ **立即** curl 逐個直探 Google API（唔經 runner，用上面嘅指令樣板，唔可以只重試同一個 model 或者坐視 degraded）。
2. 搵到現時健康嘅 model 後，用 `GEMINI_A2_MODEL_CHAIN="健康model1,健康model2" node scripts/cl-flow-runner.js --review {flow_id} --fast` **臨時 env override 即時重試**（唔改 `.env`，只影響單次呼叫，避免將可能好快又復原嘅model永久踢出鏈）。
3. 攞到真正嘅 AG 評審後，Verdict 唔再標 DEGRADED，按正常批評處理表流程走。
4. 若健康model之後又間歇性再過載（本次`3.6-flash`喺override後第二次呼叫又503一次），fallback鏈第二位（`2.5-flash`）接力成功即可，唔使進一步升級——證明「一鏈帶多個候選」本身已經夠用，唔需要因單次間歇性失敗而恐慌式加碼。

### 通用規則（新增，覆蓋原規則）
- **降級聲明唔係終點，係觸發診斷嘅訊號**：見到 DEGRADED，第一反應係 curl probe 搵活model，唔係直接接受「今次冇評審」就算數。
- probe 指令樣板已固定（見上），下次直接複用，唔使重新設計診斷步驟。
- 呢個程序本身應該被視為 runner 韌性設計嘅一部分：現行 `GEMINI_MODEL_CHAIN` 已經係「一個env變數控制成條鏈」嘅設計，故臨時override完全唔違反 Preference #6（模型切換走 .env／env override，唔改代碼）。
