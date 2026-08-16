# Learnings — 工具 / Harness / 第三方整合

> 由 `.fhs/memory/learnings.md` 分桶重構遷入（2026-08-03，flow `2026-08-03-2003`）。
> 制度說明、配額規則、tag 語法、退役 checklist 全部見 [README.md](README.md)，本檔只放內容。
> 全檔上限見 README 配額表（本桶：15）。
>
> **與 auto-memory 的邊界**（Q6 裁決，可攜性劃線）：本桶收「在 FHS repo 流程內撞到的工具怪癖」——跟 repo 走、可隨 S149 治理可攜化一併攜出。auto-memory（`~/.claude/.../memory/`）只留純個人/跨專案/harness 本身的偏好，不跟 repo 走。

---

## Patterns

1. **本地測試 Dashboard HTML 一律起 http server，禁用 file://**：Browser pane 沙盒下 `file://` 阻擋 `localStorage`，未包 try-catch 嘅呼叫會累到整個 `<script>` block 冇執行（連 hoisted function 都揾唔到），令診斷完全失真；改用 `python -m http.server <port>` 起本地伺服器再 navigate 去 `http://localhost:<port>/...html` 即可正常運作 — 已於 S179續同 S180 兩次獨立場景驗證（分別由不同 subagent/主對話撞到同一陷阱） — 源自 2026-07-16 `@tooling` <!-- v:2026-07-16 -->

## Pitfalls

1. **Python json.dump emoji → n8n surrogate pair "invalid syntax"**：用 Python 序列化含 emoji（如 🔗）的 n8n workflow JSON 時，若 `ensure_ascii=False` 且環境 CP950，emoji 被寫成 surrogate pair（`\udcfx...`）；n8n 求值表達式時 "invalid syntax" 靜默失敗。修法：`json.dump(..., ensure_ascii=True)` 強制 ASCII escape，或改用純 ASCII 替代符號（`>` 代替 🔗）— Session 128 `@tooling` <!-- v:unknown -->
2. **第三方 Claude Skill 若 frontmatter 含 `disable-model-invocation:true`，喺 Claude Code harness 內完全無法被呼叫**：唔止係「唔自動觸發」，AI 主動用 Skill 工具呼叫都會被系統拒絕。裝第三方技能包前應逐支查 frontmatter；若要設中文召喚詞疊加，改為直接呼叫其底層無此旗標嘅技能（如 `grill-me`→改叫 `grilling` 本體），使用者體驗不受影響 — Session 170 [[project_mattpocock_skills]] `@tooling` <!-- v:unknown -->
3. **【高頻 ⚠️】Canva MCP `resize_element` 嘅 `preserve_aspect_ratio=true` 保留嘅係「目前 element container 現有比例」，唔係 asset 原生像素比例**：新素材（如客人上載嘅直向 960×1920 影片）拖入 Canva 時預設 container 形狀（如舊格 864×864 方形）可能同新 asset 完全唔同比例，淨傳一個維度（如 height）靠 `preserve_aspect_ratio` 自動推，實際保留嘅係 container 舊比例（1:1），唔係 asset 原生比例（0.5），導致嚴重變形/重疊。凡新素材原生比例明顯異於現有 container 比例時，必須明確傳 width+height（`preserve_aspect_ratio=false`），唔可以淨靠 `preserve_aspect_ratio` 自動推 — Session 172 [[project_canva_video_automation]] `@tooling` <!-- v:unknown -->
4. **【高頻 ⚠️】跳脫層數唔可以靠推理，一定要用 `charCodeAt` 實測；另 raw U+2028/U+2029 放入 JS 源碼即係 SyntaxError**：改一個轉義 helper 期間連續踩兩次。①**U+2028/U+2029 本身就係 JS 行終止符**，直接打入 regex literal（`/[\r\n␨␩]/`）會即場 `SyntaxError: Invalid regular expression: missing /`，打死成個 `<script>` block；修法係 `new RegExp(String.fromCharCode(0x2028),'g')`，源碼內完全唔出現該字元。②替換字串寫咗 `'\n'`（源碼一個真 LF）而唔係 `'\\n'`（反斜線+n 兩個字元），變成「用換行換走換行」嘅 **no-op**，睇代碼完全睇唔出，多行值嘅 onclick 依然 parse 失敗、撳掣零反應零報錯。**兩個都係靠 `charCodeAt` 實測先揪到**（錯：`[97,10,98]`；啱：`[97,92,110,98]`）。**附帶**：經 Bash `node -e "..."`／`python - <<EOF` 改檔時，shell → 語言 → 檔案三層各食一次反斜線，實測會靜默少一層；**改跳脫相關代碼一律寫獨立腳本檔再 `node 檔名` 執行**，唔好用 `-e` 內聯 — 2026-08-09 `@tooling +frontend` <!-- v:2026-08-09 -->
5. **【高頻 ⚠️】Canva MCP：母片嘅 `imageBox`(crop_media) 舊值同 container 一樣「係上一個客嘅裁法、唔係規格」，禁止沿用**：抄母片 CDF 舊 imageBox 落新 asset，Canva 會 clamp 並放大約 9%，令圖四邊各裁走數十 px；一律用 `box=max(container_W,container_H)`／`left=(W-box)/2`／`top=(H-box)/2` 即場重算（Fat Mo 人手改正值同此公式差 0.05%）。同源第 2 次（首次為 container 殘留 crop offset）— 2026-08-15 [[project_canva_video_automation]] `@tooling` <!-- v:2026-08-15 -->
6. **【高頻 ⚠️】Git worktree session 入面，絕對路徑漏咗 worktree 前綴會靜默錯改主倉，Read/Edit 完全唔會報錯**：system prompt 已明確列出 `Primary working directory`（`<repo>\.claude\worktrees\<name>\`），但若構造絕對路徑時漏咗呢段前綴（例如憑「熟悉」嘅主倉路徑重構，冇對照 system prompt 原文），Read/Edit/Grep 全部靜默成功——因為主倉入面嗰個路徑本身真實存在（同一 repo 兩個獨立 checkout），連續 7 個檔案、20+ 次 Edit 全部落錯都冇任何錯誤訊息。派 fresh-context subagent 覆核 worktree 內改動時，若 prompt 冇明確帶絕對路徑，subagent 會沿用同一套「合理但錯」嘅路徑假設，連覆核都一齊行錯——首輪覆核因此誤報「啲改動全部唔存在」。修復流程：確認主倉嗰批改動 100% 屬自己呢個 session（`git status --short` 逐項核對，唔好夾埋第三方未 commit 改動）→ `cp` 內容去啱嘅 worktree → `git checkout -- <files>`（精準列檔名，唔用 `git checkout .`）還原主倉 → 要求 subagent prompt 明帶絕對路徑並用 `git branch --show-current` 自證再重跑覆核。— 2026-08-16 [[feedback_worktree_bash_cd_path_leak]] `@tooling +governance` <!-- v:2026-08-16 -->

## Preferences

1. **外部 API endpoint 必先 probe 再推薦**：知識截止日後的 model ID 可能已過時；推薦前必須 curl/node probe 確認端點存在 — 源自 2026-05-30 `@tooling` <!-- v:2026-05-30 -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `governance.md` #4 健檢/監控腳本嘅 PASS 判準必須覆蓋「實際地面真相」，唔可以只信子程序 exit code
<!-- POINTERS:END -->
