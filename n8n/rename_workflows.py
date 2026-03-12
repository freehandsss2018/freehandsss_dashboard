import json
import os

n8n_dir = r'd:\SynologyDrive\Free_handsss\freehandsss_dashboard\n8n'
mapping = {
    "FHS_Order_Processor.json": "FHS_Core_OrderProcessor.json",
    "FHS_Error_Monitor.json": "FHS_System_ErrorMonitor.json",
    "Fetch_Global_Review.json": "FHS_Query_GlobalReview.json",
    "Fetch_V25_Order (讀取舊單).json": "FHS_Query_OrderHistory.json",
    "Update_Order_Meta.json": "FHS_Action_MetadataUpdate.json"
}

for old_name, new_name in mapping.items():
    old_path = os.path.join(n8n_dir, old_name)
    new_path = os.path.join(n8n_dir, new_name)
    
    if os.path.exists(old_path):
        # Update internal JSON name first
        with open(old_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Strip .json from new_name for internal name
        internal_name = new_name.replace('.json', '')
        data['name'] = internal_name
        
        # Write back to old path (or temp) then rename
        with open(old_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        # Rename physical file
        if os.path.exists(new_path):
            os.remove(new_path)
        os.rename(old_path, new_path)
        print(f"Renamed {old_name} -> {new_name}")
    else:
        print(f"File not found: {old_name}")

print("n8n workflow renaming complete.")
