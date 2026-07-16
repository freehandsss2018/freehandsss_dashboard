# n8n 殭屍 Workflow 清理存檔（2026-07-16，S177 續）

> 來源：`/team` R4 後續巡查發現 25 條停用 workflow 中 22 條判定殭屍並清理；3 條保留（見底部）。
> 決策脈絡：非架構決策，不編 D 號，同 S177 先例一致；純例行技術債清理。
> 執行前已用四項事實查核（活躍 workflow Execute Workflow 依賴掃描／Repo 代碼引用掃描／執行紀錄查詢／保留名單覆核）確認零依賴，經 `/grilling` 六輪拷問定案。

## 垃圾件（4 條，測試殘留）

| 名稱 | 舊 ID | 最後更新 | 備份檔 |
|---|---|---|---|
| My workflow 2 | `kmqMfUQ84n8mY2qV_1pM_` | 2026-02-10 | `kmqMfUQ84n8mY2qV_1pM___My workflow 2.json` |
| Qqq | `fzENjzdGYwu35aKZ` | 2026-03-09 | `fzENjzdGYwu35aKZ__Qqq.json` |
| My workflow | `KH44LSfD-kaDaP6T5Y_1Y` | 2026-03-09 | `KH44LSfD-kaDaP6T5Y_1Y__My workflow.json` |
| TEMP_DELETEME_Cleanup_OrderItems_Done | `zbZSLzBZMxnjHWeN` | 2026-03-25 | `zbZSLzBZMxnjHWeN__TEMP_DELETEME_Cleanup_OrderItems_Done.json` |

## OrderProcessor 演化前身（6 條）

現行主線＝`FHS_Core_OrderProcessor`（id `6Ljih0hSKr9RpYNm`，唯一活躍）。以下 6 條為開發過程留低嘅版本迭代殘留，非分支功能：

| 名稱 | 舊 ID | 最後更新 | 備份檔 |
|---|---|---|---|
| FHS_Core_OrderProcessor（同名前身） | `ZWunNfw9OBBPSkO4` | 2026-03-22 | `ZWunNfw9OBBPSkO4__FHS_Core_OrderProcessor.json` |
| FHS_Core_OrderProcessor1 | `U7kkzoetrPD5cINr` | 2026-03-21 | `U7kkzoetrPD5cINr__FHS_Core_OrderProcessor1.json` |
| FHS_Core_OrderProcessor2 | `wekGCZgDUmMpim1p` | 2026-03-21 | `wekGCZgDUmMpim1p__FHS_Core_OrderProcessor2.json` |
| FHS_Core_OrderProcessor3 | `qXrEq1PYWvDQjtt5` | 2026-03-21 | `qXrEq1PYWvDQjtt5__FHS_Core_OrderProcessor3.json` |
| FHS_Core_OrderProcessor V4 | `2gWUCNBoC6TpTppp` | 2026-03-22 | `2gWUCNBoC6TpTppp__FHS_Core_OrderProcessor V4.json` |
| FHS_Core_OrderProcessor(Error) | `PLAOaoFbpV9DFrKE` | 2026-03-24 | `PLAOaoFbpV9DFrKE__FHS_Core_OrderProcessor(Error).json` |

## V22/V25 世代舊管線（12 條）

