# /upload-web — 上傳 Dashboard 至 NAS Web Station

**用途 (Purpose)**：自動偵測最新開發版，升格為 current，並上傳至 NAS Web Station `/web` 共用資料夾，三關驗證完整性。
**版本**：v1.3.0 (2026-07-12，S168，新增 /commit 條件偵測後鏈式觸發時跳過 Step 1 二次確認的例外)
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

| 輸入 | 行為 |
|------|------|
| （省略）| **升格流程**：自動偵測最新版 → cp → current → 上傳 current（見下方步驟） |
| `V43` / `V42` 等 | 只上傳該指定版本至 NAS（dev 版，**不 cp 不升格**） |
| `current` | 只上傳現有 current.html（**不 cp**，需二次確認） |
| 其他字串 | 視為 `Freehandsss_Dashboard\` 下的字面檔名 |

---

## Step 0 — 部署前置檢查（S143 新增，記憶負擔歸零機制）

**預設執行** `/fhs-check`（全系統健康檢查，`Maintenance_Tools/run_all.py`）作為部署前置：任一 Red Flag 或測試 FAIL → 停止部署，回報失敗階段，等待 Fat Mo 指示。

Fat Mo 可**明示 skip**（例如「跳過檢查直接上傳」）跳過此步——僅限小改動/緊急修復場景；skip 事件記入本次部署回報（不落獨立審計檔，口頭記錄即可）。

不與 L1 `fhs-health-check.js` 混淆：L1 是文件健康快檢（零 token，SessionStart 自動跑），`/fhs-check` 是功能/資料層壓力測試（重量級，會建立+刪除測試訂單），兩者互補不重複。

---

## 執行步驟

### 【無參數 — 升格流程（預設）】

#### Step 0 — 自動偵測最新版本
掃描 `Freehandsss_Dashboard/` 資料夾，找版本號最高的 `freehandsss_dashboardV*.html`：

**PowerShell（CL）：**
```powershell
$latest = Get-ChildItem "Freehandsss_Dashboard\freehandsss_dashboardV*.html" |
  Sort-Object { [int]($_.BaseName -replace 'freehandsss_dashboardV','') } |
  Select-Object -Last 1
```

**Bash（AG）：**
```bash
latest=$(ls Freehandsss_Dashboard/freehandsss_dashboardV*.html | sort -V | tail -1)
```

#### Step 1 — 升格確認（二次確認）
向 Fat Mo 顯示偵測結果並要求確認：
> 「偵測到最新版：`{latest檔名}`，將升格為 current.html 並部署至 NAS，確定？」

未確認不得繼續。

> **例外（2026-07-12，S168，AGENTS.md v1.7.0 授權途徑c）**：若本次 `/upload-web` 是由 `/commit` Phase 2.5 鏈式觸發（即該 Phase 已偵測到本次 commit 確實改動 `Freehandsss_Dashboard/freehandsss_dashboardV*.html`，判定「需要部署」），此步驟**跳過**，視為已由 `/commit` 本身取得授權。獨立、非 `/commit` 鏈式觸發的 `/upload-web` 呼叫（Fat Mo 直接輸入 `/upload-web` 或單獨要求部署），仍必須走本步驟二次確認。

#### Step 2 — cp 升格
**PowerShell（CL）：**
```powershell
Copy-Item $latest.FullName "Freehandsss_Dashboard\Freehandsss_dashboard_current.html" -Force
```

**Bash（AG）：**
```bash
cp "$latest" "Freehandsss_Dashboard/Freehandsss_dashboard_current.html"
```

#### Step 3 — 上傳 current
```powershell
powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 current -Force
```

#### Step 4 — 輸出結果
回報 PASS/FAIL：偵測版本名、公開網址、大小比對、SHA256。

---

### 【指定目標 — 單純上傳】

#### Step 1 — 解析目標
從 `/upload-web` 後取出目標代稱。

#### Step 2 — 生產版守護（目標為 `current` 時）
先向 Fat Mo 二次確認（「這會把生產版推上公開 web，確定？」）。獲確認後加 `-Force`；未確認不得執行。

#### Step 3 — 執行腳本
```powershell
powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 [目標] [-Force(僅 current)]
```

#### Step 4 — 輸出結果
回報 PASS/FAIL：公開網址、大小比對、SHA256。

---

## 驗證三關（腳本內建，不可省略）
1. 公開端點 HEAD 回 **HTTP 200**
2. 遠端 `Content-Length` == 本機檔案大小
3. 遠端下載後 **SHA256** 與本機逐位元組相同

任一關失敗 → 腳本 exit 1，視為部署失敗。

---

## 安全護欄
- 升格流程（無參數）：Step 1 二次確認後才 cp + 上傳
- `current.html` 生產版（指定目標）：強制二次確認 + `-Force`
- 密碼：永不回顯、永不寫入 repo（僅存 gitignored `.env`）

---

## 常用範例
```
/upload-web              # 自動偵測最新版 → 升格 current → 部署（最常用）
/upload-web V43          # 只上傳 V43 dev 版至 NAS（不升格）
/upload-web current      # 只上傳現有 current（不 cp，先確認）
```

---

## 副作用 (Side Effects)
- 是否寫檔：升格流程會覆寫本機 `Freehandsss_dashboard_current.html`（cp 動作）
- 是否覆蓋 NAS 既有同名檔：**是**（WebDAV PUT 覆寫）
- Token 消耗：~200–600（含偵測 + 確認 + 腳本呼叫 + 報告）