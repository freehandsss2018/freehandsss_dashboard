# n8n Supabase 憑證 401 根因：Secret Key 公開 Repo 洩漏遭自動撤銷（2026-08-10）

## 事故經過

`/fhs-check` 健檢腳本本身回報「全部通過」（4 passed, 1 skipped），但 LIFECYCLE/STRESS/ACCEPTANCE 輸出文字內藏「testXXXX never appeared in Supabase」警告——腳本判定邏輯只認 HTTP exit code，唔驗實際落地，Red Flag 被淹沒喺 PASS 訊息入面。連續兩輪 `/fhs-check`（同日）結果一致，手動直查 Supabase api logs 揪出：n8n（axios 來源）發出嘅 `PATCH /orders`、`GET /products` 全部 401，同期健檢腳本自己（Python-urllib，獨立 key）全部 200——鎖定 n8n 自身憑證失效，非 Supabase 專案級停用。追查 `orders` 表非測試訂單，最後一筆 `updated_at` 停留喺 2026-08-04 13:15 UTC，即真實訂單同步已斷 5 日以上。

追蹤 n8n workflow `FHS_Core_OrderProcessor` 嘅 `HTTP: Supabase Sync RPC` / `Mirror Delete to Supabase` 兩個 httpRequest node，發現佢哋唔用 n8n 標準 Credential 儲存機制，而係讀上游 `Supabase Mirror Prep`（Code node）注入嘅 `$json.supabaseKey`；該 node 原始碼（示意，實際 key 值已遮蔽）：

```js
const SUPABASE_KEY = (() => { try { return process.env.SUPABASE_SERVICE_KEY; } catch(e) { return null; } })()
  || 'sb_secret_XXXXXXXX...（寫死明文 fallback）';
```

檢查 n8n Docker Compose 環境變數，確認 `SUPABASE_SERVICE_KEY` 從未設定過，故程式碼一直行緊 `||` 後面嗰段寫死 fallback key。Fat Mo 提出關鍵質疑：「我一直都無改動過任何 key，之前一直都好好哋」——順住呢個質疑重新查證，而非直接建議換新 key：`git log --all -S"<該 secret 前綴>"` 揪出呢條 secret 由 **2026-05-16 首次出現**，經過至少 12 次 commit（透過 n8n workflow JSON 備份檔案），持續明文寫落 repo；`gh repo view --json visibility` 確認呢個 repo 係 **PUBLIC**；`git show origin/main:<受影響檔案> | grep -c` 確認**此刻**（查證當下）條 key 仍以明文形式存在於公開 GitHub `origin/main`。時序吻合 GitHub↔Supabase 嘅 secret scanning 自動撤銷合作機制——非人為改動，係 Supabase 偵測到公開洩漏後自動撤銷。

## 根因

1. **健檢腳本 PASS/FAIL 判準與實際資料落地脫鉤**：`run_all.py` 只認子程序 exit code，測試腳本內部即使印出「never appeared in Supabase」警告仍視為 PASS，令生產級故障連續多輪被腳本自己蓋過去，靠人手逐行讀 stdout 先揪到。
2. **n8n Code node 用寫死字串當 fallback secret**：`process.env.X || '<明文 secret>'` 呢種寫法一旦 Code node 內容被匯出（workflow JSON 備份、`/commit` 同步流程），secret 就會跟住原始碼一齊落 repo；若 repo 係 public，即等同主動公開洩漏。
3. **「一直冇人改過」≠「冇嘢變」**：外部安全機制（GitHub secret scanning + 供應商自動撤銷）會喺冇任何人類操作嘅情況下令憑證失效，診斷唔可以預設「錯誤=某人手動改咗嘢」，要驗證公開曝光可能性先落結論。

## 防再犯（原則，2026-08-10 記錄；技術落地見下方「追加四」，2026-08-11）

