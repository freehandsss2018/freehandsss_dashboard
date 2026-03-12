import json
import urllib.request
import urllib.error
import time
import ssl

# Disable SSL verification for self-hosted NAS
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

WEBHOOK_URL = "https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b"

def send_payload(payload, test_name):
    print(f"\n--- Running Test: {test_name} ---")
    req = urllib.request.Request(WEBHOOK_URL, method="POST")
    req.add_header('Content-Type', 'application/json; charset=utf-8')
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    try:
        response = urllib.request.urlopen(req, data=data, context=ctx)
        if response.status == 200:
            print("[SUCCESS]: Server accepted the payload.")
            print(f"Response: {response.read().decode('utf-8')}")
            return True
        else:
            print(f"[FAILED]: HTTP {response.status}")
            return False
    except urllib.error.URLError as e:
        print(f"[CONNECTION ERROR]: {e.reason}")
        return False
    except Exception as e:
        print(f"[ERROR]: {e}")
        return False

# TC-101: Massive Combinations
tc101_payload = {
    "action": "create",
    "Order_ID": "FHSW-260310-TC101",
    "Customer_Name": "Combo Test User",
    "Appointment_Date": "2026-03-31",
    "Deposit": 1000,
    "Balance": 500,
    "Additional_Fee": 100,
    "Full_Order_Text": "Massive combo test via automated script.",
    "Raw_Form_State": "{}",
    "Order_Items_List": [
        {
            "Order_Item_Key": "FHSW-260310-TC101_立體擺設_玻璃瓶套裝_4肢",
            "Quantity": 1,
            "Notes": "Mom and Dad holding hands",
            "Product_Name": "玻璃瓶套裝 (4肢)"
        },
        {
            "Order_Item_Key": "FHSW-260310-TC101_金屬鎖匙扣_嬰兒_不銹鋼",
            "Quantity": 3,
            "Notes": "Keychains x3",
            "Mode": "(加購)",
            "Product_Name": "嬰兒鎖匙扣 - 不銹鋼"
        },
        {
            "Order_Item_Key": "FHSW-260310-TC101_純銀頸鏈吊飾_嬰兒_925銀",
            "Quantity": 1,
            "Notes": "Silver chain test",
            "Mode": "(加購)",
            "Product_Name": "嬰兒吊飾 - 925銀"
        }
    ]
}

# TC-102: Edge Characters
tc102_payload = {
    "action": "create",
    "Order_ID": "FHSW-260310-TC102",
    "Customer_Name": "Fat Mo & Ling Au!!",
    "Appointment_Date": "2026-03-31",
    "Deposit": 500,
    "Balance": 0,
    "Additional_Fee": 0,
    "Full_Order_Text": "Emoji test.",
    "Raw_Form_State": "{}",
    "Order_Items_List": [
        {
            "Order_Item_Key": "FHSW-260310-TC102_純銀頸鏈吊飾_嬰兒_925銀",
            "Quantity": 1,
            "Notes": "こんにちは 안녕하세요 DROP TABLE; --",
            "Mode": "(加購)",
            "Product_Name": "嬰兒吊飾 - 925銀"
        }
    ]
}

# TC-103: Aggressive Upsert (Simulate updates)
tc103_payload_update1 = {
    "action": "update",
    "Order_ID": "FHSW-260310-TC101",
    "Customer_Name": "Combo Test User [UPDATED]",
    "Appointment_Date": "2026-03-31",
    "Deposit": 1000,
    "Balance": 1000,
    "Additional_Fee": 100,
    "Full_Order_Text": "Massive combo test via automated script. [UPDATED]",
    "Raw_Form_State": "{}",
    "Order_Items_List": [
        {
            "Order_Item_Key": "FHSW-260310-TC101_立體擺設_玻璃瓶套裝_4肢",
            "Quantity": 2, # Changed from 1 to 2
            "Notes": "Updated quantity test",
            "Product_Name": "玻璃瓶套裝 (4肢)"
        }
    ]
}

print("Initiating High-Pressure Test Battery against yanhei.synology.me:8443...")

success1 = send_payload(tc101_payload, "[TC-101] Product Matrix")
time.sleep(3) # Wait for n8n to process and write to Airtable
success2 = send_payload(tc102_payload, "[TC-102] Edge Characters")
time.sleep(3)

if success1:
    send_payload(tc103_payload_update1, "[TC-103] Aggressive Update on TC-101")
    time.sleep(3)

print("Tests fired. Please check n8n executions and Airtable to verify data integrity.")
