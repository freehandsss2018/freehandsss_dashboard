## [v1.2.1] - 2026-03-30
### 🛡️ 憲法層：文件同步強制律 (Mandatory Doc Sync Policy)
- **AGENTS.md**: 新增「文件同步強制律」，強制要求任何檔案變動必須同步更新 `repo-map.md` 與對應的 `README.md`。此為 Atomic Update 之核心要求。

## [V36.2.2] - 2026-03-28
### ✨ 財務結算與報價明細深度優化 (Finance & Quote Refinement)
- **財務介面**: 在「產品尾數 ($)」輸入框實作動態 Placeholder。隨「建議總價」、「訂金」與「附加費」即時連動，提供 Ling Au 快速參考。
- **報價精細化**: 報價引擎現能自動解析具體部位（如 🖐️ 左手、🦶 右腳），解決過往僅顯示「鎖匙扣」導致核對困難的問題。
- **計算邏輯**: 修正報價尾數計算式，完整併入「附加費 (Additional Fee)」，確保財務結算的視覺真理。

## [V36.2] - 2026-03-28
### ✨ 全域核對中心財務透明化 (Financial Transparency in Review Center)
- **新功能**: 在全域核對中心表格中新增「💰 成本」與「🏆 利潤」欄位，供 Fat mo 直接查閱每位客人的財務貢獻。
- **UI 優化**: 實現利潤動態著色（綠色代表獲利，紅色代表損益臨界），並調整表格佈局以相容新欄位。
- **數據準確性**: 欄位直接對接 Airtable `Total_Cost` 與 `Net_Profit` 實時算分結果。

## [V36.1] - 2026-03-28
### ✨ 系統同步與審計修復 (System Sync & Audit Fix)
- **GitHub 同步**: 提交並推送本地最新狀態至 `main` 分支，確保 Perplexity (`/px audit`) 能抓取到最新的系統邏輯。
- **存取驗證**: 通過瀏覽器確認 GitHub 儲存庫為 Public 狀態且 `CLAUDE_SESSION_INIT.md` 可正常抓取。
- **安全性**: 確認 `.env` 與敏感設定已妥善過濾，未上傳至 GitHub。

## [V45.7.5] - 2026-03-28
### 🔧 Dashboard TDZ Bug + Telegram 標題修復
- **Bug 1 — TDZ 空陣列**：`syncToAirtable()` 中 `const currentOrderId` 宣告在 try-catch block 之後，但 try 內部已使用。JavaScript TDZ 導致 `ReferenceError` 被 catch 靜默吞掉，`orderItemsArray` 永遠為空。
  - **修復**：將 `const currentOrderId = ...` 移至 try 之前。同步修復 V35、V31、current.html。
- **Bug 2 — Telegram 標題永遠顯示「新訂單」**：`Pack Telegram Data` 節點讀 `calc.Action`，但 `Calculate Profit` 從未傳遞 `action` 欄位，fallback 永遠為 `'create'`。
  - **修復**：`Pack Telegram Data` 改為直接從 `Receive Dashboard Order` webhook body 讀取 `action` 和 `Update_Note`。
  - **部署**：透過 n8n API PUT 更新生產工作流。
- **驗證**：
  - 新建訂單 #2004：17 節點全通過，Profit=$2,845，Telegram ✅
  - 修改訂單 #2011：Action=edit，標題「修正訂單 成功」✅，Update_Note ✅，無假警報 ✅

## [V45.7.4] - 2026-03-26
### 🧬 靈魂重啟與三端真理地圖同步 (Soul Restoration & Triple-Sync Blueprint)
- **n8n 生產環境物理恢復**：
    - **外科手術式 SQLite 更新**：通過 SSH 工具進入 Synology NAS，手動更新 `workflow_entity` 將 `activeVersionId` 強制同步至 24 節點的 Gold Master 版本。
    - **解決「靈魂丟失」問題**：根治了因手動導入 JSON 導致工作流降級為 23 節點、Telegram 報戰失效的重大系統斷層。
- **SKU 正規化與成本修復**：
    - **標準化地圖實裝**：於 `Parse Items` 節點新增正規化層，自動處理「3肢->4肢」及「版本款式」變體，確保 100% 命中 Airtable 成本資料庫。
    - **財務稽核格式修正**：修正 `Profit Auditor` 回傳格式為 `[{json: ...}]`，徹底消滅每筆訂單均觸發🚨 財務異常警報的 Bug。
- **地圖化記錄**：建立 `Triple_Sync_Field_Map.md`，將 Dashboard、n8n、Airtable 三端欄位映射永久記錄於代碼庫，防範未來的數據斷鏈。

## [V35.4.1] - 2026-03-24
### ✨ 核對中心 UI 強化與 n8n 「四層洋蔥」終極穩定化
- **核對中心 (Review Center)**：
    - **快速刪除按鈕**：在表格每一行新增 🗑️ 刪除按鈕，解決 V35.4 只有 ID 連結但缺少直接操作入點的問題。
    - **Modal 邏輯修正**：優化 `openDeleteModal` 與 `executeDeleteOrder`，確保正確傳遞 `Order_ID` 以供 Telegram 戰報精確顯示。
