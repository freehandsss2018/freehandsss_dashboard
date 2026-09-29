# finance-gatekeeper 更新記錄（由 SKILL.md frontmatter 移出）

last_updated: 2026-09-21（§一路由表「前端成本估算／前後端分工」一行改寫並指向新文件 `.fhs/notes/FHS_Cost_System_Overview.md`；更正 v1.18.0「有裁決」過頭講法——fresh-context 核對揭出：Fat Mo 2026-06-03 有確認語義（糾錯定改制 repo 冇明文）、S60 批准者查唔到、S125 已將品項層四欄廢欄——按 repo 批准情況如實寫，唔定性；同日 D82：Fat Mo 決定前端成本估算保留、四欄維持現狀）
[前次] 2026-09-20（§一路由表新增「前端 `calculatePricing()` 成本估算／前後端成本分工」一行——`finance-auditor` 第二次覆核揪出：本 Skill 係強制前置，但路由表 27 行內無一行指向前端成本估算，直接令 AI 兩次向 Fat Mo 答錯「冇任何裁決」；真實情況係有 S57／S60／2026-07-21 三條裁決——⚠️ 2026-09-21 已更正：此講法過頭，見 v1.19.0）
[前次] 2026-09-20（§四補「待確認」定義：同財務無關、訂金／全付一律已實收、`confirmed_at`＝入單日——Fat Mo 澄清；與主線 0600804 方案C（v1.16.0：§〇 強制派工閘、第6條死線、§六 Known failure modes）merge，版本 1.17.0）
[前次] 2026-09-19（D80：V2 品項層 drawing_cost 恆為 0 修復——n8n V47.25 + migration 0094，§一路由表加一行指向 §5.4.23；§三B「現行已定案方程式」V2 條補品項層 drawing_cost 語義）
[前次] 2026-09-19（0600804 事故後：新增 §〇 強制派工閘 + 第6條死線「財務必派 finance-auditor」+ §六 Known failure modes；原 line 22「不替代…需另行啟動」措辭太軟，被當成可選）
[前次] 2026-09-18（cl-flow 2026-09-18-1827 期一：`/fhs-cost-audit`（純 Airtable）已廢除歸檔，功能重寫落 Supabase 併入 `/fhs-check` COST_INTEGRITY phase，§一路由表加一行指向新機制）
[前次] 2026-08-22（D65續IV-follow：玻璃瓶「＋大寶」價階 $1,680/$1,980（同 tier ＋$300）+ 兩個新 SKU（migration 0091）；肢數 tier 改為只數嬰兒肢體，推翻 2026-07-21 定案；§一路由表加一行，見 §5.4.20。同日稍早 migration 0090「純大寶」版本為錯誤實作已作廢）
[前次] 2026-08-19（D67：`save_structured_order_items` RPC DELETE+INSERT 漏14個成本/V2欄位修復，migration 0089，§一路由表加一行，見 §5.4.19）
[前次] 2026-08-17（D65續II：立體擺設價錢真源抽為 `_pPriceOfSku()`，§一路由表加一行；純代碼重構，128組窮舉證實零財務規則變動，見 §5.4.18）
[前次] 2026-08-16（D65：父母/大寶升格訂單層一次性角色，§一路由表新增 owner 歸屬/家庭組合 S/P 全單判定一行，見 §5.4.17）
[前次] 2026-08-16（§三「5條財務死線」第2條補漏 `accessory_cost`——此前只列三分類，屬同 finance-auditor.md/database-reviewer.md 文件缺口同一批 grep sweep 事後揪出；一併修復 `FHS_Finance_Bible.md` §九「驗證公式」自身內部漂移，同檔 §三 line 136 早有4分類但 §九 line 396 仍停留3分類）
[前次] 2026-08-16（`sync_order_to_mirror` RPC `accessory_cost` 讀寫回歸修復完成，migration 0088，狀態由「未修復」更新為「✅已修復」，見 §5.4.16）
[前次] 2026-08-15（D64：多件手模擺設訂單新財務規則入表；曾記錄 accessory_cost「已修復」過時聲明——已於2026-07-28回歸，見 §5.4.15）
[前次] 2026-07-28（cl-flow 2026-07-28-1121：大寶/成人/家庭三對象轉V2模型——§一路由表新增家庭組合(V2)/大寶standalone廢止規則兩行；§三B方程式段新增V2擴充+家庭動態畫圖式）
[前次] 2026-07-25（D46事故後：§三B新增第4步「文件同步完整性grep sweep」，防止成本欄位改動漏同步Finance Bible/Product_Definition等權威文件；大型改動另派fresh-context subagent覆核）
