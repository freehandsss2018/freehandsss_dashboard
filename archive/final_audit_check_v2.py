import json
import sys

# Ensure stdout handles UTF-8 for Windows terminal
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def final_audit():
    input_file = r'C:\Users\Edwin\.gemini\antigravity\brain\2a118dc8-4589-4dab-b18c-a2f1fe5cf368\.system_generated\steps\880\output.txt'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total = len(data['records'])
    filled_non_adult = 0
    filled_adult = 0
    empty_adult = []
    empty_others = []
    
    for record in data['records']:
        fields = record.get('fields', {})
        name = fields.get('Product_Name', 'Unknown')
        target = fields.get('Target_Object', '')
        price = fields.get('Suggested_Price_Manual')
        
        is_adult = '成人' in target or '大人' in target
        
        if price is not None:
            if is_adult:
                filled_adult += 1
            else:
                filled_non_adult += 1
        else:
            if is_adult:
                empty_adult.append(name)
            else:
                empty_others.append(name)
                
    print(f"--- FHS 數據治理最終審核報告 (UTF-8) ---")
    print(f"總計項目: {total}")
    print(f"已補全非成人項目 (正常): {filled_non_adult}")
    print(f"未補全成人項目 (依規為空): {len(empty_adult)}")
    print(f"已補全成人項目 (異常/需清理?): {filled_adult}")
    print(f"未補全非成人項目 (遺漏): {len(empty_others)}")
    
    if filled_adult > 0:
        print("\n[警告] 以下成人項目竟然有售價:")
        # List them
    
    if empty_others:
        print("\n[錯誤] 以下非成人項目仍為空值:")
        for item in empty_others:
            print(f"- {item}")
            
    if len(empty_others) == 0 and filled_adult == 0:
        print("\n✅ 數據治理 100% 達成：所有非成人項目已定價，所有成人項目已清空。")

if __name__ == '__main__':
    final_audit()
