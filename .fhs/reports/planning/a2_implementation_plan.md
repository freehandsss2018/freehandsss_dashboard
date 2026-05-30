# FHS Coordinator A2 Model Upgrade Architecture Plan

> **日期**：2026-05-30
> **負責代理**：Antigravity (A2)
> **狀態**：⏳ 規劃與驗證完成 (等待 Fat Mo 與 A3 審查授權)
> **關聯 SOP**：`.fhs/notes/SOP_NOW.md` & `AGENTS.md`

---

## 1. 批判性自審 (Critique & Self-Reflection)

在上一輪回答中，我們雖然快速完成了 API 連線測試並提議了程式碼修改，但在架構上存在以下 **3 個主要弱點**：

### 🚨 弱點 1：硬編碼反模式 (Hardcoding Anti-Pattern)
* **原方案做法**：直接在 `scripts/cl-flow-runner.js` 程式碼中將 `gemini-2.5-pro` 字串取代為 `gemini-3.5-flash`。
* **架構弱點**：這是一種硬編碼做法。如果未來 Google 釋出更強大的模型（如 `gemini-4.0` 系列），或開發者需要暫時降級模型，必須再次修改程式碼。這不符合「代碼與配置分離」的架構原則。

### 🚨 弱點 2：一刀切模型策略 (One-Size-Fits-All Strategy)
* **原方案做法**：全量將 A2 的模型切換至 `gemini-3.5-flash`。
* **架構弱點**：雖然 3.5 Flash 在程式碼生成與運行速度上大幅反超，但在面對「高難度抽象推理、底層數學對帳邏輯或複雜架構爭議」時，`gemini-3.1-pro` 依然具備更高的深度推理精準度。完全移除 Pro 模型的調用，使系統喪失了在極端複雜任務下的「深度思考選項」。

### 🚨 弱點 3：缺乏安全驗收與 Subagent 聯動規劃 (No Safety Validation & Subagent Routing)
* **原方案做法**：僅提出對一個字串行的 Diff 修改，並做了一個簡單的 `TEST_OK` API 測試。
* **架構弱點**：沒有考慮到模型升級後是否會對 `cl-flow-runner.js` 的輸出結構（如 `ag-plan.md` 的 Markdown 標題、JSON 狀態欄位）造成格式偏離；且未定義升級後如何強化與 FHS 憲法所規定的 `frontend-developer`、`code-reviewer` 等 Subagents 聯動路由規則。

---

## 2. 更好的版本：具備彈性與深度模式的協調器模型架構

為了解決上述弱點，我們重新規劃了 **「配置化模型管理與雙模切換」** 的架構方案：

```mermaid
graph TD
    User[用戶執行 cl-flow] -->|CLI 參數| CLI{是否帶有 --pro 參數?}
    CLI -->|否 (預設)| ENV_DEFAULT[讀取 .env 中的 GEMINI_A2_MODEL 或預設 3.5-flash]
    CLI -->|是| PRO_FALLBACK[強制指定使用 3.1-pro 進行深度推理]
    
    ENV_DEFAULT --> APICALL[建立 HTTPS 請求]
    PRO_FALLBACK --> APICALL
    
    APICALL -->|發送 codebase 脈衝| API[Google Gemini API]
    API -->|生成計畫| Output[寫入 artifacts/ag-plan.md]
    Output -->|格式自檢| Checker[Markdown 結構與 JSON 狀態檢查]
```

### 💡 核心優化點

1. **環境變數配置化 (.env Integration)**：
   * 將 A2 模型變數寫入 `.env`（新增 `GEMINI_A2_MODEL=gemini-3.5-flash`）。
   * 腳本讀取 `process.env.GEMINI_A2_MODEL`，若未定義則安全降級 fallback 至 `gemini-3.5-flash`，徹底消除硬編碼。
2. **引進 `--pro` 深度推理模式 (Dual-Mode Execution)**：
   * 修改 `cl-flow-runner.js` 的 CLI 參數解析，支援傳入 `--pro` 參數。
   * 當執行 `npm run cl-flow -- --pro "複雜任務描述"` 時，A2 自動切換至 `gemini-3.1-pro` 以獲取最強推理能力；日常則使用 `gemini-3.5-flash` 實現高速規劃。
