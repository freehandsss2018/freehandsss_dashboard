
import json

try:
    with open('d:/SynologyDrive/Free_handsss/freehandsss_dashboard/products.json', 'r', encoding='utf-8') as f:
        products = json.load(f)
except Exception as e:
    print(f"Error loading products.json: {e}")
    exit(1)

missing_prices = []
for product in products:
    fields = product.get('fields', {})
    name = fields.get('Product_Name', 'Unknown')
    price = fields.get('Total_Base_Cost')
    
    if price is None or price == "":
        missing_prices.append(name)

if missing_prices:
    print(f"Found {len(missing_prices)} products with missing prices:")
    for name in missing_prices:
        print(f"- {name}")
else:
    print("All products have a 'Total_Base_Cost'.")
