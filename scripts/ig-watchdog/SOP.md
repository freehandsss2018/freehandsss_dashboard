# IG 漏單看門狗 — 操作指南（Fat Mo 專用）

> 本工具：**唯讀**。比對 IG 訊息與 Supabase 訂單，列出「疑似漏單」。
> **永不寫入** Supabase / Airtable / 任何業務表；客人 DM 內容**只在 NAS/你的 Google Drive
> 之間流動**，永不入 Git、永不上第三方雲端。

---

## 相關部署記錄

- `.fhs/reports/completion/2026-06-17_ig-watchdog_completion_report.md`（v1 初版）
- `.fhs/reports/completion/2026-06-23_igwatch-alerts-phase1a-2_completion_report.md`（migration 0043 + Dashboard igwatch UI 實際部署）
- `.fhs/reports/completion/2026-06-23_ig-watchdog-v3-order-id-detection_completion_report.md`（v3 order-id 偵測邏輯）
- n8n workflow 條目：`n8n/README.md`（`FHS_IGWatchdog_DriveWatch`）

---

## 〇、架構演進（為何長這樣）

| 版本 | 觸發 | 分析跑在哪 | 狀態 |
|------|------|-----------|------|
| 方案 A（已棄用） | 人手匯出 DYI ZIP → 本機常駐 server.mjs | 你的 Windows 主機 | 主機關機=分析暫停，已淘汰 |
| **方案 C（現用）** | IG 設定「每天自動匯出到 Google Drive」 | **全在 NAS n8n** | 零主機依賴，2026-06-19 上線 |

IG Graph API 讀全部客人 DM 需 Meta 商業驗證（BR／網站／業務帳單），FHS 三者皆無 → 此路封死。
改用 Meta 原生「下載你的資訊」(DYI)，並設成**每天自動**匯出到 **Google Drive**（而非裝置），
讓 n8n 的 Google Drive Trigger 監測新檔案、全自動跑完整條分析鏈，零人手介入。

---

## 一、一次性設定（已完成，記錄供日後參考/重建）

1. **IG 端**：帳戶中心 → 你的資訊和權限 → 下載你的資訊 → 訊息 → JSON → 較低畫質 →
   目的地選 **Google Drive**（不是裝置！）→ 頻率選 **每天** → 持續時間 1 年
2. **Google Cloud**：建專案 → 啟用 Google Drive API → OAuth 同意畫面（測試使用者模式）→
   建 OAuth Client（網頁應用程式，redirect URI = `https://yanhei.synology.me:8443/rest/oauth2-credential/callback`）
3. **n8n**：用上述 Client ID/Secret 建「Google Drive OAuth2 API」credential，瀏覽器走一次授權
4. **n8n workflow**：`FHS_IGWatchdog_DriveWatch`（workflow ID `D4LK6VrQbiXlju0V`）
   - Google Drive Trigger（監測 `root`，File Created）→ 過濾 .zip → Download File
   - Compression 節點解壓 → Code 節點「Parse Inbox」（mojibake 解碼 + 分組）
   - HTTP Request × 2 查 Supabase `orders` + `sales_pipeline`（anon key，唯讀）
   - Code 節點「Classify & Report」（比對 + 分級）→ Telegram Notify

**重建/改規則時**：別直接在 n8n 編輯器改長串 Code，改 `scripts/ig-watchdog/build_n8n_workflow.cjs`
（decoder/match 邏輯的唯一真相來源），重新產生 JSON 後 PUT 上 n8n。**PUT 會洗掉
credentials**，套用後務必回編輯器手動重新指派 Google Drive Trigger / Download File
兩個節點的 credential（n8n Public API 不提供 credential 列表，這步無法自動化）。

---

## 二、日常操作 — 現在什麼都不用做

> **v3（2026-06-23, Session 116）改版**：偵測核心由「客人付款證據 🔴🟡⚪」改為
> **「訂單編號比對：對話裡談成的訂單，是否真的建進 Supabase」**。比對主鍵＝訂號
> （order_id，真實格式：leading-0 的 7–8 位數，如 `0600101`/`06001008`）。**商家自己發的
> V42 訂單確認文本納入偵測**（v1/v2 曾刻意排除，v3 反轉）。付款證據 🔴🟡⚪ 降為 Phase 2
> 暫不計。詳見 `scripts/ig-watchdog/lib/order-match.mjs`。

