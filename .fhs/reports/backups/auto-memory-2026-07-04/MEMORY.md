# Memory Index

- [reference_supabase_mcp_dropout_workaround.md](reference_supabase_mcp_dropout_workaround.md) — Supabase MCP 掉線時用 Management API `/database/query` + PAT（curl，非 python-urllib）繞過跑 SQL/DDL；專案/PAT 正常則屬 stdio pipe 掉線，客戶端 /mcp 重連
- [reference_cl_flow_runner_cloudflare_fix.md](reference_cl_flow_runner_cloudflare_fix.md) — cl-flow-runner PX socket hang up = Cloudflare 擋 Node https/urllib 只放行 curl（已改 curl 子程序）；Gemini 過載走 .env 切 model；curl成功Node失敗=必為指紋勿調timeout
- [feedback_visual_bug_measure_not_guess.md](feedback_visual_bug_measure_not_guess.md) — 視覺/版面 bug 必須 playwright 實測 computed style，勿純讀碼臆測；`style.display=''` 會清掉 inline display 使 div 退回 block

- [project_kgov.md](project_kgov.md) — **kgov** = FHS 知識治理框架召喚詞（Session 63）：Product_Definition SSoT + §10 規則ID表 + Rule 3.17 + /new-product Step 6
- [project_v40_status.md](project_v40_status.md) — Supabase-First architecture (2026-05-18): V41 production, AGENTS v1.4.6, n8n V47.9, Telegram 三格分離完成
- [feedback_n8n_code_node_nas_limits.md](feedback_n8n_code_node_nas_limits.md) — NAS n8n Code 節點：fetch/process.env/require 全部靜默失敗，必須用 HTTP Request 節點或 hardcoded 資料
- [project_n8n_v4574_fix.md](project_n8n_v4574_fix.md) — n8n V45.7.4 deployment: Profit Auditor fix, SKU normalization, confirmed Airtable Product_Database SKU formats
- [feedback_n8n_deployment.md](feedback_n8n_deployment.md) — n8n deployment rules: never Import From File, use API PUT, Windows curl UTF-8 file workaround
- [user_fatmo.md](user_fatmo.md) — Fat Mo: system architect, backend/finance owner for Freehandsss
- [feedback_tdz_silent_catch.md](feedback_tdz_silent_catch.md) — Dashboard try-catch silently swallows TDZ errors, causing empty Order_Items_List
- [feedback_antigravity_worktreeconfig.md](feedback_antigravity_worktreeconfig.md) — Antigravity v1.21.6+ crashes (__store TypeError) when .git/config has worktreeConfig=true; fix: git config --unset extensions.worktreeConfig
- [feedback_airtable_direct_query.md](feedback_airtable_direct_query.md) — **Supabase first**, Airtable as fallback only; never use screenshots as real data
- [feedback_pre_delivery_dual_discipline.md](feedback_pre_delivery_dual_discipline.md) — 三交付邊界強制雙紀律自檢兩行（Rule 3.17）；Router 建議=硬要求；驗收任務型分流表（合併 subagent_router + delivery_standards）
- [feedback_subagent_record.md](feedback_subagent_record.md) — 任務完成回覆結尾必附一句 subagent 使用記錄（用/沒用/不知道），不可省略
- [project_cost_calculation_rules.md](project_cost_calculation_rules.md) — FHS 成本位置依賴規則：首件全成本/加購免畫圖、運費按件數扣減、Clasp=頸鏈$100、1頸鏈2吊飾——Finance Bible 缺失導致反覆算錯
- [feedback_finance_rules_must_be_recorded.md](feedback_finance_rules_must_be_recorded.md) — 財務規則一經確認必須立刻落盤（文件+learnings+記憶），禁止亂猜，財務算錯=嚴重核心錯誤
- [feedback_investigate_before_asking.md](feedback_investigate_before_asking.md) — 嚴禁直接問可自查/自析的事；缺資料先查Airtable+檔案、決策題給優劣對比+建議（重複犯=嚴重過失）
- [feedback_supabase_first_enforcement.md](feedback_supabase_first_enforcement.md) — 工具缺 Supabase MCP = blocker 上報，禁止靜默降級至 Airtable；任何 live 查詢設計必須 Supabase 為起點
- [project_cost_calculation_rules.md](project_cost_calculation_rules.md) — 2026-06-03 追加：收款確收守護語義確認——final_sale_price（手輸）=真理；total_cost（n8n估算）=快照；calculatePricing()=參考預算，非確收
- [project_maporder_id_pitfall.md](project_maporder_id_pitfall.md) — mapOrder() maps o.id=FHS string (NOT UUID); o._uuid=Supabase UUID；DOM/openOrderModal 全用 FHS string，傳錯則靜默失敗
- [project_keychain_addon_qty_cost_bug.md](project_keychain_addon_qty_cost_bug.md) — 加購鎖匙扣 subtotal_cost/keychain_cost 無視 quantity（qty3/4全$185嚴重低估），首件全價+加購件×N才對；n8n計算bug歸Task A，前端禁做185×N假乘法
- [feedback_v42_split_autofill_overwrite.md](feedback_v42_split_autofill_overwrite.md) — _quickHalfFillAllSplits 載入現有訂單時覆寫 split box；fix: isDefault!=='true' guard + oninput 標記 isDefault='false'
- [feedback_v42_generate_else_clear.md](feedback_v42_generate_else_clear.md) — generate() else 分支 hide box 必須同時 .value=""，否則舊手模文字殘留在 IG modal
- [feedback_v42_raw_form_state_patch_caveat.md](feedback_v42_raw_form_state_patch_caveat.md) — SQL patch orders 財務欄位不更新 raw_form_state；用戶需手動載入→改 split→sync 才能永久修正
- [project_governance_portability_plan.md](project_governance_portability_plan.md) — Fat Mo 計畫治理系統（governance/、指令架構、hooks）拆成可攜模板供未來非Dashboard專案繼承；延後至Fable SOP優化完成後處理