- **健檢腳本嘅「Red Flag」判準要覆蓋資料落地驗證，唔淨係 exit code**：`run_all.py` 應該將 stdout 內「never appeared in Supabase」类警告本身升級為 FAIL，而非留俾人手逐行讀。
- **n8n Code node 一律禁止用明文字串做 secret fallback**：缺環境變數時應該直接 `throw`，令執行記錄清晰報錯，而非靜默退回一個可能已死/已洩漏嘅寫死值。本專案 pre-tool-guard hook（R2規則）已可攔截「新寫入」明文 Supabase key，但擋唔到已存在嘅舊 commit 或 n8n workflow 內部原始碼，要人手排查。
- **懷疑憑證忽然失效但「無人改過」時，先查公開曝光可能性，先查後改**：`git log --all -S"<可疑字串>"` 揪出首次引入時間 + `gh repo view --json visibility` 確認 repo 可見度 + `git show origin/<branch>:<file> | grep` 確認此刻是否仍公開曝光；只有排除咗呢個可能性先假設係單純過期/需要 rotate。
- **判斷「今日測試單有冇真正落地」唔好靠測試腳本自報，直接查 Supabase `orders` 表非 test 開頭訂單嘅 `MAX(updated_at)`**：呢個係最快、最不受腳本本身邏輯缺陷影響嘅地面真相訊號。

## 追加：全 workflow 掃描揪出另外 2 個中招節點（2026-08-10，D62 執行後發現）

修復 `Supabase Mirror Prep` 後驗證時發現 `GET /products` 仍 401，順住呢個線索全 workflow 掃描同一 secret/變數名，確認合共 3 個節點中招（全部已修，live workflow 硬編碼 secret 歸零）：

1. **`Supabase Mirror Prep`**（Code node，CREATE/UPDATE 路徑）
2. **`Smart Cache Strategist`**（Code node，SKU 成本查詢）：`require('axios')` + 條件式 fallback
3. **`Mirror Delete to Supabase`**（httpRequest node，DELETE 路徑）：⚠️ secret 直接寫死喺 `headerParameters`，完全冇環境變數判斷邏輯——**呢種寫法唔會因為設定環境變數而自動修復**，必須獨立改節點參數（`update_node_code` 只食 Code node，須用 workflow PUT API）。

**教訓補充**：①揪出一個節點嘅寫死 secret 反模式後，應該全 workflow 搜尋同一 secret 前綴／同一變數名，一次過列晒清單，唔好逐個節點被動撞見先修一個；②同一份 secret 洩漏喺唔同節點嘅「修復難度」可以完全唔同——有環境變數判斷嘅節點會隨設定自動痊癒，純寫死嘅唔會，唔可以假設「設咗環境變數就全部搞掂」。

## 追加二：n8n Code node **預設封鎖所有環境變數存取**——呢個先係硬編碼 secret 嘅真正成因（2026-08-10）

修完 3 個節點後實測，執行記錄診斷輸出：

```
typeof $env = object       → n8n 原生 $env 物件存在
$env.SUPABASE_SERVICE_KEY  → throw "access to env vars denied"
typeof process = undefined → process 喺 Code node 沙盒內根本唔存在
```

