import pandas as pd
import json

excel_path = r"d:\SynologyDrive\Free_handsss\freehandsss_dashboard\Free_handsssV2 (Feb) 2026.xlsx"
xl = pd.ExcelFile(excel_path)

output = {}
for sheet in xl.sheet_names:
    try:
        df = xl.parse(sheet, nrows=5)
        
        # Convert all columns to string to avoid JSON serialization issues with datetime/timestamps/NaN
        df = df.astype(str)
        
        output[sheet] = df.to_dict(orient='records')
    except Exception as e:
        output[sheet] = {"error": str(e)}

with open("d:\\SynologyDrive\\Free_handsss\\freehandsss_dashboard\\excel_dump.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Dumped excel to json")
