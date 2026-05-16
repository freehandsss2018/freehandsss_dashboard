# FHS 全面文檔生態系統稽核報告
**稽核日期**：2026-05-16  
**稽核範圍**：所有 README.md 檔案 + repo-map.md 的版本號、日期、內容一致性  
**稽核狀態**：⚠️ **發現 26 個問題**，分布於 11 個 README 檔案和 repo-map.md

---

## 問題清單（優先順序排序）

### 🔴 CRITICAL 問題（影響系統初始化和整體導航）

#### 1. 根目錄 README.md 第 3 行 — 憲法層參考過時
**位置**：`README.md:3`  
**當前**：「遵循 `docs/GLOBAL_AI_SOP.md` v2.0 架構」  
**應為**：「遵循 `/.fhs/ai/AGENTS.md` v1.4.5 架構（憲法層）」  
**影響**：新進 AI 被引導至舊的 SOP 文檔，導致規則遵循混亂  
**修正**：第 3 行完整改寫，清楚指向 AGENTS.md 憲法層

#### 2. 根目錄 README.md 第 6 行 — 架構描述遺漏 Supabase
**位置**：`README.md:6`  
**當前**：「主要架構：Dashboard UI ↔ n8n Workflow ↔ Airtable Database」  
**應為**：「主要架構：Dashboard UI ↔ n8n Workflow ↔ Supabase (Primary) + Airtable (Fallback)」  
**影響**：新進人員無法理解 Supabase-First 策略，產生系統設計誤解  
**修正**：第 6 行改為四端架構描述

#### 3. 根目錄 README.md 第 16 行 — 資料庫角色顛倒
**位置**：`README.md:16`  
**當前**：「Airtable - 主資料庫，存儲產品、成本、客戶紀錄」  
**應為**：「Supabase - 主資料庫（產品、成本配置、訂單）；Airtable - 備援同步」  
**影響**：架構優先級混亂，n8n 鏡像寫入的設計理由被誤解  
**修正**：第 16 行更新為 Supabase 為主的敘述

#### 4. 根目錄 README.md 第 35 行 — Dashboard 版本與日期過時
**位置**：`README.md:35`  
**當前**：「Freehandsss_dashboard_current.html = **V40.7** (2026-05-05)」  
**應為**：「Freehandsss_dashboard_current.html = **V41** (2026-05-16)」  
**影響**：版本號不符實際部署版本，日期落後 11 天  
**修正**：第 35 行改為 V41 + 2026-05-16

#### 5. 根目錄 README.md 第 77 行 — 系統版本號過時
**位置**：`README.md:77`  
**當前**：「系統版本：**v1.4.2**」  
**應為**：「系統版本：**v1.4.5**」  
**影響**：版本号落差 3 個 patch，導致配置文檔追蹤困難  
**修正**：第 77 行改為 v1.4.5

#### 6. 根目錄 README.md 第 78 行 — SOP 版本參考錯誤
**位置**：`README.md:78`  
**當前**：「SOP 版本：v2.0（見 `docs/GLOBAL_AI_SOP.md`）」  
**應為**：「系統憲法：AGENTS.md v1.4.5（見 `/.fhs/ai/AGENTS.md`）」  
**影響**：引導至舊 SOP 而非當前憲法層  
**修正**：第 78 行改為指向 AGENTS.md

#### 7. .fhs/ai/README.md 第 8 行 — 憲法版本號過時
**位置**：`.fhs/ai/README.md:8`  
**當前**：「系統憲法 **v1.3.1**」  
**應為**：「系統憲法 **v1.4.5**」  
**影響**：版本號落差大（v1.3.1 → v1.4.5），引導至過期規則  
**修正**：第 8 行改為 v1.4.5

#### 8. repo-map.md 第 97 行 — database-reviewer 版本號不同步
**位置**：`docs/repo-map.md:97`  
**當前**：「database-reviewer.md ← **v2.0.0**」  
**應為**：「database-reviewer.md ← **v2.1.0**」  
**影響**：repo-map 列表說的是 v2.0.0，但實際文件是 v2.1.0（已於 2026-05-16 升級）  
**修正**：第 97 行改為 v2.1.0