即係話：**喺 n8n 預設設定下，Code node 兩條讀環境變數嘅路都行唔通**（`$env` 被 `N8N_BLOCK_ENV_ACCESS_IN_NODE` 主動封鎖；`process` 直接唔存在於沙盒）。解封需要喺容器加 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`。

**呢個發現反過來解釋咗整單嘢嘅源頭**：當年開發者唔係懶先至寫死 secret，而係佢試過讀環境變數失敗（原始碼嗰個 `try { return process.env.X } catch(e) { return null }` 包裹就係實驗殘跡），冇再深究就退回硬編碼——結果種下 3 個月公開洩漏嘅根。**教訓**：見到「secret 硬編碼 + 一個明顯防禦性 try/catch 包住 env 讀取」呢個組合，唔好淨係當佢係疏忽，要當佢係「環境變數機制曾經失敗過」嘅訊號去查平台層設定；淨係換 key／淨係改代碼都唔會解決問題，平台開關唔開，代碼點寫都讀唔到。

## 追加三：升級 n8n 版本會令 Code node 內 `require('axios')` 由「可用」變「令 task runner 崩潰」（2026-08-10）

同日 Fat Mo 重啟容器（`image: n8nio/n8n:latest`）後，`Smart Cache Strategist` 由正常運作變成整個 execution 死喺該節點，錯誤 `InternalTaskRunnerDisconnectAnalyzer.toDisconnectError` + `N8N_RUNNERS_MAX_OLD_SPACE_SIZE` 提示——同 [[2026-05-18_n8n-nas-code-node-limits-telegram-debug]] D55 記錄嘅症狀逐字吻合。**關鍵時序證據**：同一節點 15:24 仲成功發出 `GET /products`（Supabase log 有紀錄），15:52 重啟後完全冇 request 就死咗。

**修法**：Code node 內棄用 `require('axios')`，改用 n8n 原生 `this.helpers.httpRequest()`（task runner 下經 RPC 代理回主進程，唔會崩潰），實測修復後節點正常執行。**教訓**：①`:latest` tag 令「淨係重啟」等於「無聲升級」，任何用 `:latest` 嘅容器重啟後如果出現新故障，第一個假設應該係版本升級而非設定改動；②進程級崩潰**唔會被節點內 try/catch 捉到**，所以「有 fallback 邏輯」唔代表安全——`Smart Cache` 明明寫住 catch 後退回 Airtable，實際上整個 execution 直接死。

## 追加四：Fat Mo 要求「學習經驗、優化防止再現、審視 /fhs-check」——四項技術性防線落地（2026-08-11）

事故完全收工後，Fat Mo 明確要求唔淨係寫教訓文件，要做**技術性自動防護**。逐一審視上面「防再犯」四點，發現部分講咗但未做，落實如下：

1. **`run_all.py` 聚合層加 DEGRADED 偵測**：新增 `DEGRADED_MARKERS` 清單（"never appeared in Supabase" 等 3 個字串），任一子腳本 stdout 命中即使 exit code=0 都標記 🟡 DEGRADED，同 🔴 FAIL 一齊阻擋 `sys.exit(0)`——徹底堵死「輸出有警告但總結話全部通過」呢個 D62 事故嘅確切成因。

2. **`FHS_Full_System_Test.py` 邏輯 bug 直接修正（唔止偵測）**：查返原始碼揪出真正根因——第 71-97 行 `if created and not wait_for_order_state(...)` 呢個 gating 邏輯，當 CREATE 都驗證唔到（`created=False`）會直接短路跳過 DELETE 驗證，仲印「Cleanup verified」假訊息 + exit 0。**呢個先係 `/fhs-check` 可以連續 5 日隱藏真實故障嘅確切代碼位置**（唔止係「判準鬆」咁抽象，係一行具體嘅短路邏輯錯誤）。改為 CREATE 驗證失敗即 `SystemExit(1)`，唔再假裝可以驗證一張唔存在嘅訂單。**注意**：`FHS_System_StressTester.py`/`FHS_Comprehensive_Test.py` 有相同 pattern 但涉及 TC-02~05／Test B 呢啲刻意測試 failsafe 嘅案例（`created=False` 可能係預期行為定係真 bug 屬產品語義問題，AI 冇資格單方面拍板），故只喺 `run_all.py` 層面加 DEGRADED 偵測兜底，冇動呢兩個腳本嘅個案邏輯——如果之後想埋單呢個灰色地帶，需要 Fat Mo 先定義 TC-02~05／Test B 嘅預期落地行為。

3. **`n8n-mcp-server/src/tools/update-node-code.js` 加密鑰遮蔽**：呢個係**真正嘅洩漏源頭**，比 `pre-tool-guard.js` R2 更根本——`backupNode()` 用 `fs.writeFileSync` 將節點原始碼（含任何硬編碼密鑰）直接寫落 `.fhs/notes/aireports/n8n-mcp-backups/`，而 R2 只擋 Claude Code 自己嘅 Write/Edit 工具呼叫，MCP server 係獨立子進程，完全繞過個 hook。新增 `redactSecrets()`（同 R2 用同一套 pattern）喺 `writeFileSync` 前掃描並遮蔽，寫檔時偵測到命中會印 stderr 警告。**限制**：呢個 MCP server 進程喺本 session 全程運行緊，patch 要下次連接/重啟先生效，未能喺同一 session 內即時驗證。

4. **`pre-tool-guard.js` 加互相參照註解**：喺 Rule 2 頂部加註解指向 `update-node-code.js` 嘅 `SECRET_PATTERNS`，提醒兩處清單需同步維護，避免未來只改一邊。

**教訓（元層級）**：「寫低教訓」同「真正落地防線」係兩件事——2026-08-10 版本嘅「防再犯」清單其實已經預見咗呢 4 個修法嘅方向，但停留喺文字建議層面，未經追問就唔會變成實際代碼改動。Fat Mo 主動追問「你有冇學習經驗並優化」正正逼出咗呢個落差。

## 追加五：新警報第一次觸發必須逐個案追到底——恆定 DEGRADED = 恆定 PASS（2026-08-11）

D63 加咗 DEGRADED 偵測後首跑，LIFECYCLE 由假 PASS 變真 FAIL（→ 揪出 migration 0087 嘅 `deleted_at` bug，修完轉 PASS），但 STRESS/ACCEPTANCE 仍然 DEGRADED。**當時最容易犯嘅錯係「LIFECYCLE 已修好，其餘 DEGRADED 算已知情況」就收工**——但一個長期恆定 DEGRADED 嘅健檢，同一個恆定 PASS 嘅健檢一樣冇用，兩者都會令人停止細睇，正正就係今次事故（假 PASS 隱藏 5 日）嘅同一種失效模式。逐個案追落去，再揪出兩件事：

1. **`test2001`/`test2002` 真因唔係憑證/同步，係測試夾具過時**：n8n execution log 顯示 FK 違反 `order_items_product_sku_fkey`——`FHS_Comprehensive_Test.py` 用緊 `金屬鎖匙扣 (不鏽鋼)`，係舊格式品名，而且係「不**鏽**鋼」vs 現行目錄「不**銹**鋼」**兩個唔同嘅字**，該 SKU 早已不存在。ACCEPTANCE 測試一直靜靜失敗緊、被舊版腳本吞咗。屬測試資料維護問題（改夾具 vs 保留作 FK 防線測試需產品決策），未自行改動。

2. **自己嘅修復留低咗手尾**：D63 改 `Smart Cache Strategist` 時（`$env` 封鎖問題尚未確診）保留咗 `process.env` 讀 key，但之後已證實沙盒內 `typeof process === 'undefined'`，令該節點每次都靜默 fallback 落 Airtable（`supabaseFetched=false`）——功能上唔算壞（Airtable fallback 本身係設計內），但完全冇行到預期嘅 Supabase 路徑，等於 D62 嗰輪修復喺呢個節點白做。改用 `$env` 後實測 `supabaseFetched=true, costKeys=2`。

**教訓**：①任何新加嘅警報/偵測機制，第一次觸發時必須逐個案追到底並確認「呢個警報係咪指向真問題」，否則佢會迅速退化成背景噪音；②診斷過程中途得出嘅結論（例如「用 `process.env`」）如果之後被新證據推翻（「沙盒冇 `process`」），要**主動回頭檢查早前基於舊結論寫落去嘅代碼**，唔好假設「當時改咗就 OK」——同一 session 內嘅前後認知落差係真實存在嘅缺陷來源。

詳見 `Maintenance_Tools/run_all.py`、`Maintenance_Tools/FHS_Full_System_Test.py`、`n8n-mcp-server/src/tools/update-node-code.js`、`scripts/hooks/pre-tool-guard.js`、`.fhs/notes/decisions.md` D63。

## 相關

`.fhs/notes/session-log.md` 2026-08-09/2026-08-10/2026-08-11 條目、handoff.md D61-follow（Supabase憑證401待Fat Mo輪替，已解決）、decisions.md D62/D62續/D62續II/D63、[[project_n8n_supabase_401_credential_incident]]（session memory）
