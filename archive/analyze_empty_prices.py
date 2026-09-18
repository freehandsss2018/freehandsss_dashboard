import json
import os

def analyze_empty_prices():
    input_file = r'C:\Users\Edwin\.gemini\antigravity\brain\2a118dc8-4589-4dab-b18c-a2f1fe5cf368\.system_generated\steps\811\output.txt'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    empty_adult = []
    empty_non_adult = []
    total_count = len(data['records'])
    
    for record in data['records']:
        fields = record.get('fields', {})
        name = fields.get('Product_Name', 'Unknown')
        target = fields.get('Target_Object', '')
        price = fields.get('Suggested_Price_Manual')
        
        if price is None:
            if '成人' in target or '大人' in target:
                empty_adult.append(name)
            else:
                empty_non_adult.append({
                    "name": name,
                    "target": target,
                    "category": fields.get('Main_Category', ''),
                    "material": fields.get('Material', ''),
                    "mode": fields.get('Mode', ''),
                    "items": fields.get('Item_Per_Set', 1)
                })

    print(f"Total SKU: {total_count}")
    print(f"Empty Adult items: {len(empty_adult)} (Expected)")
    print(f"Empty Non-Adult items: {len(empty_non_adult)} (Attention Required)")
    
    if empty_non_adult:
        print("\n--- Non-Adult Empty List ---")
        for item in empty_non_adult:
            print(f"- {item['name']} | Target: {item['target']} | Category: {item['category']}")

if __name__ == '__main__':
    analyze_empty_prices()
