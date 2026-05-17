# 完成記錄：/fhs-audit v2.1 + 全專案語義稽核大掃除

**日期**：2026-05-17
**執行者**：Claude Code (A3, Opus)
**授權方式**：Fat Mo 口頭授權 + /execute 指令
**任務類型**：制度層 minor + 工具層新增 + 全專案語義漂移修正

---

## 背景

Fat Mo 發現：即使先前 `/fhs-audit v2.0` 通過（25/25 結構檢查全綠），AGENTS.md 仍存在 6 處與 Supabase-First 矛盾的措辭。原因是 `/fhs-audit` 只做結構稽核（檔案存在、版本號對齊、frontmatter 完整），從不讀進規則內容做語義一致性檢查。

本次任務建立 **5 維語義稽核框架** 填補此能力缺口：
- D1 Stale（過時）
- D2 Orphan（孤立）
- D3 Conflict（衝突）
- D4 Redundant（沉餘）
- D5 Loops（廻路 / 殭屍 reference）

---

## Subagent 編組（規劃階段）

| Agent | 任務 | 輸出 |
|-------|------|------|
| Explore | 全域 grep 5 類症狀 | D1/D2/D3/D5 候選清單（5 處 Triple_Sync 殘留 + 0 Airtable-centric + 0 廻路） |
| general-purpose | 語義審查 + Check 7 設計 | F1-F12 finding；混合「程式化 + AI 仲裁」設計建議 |
| database-reviewer | Quadruple_Sync 遷移完整性 | 業務欄位 100% 覆蓋；建議補「n8n 內部計算規則」段落 |
| Explore (P2) | F10/F11/F12 驗證 | skills 路徑全綠；ai_reports 描述失實；synced 目錄多 1 個檔（FHS_Finance_Bible.md） |

---

## 修改清單（5 個 Phase）

### Phase 1：P0 機械式清掃（10 edits / 6 files）
| 檔案 | 改動 |
|------|------|
| `.cursorrules` L48 + L60 | Triple_Sync → Quadruple_Sync（含三端→四端） |
| `.fhs/ai/AGENTS.md` L21 + L47 | 內文版號 v1.4.5→v1.4.6；修改前必讀 Triple→Quadruple |
| `.fhs/ai/commands/px-audit.md` L10 | Triple_Sync → Quadruple_Sync |
| `.fhs/notes/SOP_NOW.md` L9/L19/L23/L44 | AGENTS v1.4.5→v1.4.6；日期更新；n8n V47.4；三端→四端 |
| `.fhs/notes/decisions.md` L34 | Triple_Sync → Quadruple_Sync |
| `docs/FHS_Prompts.md` L3 | compatible_with v1.4.5 → v1.4.6 |

### Phase 2：n8n 版本對齊 V47.4
- `.fhs/memory/handoff.md`：V45.7.4 → V47.4
- `~/.claude/.../memory/project_v40_status.md`：v47.3 → V47.4（5 處）+ AGENTS v1.4.5 → v1.4.6
- `~/.claude/.../memory/MEMORY.md`：索引條目更新

### Phase 3：P1 語義衝突修正
- `.fhs/ai/AGENTS.md §1`：新增「1.1 數據主導權矩陣」表格，消除 Primary Lead vs SSoT 並列歧義
- `.fhs/memory/handoff.md` L26（Anti-Idle Ping）：從「待辦」改為「部署驗證」，與 AGENTS.md §4 硬規則不重複定義
- `.fhs/notes/decisions.md` 2026-05-04 條目：加 ⚠️ SUPERSEDED 標籤
- `n8n/Quadruple_Sync_Field_Map.md`：新增「n8n 內部計算規則（非持久化）」段落，補完 Triple_Sync 知識遷移

### Phase 4：建立 `/fhs-audit` Check 7（架構升級）
新建：
- `.fhs/tools/semantic_audit.py` MVP（3 核心函式：canonical key 抽取、ref graph 建構、deprecated 黑名單 grep）
- `.fhs/tools/canonical_keys.yml`（6 keys）
- `.fhs/tools/deprecated_terms.txt`（4 類已廢棄詞）

修改：
- `.fhs/ai/commands/fhs-audit.md` v2.0 → **v2.1**：新增 Check 7（A7-1 ~ A7-5），總分 25 → 30

煙霧測試：`python .fhs/tools/semantic_audit.py` 通過，輸出 `.fhs/reports/semantic_audit_candidates.json`（6 keys / 48 deprecated hits / 273 dangling / 2 cycles）

### Phase 5：P2 收尾
- `docs/repo-map.md`：新增 `.fhs/tools/` 條目；ai_reports/ 描述改為「目前空，保留作為未來報告暫存」
- `~/.claude/agents/freehandsss/FHS_Finance_Bible.md`：刪除（同步孤兒，source 目錄無此檔）

---

## 觸發的後效同步

- **[A] 結構變動** ✅ — 新增 3 個 `.fhs/tools/` 檔 + 刪 1 個 synced 孤兒 → `docs/repo-map.md` 已同步
- **[B] 制度層變動** ✅ — 本記錄即為強制完成記錄
- **[C] CHANGELOG** ✅ — 已於 2026-05-17 頂部補入完整變更條目

---

## 驗收標準

- [x] AGENTS.md §1 數據主導權矩陣完成
- [x] 全專案 Triple_Sync 殘留清空（活躍引用 = 0）
- [x] n8n 版本跨檔統一 V47.4
- [x] /fhs-audit v2.1 含 Check 7 五維檢查
- [x] semantic_audit.py 煙霧測試通過
- [x] canonical_keys.yml + deprecated_terms.txt 配置就緒
- [x] FHS_Finance_Bible.md synced 孤兒已刪
- [x] docs/repo-map.md 反映新增/刪除
- [x] CHANGELOG.md 已更新

---

## 後續建議

1. 下次 `/fhs-audit` 跑滿 Check 7，驗證 `semantic_audit_candidates.json` 內的 48 deprecated hits 與 273 dangling 是否需要 exception_paths 過濾或實際修正
2. canonical_keys.yml 可擴展至更多 key（如 supabase_url / production_branch / workflow_id 等）
3. 若 D4 沉餘自動化需求增加，再評估引入 rapidfuzz 依賴
4. Quadruple_Sync 內「n8n 內部計算規則」段落需在 Cost Calculator 邏輯變動時同步更新

---

## 設計哲學

> 結構稽核問「檔案在不在、版本對不對」；語義稽核問「內容說的是否還是真的」。前者是骨架健康度，後者是靈魂一致性。/fhs-audit v2.1 兩者兼備。