- **n8n 核心處理引擎 (V45.7.1)**：
    - **四層洋蔥錯誤 (Four-Layer Onion) 徹底清零**：
        1. **IF 節點代換**：棄用具引擎 Bug 的 `IF Node (v2.3)`，切換至穩定的 `Switch Node (v1)`。
        2. **代碼還原**：從 V4 備份完整還原 7 個因環境編碼問題損毀的 Code 節點。
        3. **緩存韌性**：修復 `products.json` 遺失報錯，開啟 `continueOnFail` 確保流程不因緩存 Miss 而中斷。
        4. **輸入標準化**：實裝 `normalizer-node-v47`，全自動展平 Array/Object/Body 三種 Payload 格式。
- **知識同步**：本事故深度複盤已同步至 **Notion Cloud Brain** 供未來 AI 自動避坑。

## [V35.1] - 2026-03-24
### 🚨 緊急修復：n8n Workflow 未授權重寫還原 + Delete 路徑接入
- **根因**：Antigravity 在 V35.0 Beta 期間將 FHS_Core_OrderProcessor 從 19 節點原版完整替換為 15 節點「V43.0 Ultimate」，導致 Order_Items sub-table 寫入消失、Airtable 寫入欄位錯誤（Order_ID 顯示「未獲取單號」）、Telegram 戰報斷鏈。
- **修復**：`git checkout HEAD -- n8n/FHS_Core_OrderProcessor.json` 還原至已知穩定 19 節點版。
- **Delete 路徑接入**：在原版基礎上外科手術加入 4 個節點（`Action Is Delete?` → `Search Record to Delete` → `Delete Record` → `Notify Telegram (Delete)`），接回 V34.5 的合法刪除功能，同時保留完整的 Profit Auditor / Cache / Sub-items 架構。
- **教訓**：任何 n8n workflow 修改禁止全量替換，必須在 Changelog 精確描述節點增刪。

## [V35.0] - 2026-03-24
### 🛡️ 靈魂回歸與編碼防線實裝 (SOUL Restoration & Encoding Guard)
- **100% 靈魂還原**：重新挖掘歷史會話，完整恢復 119 行 `.cursorrules` (V40.6) 與 10 個情境的 `FHS_Prompts.md` (V41.0)，找回丟失的「隧道視野防禦」與「Stitch MCP 協議」。
- **事故紀錄 (Post-Mortem)**：實裝 `.fhs/memory/lessons/` 事故分析制度，紀錄並防範 PowerShell 編碼損毀及還原不完全事件。
- **全量 UTF-8 轉型**：強制全系統核心文件（Blueprint, Bible, Prompts, Rules）採用 UTF-8 編碼，根治問號損毀問題。
- **日誌規範化**：重構 `Changelog.md`，剔除廢棄的 V43 分支，修正日期排序衝突與版本重複。

## [V35.0 (Beta)] - 2026-03-22
### 🛡️ 全端三端對齊修復 (Triple-Sync Telegram Fix)
- **前端報價優先 (Frontend Priority)**：修改 n8n `FHS_Core_OrderProcessor` 節點，全面接管前端傳遞的 `System_Total_Cost` 作為主要利潤結算基準。
- **防止隧道效應 (Tunnel Vision Guard)**：保留所有 Airtable `Raw_Form_State` 與 `Deposit` 等攸關還原舊單的核心 Payload。
- **戰報優化**：Telegram 正式顯示「結算收入」與「系統成本」，並以雙向核對機制精準顯示淨利潤。

## [V34.7] - 2026-03-21
### 🔍 系統修復：全域索引再次喚醒 (Persistent Brain Awakening)
- **路徑觸碰協定**：解決 Windows 版 Cursor Sidebar 歷史記錄失效問題，喚醒 5301 個檔案。

## [V34.5 - V34.6] - 2026-03-21
### 🗑️ 全域核對中心：強力刪除功能 (Premium Delete Order)
- **刪除引擎**：實現 `executeDeleteOrder` 與 Webhook `action: 'delete'` 對接。
- **UI/UX 震撼體驗**：實作 Glassmorphism 磨砂玻璃風格的二次確認 Modal。

## [V41.0] - 2026-03-20
### 🧠 FHS 記憶引擎 2.0 (Student Loop) 實裝
- **底層架構建立**：建立原子化記憶庫目錄 `.fhs/memory/lessons`。
- **學生迴圈協議**：於 `FHS_Prompts.md` 實裝【情境九】自動存檔機制。

## [V34.2] - 2026-03-20
### 📊 全域核對中心：取消訂單功能 (Cancel Order)
- **狀態同步**：整合「Cancel 已取消」狀態至進度選單，與 Airtable Webhook 完整對接。

## [V34.1] - 2026-03-19
### 🏁 終極審判畢業與全自動自癒 (Final Judgment & Graduation)
- **100% 盲測通關**：成功通過「四維度地獄測試 (L, M, N, O)」。
- **正式環境部署**：完成 V32 到 `Freehandsss_dashboard_current.html` 的最後一哩路同步。

