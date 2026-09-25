# learnings 退役條目原文封存（2026-09-25 配額清理）

> 依 `.fhs/memory/learnings/README.md` §5 退役 Checklist，六條教訓因符合退役類別移出 governance／tooling 桶；原文一字不改保存於此，並於 README §8.9 登記。

---

## governance.md — Pitfalls #10（類1 已升格為更高層規則）

**證據**：`CLAUDE.md` 第三條紅線「驗收不自驗」＋第四條紅線「財務必派 finance-auditor」＋`stop-finance-auditor.js` Stop hook；0600804 再犯教訓已寫入 decisions.md 2026-09-19

10. **【高頻 ⚠️】同一個 AI 用同一套方法論自查三次仍會漏——驗收財務/生產改動必須改派獨立 fresh-context agent，唔可以再自己查第四次**：D65續IV-follow 玻璃瓶大寶定價，主對話自己核實咗三次「邏輯定義/UI/財務/測試驗收」四項（working tree→committed HEAD→再重複），每次都只查 Dashboard browser + Supabase products 表，從未實際跑 n8n webhook 全鏈路。改派一個完全冇對話記憶嘅 general-purpose agent 用相同四項清單獨立查，第一次就揪出 n8n 節點無條件降級玻璃瓶 SKU、抹走「(家庭)」/「+大寶」後綴嘅真 bug（存在超過一個月）。根因：自查會不自覺沿住之前驗證過嘅路徑再驗一次（同一套「browser+DB」方法論），唔會主動跳去未驗證過嘅層（n8n）；獨立 agent 冇呢個路徑依賴，會用自己嘅理解重新掃一次全部聲稱嘅範圍。日後任何財務/schema/n8n/生產HTML改動，交付後嘅「核實」唔應該由同一個 AI 用同一套方法反覆做，第二次起就應該改派獨立 subagent。**2026-09-19 再犯（0600804）**：AI 自己 SQL 宣告「已完成 $5,560」，事後派 finance-auditor 先揪出已被第二次儲存蓋過（$5,640）；規則其實早存在 AGENTS.md，但被 harness「未要求不派 subagent」預設蓋過——「必須派」要寫入每 session 必載嘅 CLAUDE.md 紅線＋Stop hook 機械把關，見 decisions.md 2026-09-19 — 2026-08-24 見 decisions.md 同 Logic_Overview §5.4.21 `@governance +finance +n8n` <!-- v:2026-09-19 -->

## governance.md — Preferences #3（類2 已結構性修復）

**證據**：`/cl-flow`／`/cl-flow-fast` 已按 D39 重組為 A3 先寫草案、A1/A2 做評審（`cl-flow.md` 流程本身），全文 decisions.md D39

3. **多代理管道應派缺 context 存取嘅模型做評審／red-team，唔好派佢做作者**：A1/A2 從零盲寫計劃反覆幻覺（假路徑/假角色/假 API），改做評審已有真實草案的角色後準確率大升——錯誤殺傷力亦由「作者錯要重寫」降為「評審錯唔採納就算」。日後設計任何多模型協作管道，先問邊個模型有 repo/現況存取，冇存取嘅只可以做評審唔可以做作者 — D39/S176 2026-07-16 `@governance` <!-- v:2026-07-16 -->

## governance.md — Preferences #4（類3 已在其他文件有更完整記錄）

**證據**：`commit.md` Phase 2.6（fast-forward-only）＋Phase 2.7；全文 decisions.md D70／D89

4. **人類直覺「completion＝主線已同步」值得實現，但只喺技術上零風險（fast-forward-only）先自動做，唔可以做「naive 每次自動合併」**：Fat Mo 質疑「打 commit 就代表任務完成，是否應該等同自動落 main」，落手前先查證而非直接照做——揪出本 repo 常態同時有多條 worktree 並行、`handoff.md` 幾乎每個 commit 都改到同一區塊、且已有真實「分支合併事故」先例（2026-09-03，一分支連續部署冇核對時間戳覆寫另一分支 31 輪成果）。故只做 git 底層保證零風險嘅子集（`merge-base --is-ancestor` 判斷 + fast-forward push），main 已被搶先就停低等人手，唔追求「每次都自動」嘅表面完整。**通則**：實現一個符合直覺嘅自動化功能前，先查現況是否真係「邊緣情況罕見」，唔可以假設；一旦查到已有真實事故先例，自動化範圍就要收窄到「物理上不可能靜默遺失資料」嗰個子集 — D70 2026-09-05 `@governance` <!-- v:2026-09-05 -->

