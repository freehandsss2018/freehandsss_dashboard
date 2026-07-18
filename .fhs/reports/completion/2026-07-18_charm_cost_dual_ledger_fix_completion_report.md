# 完成記錄：吊飾成本雙數簿漂移修復 + 頸鏈規則補件 + 防再錯機制（D40，S181）

**日期**：2026-07-17 ~ 2026-07-18
**執行者**：Claude Code（Fable 5 定方案／Sonnet 5 初步審計／opus×3 對抗審查）
**授權**：Fat Mo 逐步 AskUserQuestion 拍板（全面追新數簿方案、金銀同價確認）+ `/execute` 指令（n8n 部署）+「必須處理糾正及防止的方案」指示（防錯機制）
**決策記錄**：`decisions.md` D40 + 附錄

## 一、改動清單（全部已上線）

| # | 改動 | 位置 | 驗證 |
|---|---|---|---|
| 1 | migration `0046_charm_cost_refresh`：建 `fhs_compute_charm_cost()` RPC + 吊飾材料價回填（365/421→465/465） | Supabase | SQL 回讀 242 行 |
| 2 | migration `0056_charm_cost_per_set_and_addon_drawing`：per-set 補完（加購=465×N 免畫圖；單購=tier_drawing+465×N；防禦處理「加貼」typo row） | Supabase | 242/242 符合方程式，零違規 |
| 3 | migration `0057_drift_check_charm_coverage`：`fhs_check_product_cost_drift()` 擴充覆蓋吊飾全 tier | Supabase | 282 行檢查，零漂移 |
| 4 | n8n `Calculate Profit & Pack Items` V47.18→V47.19：訂單層新增頸鏈 `ceil(charmItemCount/2)×100` | n8n workflow 6Ljih0hSKr9RpYNm | versionId `a057ec7b`；`get_node` 讀回逐字核對；備份 `.fhs/notes/aireports/n8n-mcp-backups/2026-07-17/` |
| 5 | `finance-gatekeeper/SKILL.md` v1.4.0：新增 §三B 成本改動前置紀律（三步強制）+ 路由表加行 | `.fhs/ai/skills/` | 備份 `.fhs/reports/backups/finance-gatekeeper-SKILL.md.2026-07-18-pre-s181.bak`（補做） |
| 6 | 文件同步：Logic Overview §5.4.2 新章、CHANGELOG S181 條、decisions.md D40+附錄、lessons post-mortem、repo-map、audit report 修正註記 | 各檔 | — |

## 二、最終方程式（live 驗證定案，勿再引用中間版本）

- 吊飾加購 = `material(465) × item_per_set`（免畫圖）
- 吊飾單購 = `tier_drawing{嬰兒60｜嬰兒(P)110｜成人(S)/家庭(S*)110｜成人(P)/家庭(P*)240} + material × item_per_set`
- 運費不入 SKU（S124 v2 裁決；僅訂單層扣減 (N−1)×35）；頸鏈不入 SKU（n8n 訂單層 ceil(N/2)×100）
- **Akira 0600721 定案數：total_cost $2605**（吊飾 1955 + 鎖匙扣 440 + 手模 210；現存 2357）

## 三、過程缺陷自白（Fat Mo 定性嚴重，成立）

連環四錯：漏頸鏈（原始 bug）→ 險雙計（第一版 patch，opus 審查攔截）→ 誤判漏 $35 運費（引用已被 S124 v2 取代嘅 Pricing Bible §6.2 舊分解做基準——**同 session 早前已自行判定該分解過時**）→ N飾未倍增/加購未免畫圖（0046 漏做）。
根因：逐忽修補＋文件當真相。防止機制見 §三B 三步（完整方程式先行／對齊先例／drift 檢查零行收工）。

## 四、維護協議自我裁定（05 §1 對照，Fat Mo 質詢後補查）

- ✅ 合規：decisions.md 追加、lessons/ 落點、AGENTS.md/CLAUDE.md/governance 本體零改動
- ⚠️ 踩界一：finance-gatekeeper §三B 屬 skill 檔新增強制規則，超出 §1 自助範圍（僅允許 Known failure modes 純追加），且改前未備份——備份已補做；規則內容係 Fat Mo 明示「必須…防止的方案」授權嘅落實，**位置與形式待 Fat Mo 追認**：若裁定應升格 AGENTS.md 憲法層或改寫成 Known failure modes 格式，可從備份重整
- ⚠️ 踩界二：上輪 [D] 稽核錯誤宣告「[B] 不觸發」（repo-map.md 改動明列於 [B] 觸發清單）——本報告即係補交嘅 [B] 完成記錄

## 五、待辦移交

- 🔴 Fat Mo：7 張歷史單（Akira/Dede/Kathleen/Amen/Selina Lai/Lokyi_C/DebbieHo）Dashboard 載入→sync；完成後建議叫 AI 跑一次全量覆核
- 🟡 Fat Mo 追認：§三B 位置形式（見 §四）
- 🟡 products 表「加貼」typo SKU（`家庭(P1)吊飾 - 925銀 - 3飾 (加貼)`，mode 欄錯填「無」）資料清理，另辦
- ⚪ n8n `trigger_test_execution` webhook 405 未能取 mock 執行證據；首張真實吊飾新單落單後用 `get_execution_log` 抽查補證
