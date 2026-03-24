import urllib.request
import json
import time
import ssl

# === Freehandsss V41.11: 完整週期循環測試腳本 (對齊金額欄位) ===

WEBHOOK_URL = "https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b"
TEST_ID = "9999003" # 換一個新 ID 測試

def api_call(name, payload):
    print(f"\n[PHASE] {name}...")
    ctx = ssl._create_unverified_context()
    headers = {'Content-Type': 'application/json'}
    try:
        req = urllib.request.Request(WEBHOOK_URL, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            print(f"   [OK] Status: {resp.getcode()}")
            return True
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False

def full_cycle_test():
    # 1. 正常開訂 (Create)
    api_call("1. CREATE ORDER (New)", {
        "action": "create",
        "Order_ID": TEST_ID,
        "Customer_Name": "Cycle_Tester_V4111",
        "Deposit": 500, "Balance": 1000, "Additional_Fee": 100, # 加入金額
        "Full_Order_Text": "【全週期測試 V41.11】這是一筆正常的 *新開單*",
        "Order_Items_List": [{"Product_Name": "木框套裝 (2肢)", "Quantity": 1}]
    })
    
    time.sleep(10) # 增加等待時間

    # 2. 修改訂單 (Update)
    api_call("2. UPDATE ORDER (Modify)", {
        "action": "update",
        "Order_ID": TEST_ID,
        "Customer_Name": "Cycle_Tester_V4111",
        "Deposit": 500, "Balance": 2000, "Additional_Fee": 0, # 修改金額平衡
        "Full_Order_Text": "【全週期測試 V41.11】內容已進行 *內容修改*",
        "Order_Items_List": [{"Product_Name": "金屬鎖匙扣 (不鏽鋼)", "Quantity": 2}]
    })

    time.sleep(10)

    # 3. 刪除訂單 (Delete)
    api_call("3. DELETE ORDER (Cleanup)", {
        "action": "delete",
        "Order_ID": TEST_ID
    })

if __name__ == "__main__":
    print("=== [V41.11] FHS Lifecycle Full Logic Test ===")
    full_cycle_test()
    print("\n=== Actions dispatched. Check Telegram Status Labels. ===")
