---
name: reference_cl_flow_runner_cloudflare_fix
description: cl-flow-runner PX socket hang up = Cloudflare 擋 Node https/urllib，已改 curl 子程序；Gemini 過載走 .env 切 model
metadata: 
  node_type: memory
  type: reference
  originSessionId: 80db43a8-9054-4645-96bd-d14da0b72d74
---

`scripts/cl-flow-runner.js` 兩個 API 故障的根因與修法（Session 116，2026-06-23）：

**PX「socket hang up」** = Perplexity 前置 Cloudflare 對 client TLS/HTTP 指紋 fingerprinting，reset Node `https.request` 與 python-urllib，**只放行 curl**（同 [[reference_supabase_mcp_dropout_workaround]] 機制）。`sonar-reasoning-pro` 長 `<think>` 靜默無數據流更易被 idle reset。診斷套路：先 curl probe 同 payload；**curl 成功而 Node/urllib 失敗 = 必為指紋，勿再調 timeout/header/retry**。已修：`callPerplexity` 改 `spawnSync('curl', ['--data','@tmpFile',...])`，FULL 模式 px-report.md 正常產出。

**Gemini「high demand」** = 單一 model（gemini-3.5-flash）尖峰過載。改 `.env GEMINI_A2_MODEL_DEFAULT=gemini-2.5-flash`（runner 讀此 env，不改代碼）。先 probe `models?key=` 列表 + generateContent 確認替代 model 200 再切。

**runner 脆弱點**：`Promise.all([PX, AG])` 任一拋錯則全棄（連已成功的另一個也不寫檔）。PX 不穩時可 `node cl-flow-runner.js --quick`（跳 PX，AG only）先拿 A2。
