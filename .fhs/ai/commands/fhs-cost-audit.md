# /fhs-cost-audit（財務成本完整性稽核）

用途：掃描所有 Main_Orders，比對 Total_Cost 與 Order_Items rollup（Keychain/Handmodel/Necklace）之間的差距，偵測成本異常訂單。

觸發指令：/fhs-cost-audit
性質：純讀取稽核，不修改任何業務資料，只輸出報告。

---

## 執行步驟

1. 確認環境變數 `AIRTABLE_API_KEY` 或 `AIRTABLE_TOKEN` 已設定
2. 執行腳本：
   ```bash
   python Maintenance_Tools/audit_total_cost_integrity.py
   ```
3. 報告自動輸出至 `.fhs/notes/aireports/total_cost_audit_YYYY-MM-DD.md`
4. 若有 CRITICAL 項目，立即回報 Fat Mo，等待 `/execute` 授權修正

---

## 報告分類邏輯

| 狀態 | 條件 | 處理方式 |
|------|------|---------|
| ✅ 正常 | `deduction` 在合理範圍內（0~$200） | 無需處理 |
| ✅ 無成本訂單 | rawSum = 0 且 Total_Cost = 0 | 無需處理 |
| ⚠️ WARN | 扣減異常偏大或需人工確認 | 建議人工核查 |
| ❌ CRITICAL | Total_Cost=0 但有產品成本，或 Total_Cost 異常偏高 | 立即回報，等待修正授權 |

> **deduction** = Keychain_Cost + Handmodel_Cost + Necklace_Cost − Total_Cost
> 正數為系統跨部位扣減（正常），最大合理扣減為 (N-1)×$20（N = 鎖匙扣件數）

---

## 前置條件

- Airtable API Key 已設定
- 在專案根目錄執行（`d:\SynologyDrive\Free_handsss\freehandsss_dashboard\`）
- Python 3.8+ / uv 可用

---

## 執行規則

- 全程只讀取 Airtable，不寫入任何資料
- 若 API Key 未設定，腳本自動退出並報錯
- 報告輸出後，等待 Fat Mo 指示才處理異常訂單
