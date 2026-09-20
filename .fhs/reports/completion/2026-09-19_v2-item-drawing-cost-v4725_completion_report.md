# 完成記錄：V2 品項層 `order_items.drawing_cost` 恆為 0 修復——n8n V47.25 + migration 0094（D80）

> 執行：Claude Code／2026-09-19／授權：Fat Mo `/execute Step 1 + Step 2（回填）`
> 無 `/cl-flow` artifacts：批准依據＝對話中經 `finance-auditor` 獨立 live 驗證後嘅提案（`execute.md` 第 16 行「Fat Mo 明確口頭批准」）

## 一、任務背景

`finance-auditor` 審查訂單 0600804 時揭發：生產庫全部 5 行 V2 品項（`cost_model_version='v2_layered'`，3 張單）`order_items.drawing_cost=0`，但 `drawing_charged_count=1`，違反 Cost Schema v2 §10.3「品項層＝全額（quantity × tier 費率）」，合共缺 $720。訂單層總數（`total_cost`／`net_profit`／四個分類成本）不受影響，因為 `item_base_cost` 取自 `products.total_base_cost`。

## 二、調查階段（唯讀，遵 finance-gatekeeper §三B 四步）

1. **完整方程式先行**：用 live 數據逐行驗證，5 行全部滿足 `item_base_cost − printing − chain − shipping = quantity × tier 費率`，即缺失嘅剛好只係畫圖分量。
2. **對齊先例**：migration 0078（品項層全額、訂單層不動）。
3. **drift 檢查**：`fhs_check_product_cost_drift()` 基線 0/172 行。
4. **文件同步 grep sweep**：見下文 §六。
- 根因兩層（execution 7516 webhook body 實證 `Drawing_Cost:0`）：Dashboard `calculatePricing()`（V42.html:9601-9613）仍沿用 S55 舊語義；n8n V47.24 對非家庭 V2 品項原樣透傳。
- `finance-auditor` 第一輪（前期）獨立 live 驗證：兩項 PASS（宣稱成立／回填不改訂單層數字）。

## 三、執行內容

### Step 1 — n8n V47.25（`Calculate Profit & Pack Items`）

- 唯一功能改動：`Drawing_Cost: isFamilyV2 ? itemFamilyDrawing : (isV2Sku ? getDrawingRateForV2Sku(sku) * itemQty : (Number(originalItemData.Drawing_Cost) || 0))`；另加標頭與 7 行歷史註解。
- **部署方式**：GET workflow → 精準字串替換（每處 count==1 斷言）→ PUT 四個核心欄位。不用 `update_node_code`：live 節點註解含 8 個 U+FFFD 亂碼字元，該工具要整段重輸出 391 行，有逐字抄錯風險。部署前重新 GET，確認 live 代碼與 versionId 同快照一致才 PUT。
- 部署結果：versionId `f495af34…` → `35ef85b8…`，workflow 仍 active；其餘 29 個節點同連線逐項比對零改動；live 代碼 == 預期候選稿；U+FFFD 仍為 8 個。
- **備份／回滾**：`.fhs/notes/aireports/n8n-mcp-backups/2026-09-19/6Ljih0hSKr9RpYNm/Calculate_Profit___Pack_Items.json`（`rollback_node_code` 相容格式，已先掃密鑰 0 命中）。
- repo 鏡像 `n8n/FHS_Core_OrderProcessor_live.json`：節點代碼喺 `nodes[]` 同 `activeVersion.nodes[]` 各一份，兩處皆替換；解析後結構比對除 jsCode 外零差異，CRLF 保留，`git diff` 2 行。

### Step 2 — migration 0094（回填）

