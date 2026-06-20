# n8n Google Drive 節點 Search 查詢機制精確化（F1-F7，IG 看門狗 v2 重建）

## 背景
Session 110（v1）假設 Google Drive Trigger 監測 root 可偵測新檔，且匯出是 ZIP。Fat Mo
要求先系統性查清 Meta DYI 運作再重估，逼著用 probe-then-delete 方法把 n8n Google Drive
節點的 Search 查詢機制測清楚，而非憑記憶/文件假設參數形狀。

## 新發現（F1-F7，皆透過臨時 webhook probe workflow 逐項實測，測完即刪，零殘留）

| # | 發現 |
|---|------|
| F1 | 要做「原始 Drive `q` 查詢」必須 `searchMethod:'query'` + `queryString`。`filter.query` 會被**靜默忽略**（變成無過濾全列，又一靜默失敗實例）；`searchMethod:'name'` 會把字串套進 `name contains '...'` 範本，造成雙重引號 400 |
| F2 | `mimeType='application/json'` 可乾淨排除 photos/videos，媒體零下載（OOM 防護） |
| F3 | `options.fields` 須傳**陣列**（如 `['id','name','parents','modifiedTime']`），傳字串在 `prepareQueryString` 階段直接 throw `fields.join is not a function` |
| F4 | **footgun**：把「無 parent 限定的全域 flat query」接在多輸入節點下游，n8n 會「每輸入項執行一次」造成 N 倍重複——曾誤判為 Drive API bug（1024=32×32 太巧合），重新用單項觸發 vs 多項觸發兩種拓樸對照測試後，證實是**執行拓樸問題，非節點缺陷** |
| F5 | scoped 查詢（`'parentId' in parents`）完全乾淨、零重複、直接拿到資料夾名稱 |
| F6 | 同一容器資料夾下會累積多個 `instagram-*` 子資料夾（每日一個），thread 名稱跨子資料夾重複出現——已處理追蹤必須用**資料夾 id** 而非名稱 |
| F7 | **pairedItem 在 Drive Search 的 fan-out 後可靠**：用 `$('NodeName').item.json.xxx` 可正確配對回原始觸發項目，即使下游節點對每個上游 parent 各自 fan-out 出多個子項目。已用兩個不同 parent 各自的子項目實測驗證標籤不串線 |

## 結論 / 怎麼用這個教訓

- **參數形狀絕不可憑記憶或訓練知識假設**，必須 probe 驗證——`filter.query` 看起來最直覺，
  但實際被忽略；`searchMethod:'query'` 反而是正確答案，這違反直覺命名。任何 n8n 節點的
  「進階查詢」類參數，先建 disposable webhook probe 測過再寫進生產 workflow。
- **F4 是本次最容易誤判的陷阱**：拿到一個異常數字（1024 = 32×32）時，第一反應是「API/節點
  有 bug」，但先換一種拓樸（單項 vs 多項觸發）對照測試，往往會發現是自己的執行圖設計問題。
  即使最終要記一條「bug」，也要先用最小可複現案例排除自己的拓樸錯誤。
- **F7 解開了「多層 scoped 查詢會不會丟 context」的疑慮**：不需要額外 Merge/Set 節點補救，
  可以放心用 `$('上游節點').item` 串接任意深度的 scoped Drive Search 鏈，這讓「以每日匯出
  資料夾為工作單元逐層下探」這種架構在 n8n 上可行，不必依賴全域 flat query（F4 footgun）。

## 相關
- [[2026-06-19_n8n-nas-code-node-buffer-compression-capabilities]]（同一輪 IG 看門狗重建工程的前篇教訓，本篇聚焦 Drive 節點而非 Code 節點）
- Session 111 完整變更見 `Changelog.md` 2026-06-20 條目，完整實測記錄見 `artifacts/2026-06-20-0112/cl-final-plan.md`
