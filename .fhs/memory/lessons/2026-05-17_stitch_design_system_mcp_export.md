---
date: 2026-05-17
topic: Stitch 雲端設計系統註冊與視覺標記同步
---

## 教訓

### 1. 確保 StitchMCP 的 Markdown 上傳為純淨 UTF-8 Base64
- 為了防止 Base64 編碼異常，上傳 Markdown 文件內容前，必須確保內容不包含任何無法解析的特殊字元或非 UTF-8 字元。
- 解析出來的 `docs/DESIGN.md` 會直接驅動 Google Stitch 的視覺解析器，任何格式缺損都會導致 Token 讀取失敗。

### 2. 視覺「唯一真理來源 (SSOT)」的完整性映射
- 大地溫潤 (Earthy Warm) 的 `:root` 變數需 100% 同步於 `docs/DESIGN.md` 中。
- 為了避免未來的 AI 生成專案產生視覺漂移 (Visual Drift)，設計文件應包含：
  - 玻璃擬態與無邊框 (No-Line) 規範。
  - 行動端防縮放硬規則 (input font-size >= 16px)，防止 iOS 自動縮放破壞 Ling Au 的 Wizard 流程體驗。
  - specialized KPI 財務看板色彩（如 Revenue, Cost, Margin, Orders 等個別語意色彩），確保 Fat Mo 看板的可視性。

### 3. 設計系統建立與專案關聯步驟
- 在 Google Stitch 平台，專案的建立 (Project) 應緊密伴隨著 `UploadDesignMd` 與 `CreateDesignSystemFromDesignMd` 兩個連續調用。
- 綁定後的設計系統 ID（如 `08d31e5f626240ff8a69be7fa9816c49`）應登錄於 completion_report 及 handoff 中，使後續 subagent 在自動生成 UI 或編輯 Screen 時，能強制引用該 Asset ID 保持品牌統一性。