- `supabase/migrations/0094_backfill_v2_item_drawing_cost.sql`，已用 `apply_migration` 套用（version `20260919124020`）。
- 只改 `order_items.drawing_cost`；不變式守衛（`item_base − printing − chain − shipping = qty × 費率`）＋ 命中行數必須 0 或 5，否則整個 transaction 回滾（0＝重放於全新 DB／已回填）。
- **順序鐵則**：先部署 V47.25 再回填，否則任何重新同步會用 Dashboard 嘅 0 覆蓋（0600804 於 2026-09-19 04:43Z 重新同步即被重設為 0）。
- 回填前重新盤點：受影響行仍係原先批准嘅 5 行（期間冇新增），不變式全部成立。
- 補回值：0600804_M_E_RH 60／0600804_M_LH 60／06009005_K_RH 360／0600914_K_LF 120／0600914_K_LH 120，合計 $720。

### 文件同步（[G] 觸發）

Cost Schema v2 v2.4.2（§10.4 實作行）、`FHS_Finance_Bible.md` v1.4.3（§五 order_items 表補四分量寫入方＋版本標籤）、`Quadruple_Sync_Field_Map.md` v2.1.2（order_items 四分量映射＋V2 畫圖費計算段；獨立覆核後補）、`FHS_System_Logic_Overview.md`（新增 §5.4.23 ＋ 四分量／`drawing_cost` 欄位兩處措辭 ＋ Phase 2 已知瑕疵註記）、`finance-gatekeeper` v1.17.0（路由表 +1 行＋§三B V2 方程式補語義＋§四「待確認」定義；2026-09-20 與主線 v1.16.0 merge）、`decisions.md` D80、`Changelog.md`、`docs/repo-map.md`（+0094）。

### 教訓落盤（過 stage-3 門檻）

`learnings/finance.md` #2（「已知 cosmetic」審計差值可能係真缺陷唯一信號）、`learnings/n8n.md` #8（live 節點含 U+FFFD 時用 GET→精準替換→PUT）、`learnings/supabase.md` #17（斷言 RPC 排除某類資料前要讀 WHERE 謂詞並實跑，唔好數關鍵字次數——覆核揪出我嘅錯後補）。另 2026-09-20 依 Fat Mo 澄清補 `learnings/finance.md` #7（「待確認」＝訂單細節待確認，同財務無關；訂金／全付已實收）同 `finance-gatekeeper` §四一行（合併後 v1.17.0）。三桶均在配額內（finance 9/20、n8n 10/20、supabase 18/20）；governance／frontend／tooling 三桶本身已超額（pre-existing），本次不碰。

## 四、驗證

| 項目 | 方法 | 結果 |
|---|---|---|
| 離線重放（部署前） | execution 7516 真實輸入（0600804）＋按 DB 重建嘅 0600914／06009005，舊 V47.24 vs 新 V47.25 逐位比對 | `Total_Cost`／四分類總數／調整金額全相同，只有 `Sub_Items[].Drawing_Cost` 變；新總數等於 DB 實際值（1425／850／1040）；收斂差值 360→240 |
| 費率矩陣 | 12 個 V2 檔位（嬰兒／大寶／成人 × S/P × 鎖匙扣／吊飾）＋家庭組合＋舊 SKU 透傳 | 費率全部正確；家庭組合（280）同舊 SKU（55）不變 |
| live 端到端 | 測試單 `testV2draw0919`（不帶 `Order_Confirm_Date`），execution 7539 success | `drawing_cost` 110／220／60／60（非 V2 兩件 0）；`total_cost`＝2040、`keychain_cost`＝615、`net_profit`＝3960，與預先手算一致 |
| Layer-2 紅線 | 回填前後 `md5(orders::text)` | 3 張單整行雜湊逐位一致；全表 75 張單（排除測試單）雜湊與合計（39,050／193,145）一致 |
| 其餘品項 | 145 行其他 `order_items` 雜湊、`drawing_cost` 合計 | 完全一致（8,280） |
| 5 行除 `drawing_cost` 外 | 整行雜湊（排除 `drawing_cost`／`updated_at`） | 5 行皆與改前一致 |
| drift／殘留 | `fhs_check_product_cost_drift()`；V2 非家庭 `drawing_cost=0` 行數 | 0 行；0 行 |
| KPI 影響（**更正**） | 兩個 KPI RPC 原始碼＋RPC 實跑（獨立覆核） | ⚠️ 期間歸屬用 `LEAST(confirmed_at, appointment_at)`（migration 0066），`LEAST` 忽略 NULL，未確認單以預約日入賬。測試單預約日 2026-12-31：而家唔計入，**2026-12 起會計入 $6,000 收入／$2,040 成本**，**已於 2026-09-20 經 Fat Mo 授權軟刪**（2026-12 月度 KPI 1→0 單、全年 58→57 單）。（原本寫「不計入」係我未讀謂詞下嘅錯誤結論） |

