<#
.SYNOPSIS
  FHS /upload-web — 將指定 Dashboard 檔上傳至 NAS Web Station /web 並驗證。
.DESCRIPTION
  沿用 WebDAV over HTTPS 通道（yanhei.synology.me:5006）。
  驗證三關：公開端點 HTTP 200 + Content-Length 比對 + SHA256 逐位元組比對。
  憑證從 repo 根 .env 讀取（NAS_WEBDAV_URL / NAS_WEBDAV_USER / NAS_WEBDAV_PASS），密碼永不回顯。
.PARAMETER Target
  目標檔代稱或檔名：
    (省略) / V42  -> freehandsss_dashboardV42.html （來源 Freehandsss_Dashboard\）
    V41           -> freehandsss_dashboardV41.html （來源 Freehandsss_Dashboard\）
    V40           -> freehandsss_dashboardV40.html （來源 Freehandsss_Dashboard\）
    current       -> Freehandsss_dashboard_current.html （生產版，來源 Freehandsss_Dashboard\，需 -Force）
    team          -> agent_dashboardV42.html （AI 助理團隊名冊，來源 artifacts\，2026-07-16 新增；上傳前建議先跑 node scripts/agent_dashboardV42.js 確保最新）
    其他          -> 視為 Freehandsss_Dashboard\ 下的字面檔名
.PARAMETER Force
  部署 current.html（生產版）時必須加此旗標，否則中止。
.EXAMPLE
  pwsh scripts/upload-web.ps1
  pwsh scripts/upload-web.ps1 V41
  pwsh scripts/upload-web.ps1 current -Force