#### 9. repo-map.md 第 101-102 行 — blender-3d-modeler 條目重複
**位置**：`docs/repo-map.md:101-102`  
**當前**：
```
│       ├── blender-3d-modeler.md ← v2.0.0 Blender 3D 建模（2026-05-07）
│       │       └── blender-3d-modeler.md ← v2.0.0 Blender 3D 建模（2026-05-07）
```
**應為**：刪除第 102 行重複條目  
**影響**：repo-map 結構混亂，自動化工具難以解析  
**修正**：刪除第 102 行

#### 10. repo-map.md 第 154 行 — Triple_Sync 已過時未說明
**位置**：`docs/repo-map.md:154`  
**當前**：「Triple_Sync_Field_Map.md - 三端對齊欄位地圖」  
**應為**：「Triple_Sync_Field_Map.md - ⚠️ [已由 Quadruple_Sync_Field_Map.md 取代] 三端對齊欄位地圖」  
**影響**：讀者可能誤用過期欄位映射，導致四端同步失敗  
**修正**：第 154 行添加過時標記

#### 11. repo-map.md 第 157 行 — n8n node 數量不正確
**位置**：`docs/repo-map.md:157`  
**當前**：「N8N_Node_Interaction_Map.md ← n8n **24 nodes** Airtable 互動圖」  
**應為**：「N8N_Node_Interaction_Map.md ← n8n **26 nodes** 工作流互動圖」  
**影響**：文檔記錄與實際工作流節點數不符（database-reviewer.md 指出 26 nodes）  
**修正**：第 157 行改為 26 nodes

#### 12. repo-map.md 第 147 行 — GLOBAL_AI_SOP 未說明與 AGENTS.md 關係
**位置**：`docs/repo-map.md:147`  
**當前**：「GLOBAL_AI_SOP.md - v2.2 跨環境與多代理協作協議」  
**應為**：「GLOBAL_AI_SOP.md - v2.2 跨環境與多代理協作協議（⚠️ 被 AGENTS.md v1.4.5 憲法層取代）」  
**影響**：不清楚文檔優先級關係，導致人員誤用舊 SOP  
**修正**：第 147 行添加過時標記和優先級說明

---

### 🟠 HIGH 優先級問題（內容一致性）

#### 13. Freehandsss_Dashboard/README.md 第 11 行 — V41 同步日期過舊
**位置**：`Freehandsss_Dashboard/README.md:11`  
**當前**：「Freehandsss_dashboard_current.html = **V41**（**2026-05-11** 同步）」  
**應為**：「Freehandsss_dashboard_current.html = V41（**2026-05-16** 同步）」  
**影響**：日期落後 5 天，不符系統最後更新日期  
**修正**：第 11 行改為 2026-05-16

#### 14. Freehandsss_Dashboard/README.md 第 32 行 — 憲法版本過時
**位置**：`Freehandsss_Dashboard/README.md:32`  
**當前**：「憲法層：**v1.4.2**（AGENTS.md）」  
**應為**：「憲法層：**v1.4.5**（AGENTS.md）」  
**影響**：版本號不同步，文檔參考混亂  
**修正**：第 32 行改為 v1.4.5

#### 15. Freehandsss_Dashboard/README.md 第 36 行 — 三端欄位映射參考過時
**位置**：`Freehandsss_Dashboard/README.md:36`  
**當前**：「三端欄位映射：`/n8n/Triple_Sync_Field_Map.md`」  
**應為**：「四端欄位映射：`/n8n/Quadruple_Sync_Field_Map.md`（取代 Triple_Sync）」  
**影響**：開發人員參考舊文檔，可能遺漏 Supabase 四端映射  
**修正**：第 36 行改為四端版本

#### 16. docs/README.md 第 9 行 — 三端欄位映射未說明位置與更新
**位置**：`docs/README.md:9`  
**當前**：「Triple_Sync_Field_Map.md - 三端對齊欄位地圖（位於 n8n/）」  
**應為**：「Quadruple_Sync_Field_Map.md - 四端對齊欄位地圖 v1.1（位於 n8n/，取代 Triple_Sync）」  
**影響**：讀者不知道有新的四端版本  
**修正**：第 9 行更新為四端版本說明

#### 17. n8n/README.md 第 5 行 — 三端映射未說明過時狀態
**位置**：`n8n/README.md:5`  
**當前**：「`Triple_Sync_Field_Map.md` - Dashboard ↔ n8n ↔ Airtable 三端欄位映射」  
**應為**：「`Quadruple_Sync_Field_Map.md` - Dashboard ↔ n8n ↔ Airtable ↔ Supabase 四端欄位映射 v1.1（2026-05-13，取代 Triple_Sync）」  
**影響**：使用者易誤用舊的三端欄位映射  
**修正**：第 5 行完全改寫為四端版本