### 獨立 fresh-context 驗收（finance-auditor）

獨立 fresh-context `finance-auditor`（全新上下文，read-only，自行查 live 來源）：**兩項總結 PASS**——「Layer-2 紅線 intact」PASS、「V47.25 部署與回填正確」PASS。

| # | 項目 | 結果 |
|---|---|---|
| 1 | n8n live 代碼 vs 備份 | PASS：只有標頭、7 行註解插入、Drawing_Cost 一行變三行；U+FFFD 仍 8 個；`getDrawingRateForV2Sku`／`calcFamilyDrawing`／`getPositionCode`／`getItemCategory` 逐位不變；其餘 29 節點同連線零改動；對 24 個非家庭 V2 SKU 跑 live 費率函數對 `cost_configurations`：0 不符 |
| 2 | 5 行資料 | PASS：`drawing_cost` = qty × 費率，`base − print − chain − ship` 恆等式成立；無其他 V2 非家庭行 drawing_cost=0；5 行更新時間 12:40:20Z 晚於 n8n PUT 12:35:49Z（先部署後回填次序成立） |
| 3 | Layer-2 紅線 | PASS：3 張單欄位值同整行 md5、全表 75 張單雜湊與合計、145 行其他品項雜湊與 `drawing_cost` 合計全部與回填前記錄一致；drift 0；migration 已登記 |
| 4 | live 端到端 | PASS-with-findings：獨立重算 `total_cost=2040`、`net_profit=3960`、各分類與 item 層 drawing／waived 全部吻合；**發現「不計入 KPI」係錯（見下）** |
| 5 | repo 鏡像 | PASS：2 行變動，兩份 jsCode 一致，對 live 只差已知 2 行註解（live 有 U+FFFD） |
| 6 | 文件 sweep | PASS-with-findings：**發現 Finance Bible／Field Map 漏改**（見下） |
| 7 | migration 檔 vs 已套用 | PASS：檔案 md5 同 `schema_migrations.statements` 逐位相同；空庫重放更新 0 行並通過守衛（冪等） |

**覆核揪出並已處理**：
1. **中**：我寫嘅「測試單不計入 KPI」係事實錯誤（五處文字：System_Logic §5.4.23、decisions D80、Changelog、本記錄兩處）——已全部更正為「現時不計入、2026-12 起計入」；測試單清理原屬核准範圍外嘅生產寫入，其後 2026-09-20 經 Fat Mo 授權軟刪，已執行並驗證。
2. **低—中**：`FHS_Finance_Bible.md`（L1）與 `Quadruple_Sync_Field_Map.md` 仍標 V47.22／V47.24 為現行，且 order_items 表欠四分量寫入方 → 已補；`FHS_System_Logic_Overview.md` 217 行 `chain_cost`「前端傳入」措辭（吊飾自 V47.20 起 n8n 自算，pre-existing 錯）一併更正。
3. **低**：測試 payload 嘅鎖匙扣 `Printing_Cost` 用咗舊值 95（live 設定 115），令兩行測試單 `base−print−chain−ship` 恆等式唔成立，並解釋 `convergence_note` 差額 300 中嘅 60；純測試資料，非缺陷。
4. **低**：D80 原本附喺 `decisions.md` 檔尾並用 `###` 格式，同 D70–D78「頂部、`[日期] (Dnn)`」慣例唔一致 → 已搬到頂部改用慣例格式。
5. **資訊**：`saveMode2Items` 唔送 `drawing_cost`，RPC 以 COALESCE 保留舊值，回填不會被覆蓋。

