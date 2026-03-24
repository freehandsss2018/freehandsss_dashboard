
import json

def simulate_audit(order_data):
    bible = {
        "WOOD_2": 2080,
        "WOOD_4": 2380,
        "KEYCHAIN_S_ADDON": 860,
        "KEYCHAIN_P_STANDALONE": 1580,
    }
    
    reasons = []
    theoretical_price = 0
    
    # Logic 1: Wood Frame
    if order_data['hasMainProduct']:
        limbs = order_data['limbs_count']
        if limbs <= 2:
            theoretical_price += bible["WOOD_2"]
        else:
            theoretical_price += bible["WOOD_4"]
            
    # Logic 2: Keychain
    if order_data['hasKeychain']:
        # If it's an add-on (hasMainProduct is True)
        if order_data['hasMainProduct']:
            theoretical_price += bible["KEYCHAIN_S_ADDON"]
        else:
            theoretical_price += bible["KEYCHAIN_P_STANDALONE"]
            
    actual_revenue = order_data['deposit'] + order_data['balance']
    
    if actual_revenue != theoretical_price:
        reasons.append(f"金額不符！理論：${theoretical_price}，實際：${actual_revenue}")
        return False, reasons
    
    return True, []

# User Order #0695346 Simulation
order_0695346 = {
    "hasMainProduct": True,
    "limbs_count": 3, # 1 Hand, 2 Feet
    "hasKeychain": True, # Keychain Baby Left Hand (Add-on)
    "deposit": 3000,
    "balance": 240
}

passed, reasons = simulate_audit(order_0695346)
print(f"Audit Passed: {passed}")
print(f"Reasons: {reasons}")