| 名稱 | 舊 ID | 最後更新 | 繼承者推斷 | 備份檔 |
|---|---|---|---|---|
| FHS_System_CacheSync | `Y8gNyxKiNIvEjsdL` | 2026-03-11 | 無明確現行繼承者 | `Y8gNyxKiNIvEjsdL__FHS_System_CacheSync.json` |
| FHS_System_Diagnostic_V2 | `5pw6EJO8Jo2KpmTS` | 2026-03-11 | 無明確現行繼承者 | `5pw6EJO8Jo2KpmTS__FHS_System_Diagnostic_V2.json` |
| freehandsss | `R5YbC0UHAkpU0zBKm9tZw` | 2026-03-21 | 推測→FHS_Core_OrderProcessor 整合前身 | `R5YbC0UHAkpU0zBKm9tZw__freehandsss.json` |
| freehandsss-IG | `iENE5STmHCw3jmEj` | 2026-03-21 | 推測→IG watchdog 系列整合前身 | `iENE5STmHCw3jmEj__freehandsss-IG.json` |
| freehandsss-Stage2-AI-Batch | `Q1iR3tKsWiadmaTp` | 2026-03-21 | 無明確現行繼承者 | `Q1iR3tKsWiadmaTp__freehandsss-Stage2-AI-Batch.json` |
| Dashboard_V22_Core_Sync | `BDL6KPiL5FlJtJsJ` | 2026-03-21 | 推測→FHS_Core_OrderProcessor 整合前身 | `BDL6KPiL5FlJtJsJ__Dashboard_V22_Core_Sync.json` |
| Fetch_V25_Order（讀取舊單） | `xad2hBCcKoEhHSRY` | 2026-03-21 | **已確認**→FHS_Query_OrderHistory（原始碼殘留 id 證實） | `xad2hBCcKoEhHSRY__Fetch_V25_Order (____).json` |
| FHS_Order_Processor | `gYiFsE3J4JmCCKiA` | 2026-03-21 | 推測→FHS_Core_OrderProcessor 整合前身 | `gYiFsE3J4JmCCKiA__FHS_Order_Processor.json` |
| Update_Order_Meta | `rh3f8EFxEjAO2rNn` | 2026-03-21 | 推測→FHS_Action_MetadataUpdate 整合前身 | `rh3f8EFxEjAO2rNn__Update_Order_Meta.json` |
| Fetch_Global_Review | `V74xrl6cZYZURJXl` | 2026-03-21 | 推測→FHS_Query_GlobalReview（名稱相近，未經原始碼證實） | `V74xrl6cZYZURJXl__Fetch_Global_Review.json` |
| FHS_Action_MetadataUpdate1 | `uUh5GD0BN54uLNkZ` | 2026-03-21 | 推測→FHS_Action_MetadataUpdate（"1"後綴命名規律相符） | `uUh5GD0BN54uLNkZ__FHS_Action_MetadataUpdate1.json` |
| FHS_Error_Monitor | `psg4Itj9ya3MGll9` | 2026-03-21 | **已確認**→FHS_System_ErrorMonitor（原始碼殘留 id 證實） | `psg4Itj9ya3MGll9__FHS_Error_Monitor.json` |

## 保留（非殭屍，不刪）

| 名稱 | ID | 保留原因 |
|---|---|---|
| FHS_Deploy_Webhook | `kOhA1so8VNU0l4TD` | 2026-05 最後更新，疑同 `/upload-web` 部署鏈有關 |
| 3brain API Probe (P10 test) | `iTKmxBapcoJXSGLh` | 2026-07-03，近期測試件 |
| FHS AI 開發團隊（A2 Gemini→A3 Claude→A1 ChatGPT） | `cztGsFXZYtvBUDA6` | AGENTS.md §1.2 明文休眠藍圖，刻意保留停用（非殭屍） |

## 依賴查核方法紀錄

1. **活躍 workflow 依賴掃描**：10 條活躍 workflow 全定義掃描，零 Execute Workflow 子呼叫節點；`freehandsss` ID 出現在所有回應純屬 n8n 帳號 metadata `firstSuccessfulWorkflowId`，非真依賴。
2. **Repo 代碼引用掃描**：22 個 ID 全 repo grep，命中僅 `artifacts/agent_dashboardV42.html`（生成物快照）+ `n8n/FHS_Query_OrderHistory.json`／`n8n/FHS_System_ErrorMonitor.json`（現行活躍件殘留嘅前身 id 欄位，非依賴）。
3. **執行紀錄查詢**：22 條全部「從無執行紀錄」。
4. **/grilling 六輪拷問**：備份落 git（Q1）／先備份晒先刪（Q2）／任何備份失敗即全停零刪除（Q3）／一次過做完唔再停低問（Q4）／三重驗證（Q5）／記錄前身推斷（Q6）。
