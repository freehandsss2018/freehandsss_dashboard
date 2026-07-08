# S158 完成記錄 — FHS_Blueprint 13 處過時修正＋降級改定位＋全系統接線

> 日期：2026-07-08｜執行：Fable 5（主對話）｜決策：D20｜本檔為全文唯一居所（D13 規則(a)）

## 一、緣起

Fat Mo 以 `@docs/FHS_Blueprint.md` 指令要求審視是否過時，審出 13 處；追問「為何十幾個優化 session 無人發現」與「防再發生方案」；再追問核心「佢重有冇用？」→ 裁決方案 A（降級改定位）＋ `/8d` 自我批評後以 v2 執行。

## 二、根因（全部有實證）

1. **零讀取路徑（幽靈權威）**：Blueprint 自稱「AI 介入開發必須首先讀取」，但 SessionStart hook／`/read` 清單／CLAUDE.md 路由表／knowledge-map 查詢表**全部不指向它**。Token 節約紀律下，無路由＝無流量＝無人發現腐爛。今次被發現，正因 Fat Mo 手動 @ 檔案。
2. **無寫回合約**：有合約的文件生存（System_Logic_Overview 有 kgov [G]、repo-map 有 [A]、handoff/Changelog 有 §3），Blueprint 一條合約都無——S134 平台收斂、S150 審計、S153 UI 改版均無規則要求同步它。制度性選擇壓力，非個別 session 疏忽。
3. **偵測工具反向認證**：fhs-health 五病偵測天生看不到「語義過時」；`/fhs-audit` A6-3 期望值 **v4.8 寫死在稽核指令內**，S145 全量稽核跑過等於蓋章認證過時版本；A6-3 並仍列 S138 已刪除的 docs/CHANGELOG.md 與 DEPRECATED 的 Product_Bible_V3.7。

## 三、13 處修正（v4.9，全文對照見 git diff）

🔴 危險級：§4 財務語義（v4.8 寫法＝2026-06-03 事故誤讀源頭，已改為收款確收守護三分工＋歷史警示禁止回退）；§7「Supabase=正式SSoT」措辭（違反 AGENTS §1.1，已改 Read/Write Lead＋翻轉條件）。
🟡 明確過時 9 項：frontmatter 日期自相矛盾／`.cursorrules` 持續記憶（已DEPRECATED）／24節點 Gold Master（2026-03 快照）／固定底部導覽（S153 已改 static）／Stitch MCP（S134 DEPRECATED）／§6 Airtable-centric／§9 Antigravity 執行協議（S134 平台矩陣＋R10 deploy 機制）／§10 三端→四端／migration 數字寫死。
⚪ 缺漏 2 項：§1 補記念影片產品線；SKU 數字改指向 Supabase 表。

## 四、v5.0 降級改定位（方案 A，/8d v2）

- 定位：「核心邏輯與技術規格真相（必讀）」→「**系統導覽（§1–§2）＋ UI 排版規範（§5 唯一居所）**」，明文非規則源、與 SSoT 衝突以 SSoT 為準
- 查證：§5 排版鐵律（rowspan 定律/13px/Loader/review-jump-pill）grep skills＋subagents 均無第二居所——此為本檔真實存在理由
- M2（execute.md [H] 寫回合約）／M3（health cadence 語義覆核）**裁決不做**：導覽檔過時殺傷力低，重型保養合約成本不相稱

## 五、接線清單（/8d v2 的 F1/F2/F3）

| 接線 | 檔案 | 內容 |
|---|---|---|
| 路由（主對話） | CLAUDE.md 路由表 | +2 行：改排版→§5；一頁理解全系統→本檔 |
| 路由（查詢） | .fhs/notes/knowledge-map.md | +2 行（同上兩個查詢意圖） |
| subagent 直連（F2） | ui-designer.md＋frontend-developer.md Constraints 節 | 各+1 行「排版鐵律遵循 Blueprint §5」；master 已同步 `~/.claude/agents/freehandsss/` |
| 稽核治本 | fhs-audit.md A6-3 | 禁寫死版本號、刪已亡 CHANGELOG.md 條目、DEPRECATED 檔改驗警示標記 |