整條鏈每天自動跑：IG 匯出 → Drive 出現新檔 → n8n 偵測 → 解析 → 抽訂號 → 比對 Supabase orders →
**Telegram 推送需核對項目**。你只需要：

- **看 Telegram 通知**：v3 格式如
  ```
  🐶 IG漏單看門狗 v3（訂號偵測）
  覆蓋：6/22/2026 ~ 6/23/2026
  掃描：12 threads / 18 檔 / 40 則訊息
  ✅已建立 6 ｜📝資訊不齊 1 ｜🆕未建立 1 ｜⚠️弱訊號(無號) 2
  需核對：2

  🆕 未建立｜訂號 0600999
    訊息：Mandy「已收訂金，幫你開咗單 0600999」 📎收據
    DB：❌查無此單
    thread:xxx

  📝 資訊不齊｜訂號 0600804
    訊息：Katrina「你個單號 0600804，訂金已收」
    DB：✅有單 Katrina Sui 訂金$800
    thread:xxx
  ```
- **🆕 未建立** → 去 V42 補開訂單（DB 真的查無此訂號）
- **📝 資訊不齊** → 訂單已建立，但訊息側資料與 DB 不齊，進 V42 核對補全
- **⚠️ 弱訊號(無號)**：有成交語氣但訊息沒寫訂號 → 不即時警報（避免每日 noise），屬已知覆蓋邊界
  （無訂號的漏單由 Phase 2 付款證據層負責，本期未啟用）
- **📎收據**：客人有發轉帳收據截圖（方案 A：只標記存在性，**零下載零 OCR**，不讀內容，守隱私紅線）

**已知限制**：NAS 版沒有本機版的 `history.json`「標記已處理永久收起」機制——但因 Meta
每天匯出是「上次未含的新資訊」（增量），同一批訊息理論上不會重複出現，所以實務影響低。

---

## 三、調得更準

`build_n8n_workflow.cjs` 內的 threshold/timeWindowDays 寫死在 `classify()` 呼叫處
（目前 0.6 / 3 天），跟本機版 `index.mjs` 預設值一致。要調整：改該檔案對應數值 → 重新產生
→ PUT 上 n8n → 重新指派 Google Drive credential。

別名字典（IG 暱稱→真實客名）目前 NAS 版**未移植**（v2 W1 機制只存在本機版）。如果常見的
IG 暱稱誤判困擾，可以之後加一個 Supabase 表存別名映射，讓 Classify & Report 節點查表替代
原本讀本機 JSON 檔的設計——這是已知的待辦，不是 bug。

---

## 四、隱私紅線（必守）

- 客人 DM 內容只在「Meta → 你的 Google Drive → NAS n8n 記憶體」之間流動，**全程不落地任何
  本機硬碟、不入 Git、不上傳 Airtable**。
- n8n 的 Compression/Code 節點處理完即釋放，只有 Telegram 摘要文字（不含完整 DM 原文）落為
  訊息紀錄。
- 本工具對 Supabase **零寫入**，不觸 captureFormState / raw_form_state / 確收三欄。

---

## 五、本機手動工具（保留作 ad-hoc 深度分析用，非日常必需）

如果想用本機腳本對歷史資料做一次性深度分析（例如手動匯出某段時間範圍、想看完整 HTML
報告而非 Telegram 摘要），`index.mjs` 仍可用：

```bash
cd scripts/ig-watchdog
node index.mjs --raw <解壓後的 inbox 路徑> --orders-fixture ... # 或設定 .fhs-local/ig-watchdog/config.json 後直接 npm run watchdog
npm run calibrate    # 校準 threshold
npm run selftest     # 離線自測（合成 fixtures，無需真資料）
npm test             # 單元測試（decoder + match，19 cases）
```

這部分邏輯與 NAS 版（`build_n8n_workflow.cjs` 產生的 Code 節點）**理論上一致但維護在兩處**，
改規則時兩邊都要改，是目前架構已知的維護成本。