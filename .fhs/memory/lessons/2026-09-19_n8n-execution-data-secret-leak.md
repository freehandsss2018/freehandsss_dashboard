# Lesson — n8n execution data 洩漏 secret 嘅兩條路徑（D62 續，D79）

**日期**：2026-09-19｜**類型**：Pitfall｜**來源**：finance audit 0600804 只讀查證副產物

## 事實
- `Supabase Mirror Prep` 為咗俾下游 HTTP 節點用，將 `$env.SUPABASE_SERVICE_KEY` 當 `supabaseKey` 放入節點輸出。**n8n 會將每個節點輸出存入 execution data**，且預設保留 14 日、成功失敗都存全文——即 secret 被寫入一份可經 `GET /api/v1/executions/<id>?includeData=true` 讀取嘅日誌。
- **第二條路徑（易漏）**：HTTP 節點失敗時，n8n 將 request headers 存入 `error.context.request.headers`，**只遮 `Authorization`，唔遮 `apikey`**。所以單純由「節點輸出」改成「`$env` 直接寫喺 header 表達式」只堵到第一條，失敗 execution 仍會洩漏；要用 n8n credential 先有機會根治（須以刻意失敗嘅單實測）。
- 連環放大：n8n API key 明文喺**公開** repo（5 個受追蹤檔）＋ n8n 喺公網 → 任何人可讀 execution data 取 secret。GitHub secret scanning 唔覆蓋 n8n key，唔會自動撤銷。

## 預防檢查清單
1. 任何 Code 節點 `return` 前，掃一次輸出物件有冇 key／token／password 類欄位；secret 只可喺**用到嗰個節點**內讀取，唔好經節點輸出傳遞。
2. 改完必須讀 `runData` 驗證：全 execution JSON 內 `sb_secret_`／`Bearer ` 出現次數＝0，並包括一張刻意失敗嘅單（睇 `error.context.request.headers`）。
3. 稽核「secret 洩漏」時要掃**所有 execution（跨 workflow）**，用指紋（sha256 前 10 碼）比對，唔好印出 key；兩種路徑要**去重**先計數（今次曾將 92 個誤報成 114）。
4. 查 secret 暴露面時，一併查**呼叫 API 嘅 key**（n8n API key）有冇喺公開 repo——資料洩漏面嘅門匙可能係另一條 key。

## 關聯
`decisions.md` D79、D62／D62續；`learnings/n8n.md` #7、#8；memory `project_n8n_supabase_401_credential_incident`。