**覆核冇驗證嘅**：execution 7516（API 已 404，只見我嘅 scratchpad 副本）；`wf_before.json` 來源（只連到備份 jsCode）；冇重跑離線新舊重放；Telegram 有冇真實送達；Airtable 側；本記錄除 KPI 行外其餘內容。

## 五、已知限制 / 後續

- **Dashboard 舊語義未改（Fat Mo 未裁決；2026-09-20 finance-auditor 核實後更正早前評估）**：V42 `calculatePricing()` 成本估算（`_totalCostNew`＝畫圖＋打印＋頸鏈＋環扣−運費扣減）仍沿用 S55 舊畫圖語義（生產 HTML，另案）。V2 品項而家由 n8n 決定 `Drawing_Cost`，入帳／KPI 無影響。
  - **性質（有裁決）**：Fat Mo 2026-06-03 裁決該輸出＝「供操作者參考嘅預算估算，非確收數字」，n8n 擁有成本（`decisions.md:2598-2631`、AGENTS.md:86、Finance Bible §一）；2026-07-21 Fat Mo 將該數字 UI 隱藏（commit `aa12f5e`：`#drawingCost` `display:none`，成本／利潤顯示改由「核對訂單」負責，裁決原文「for quoting only … owned by the Audit Ledger」）。
  - **命名確實誤導過（2026-09-20 第二次 `finance-auditor` 覆核揪出，更正我早前講法）**：隱藏前嗰個徽章嘅文字係「**畫圖成本: $X**」（V42.html:5969），但寫入佢嘅值係 `_systemTotalCost`＝**全成本估算**（畫圖＋打印＋頸鏈＋環扣−運費扣減，V42.html:9989）——名實不符，由 2026-06-03（commit `9c4292c`）到 2026-07-21（`aa12f5e`）存在約 7 星期。我早前答「冇呢個介面標籤」係將「而家隱藏咗」講成「從來唔存在」，掩蓋咗真正嘅命名問題。同日 commit `7fea544` 亦刪走咗全系統唯一一句向操作員解釋兩套計算嘅 UI 文字（「成本估算已含打印/環扣/運費（後台記帳由 n8n 負責）」），今日 UI 零解釋。
  - **消費者**：只有 n8n `Profit Auditor` V45.8（只喺收款低於呢個估算先 Telegram 警報；62 張單中 29 張估算為 0 而跳過，冇一張收款低於 n8n 成本，最低售價／成本比 2.34，從未觸發；V45.8 由 AI 於 2026-03-27 實作，冇 Fat Mo 裁決紀錄）＋ `raw_form_state.__System_Total_Cost`（冇人讀，Field Map:275 標明「參考用，非寫入來源」）。⚠️ **但「前端成本估算＝純參考、零 DB 足跡」係錯嘅框架（2026-09-20 更正）**：訂單層 `System_Total_Cost` 的確只餵 Profit Auditor，但**品項層四分量**（`Drawing_Cost`／`Printing_Cost`／`Chain_Cost`／`Shipping_Cost`）由前端 `calculatePricing()` 計出、經 n8n 透傳，**真實寫入 `order_items` 對應欄位**（live：printing 58 行、shipping 58 行、chain 59 行、drawing 71 行非零）。其中 chain 自 V47.20、V2 drawing 自 V47.25 已由 n8n 收回自算，printing／shipping 仍係前端值。
  - **3 張 V2 實單差距拆解**（估算 vs n8n 成本；已用前端公式逐位重現估算）：0600804：995 vs 1,425（差 430＝P_MAIN 210＋燈飾 30＋S55 舊畫圖 120＋V2 SKU 內含基本運費 70）；06009005：650 vs 1,040（差 390＝210＋畫圖 60＋運費 120）；0600914：440 vs 850（差 410＝210＋畫圖 120＋運費 80）；無未解釋餘額。有紀錄嘅只有 P_MAIN $210（TD-P-chargedPositions）；燈飾 $30 冇紀錄；V2 基本運費係**新漂移、非設計**（2026-07-21 移除面板運費項後，V2 SKU 自 07-24 起將運費計入單價）。
  - **單純移除 S55 預填唔會令估算對齊**：面板畫圖按 rate×qty 逐行計、冇同部位豁免，會變 120／360／240，對 n8n 淨額 120／60／120。
  - **「前端同 n8n 分開計」係有裁決、有理由記錄嘅**（2026-09-20 二次更正：我早前寫「沒有任何裁決要求改或不改」係錯）：
    - 2026-03-22（`Changelog.md:7006`，V35.0 Beta）起前端 `System_Total_Cost` 曾經係**利潤結算主要基準**；2026-06-02（commit `aae874a`，S53）更明文「`calculatePricing()` 確立為唯一成本計算權威」。
    - **2026-06-03（S57，`decisions.md:1787-1796`）權威翻轉**：Finance Bible §一職責分工確立「成本側由 n8n 計算（非前端傳入）」，「n8n 信任前端成本」被判違反 Rule 3.16；前端 TRANSITION 標示由橘字警告改中性灰色估算提示。
    - **2026-06-05（S60，`decisions.md:1777-1785`）裁決前端繼續計並透傳品項層四分量**，明文理由：**「n8n 拿不到部位級資料，無法重算 drawing 豁免邏輯（最高頻財務雷）」**。呢條就係「刻意分開」嘅裁決同理由。
    - **「較易維護」查唔到任何記錄**（全 repo grep 易維護／方便維護／maintainab 零命中，唯一中文命中講 n8n workflow 結構，與此無關）；「離線」亦查唔到（`calculatePricing()` 反而要等 Supabase `cost_configurations` 載入，V42.html:9590-9594）。
    - 未有裁決嘅只係**計算邏輯本身**（S55 舊畫圖語義要唔要修）——S125 只裁決 DB 四欄，Phase 2「成本組裝單一真源重構」範圍係 `cost_configurations`／`products`／n8n，並非面板。呢點仍然係 AI 評估、Fat Mo 未裁決。
    - ⚠️ **S60 嘅技術前提今日已部分失效**：n8n 自 V47.22 起靠 `position_code` 拎到部位資料，V47.25 起 V2 品項畫圖費已由 n8n 自算、忽略前端值（§5.4.23）。即當初「非前端計唔可」嘅理由唔再完全成立。
  - **真正嘅缺口（回答「係咪根本冇記錄」）**：**有記錄，但散落 5 份文件＋ git commit message，冇單一入口、冇 WHY 層**。Finance Bible（L1）全檔零次提及 `calculatePricing()`；`finance-gatekeeper` §一路由表原 27 行無一行指向前端成本估算（2026-09-20 已補一行，v1.18.0）；`knowledge-map.md` 零命中；`Quadruple_Sync_Field_Map.md` 完全冇收錄 top-level `System_Total_Cost` payload 欄位同 Profit Auditor 消費鏈；UI 顯示狀態史只存喺 commit message（`aa12f5e`／`7fea544`）。
  - **審計順帶揭發嘅舊文件漂移（未修，另案）**：decisions.md B1 記錄稱「n8n 完全不讀 System_Total_Cost」（與 live Profit Auditor 矛盾）；Field Map:246 Profit Auditor 描述過時；System_Logic §5.4.6 與 V42.html:15451-15455 註解稱運費不入 `item_base_cost`（V2 行不成立）；Pricing Bible §8:285「不存 DB」過時；P1 W3（面板計入立體擺設／燈飾）獲批但從未實作亦冇放棄紀錄；**2026-09-20 二次覆核新揪出**：`FHS_System_Logic_Overview.md:59` `_systemTotalCost` 公式仍含「+ BaseShipping」（該加項已於 2026-07-21 commit `3845879` 移除），同檔檔頭／§一／§二仍標「V41 Dashboard」「V47.16」（實為 V42／V47.25）。
