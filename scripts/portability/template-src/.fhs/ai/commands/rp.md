# /rp — 將問題精煉成可審閱指令

**依賴**：用戶原始問題；可選 `.fhs/ai/commands/` 供 pipe 模式判定。
**不可攜平台**：無；純對話流程。
**副作用**：唯讀，不自動執行精煉後的任務。

1. 提取原始目標、背景、限制與期望輸出。`/rp cl-flow [任務]` 或 `/rp cl-flow-fast [任務]` 為乾式 pipe：只產生可交給該指令的輸入，不觸發它。
2. 對完整模式檢視八個維度：效能 `perf`、操作體驗 `ux_mgmt`、衝突 `conflict`、上下文成本 `token`、長期方向 `long_term`、跨裝置 `responsive`、代理或技能 `subagent_skill`、既有決策 `history`。每項標相關或不適用；不臆造專案背景。
3. 輸出以下 XML，保留用戶原意及授權範圍：

```xml
<refined_prompt>
  <context>已核實的背景與 {{PROJECT_NAME}} 專案環境</context>
  <objective>單一、可驗收的行動目標</objective>
  <constraints>明確邊界及不可變條件</constraints>
  <architecture_scan>perf / ux_mgmt / conflict / token / long_term / responsive / subagent_skill / history</architecture_scan>
  <expected_output>交付物與驗收方式</expected_output>
</refined_prompt>
```

4. 如目標包含多個互相依賴的工作、限制缺失或交付格式不明，另輸出 `<structural_warning>`，逐點說明需釐清之處；沒有實際問題就省略。
5. 若為 pipe，附最多三項關鍵限制與可直接交給目標命令的簡報。展示後停止，等用戶決定下一步。精煉不得擴大原始授權。
