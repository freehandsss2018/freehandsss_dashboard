# FHS Handoff - 2026-04-25 15:30
當前版本：v1.4.1（憲法層）/ V40.2（UI層）

## 狀態摘要

**本次 Session 完成事項：**

1. **Financial Overview 整合入 V40（V40.2）**
   - `freehandsss_dashboardV40.html` 新增第 4 模式 `finance`
   - 模式切換：`switchMode('finance')` → 顯示 `#financeModeContainer`，隱藏 Bottom Bar
   - Top Bar：`<a>` 連結升級為 `<button id="modeFinanceBtn">`
   - CSS：全部 `fo-*` 樣式 + `.v40-finance-active` 全寬佈局整合進 `<style>` 塊
   - JS：`foInitAll()` / `foDrawLine()` / `foDrawBar()` / `foDrawPie()` 等 fo 前綴函式注入
   - Tab Bar sticky 對齊 V40 top bar（56px）

2. **Mock Data 校正為 Airtable 真實數據（2026-04-25）**
   - Current：Revenue HK$20,520 / Cost HK$9,953 / Profit HK$10,567 / 7 單
   - Monthly（4月）：HK$6,240 / HK$1,865 / HK$4,375 / 3 單
   - Yearly：累計同 Current（業務剛起步，歷史年份填 0）
   - 產品分類改為真實類別：吊飾 > 鎖匙扣 > 立體擺設

## 未解決 🔴 項目

1. **n8n workflow 尚未匯入** — Fat Mo 需手動操作：
   - n8n UI → New Workflow → Import from JSON → 選 `n8n/FHS_Financial_Overview_workflow.json`
   - 在「Fetch All Main Orders」和「Fetch All Order Items」節點設 Airtable Credential（同 FHS_Core_OrderProcessor）
   - 儲存並啟用，Webhook URL：`https://yanhei.synology.me:8443/webhook/financial-overview`

2. **iPhone 實機測試未完成** — Fat Mo 需確認：
   - 點「📈 財務」按鈕進入財務模式，KPI + 三圖表是否正常顯示
   - Tab 切換（Current/Monthly/Yearly）觸控回應
   - 返回其他模式（新增/修改/核對）無殘留

3. **Yearly tab 歷史數據稀少** — 僅有 2026 年 3–4 月真實數據，2019–2025 填 0，視覺略顯空洞。待業務數據積累後補充。

## 下個 Session 三項待辦

- [ ] Fat Mo 完成 n8n 匯入 + 實機確認後，確認財務 Dashboard 使用 live 數據正常
- [ ] 若獨立頁面 `freehandsss_financial_overview.html` 確認無用，標記 DEPRECATED 並移入 `archive/`
- [ ] 評估是否需要將 Financial Overview 連結加入 `Freehandsss_dashboard_current.html`（生產版）

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.1 |
| 穩定生產版 | `Freehandsss_dashboard_current.html`（對應 V37）|
| 主要開發版 | `freehandsss_dashboardV40.html`（**V40.2** — 含財務模式）|
| 財務模式入口 | Top Bar「📈 財務」按鈕 → `switchMode('finance')`|
| 獨立財務頁 | `freehandsss_financial_overview.html`（保留，待確認棄用）|
| n8n Workflow JSON | `n8n/FHS_Financial_Overview_workflow.json`（待匯入）|
| Webhook URL | `https://yanhei.synology.me:8443/webhook/financial-overview` |
| Airtable Base | `app9GuLsW9frN4xaT` |
| Main_Orders 表 | `tbltCH0I9fknVCtmV`（7筆，Revenue $20,520，Profit $10,567）|
| Order_Items 表 | `tbljkptnNcUEyDRFH`（154筆 records）|