#>
param(
  [string]$Target = "V42",
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$htmlDir  = Join-Path $repoRoot 'Freehandsss_Dashboard'
$artifactsDir = Join-Path $repoRoot 'artifacts'

function Fail($msg) { Write-Host "❌ FAIL: $msg" -ForegroundColor Red; exit 1 }

# --- 1. 解析目標檔（$sourceDir 預設 Freehandsss_Dashboard\，非 POS Dashboard 類目標可覆寫） ---
$sourceDir = $htmlDir
switch -Regex ($Target) {
  '^(?i)(|V42)$'    { $fileName = 'freehandsss_dashboardV42.html' }
  '^(?i)V41$'       { $fileName = 'freehandsss_dashboardV41.html' }
  '^(?i)V40$'       { $fileName = 'freehandsss_dashboardV40.html' }
  '^(?i)current$'   { $fileName = 'Freehandsss_dashboard_current.html' }
  '^(?i)team$'      { $fileName = 'agent_dashboardV42.html'; $sourceDir = $artifactsDir }
  default           { $fileName = $Target }
}

# --- 2. 生產版守護（僅 POS Dashboard current.html，team 等其他目標非生產系統不受此限） ---
if ($fileName -eq 'Freehandsss_dashboard_current.html' -and -not $Force) {
  Fail "current.html 為生產版，部署需加 -Force（請先確認）。"
}

$localFile = Join-Path $sourceDir $fileName
if (-not (Test-Path $localFile)) { Fail "找不到本機檔案：$localFile" }

# --- 2.5 生產版部署時間戳注入（S182，iOS「加入主畫面」cache-bust 修復，僅 current 目標）---
# current.html 的 <meta name="fhs-build"> 注入真實部署時間戳，令頁內自我更新偵測腳本
# 可比對出新版本並強制重新載入，避免 iOS 長期食舊快照。
# 注意：Windows PowerShell 5.1 嘅 Get-Content/Set-Content 冇明確 encoding 時對冇 BOM 嘅
# UTF-8 檔案會誤判做系統 ANSI codepage，令全部中文字亂碼；改用 .NET File 類別明確指定
# UTF8Encoding($false)（無 BOM）讀寫，避免呢個陷阱（S182續事故：曾令 current.html 中文全爛）。
if ($fileName -eq 'Freehandsss_dashboard_current.html') {
  $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $content = [System.IO.File]::ReadAllText($localFile, $utf8NoBom)
  $newContent = $content -replace '<meta name="fhs-build" content="[^"]*">', "<meta name=`"fhs-build`" content=`"$ts`">"
  if ($newContent -ne $content) {
    [System.IO.File]::WriteAllText($localFile, $newContent, $utf8NoBom)
    Write-Host "  🕐 已注入部署時間戳 fhs-build=$ts（iOS home-screen cache-bust）"
  }
}

$localSize = (Get-Item $localFile).Length

# --- 3. 讀 .env 憑證 ---
$envPath = Join-Path $repoRoot '.env'
if (-not (Test-Path $envPath)) { Fail ".env 不存在，無法取得 WebDAV 憑證。" }
$cfg = @{}
Get-Content $envPath | Where-Object { $_ -match '^\s*NAS_(WEBDAV|WEB)_' } | ForEach-Object {
  $k,$v = $_ -split '=',2; $cfg[$k.Trim()] = $v.Trim()
}
foreach ($k in 'NAS_WEBDAV_URL','NAS_WEBDAV_USER','NAS_WEBDAV_PASS') {
  if (-not $cfg.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($cfg[$k])) { Fail ".env 缺少 $k" }
}
$webdavBase = $cfg['NAS_WEBDAV_URL'].TrimEnd('/')
$cred       = $cfg['NAS_WEBDAV_USER'] + ':' + $cfg['NAS_WEBDAV_PASS']
$putUrl     = "$webdavBase/$fileName"

# 公開端點 base：優先 .env 的 NAS_WEB_PUBLIC_BASE，否則由 WebDAV host 推導 https://<host>/
if ($cfg.ContainsKey('NAS_WEB_PUBLIC_BASE') -and $cfg['NAS_WEB_PUBLIC_BASE']) {
  $publicBase = $cfg['NAS_WEB_PUBLIC_BASE'].TrimEnd('/')
} else {
  $u = [Uri]$webdavBase
  $publicBase = "https://$($u.Host)"
}
$publicUrl = "$publicBase/$fileName"

# --- 4. 通道測試 ---
$davUri = [Uri]$webdavBase
$port = if ($davUri.Port -gt 0) { $davUri.Port } else { 5006 }
Write-Host "⏳ 測試 WebDAV 通道 $($davUri.Host):$port ..."
$t = Test-NetConnection -ComputerName $davUri.Host -Port $port -WarningAction SilentlyContinue
if (-not $t.TcpTestSucceeded) { Fail "WebDAV 埠 $port 不通（防火牆？通道未開？）。" }

# --- 5. WebDAV PUT 上傳 ---
Write-Host "⏳ 上傳 $fileName ($('{0:N0}' -f $localSize) bytes) → $putUrl"
$putCode = & curl.exe -k --ssl-no-revoke -s -o NUL -w "%{http_code}" -u $cred -T $localFile $putUrl
if ($putCode -notin '200','201','204') { Fail "WebDAV PUT 回傳 HTTP $putCode" }
Write-Host "  ✅ PUT HTTP $putCode"

# --- 6. 驗證關卡 ---
# 6a. 公開端點 HEAD
$headOut = & curl.exe -k --ssl-no-revoke -s -I $publicUrl
$httpLine = ($headOut | Select-String -Pattern '^HTTP' | Select-Object -First 1).ToString()
if ($httpLine -notmatch '\b200\b') { Fail "公開端點未回 200：$httpLine（$publicUrl）" }
$remoteLen = (($headOut | Select-String -Pattern '(?i)^Content-Length:\s*(\d+)').Matches.Groups[1].Value)

# 6b. 大小比對
if ([int64]$remoteLen -ne [int64]$localSize) { Fail "大小不符：remote=$remoteLen local=$localSize" }

# 6c. SHA256 比對
$tmp = Join-Path $env:TEMP ("uploadweb_verify_" + [guid]::NewGuid().ToString('N') + '.bin')
& curl.exe -k --ssl-no-revoke -s -o $tmp $publicUrl
$lh = (Get-FileHash $localFile -Algorithm SHA256).Hash
$rh = (Get-FileHash $tmp -Algorithm SHA256).Hash
Remove-Item $tmp -ErrorAction SilentlyContinue
if ($lh -ne $rh) { Fail "SHA256 不符 local=$lh remote=$rh" }

# --- 7. 成功報告 ---
Write-Host ""
Write-Host "✅ PASS — $fileName 已部署並驗證" -ForegroundColor Green
Write-Host "   公開網址 : $publicUrl"
Write-Host "   大小      : $('{0:N0}' -f $localSize) bytes (remote=local)"
Write-Host "   SHA256    : $lh"
exit 0