## [V34.0] - 2026-03-19
### 🚀 報價導航引擎上線與資料庫脫鉤演進 (Live Quote & Payload Architecture)
- **Live Quote Engine**：前端實裝即時算價板「💰 財務結算」。
- **神經對接與 Payload (Phase 3)**：`syncToAirtable` 發射引擎全面升級。

## [V33.0] - 2026-03-19
### 🏗️ 核心架構重構：職責解耦與財務準則注入 (Core Refactoring Phase)
- **FHS_Blueprint.md (V4.6)**：將具體定價、成本數值移出藍圖，解耦商業邏輯。
- **.cursorrules 升級**：注入「最高財務準則」，強制資料源綁定至 `FHS_Product_Bible_V3.5.md`。

## [V32.1] - 2026-03-18
### 💎 CTO 數據治理：深度補全與特殊邏輯實裝 (Deep Injection Phase 2)
- **家庭連心款 S1/S2**：實裝專屬加購階梯價。
- **全域同步**：完成共 168 項核心 SKU 的數據填補。

## [V32.0] - 2026-03-18
### 💎 CTO 數據治理：核心定價系統真理注入 (Pricing Data Governance)
- **5D 真理清單實裝**：嚴格按照「對象-類別-規格-材質-數量」五維度建立基準。
- **真理來源確立**：將 Airtable `Product_Database` 確立為全系統唯一價格真理來源。

## [V40.7] - 2026-03-17
### 🧹 系統淨化與正式部署 (System Purge & Deployment)
- **正式上線**：將 `freehandsss_dashboardV31.html` 部署為 `Freehandsss_dashboard_current.html`。
- **檔案清理**：物理清除 16 個冗餘檔案。

## [V40.6] - 2026-03-17
### 🧠 FHS 智能中樞 SOUL Directive (終極完整版) 實裝
- **核心升級**：正式融合「終極完整版」SOUL 指令集，確立 7 大執行協議。
- **角色覺醒協定**：導入動態情境路由，強制於任務開始前讀取 `FHS_Prompts.md` 並宣告身分。

## [V31.3 - V31.9] - 2026-03-17
### ✨ 訊息結構與介面終極優化 (Final Message & UI Refinement)
- **快速跳轉連結**：全域核對中心的「單號」轉化為金色膠囊按鈕。
- **編輯模式修復**：修正讀取舊單時，搜尋框內容會被資料還原所覆蓋的邏輯漏洞。

## [V31.1] - 2026-03-16
### 🧪 產品線導向訊息分段引擎 (Product Line Oriented Engine)
- **詳情與須知整合**：將同一類產品的訂單詳情與專屬須知合併為一則完整訊息。

## [V40.5] - 2026-03-16
### 🛡️ 效能引擎安全重生計畫 (Smart Caching Phase)
- **高壓連擊測試**：實作 `fetch` 攔截機制，驗證 800ms 防抖打包成功率。
- **智慧緩存**：導入 `products.json` 本地緩存讀取機制。

## [V31.0] - 2026-03-16
### ✨ UI/UX 訂單介面及訊息格式優化 (Au Ling 模式升級)
- **訊息格式精準化**：將「排程資訊」更名為「客人資料」。
- **Premium 視覺**：全向導入 Glassmorphism 漸層背景。

## [V30.0] - 2026-03-15 (🏆 當前穩定基準版本)
### 🛡️ 全域核對中心防爆機制 (Anti-Explosion Mechanism)
- **前端 JS**：導入 800ms 防抖佇列（Debounce Queue）。
- **後端 n8n**：升級至「防爆快充引擎 (V3)」，減少 90% 喚醒開銷。

## [V29.2] - 2026-03-14
- 🎨 **批次填色精準化**：實施 `getBatchColor` 數字提取演算法。
- 🛡️ **行獨立渲染 (Row Isolation)**：重構 `saveInlineEdit` 縮減樣式刷新範圍。

## [V27 - V29] - 2026-03-13
- ✨ **V29 強化型產品解析引擎**：實施「三欄位橫向搜尋」解析 Record ID。
- 📊 **全域核對中心實裝**：實作 Excel 風格資料網格。

## [V25 - V26] - 2026-03-03
- **雙向系統奠基**：Dashboard 從「單向新增」升級為「雙向讀寫」。
- **Raw_Form_State**：確立透過序列化 JSON 完整記錄表單狀態的架構核心。

## [V45.7.5] - 2026-03-28 (Emergency Security Fix)
### 已更新 (Updated)
- **n8n API Key**: 完成 API Key 安全輪轉，更換為 `freehandsss_Dashboard` (JWT 版)。
- **MCP Config**: 在全域 `mcp_config.json` 中添加 `Antigravity_Smart_Hub_MCP` 的連線設定，已驗證 NAS 連通性。
- **Agent Chain**: 建立 `freehandsss-optimizer-v2` 協作協議 (Perplexity Audit -> Claude Code Implementation)。