- **測試單副作用（已核實）**：`testV2draw0919`（待確認、未確認、預約日 2026-12-31）原會於 2026-12 起被 KPI RPC 計入（見上表），**已於 2026-09-20 經 Fat Mo 授權軟刪**（只設 `deleted_at`；該單其餘欄位、其他 75 張單同該單 6 行品項雜湊逐位不變；2026-12 月度 KPI 1→0 單、全年 58→57 單）。execution 7539 實際跑咗 16 個節點：Airtable 節點（`Create Main Order`／`Create Sub Items`）冇跑，即冇 Airtable 測試記錄；唯一對外副作用係 `Send Profit Report`（Telegram）發出一則該測試單嘅利潤報告，同以往 `test*` 測試單一樣。
- **0600106（已處理；2026-09-20；並非缺陷）**：真單 0600106（$6,580，訂金已收全數，冇 `confirmed_at`、預約 2026-05-20）以預約日計入 2026-05 月度 KPI（7 單 vs 只計已確認 6 單）。**呢個係 2026-07-23 D43續三（migration 0066）Fat Mo 提出並核准、驗證時已明列（「+0600106 未確認但有約定日期」）嘅設計結果，唔係副作用**；本記錄較早版本寫「同 07-17 裁決唔一致、待 Fat Mo 決定」係我未讀 decisions.md 就下嘅錯誤判斷，07-17 裁決只係被 07-23 裁決取代。Fat Mo 確認係真單後，只補設 `confirmed_at=2026-05-22`（該單建立日；`confirmed_at` 係 date 型別，Dashboard 只喺新建單時寫入＝入單日，同「待確認」狀態無關——Fat Mo 2026-09-20 澄清：「待確認」＝日期、刻字內容等訂單細節仍待確認，同財務無關，訂金／全付一律已實收；另有 53 張有確認日期嘅單亦係待確認）。驗證：該單其餘欄位（含 Layer-2 成本 1190／淨利 5390）、其他 75 張單同其 3 行品項雜湊逐位不變；2026-05／2026-09 月度同 2026 全年 KPI 逐數不變（`LEAST(05-22, 預約日 05-20)` 仍屬 5 月）。
- **歷史 `convergence_note` 文字不變**：三張已回填單嘅舊備註文字要待下次重新同步先會更新；純審計文字，`amount=0`。
- **`fhs_simulate_new_cost_model()`**：會把新補回嘅 3 行（qty>1 且 `drawing_cost>0`）計入其「已知 qty 相乘 bug 污染」診斷計數，純標籤，唯讀診斷函數，無財務影響。
- **其餘過時位置（本次不動，另案）**：V42.html:15421-15424 註解（「n8n 無獨立寫 drawing_cost」，生產 HTML）；兩份 `finance-auditor.md`（repo v2.2.1／用戶層 v2.3.0，pre-existing 漂移 36 行）仍有「Task A 完成前不寫入實值」等過時描述，用戶層檔案在 repo 外；`FHS_Product_Cost_Schema_v2.md` 標題／status 仍寫 v2.3.0（pre-existing）。
- **`check_registry.json` 0600804 例外**：已由主線並行 session（0600804 違規單追查，2026-09-19）移除；live `net_profit 4215 = 5640 − 1425` 通過 C2，與本次改動無關。2026-09-20 merge 主線時核實。

