# Lesson — n8n Workflow 全 API 建置手法 + Cloudflare 封鎖範圍修正

**日期**：2026-07-04（Session 134）
**類型**：Pattern + Pitfall
**來源**：Desktop App 平台收斂計劃 Phase 3（n8n 三腦 P10 探針 + 正式 workflow 建置）

## 背景

需要在無法操作瀏覽器/n8n UI 的情況下（AI 純文字介面），驗證三個外部 API（Perplexity/Anthropic/OpenAI）從 n8n 伺服器端連線是否被 Cloudflare 指紋封鎖，並建立一個正式的多節點協作 workflow。全程透過 n8n Public API（`.env` `N8N_KEY`）完成，未觸碰任何既有業務 workflow。

## Pattern：n8n workflow 可完全透過 REST API 建置測試，免瀏覽器操作

步驟（皆為 `curl` + `X-N8N-API-KEY` header）：
1. `POST /api/v1/credentials` 建 Header Auth / Query Auth credential（`{"name":"...","type":"httpHeaderAuth","data":{"name":"x-api-key","value":"..."}}`）
2. `POST /api/v1/workflows` 建 workflow（body 含完整 nodes/connections/settings）
3. `POST /api/v1/workflows/{id}/activate` 啟用
4. 觸發（webhook 或讀 execution）→ `GET /api/v1/executions/{id}?includeData=true` 讀每個節點的 `resultData.runData[nodeName][0].data.main[0][0].json` 取得實際輸出/錯誤

用 **Code 節點組裝含中文/換行的 JSON body**（`JSON.stringify({...})` 於 jsCode 內），比在 HTTP Request 節點參數裡手刻含跳脫字元的 JSON 字串穩健得多——避免逐字元跳脫出錯。

## Pitfall：API 建立的 Webhook 節點不會自動註冊路由

- API 建立 + `activate` 的 webhook 節點，打 production URL 會回 404「webhook not registered」，即使 `active:true` 且節點設定完全正確
- **根因**：n8n 的 webhook 路由表只在**編輯器 UI 存檔**時才真正註冊，純 API `activate` 端點不會觸發
- **修復**：(1) 節點 JSON 補 `webhookId`（UUID，API 直建的 webhook 節點缺此欄位）(2) 請人類在 n8n UI 打開該 workflow 手動存檔一次（Ctrl+S），之後 API 觸發即正常
- 部署 workflow 時遵守既有 S121 規則：PUT body 只能含 `{name, nodes, connections, settings}` 四欄

## Pitfall 修正：Cloudflare 指紋封鎖是「執行環境」屬性，非「API 服務商」屬性

- 舊認知（源自 `cl-flow-runner.js` 註解）：Perplexity API 被 Cloudflare 擋，須用 curl 子程序繞過
- **修正**：這是**本機 Node.js/Python client** 呼叫時的指紋辨識問題。實測 n8n 伺服器端 HTTP Request 節點呼叫 Perplexity/Anthropic/OpenAI **三者全部直連成功**，未被封鎖——n8n 的 HTTP client 與本機 Node.js/Python 是不同的 TLS 指紋
- **應用**：遇到「某工具鏈需要 curl 繞過 Cloudflare」的既有結論，**不可直接套用到另一個執行環境**（同一 API、不同呼叫端＝不同指紋），必須針對新環境重新實測，不可憑舊結論假設

## 關聯

- `.fhs/reports/planning/fhs_n8n_3brain_spec.md` §零／§十（完整實測記錄）
- `scripts/cl-flow-runner.js` L55-59（原始 Cloudflare 繞過註解，範圍限定為本機呼叫，非通用結論）
- decisions.md 2026-07-03（Session 134 續）P10 三腦 API 實測結果條目