## tooling.md — Pitfalls #3（類3 已在其他文件有更完整記錄）

**證據**：`canva-auto.md` Stage③ 步驟「`resize_element(preserve_aspect_ratio=false)`，width/height 都按新素材長寬比明確計算傳入」（第151行）

3. **【高頻 ⚠️】Canva MCP `resize_element` 嘅 `preserve_aspect_ratio=true` 保留嘅係「目前 element container 現有比例」，唔係 asset 原生像素比例**：新素材（如客人上載嘅直向 960×1920 影片）拖入 Canva 時預設 container 形狀（如舊格 864×864 方形）可能同新 asset 完全唔同比例，淨傳一個維度（如 height）靠 `preserve_aspect_ratio` 自動推，實際保留嘅係 container 舊比例（1:1），唔係 asset 原生比例（0.5），導致嚴重變形/重疊。凡新素材原生比例明顯異於現有 container 比例時，必須明確傳 width+height（`preserve_aspect_ratio=false`），唔可以淨靠 `preserve_aspect_ratio` 自動推 — Session 172 [[project_canva_video_automation]] `@tooling` <!-- v:unknown -->

## tooling.md — Pitfalls #5（類3 已在其他文件有更完整記錄）

**證據**：`canva-auto.md`「禁止沿用母片 imageBox 值」（第158行）及 crop_media 正確理解（第153-154行）

5. **【高頻 ⚠️】Canva MCP：母片嘅 `imageBox`(crop_media) 舊值同 container 一樣「係上一個客嘅裁法、唔係規格」，禁止沿用**：抄母片 CDF 舊 imageBox 落新 asset，Canva 會 clamp 並放大約 9%，令圖四邊各裁走數十 px；一律用 `box=max(container_W,container_H)`／`left=(W-box)/2`／`top=(H-box)/2` 即場重算（Fat Mo 人手改正值同此公式差 0.05%）。同源第 2 次（首次為 container 殘留 crop offset）— 2026-08-15 [[project_canva_video_automation]] `@tooling` <!-- v:2026-08-15 -->

## tooling.md — Pitfalls #14（類3 已在其他文件有更完整記錄）

**證據**：`cl-flow.md`／`cl-flow-fast.md`／`ag-flow.md`／`execute.md` Known failure modes 節（「Gemini(A2) fallback鏈全數同時503」標準處理程序）＋`.fhs/memory/lessons/2026-06-23_cl-flow-runner-cloudflare-px-gemini-fix.md`

14. **【高頻 ⚠️】`cl-flow-runner.js` 嘅 Gemini fallback鏈（3個model）可以同時全部503 high demand——唔可以見到DEGRADED就直接接受，要即刻curl逐個直探Google API搵活model再用`GEMINI_A2_MODEL_CHAIN` env override即時重試**：2026-06-23（單一model過載）、2026-08-17（同上）、2026-09-23（首次3個model一齊撞503）三次撞到同款「high demand」，但2026-09-23實測證明「三個一齊過載」只係暫時性巧合，同一時間點必然有其他健康model存在（該次`3.6-flash`/`2.5-flash`即時200）。**通則**：見到 `state.json` 標 `degraded:true` 或錯誤含"high demand"，第一反應係跑 `for m in <候選>; do curl ...models/$m:generateContent?key=$KEY ...; done` 逐個直探現況（唔經runner，排除runner本身邏輯問題），搵到200嘅model後用 `GEMINI_A2_MODEL_CHAIN="model1,model2" node scripts/cl-flow-runner.js --review {flow_id} --fast` 臨時覆寫（唔改`.env`，只影響單次呼叫）即時重試，唔好對財務/架構相關嘅Verdict將就一個零外部評審嘅DEGRADED版本 — 2026-09-23 [[feedback_gemini_degraded_probe_and_switch]] `@tooling +governance +finance` <!-- v:2026-09-23 -->