## 六、文件同步 grep sweep（§三B 第 4 步）

兄弟欄位：`drawing_cost`／`printing_cost`／`chain_cost`／`shipping_cost`／「四分量」／「前端傳入」／「前端透傳」。清單：`FHS_Finance_Bible.md`（L1）、`FHS_Product_Definition.md`、`FHS_Product_Cost_Schema_v2.md`、`FHS_Pricing_Bible.md`、`n8n/Quadruple_Sync_Field_Map.md`、`finance-gatekeeper/SKILL.md`、`FHS_System_Logic_Overview.md`、`docs/`。
- Product_Definition／Pricing Bible：0 命中或只有 config key，不需改。
- **Finance Bible（L1）／Field Map（初版 sweep 漏改，獨立覆核揪出）**：仍標 V47.22／V47.24 為現行，order_items 表冇 drawing／printing／chain／shipping_cost 寫入方 → 已補（Finance Bible v1.4.3、Field Map v2.1.2）。漏改原因：初版 sweep 只 grep 欄位名，冇 grep「現行 V47.xx」版本標籤同「表內欠行」。
- Cost Schema v2：§10.3 規則本身不變；§10.4 實作行、標頭版本、references 已更新。
- System_Logic_Overview：4 處措辭（四分量說明、`drawing_cost` 欄位表、`chain_cost` 欄位表（覆核後補，pre-existing 錯）、Phase 2 已知瑕疵註記）＋新增 §5.4.23 已更新。
- finance-gatekeeper：路由表 +1 行、§三B V2 方程式補品項層語義、版本 1.15.0→1.16.0。
- 大型跨文件改動（≥3 份權威文件）→ 另派 fresh-context subagent 覆核同一清單（結果見上）。

