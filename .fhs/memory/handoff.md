# FHS Handoff - 2026-05-19
當前版本：v1.4.6（憲法層）/ V41（UI層）
n8n Workflow：V47.9（Smart Cache Strategist 本地成本表）

---

## 本次 Session 完成事項

### Antigravity (A2/Gemini) 系統性 Bug 修復

**問題**：A2 在任何輸入（含「say hi」）下自動執行初始化、主動處理待辦清單、越權寫入檔案

**根因（共 5 條）**：
1. SOP_NOW.md 無條件強制觸發器（Soul Awakening Hook）
2. A2 職責欄缺少「需用戶確認」約束
3. .agents/workflows/read.md 指向錯誤 handoff 路徑（靜默失敗）
4. 三個橋接版含硬編碼邏輯（違反橋接版規則）
5. guardian.md 關鍵詞自動觸發

**已修復（7 檔）**：
- `.fhs/notes/SOP_NOW.md`：弱化 Soul Awakening Hook + 限制 AGENTS.md 讀取前 100 行 + A2 職責補充禁止自主寫入
- `.fhs/memory/handoff.md`：待辦清單加防呆標示
- `.agents/workflows/read.md`：路徑 `/notes/` → `/memory/`
- `.agents/workflows/ag-plan.md`、`error-eye.md`、`fhs-check.md`：移除橋接版硬編碼邏輯
- `.fhs/ai/commands/guardian.md`：自動觸發 → 純手動 /guardian

**附加修復（2 檔）**：
- `.fhs/ai/commands/commit.md`：移除重複的第一/二/三階段內容（~50% token 浪費）
- `.fhs/ai/AGENTS.md`：補充 /commit 授權例外聲明，消除語義灰色地帶

**驗證結果**：
- GEMINI.md 機制：經測試確認 Antigravity 不載入專案根目錄 GEMINI.md，Fix [J] 放棄
- implicit memory 殘留路徑：接受為殘留風險，靠使用習慣管理（A2 仍可能從 IDE 開啟檔案推斷工作意圖）

---

## 待辦 ⏳ 項目
> ⚠️ 此待辦清單僅供狀態備份。未經 Fat Mo 明確指派任務，AI 嚴禁主動「寫入」或「執行」業務檔案；但允許在 /read 初始化後，主動引用 `.fhs/memory/learnings.md` 條目提示相關 pattern 或 pitfall（純文字提示，不觸發任何寫入）。

1. **Supabase products 成本更新**：若新增產品類型，需同步更新 Smart Cache Strategist V47.9 的硬編碼表
2. **Airtable 背景同步驗證**：API 額度重置（6月初）後確認背景 Airtable sync path 正常
3. **Anti-Idle Ping 驗證**：確認 n8n 每 6 天 ping Supabase 的 Schedule Trigger 存在
4. **pg_cron TTL**：`error_logs` 表 30 天自動清理
5. **A2 implicit memory 觀察**：後續幾個 session 觀察 A2 在「say hi」後是否仍主動引導工作，記錄改善程度

---

## 核心配置

| 項目 | 值 |
|------|-----|
| n8n Workflow ID | `6Ljih0hSKr9RpYNm` |
| n8n versionId (Smart Cache) | `d43bce23` |
| n8n versionId (Pack Telegram) | `d5f7121c` |
| Supabase URL | `https://vpmwizzixnwilmzctdvu.supabase.co` |
| Airtable Base | `app9GuLsW9frN4xaT` |
| Dashboard 生產版 | `Freehandsss_dashboard_current.html` (V41) |
| Dashboard 開發版 | `freehandsss_dashboardV41.html` |

### n8n Code 節點 NAS 限制（重要）
- `fetch()` ❌ 靜默失敗
- `process.env` ❌ IIFE try-catch 繞過
- `require()` ❌ 完全不可用
- → 所有 HTTP 呼叫必須用 HTTP Request 節點，Code 節點只做計算

### Antigravity implicit memory 說明
- A2 的行為約束主要靠 implicit memory（1.73MB .pb 檔），非文件直接載入
- GEMINI.md 機制已驗證不存在（2026-05-19 測試）
- 文件層修復（SOP_NOW.md、橋接版）封閉了文件觸發路徑，但 implicit memory 本能仍在
