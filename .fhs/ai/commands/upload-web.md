# /upload-web — 上傳 Dashboard 至 NAS Web Station

**用途 (Purpose)**：將指定的 Dashboard HTML 檔上傳至 NAS Web Station 的 `/web` 共用資料夾，並自動驗證公開可達性與檔案完整性。
**版本**：v1.0.0 (2026-06-08)
**通用平台**：Claude Code (CL) · Antigravity/Gemini (AG) — 雙端通用（需本機 shell + curl；2026-06-08 Fat Mo 授權開放 AG）
**觸發**：`/upload-web` 或 `/upload-web [目標]`

---

## 前提

- 通道：WebDAV over HTTPS（`yanhei.synology.me:5006`，對應 `/web` 共用資料夾）
- 憑證來源：repo 根 `.env`（`NAS_WEBDAV_URL` / `NAS_WEBDAV_USER` / `NAS_WEBDAV_PASS`），**密碼永不回顯、`.env` 永不入庫**
- 公開端點：`https://yanhei.synology.me/<檔名>`（Web Station 將 `/web` 對映至 HTTP 根）
- 實作腳本：`scripts/upload-web.ps1`（封裝上傳 + 三關驗證）

---

## 目標代稱對照

| 輸入 | 實際檔案 |
|------|---------|
| （省略）/ `V42` | `freehandsss_dashboardV42.html`（預設，開發基線） |
| `V41` | `freehandsss_dashboardV41.html` |
| `V40` | `freehandsss_dashboardV40.html` |
| `current` | `Freehandsss_dashboard_current.html`（**生產版，需二次確認**） |
| 其他字串 | 視為 `Freehandsss_Dashboard\` 下的字面檔名 |

---

## 執行步驟

### Step 1 — 解析目標
從 `/upload-web` 後取出目標代稱（無則預設 `V42`）。

### Step 2 — 生產版守護
若目標解析為 `current.html`：**先向 Fat Mo 二次確認**（「這會把生產版推上公開 web，確定？」）。獲確認後執行時加 `-Force` 旗標；未確認不得執行。

### Step 3 — 公開暴露提醒（首次部署 dev 版時）
提醒：Web Station `/web` 為公開可瀏覽，dev 版含成本/財務邏輯。確認 Fat Mo 已知悉（沿用既有授權即可，不需每次重問）。

### Step 4 — 執行腳本
```powershell
powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 [目標] [-Force(僅 current)]
```
腳本流程：讀 `.env` 憑證 → `Test-NetConnection :5006` → `curl.exe -k -T` WebDAV PUT → 驗證三關。

### Step 5 — 輸出結果
回報 PASS/FAIL：公開網址、大小比對、SHA256。失敗時附腳本的 FAIL 原因。

---

## 驗證三關（腳本內建，不可省略）
1. 公開端點 HEAD 回 **HTTP 200**
2. 遠端 `Content-Length` == 本機檔案大小
3. 遠端下載後 **SHA256** 與本機逐位元組相同

任一關失敗 → 腳本 exit 1，視為部署失敗。

---

## 安全護欄
- `current.html` 生產版：強制二次確認 + `-Force`
- 公開暴露：dev 版含財務邏輯，提醒 Fat Mo
- 密碼：永不回顯、永不寫入 repo（僅存 gitignored `.env`）

---

## 常用範例
```
/upload-web              # 上傳 V42（預設）
/upload-web V41          # 上傳 V41
/upload-web current      # 上傳生產版（先確認，腳本帶 -Force）
```

---

## 副作用 (Side Effects)
- 是否寫檔：**否**（不改 repo 內任何檔；僅上傳副本至 NAS）
- 是否覆蓋 NAS 既有同名檔：**是**（WebDAV PUT 覆寫）
- Token 消耗：~200–500（單次腳本呼叫 + 報告）