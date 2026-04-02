# 🎯 稽核問題解決清單
**日期**：2026-04-03  
**狀態**：待 Fat Mo 授權執行

---

## 📋 執行清單（7 項）

### 🔴 高優先（立即處理）

#### ✅ 已完成（Antigravity 清理）
- [x] A4-2 / A4-3：a3go.md & reflect.md 歸檔
- [x] A3-1：repomix-output.txt 刪除
- [x] A1-2：repo-map.md 加入 .claude 描述

---

### 待執行（5 項）

#### 1️⃣ 【A2-1】HTML ID 規則措辭統一 ⏱ 5 分鐘
**檔案**：`.cursorrules`  
**行數**：第 21 行  
**當前**：`禁止修改 Element IDs`  
**修改為**：`禁止變更 HTML ID（包含 Element IDs）`  
**加註**：請參閱 `.fhs/ai/AGENTS.md` 第 3.3 節

**驗收**：.cursorrules 與 AGENTS.md 措辭統一

---

#### 2️⃣ 【A2-2】FHS_Prompts Router 格式驗證 ⏱ 30 分鐘
**檔案**：`docs/FHS_Prompts.md`  
**任務**：
1. 搜索「## 情境四」、「## 情境九」、「## 情境十」、「## 情境十一」
2. 檢查各情境是否遵循「→ /命令」格式（Router 格式）
3. 若仍有「處理流程」或舊邏輯 → 轉換為 Router 指令

**範例**（正確格式）：
```markdown
## 情境四：訂單修改（Order Modification Flow）

描述...

→ /cl-flow
```

**完成後**：更新 FHS_Prompts.md 頂部版本號（v1.3+ → v1.4）

**驗收**：FHS_Prompts.md 所有情境均使用 Router 格式

---

#### 3️⃣ 【A3-2】rebuild_index.py 用途驗證 ⏱ 10 分鐘
**檔案**：`scripts/rebuild_index.py`  
**步驟**：
1. 讀取檔案頂部註釋（確認用途）
2. 檢查是否仍在使用

**決策樹**：

**IF** 仍在使用（有明確用途）：
→ 編輯 `scripts/README.md`  
→ 加入行項：`rebuild_index.py: 本地 Notion 索引重建腳本`  
→ 在 `docs/repo-map.md` 確認已列入

**ELSE IF** 已棄用（無註釋或被其他工具替代）：
→ 刪除 `scripts/rebuild_index.py`  
→ 從 `docs/repo-map.md` 移除  
→ 更新 `scripts/README.md`

**驗收**：scripts/README.md 記載了 rebuild_index.py 的用途，或檔案已刪除且文檔同步

---

#### 4️⃣ 【A4-1】備份清理政策明確 ⏱ 15 分鐘
**檔案**：`docs/archive/README.md`  
**發現**：pre-v1.0-backup/ 內有 6 個舊版檔案
```
- .cursorrules
- .impeccable.md
- CLAUDE.md
- FHS_System_Health_Check_SOP.md
- System_Architecture_Handover.md
```

**步驟**：
1. 讀取 `docs/archive/README.md`
2. 檢查是否已有清理政策說明

**決策樹**：

**IF** 無清理政策記載：
→ 在 README.md 加入段落：
```markdown
## pre-v1.0-backup/ — v1.0 架構重組前的備份

本目錄包含系統架構演進的歷史紀錄。

**保留政策**：永久保留  
**用途**：架構決策歷史參考  
**存取權限**：只讀（禁止修改）
```

**ELSE IF** 應該清理（根據現有政策）：
→ 刪除 `docs/archive/pre-v1.0-backup/` 目錄  
→ 更新 `docs/repo-map.md`（移除該目錄）  
→ 在 `docs/archive/README.md` 記載清理日期

**驗收**：docs/archive/README.md 明確記載 pre-v1.0-backup/ 的保留或清理政策

---

#### 5️⃣ 【A4-3】Command 檔案引用驗證 ⏱ 20 分鐘
**檔案**：`.fhs/ai/AGENTS.md` 第 7 節「正式指令系統」

**已驗證**（✅ 已在表格中）：
- ag-plan / cl-flow / px-plan / read
- cl-review / execute
- commit
- error-eye / guardian / px-audit / fhs-audit

**待驗證**（❓ 未在表格中）：
- `fhs-check.md` — /fhs-check（全系統健康檢查）
- `px-audit.md` — /px-audit（外部審查）

**步驟**：
1. 檢查 AGENTS.md 第 7 節的指令表格（~L139）
2. 若 fhs-check & px-audit 未列入 → 加入表格

**建議新增行**：
```markdown
| `/fhs-check` | fhs 給我全系統檢查 | Claude | 全系統健康檢查與壓力測試 |
| `/px-audit` | px 審查現況 | Perplexity | 外部研究與系統審查（第二意見） |
```

**驗收**：AGENTS.md 第 7 節表格包含所有 12 個現行指令

---

#### 6️⃣ 【A5-4】todo.md 逾期項目檢查 ⏱ 10 分鐘
**檔案**：`.fhs/notes/todo.md`  
**步驟**：
1. 讀取 todo.md
2. 檢查各項目是否有日期標記
3. 計算距今日期（2026-04-03）
4. 識別 30+ 天未處理的項目

**決策樹**：

**IF** 發現逾期項目（>30 天）：
→ 標記為 `[ARCHIVED]` 或 `[CLOSED]`  
→ 或與 Fat Mo 討論是否重新排期  
→ 記錄審查日期：`# 2026-04-03 檢查：無逾期項目` 或 `已清理逾期項目 N 項`

**ELSE IF** 無逾期項目：
→ 在檔案頂部加註：`# 最後審查：2026-04-03（無逾期項目）`

**驗收**：todo.md 已審查，無未處理的逾期項目

---

## 📊 執行狀態

| # | 項目 | 優先級 | 時間 | 狀態 |
|---|---|---|---|---|
| A2-1 | HTML ID 規則統一 | 🔴 高 | 5 分 | ⏳ 待執行 |
| A2-2 | Router 格式驗證 | 🔴 高 | 30 分 | ⏳ 待執行 |
| A3-2 | rebuild_index.py | 🟡 中 | 10 分 | ⏳ 待執行 |
| A4-1 | 備份政策明確 | 🟡 中 | 15 分 | ⏳ 待執行 |
| A4-3 | Command 引用驗證 | 🟡 中 | 20 分 | ⏳ 待執行 |
| A5-4 | todo.md 檢查 | 🟢 低 | 10 分 | ⏳ 待執行 |
| **合計** | — | — | **90 分** | — |

---

## 🚀 執行方式

### 方案 A：Fat Mo 授權一次性執行（推薦）
```
/execute 基於 2026-04-03 稽核報告，執行 6 項解決方案
```

→ Claude 將按清單依次修改檔案  
→ 完成後產出完成報告至 `completion_reports/2026-04-03_audit_resolution_completion_report.md`

---

### 方案 B：逐項手動執行
1. 同意 A2-1 & A2-2（高優先）→ 我執行
2. 確認 A3-2 & A4-1 的決策 → 我執行
3. 驗證 A4-3 & A5-4 → 我執行

---

## ✅ 完成標準

稽核報告結果達到：
- **總通過數**：21/21 (100%)
- **無 🔴 項目**
- **無 🟡 項目**（全轉為 ✅）

---

**等待 Fat Mo 決策**  
📌 建議執行方案 A（一次性授權 /execute），預計 90 分鐘內完成所有修復