## 六、M4-lite 盤點（docs/ 頂層 10 檔，F3 邊界：超出只記錄）

| 檔 | 判定 |
|---|---|
| FHS_Blueprint.md | ✅ 本次已治 |
| GLOBAL_AI_SOP.md／FHS_Product_Bible_V3.7.md | ✅ 已有 ⛔/DEPRECATED 標記，健康 |
| repo-map.md（[A]合約）／FHS_Prompts.md（[F]合約）／FHS_Knowledge_Map.md（S145 已註明職責） | ✅ 有合約/有職責聲明 |
| README.md／DESIGN.md／FHS_Legacy_Migration_Notes.md／plan_0004 | ⚪ 索引/歷史檔，低風險，未加合約（記錄，不動手） |

**記錄不動手項**（超出 F3 邊界）：ui-designer.md Constraints 內「Stitch 協同…`/ag-stitch-sync` → `/ag-ui-import` 管線」引用已 DEPRECATED 指令（S134），待日後 subagent 定義維護時一併清。

## 七、呈批項（憲法級，未動）

AGENTS.md 兩行過時引用，**等 Fat Mo 批先改**：
1. **L77 亂碼自癒**：「參考 `/docs/FHS_Blueprint.md` 修復」——Blueprint 從無 NEL/U+0085 修復內容；真實記錄在 `.fhs/memory/lessons/20260324_System_Management_Chaos_Reflection.md`。建議改指向該 lesson。
2. **L251-252 參考清單**：列 Blueprint「架構 ID 命名、數據流」（與 v5.0 新定位不符）＋列已 DEPRECATED 嘅 `FHS_Product_Bible_V3.7.md`。建議改為 Blueprint（系統導覽+§5 排版）＋ Pricing_Bible/Product_Definition。

## 八、同日追加：Fat Mo 二次裁決——整檔刪除取代降級

Fat Mo 質疑：「若真係非必要，不如直接刪，用最簡單直接，不要為留而留。當初認它重要係因為它寫低業務背景令我不必重覆解說——該用途等同 auto-memory 中 canva/youtube/spotify 記憶與財務專檔。」裁決成立：檔案對 Fat Mo 嘅唯一價值（免重覆解說）由 auto-memory 承接得更好（session 自動載入，零路由成本）。

執行（v5.0 降級方案作廢）：
1. **刪檔**：`git rm docs/FHS_Blueprint.md`，備份 `.fhs/reports/backups/FHS_Blueprint.md.bak_20260708_v5.0_final`
2. **§5 排版鐵律遷居**：`ui-ux-pro-max/FHS_INTEGRATION.md` 新增 **Section 六**（唯一居所；ui-designer Phase A 本來就讀此 skill＝有真讀者）；兩支 UI subagent 引用改指 Section 六並再同步 `~/.claude/agents/`
3. **§1 業務背景遷居**：auto-memory 新增 `project_fhs_business_context`（含 mobile POS 使用者「極度防呆」設計根因），MEMORY.md 已索引
4. **八處反向引用清理**：CLAUDE.md 路由（併為一行指 Section 六）／knowledge-map（同）／ui-designer／frontend-developer／fhs-audit A6-3（刪 Blueprint 行）／System_Logic_Overview 檔頭 See-Also／docs/FHS_Knowledge_Map wikilink／Dashboard README；repo-map 標 `[已刪除]`（沿 S138 CHANGELOG.md 慣例）
5. **AGENTS.md 呈批項更新**：L251-252 建議改為**直接刪除** Blueprint 行＋DEPRECATED V3.7 行（L77 亂碼自癒改指 lesson 檔建議不變）

【交付前雙紀律自檢】
驗收：文件治理任務——13 處修正逐項對照 AGENTS/decisions/Changelog 現行條文核實；反向引用 grep 普查（AGENTS×2/Knowledge_Map/Dashboard README/fhs-audit）逐條處置或呈批；§5 唯一居所聲稱經 skills+subagents 兩次 grep 實證；`git status` 改動面=本清單檔案（S157 未 commit 改動未混入）＝✅
Subagent：❌ 未使用——定點 grep＋窗口編輯，按 governance/02 §1 主對話直接執行清單