## 七、後效同步稽核

- **[A] 結構變動**：新增 `supabase/migrations/0094_…sql`、`.fhs/notes/aireports/n8n-mcp-backups/2026-09-19/…`、本完成記錄 → 已更新 `docs/repo-map.md`（+0094）。`supabase/README.md` 只列 0001 作範例（頁首已聲明目錄段過時、以實際目錄為準），無逐檔清單，不需更新。
- **[B] 制度層變動**：`finance-gatekeeper` 路由表、`docs/repo-map.md` → 本完成記錄。
- **[C] CHANGELOG**：n8n 財務邏輯行為變更 → 已更新 `Changelog.md`。
- **[G] 運算邏輯變動**：n8n Calculate 節點代碼＋ migration 觸及財務欄位 → 已更新 `FHS_System_Logic_Overview.md` §5.4.23；`finance-gatekeeper` 路由表已加行。
- **[F] FHS_Prompts.md**：不觸發——冇新 Rule／指令增刪／L2 文件增刪，亦非財務術語或產品身份定義變更，僅實作記錄同步。

【交付前雙紀律自檢】
驗收：財務／n8n → `finance-auditor`（fresh-context，獨立 live）PASS：n8n 代碼 diff／5 行資料／Layer-2 紅線（3 張單整行 md5＋全表 75 張單雜湊逐位一致）／execution 7539 端到端／migration 檔 md5 與已套用版本一致；另揪出 2 項（KPI 事實錯誤、sweep 漏改）已處理。訂單號：0600804／06009005／0600914／testV2draw0919。
Subagent：✅ `finance-auditor` ×2（前期獨立 live 驗證；後期 fresh-context 覆核）。前置評估：財務改動必派 finance-auditor（AGENTS.md）；≥3 份權威文件改動須派 fresh-context 覆核（gatekeeper §三B 第 4 步）。

## 八、影響檔案

n8n live 節點（V47.24→V47.25）＋ `n8n/FHS_Core_OrderProcessor_live.json`；`supabase/migrations/0094_backfill_v2_item_drawing_cost.sql`；`.fhs/notes/aireports/n8n-mcp-backups/2026-09-19/6Ljih0hSKr9RpYNm/Calculate_Profit___Pack_Items.json`；`.fhs/ai/FHS_Product_Cost_Schema_v2.md`；`.fhs/ai/skills/finance-gatekeeper/SKILL.md`；`.fhs/notes/FHS_System_Logic_Overview.md`；`.fhs/notes/decisions.md`；`Changelog.md`；`docs/repo-map.md`；`.fhs/ai/FHS_Finance_Bible.md`、`n8n/Quadruple_Sync_Field_Map.md`；`.fhs/memory/learnings/finance.md`、`n8n.md`、`supabase.md`；`.fhs/memory/handoff.md`；本完成記錄。