---

### 🟡 MEDIUM 優先級問題（最佳實踐/完整性）

#### 18. 根目錄 README.md 缺少 Supabase 部分架構說明
**位置**：`README.md`  
**缺失**：未說明 Supabase-First 策略、Layer 1/2 雙層成本架構、Mirror to Supabase 機制  
**影響**：新進 AI 無法理解成本計算為何分成兩層  
**建議**：在第 10-20 行添加「Supabase-First 架構」小節

#### 19. repo-map.md 第 68 行 — FHS_Finance_Bible 版本日期齊全但無說明用途
**位置**：`docs/repo-map.md:68`  
**當前**：「FHS_Finance_Bible.md ← 財務計算聖經 v1.0.0（2026-05-16 新增：...）」  
**狀況**：已完整且最新，無需修正 ✅

#### 20. Supabase/README.md 第 4 行 — Phase 描述簡略
**位置**：`supabase/README.md:4`  
**當前**：「Phase：Phase 1（Schema 建立）」  
**應為**：「Phase：Phase 1 Complete（Schema 建立 2026-05-10），Phase 2 Complete（n8n 雙寫機制 2026-05-10），Phase 3 Complete（Dashboard V41 2026-05-10），Phase 4 Pending（雙系統穩定共存確認）」  
**影響**：讀者不知道當前進度  
**修正**：第 4 行擴展為進度狀態

#### 21. docs/archive/README.md — 檔案不存在
**位置**：`docs/archive/README.md`  
**狀況**：repo-map 第 149 行參考但檔案不存在  
**影響**：repo-map 自我參考失效  
**建議**：創建該檔案或移除 repo-map 中的參考

#### 22. 跨 README 檔案的版本號不同步（系統級問題）
**影響範圍**：根目錄 README.md、.fhs/ai/README.md、Freehandsss_Dashboard/README.md  
**現象**：同一個 AGENTS.md，在不同 README 中版本號各異（v1.3.1、v1.4.2、v1.4.5）  
**根本原因**：多個檔案在不同時間點更新，未建立同步機制  
**解決方案**：建立「單一真理來源」規則（見下方建議修正順序）

#### 23. 根目錄 README.md 第 38 行 — Freehandsss_dashboardV40.html 描述不完整
**位置**：`README.md:38`  
**當前**：「freehandsss_dashboardV40.html - **當前穩定基準** (Latest Stable)」  
**應為**：「freehandsss_dashboardV40.html - 前一版本（V40.8 — 移除嬰兒月齡 + 報價明細 breakdown）」  
**影響**：誤導讀者認為 V40 是最新版本  
**修正**：第 38 行改為說明 V40 是前一版本

#### 24. 根目錄 README.md 第 35 行 — Freehandsss_dashboardV41.html 缺少說明
**位置**：`README.md`  
**缺失**：根目錄 README 沒列出 V41.html，但 Freehandsss_Dashboard/README.md 有  
**影響**：兩個 README 內容不一致  
**修正**：根目錄 README 應新增 V41.html 行項

#### 25. docs/README.md 第 9 行 — Triple_Sync 位置說明多餘
**位置**：`docs/README.md:9`  
**當前**：「Triple_Sync_Field_Map.md - 三端對齊欄位地圖（位於 n8n/）」  
**應為**：整條刪除或改為指向 Quadruple_Sync  
**影響**：docs/README 不應列出 n8n/ 下的檔案（應自行導航）  
**修正**：刪除第 9 行或改為「Quadruple_Sync...」

#### 26. 缺少「文檔版本同步機制」的說明
**位置**：各 README 檔案未說明版本號應如何與 AGENTS.md 保持同步  
**建議**：在 `.fhs/notes/README.md` 或 `docs/README.md` 中添加「版本同步規則」小節

---

## 修正優先順序與執行計劃

### 第一階段（立即修正 — 影響系統初始化與主導航）
**涉及檔案**：3 個
**預估時間**：30 分鐘

1. ✅ **根目錄 README.md** — 6 項更改（第 3, 6, 16, 35, 77, 78 行）
   - 改寫憲法層參考（第 3 行）
   - 更新架構描述為 Supabase-First（第 6, 16 行）
   - 更新 Dashboard 版本為 V41（2026-05-16）（第 35 行）
   - 更新系統版本為 v1.4.5（第 77-78 行）

