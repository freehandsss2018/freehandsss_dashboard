import json
import os

n8n_dir = r'd:\SynologyDrive\Free_handsss\freehandsss_dashboard\n8n'
workflows = {
    "FHS_Order_Processor.json": "### 🚀 【訂單核心處理引擎】\n\n**核心用途：** 接收並處理前端 Dashboard 送出的所有新訂單與修改請求。\n\n**主要功能：**\n1. **拆解子項目：** 將合併的訂單資料拆解為個別的品項紀錄。\n2. **成本匹配：** 根據「五維度邏輯」自動從資料庫匹配畫圖、取模與物流成本。\n3. **雙向同步：** 將資料精準寫入 Airtable (主表與子表)，支援 Upsert 避免重複。\n4. **Telegram 戰報：** 自動計算淨利潤並發送至老闆的手機。",
    
    "FHS_Error_Monitor.json": "### 👁️ 【雲端之眼 - 錯誤監測系統】\n\n**核心用途：** 負責全系統的健全狀況監測。\n\n**主要功能：**\n1. **異常攔截：** 當其他工作流報錯時自動觸發。\n2. **資料彙整：** 捕捉錯誤訊息、發生時間、哪一個工作流及哪一個節點崩潰。\n3. **雲端日誌：** 將錯誤詳細資訊寫入 Airtable `Error_Logs`，避開本地 Docker 權限問題。\n4. **AI 醫療診斷：** 提供資料供智能中樞進行線上自動修復建議。",
    
    "Fetch_Global_Review.json": "### 📊 【全域核對中心 - 數據抓取引擎】\n\n**核心用途：** 支援 V27 全域核對中心的後端數據檢索。\n\n**主要功能：**\n1. **動態過濾：** 接收年度、月份、狀態、單號、姓名或批次等過濾條件。\n2. **合併查詢：** 同時檢索 `Main_Orders` 與關聯的 `Order_Items` 子項目。\n3. **格式化輸出：** 整理成 Excel 風格的 JSON 數據供給前端 Grid 顯示。",
    
    "Fetch_V25_Order (讀取舊單).json": "### 🔄 【舊單還原 - 數據讀取引擎】\n\n**核心用途：** 支援 Dashboard 的「修改舊單」功能。\n\n**主要功能：**\n1. **精準検索：** 根據 `Order_ID` 從 Airtable 抓取最原始的紀錄。\n2. **狀態還原：** 提取並回傳 `Raw_Form_State` (JSON)，讓前端能在 0.1 秒內復原當時的表單點選狀態。",
    
    "Update_Order_Meta.json": "### 📝 【全域核對 - 原地更新引擎】\n\n**核心用途：** 專用於 V27 全域核對中心的「原地修改」功能。\n\n**主要功能：**\n1. **快速更新：** 接收 Record_ID、批次編號、進度狀態與行政備註。\n2. **即時同步：** 直接更新 Airtable 主訂單，實現「邊核對邊修正」的高效管理流程。"
}

for filename, description in workflows.items():
    file_path = os.path.join(n8n_dir, filename)
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Check if a sticky note with specific content title already exists
    exists = any(node.get('type') == 'n8n-nodes-base.stickyNote' and filename in str(node.get('parameters', {}).get('content', '')) for node in data['nodes'])
    
    if not exists:
        sticky_node = {
            "parameters": {
                "content": description,
                "height": 280,
                "width": 550
            },
            "id": f"doc-{filename.replace(' ', '_')}",
            "name": "Workflow Description",
            "type": "n8n-nodes-base.stickyNote",
            "typeVersion": 1,
            "position": [-350, -350]
        }
        # Insert at the beginning of nodes
        data['nodes'].insert(0, sticky_node)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
print("All n8n workflows updated with Chinese descriptions.")