3. **優化與 Subagent/Skill 聯動 (Subagent & Skill Synergy)**：
   * `gemini-3.5-flash` 具備極強的工具調用 (Tool Call) 與 Agent 路由對齊能力。新架構在 Prompt 中將強化 Subagent 路由引導，確保 A2 生成的實作計劃能 100% 精確地指定 `frontend-developer` 或 `database-reviewer` 進行下一階段 Gate 審查。

---

## 3. 架構多維度分析

### 🚀 系統效能 (Performance)
* **速度提升**：`gemini-3.5-flash` 的 API 響應速度約為 `gemini-2.5-pro` 的 4 倍。這能將每次 `/cl-flow` 的等待時間從約 45–60 秒縮短至 15–20 秒，大幅優化本地開發的流暢度。
* **長輸出支援**：擁有 65k output tokens 空間，避免了在處理大型 HTML/JS（如 V41 的 1.1 萬行大檔案）時產生斷尾現象。

### 💰 Token 消費與 API 額度 (Token Consumption)
* **成本與額度**：Flash 模型在 Google AI Studio 中擁有更高的免費額度限制 (RPM/TPM)，且每百萬 token 價格僅為 Pro 的十分之一左右。在頻繁的並行規劃中，能有效防止 API Key 出現 `429 Rate Limit Exceeded` 的阻斷。

### ⚙️ 直觀管理模式與衝突避免 (Management & Conflict Avoidance)
* **無縫相容**：`gemini-3.5-flash` 完全支援當前的 `v1beta/models` 請求格式與 JSON Payload，不需要重構 https 連線核心。
* **管理直觀**：Edwin 只需在 `.env` 中修改 `GEMINI_A2_MODEL` 的值即可完成模型切換，無須開啟程式碼編輯器。

---

## 4. 具體實施計畫 (Implementation Plan)

### Phase 1: 代碼調整與配置提取
- [ ] 修改 `.env` 範例與本機 `.env`，加入 `GEMINI_A2_MODEL` 配置項目。
- [ ] 重構 `scripts/cl-flow-runner.js`：
  * 提取 `process.env.GEMINI_A2_MODEL` 作為預設模型。
  * 解析 CLI 參數中的 `--pro` 標記，若啟用則覆寫 model 為 `gemini-3.1-pro`。

### Phase 2: 自動化自檢與驗收
- [ ] 在 `scripts/test/` 下建立 `test-cl-flow-models.js` 驗收腳本。
- [ ] 執行測試：
  * **TC-01**：不帶參數執行，驗證是否默認呼叫 `gemini-3.5-flash` 且返回正確格式。
  * **TC-02**：帶 `--pro` 參數執行，驗證是否成功轉向呼叫 `gemini-3.1-pro` 且返回正確格式。
- [ ] 測試成功後，向 Fat Mo 呈報測試結果，確認升級完成。

---

## 5. 擬議修改檔案清單 (Proposed Files Changes)

### 📂 [MODIFY] `.env`
* 新增：`GEMINI_A2_MODEL=gemini-3.5-flash`

### 📂 [MODIFY] `scripts/cl-flow-runner.js`
* 讀取環境變數，並加入 `--pro` 參數控制邏輯：

```javascript
// 預估修改位置：
// 1. 環境變數加載處
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_A2_MODEL || 'gemini-3.5-flash';

// 2. 參數解析處 (支援 --pro)
const proMode = args.includes('--pro');
// 過濾掉 --pro 參數，避免干擾任務描述提取
const filteredArgs = args.filter(a => a !== '--pro' && a !== '--quick');
const task = (quickMode ? filteredArgs[1] : filteredArgs[0]) || 'No task specified';

// 3. 模型指定邏輯
const activeGeminiModel = proMode ? 'gemini-3.1-pro' : DEFAULT_GEMINI_MODEL;
```

---

## 6. NO-TOUCH 護欄與安全性聲明

> ⚠️ **重要**：此階段為本地 analysis 與實施計畫產出。根據 FHS 憲法規定，本代理人在此步驟**不得**對專案程式碼執行任何實體修改。計畫將直接呈報給 Fat Mo 與 A3 (Claude Code) 審查，獲得明確執行授權與簽名後，方可實施代碼層修改。