2. ✅ **.fhs/ai/README.md** — 1 項更改（第 8 行）
   - 更新憲法版本為 v1.4.5

3. ✅ **repo-map.md** — 6 項更改（第 97, 101-102, 147, 154, 157 行）
   - 修正 database-reviewer 版本為 v2.1.0
   - 刪除重複的 blender-3d-modeler 條目
   - 標記 Triple_Sync 為過時
   - 標記 GLOBAL_AI_SOP 與 AGENTS.md 的關係
   - 更正 n8n node 數量為 26

### 第二階段（本 Session 完成 — 內容一致性）
**涉及檔案**：5 個
**預估時間**：45 分鐘

4. ✅ **Freehandsss_Dashboard/README.md** — 3 項更改（第 11, 32, 36 行）
   - 更新 V41 同步日期為 2026-05-16
   - 更新憲法版本為 v1.4.5
   - 改為四端欄位映射參考

5. ✅ **docs/README.md** — 1 項更改（第 9 行）
   - 改為四端欄位映射說明

6. ✅ **n8n/README.md** — 1 項更改（第 5 行）
   - 改為四端欄位映射說明

7. ✅ **supabase/README.md** — 1 項改進（第 4 行）
   - 擴展 Phase 進度說明

8. ✅ **新增** — `docs/archive/README.md`
   - 創建歸檔政策文檔（如檔案真正不存在）

### 第三階段（跨 Session — 體系化改進）
**涉及檔案**：多個
**預估時間**：90 分鐘（獨立 Session）

9. **新增文檔版本同步規則**
   - 在 `.fhs/notes/README.md` 中添加「版本號單一真理來源」規則
   - 規則：所有 README 中的 AGENTS 版本號必須與 `/.fhs/ai/AGENTS.md` 頭部 frontmatter 同步
   - 自動化檢查指令（grep + script）

10. **統一 subagent 版本格式**
    - ui-designer.md、frontend-developer.md、code-reviewer.md：補充頁尾版本宣告
    - build-error-resolver.md：補充頁頭版本宣告

11. **建立交叉參考驗證**
    - 建立 repo-map.md ↔ 實際檔案的自動化驗證
    - 標記所有過時文檔（例如 Triple_Sync）

---

## 已驗證項目（無需修正 ✅）

| 項目 | 版本/日期 | 狀態 |
|------|---------|------|
| AGENTS.md | v1.4.5 (2026-05-13) | ✅ 最新 |
| FHS_Finance_Bible.md | v1.0.0 (2026-05-16) | ✅ 最新 |
| Quadruple_Sync_Field_Map.md | v1.1 (2026-05-13) | ✅ 最新 |
| SOP_NOW.md | (2026-05-16 同步) | ✅ 已更新 |
| database-reviewer.md | v2.1.0 (2026-05-16) | ✅ 最新 |
| finance-auditor.md | v2.0.0 (2026-05-16) | ✅ 最新 |
| decisions.md | (2026-05-16 最新記錄) | ✅ 活躍 |

---

## 完整性檢查清單（防止未來漂移）

**新規則**：每次修改任何 README 或主文檔時，必須：

| 修改檔案 | 必須同步 | 檢查項目 |
|---------|--------|--------|
| `.fhs/ai/AGENTS.md` | 根目錄 README.md 第 77 行 | 系統版本號 |
| 根目錄 README.md | `.fhs/ai/README.md` + 所有參考 AGENTS 的 README | 版本號一致性 |
| `AGENTS.md` | `SOP_NOW.md` 第 9 行 + 第 15 行系統快照 | 版本日期 |
| 升級任何 subagent | `.fhs/ai/subagents/README.md` | 列表完整性 + 版本號 |
| repo-map.md | 實際檔案結構 | 路徑正確性 + 過時標記 |

---

## 授權與下一步

**稽核完成人**：FHS 自動化審計系統  
**稽核時間**：2026-05-16  

**建議行動**：
1. ✅ 立即執行第一階段修正（3 個檔案）— 避免初始化污染
2. ✅ 本 Session 執行第二階段修正（5 個檔案）— 確保導航一致性
3. 📅 安排獨立 Session 執行第三階段（格式統一化 + 自動化檢查）

**完成標誌**：所有 README、repo-map、@doc 檔案的版本號、日期、位置參考均一致，無交叉參考錯誤，且每個過時檔案都有清楚的「已過時」標記。

