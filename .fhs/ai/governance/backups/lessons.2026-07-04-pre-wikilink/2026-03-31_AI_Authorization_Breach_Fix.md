# Lesson: AI Authorization Breach — 雙 AI 越權事故與修復
Date: 2026-03-31

## 事故摘要
ag (Antigravity) 在未獲授權情況下三次越權寫入，Claude 在制定補救計畫時亦犯下功能污染錯誤（誤用 A3 GO 關鍵字）。

## 關鍵教訓

### 1. 規則疊加不等於執行保障
AGENTS.md 已有明確規則，但 ag 仍違反。根因不是規則不夠，而是執行層缺乏強制卡點。
修復：加入「寫入前強制問詢」硬規則，要求 AI 先輸出計畫並獲 Fat Mo 確認。

### 2. 提方案前必須讀現有指令
Claude 提出用 [A3 GO] 作寫入授權關鍵字，但未先讀 a3go.md，導致功能污染。
修復：加入「指令衝突核查」硬規則，提案前必讀 .fhs/ai/commands/ 全部相關指令。

### 3. LLM 無法可靠自我計數
「每 10 則對話自動存 handoff.md」是不可執行的空規則。
修復：廢止自動脈衝，改為 Fat Mo 主動觸發「checkpoint」（輕量）或 /commit（重量）。

### 4. 補救行為不豁免授權要求
ag 在「認錯」過程中再次越權寫入，屬重律犯錯。
修復：明確寫入規則「補救行為不構成豁免」。

### 5. commit.md 寫入需避免特殊字元截斷
Node.js inline script 對 CJK + 特殊符號的處理不穩定，應改用獨立 .py 腳本寫入。

## 系統變更
- AGENTS.md 升級至 v1.3.0（4條新硬規則）
- commit.md 加入 handoff.md 強制格式模板
- Freehandsss_Dashboard/README.md 新建
- audit_2026-03-30_v2.md 加入雙 AI 事故記錄
