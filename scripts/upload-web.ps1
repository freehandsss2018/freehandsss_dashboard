<#
.SYNOPSIS
  FHS /upload-web — 將指定 Dashboard 檔上傳至 NAS Web Station /web 並驗證。
.DESCRIPTION
  沿用 WebDAV over HTTPS 通道（yanhei.synology.me:5006）。
  Gate 0：生產版血統前置檢查（防跨分支覆寫，D71-follow3 新增）。
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
.PARAMETER AllowClobber
  Gate 0 血統檢查不通過時，明確授權覆寫生產版（會記入 deploy-log.md）。
  ⚠️ 只應喺「已人手核實生產版內容確實可以被取代」時使用。
.EXAMPLE
  pwsh scripts/upload-web.ps1
  pwsh scripts/upload-web.ps1 V41
  pwsh scripts/upload-web.ps1 current -Force
#>
param(
  [string]$Target = "V42",
  [switch]$Force,
  [switch]$AllowClobber
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$htmlDir  = Join-Path $repoRoot 'Freehandsss_Dashboard'
$artifactsDir = Join-Path $repoRoot 'artifacts'

function Fail($msg) { Write-Host "❌ FAIL: $msg" -ForegroundColor Red; exit 1 }

# git 呼叫封裝：PowerShell 5.1 對 native command 嘅 stderr 處理會令 $? 失真，
# 統一用 $LASTEXITCODE 判斷，並喺呼叫期間放寬 ErrorActionPreference。
function Invoke-Git {
  param([string[]]$GitArgs)
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & git -C $repoRoot @GitArgs 2>$null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prevEAP
  return [pscustomobject]@{ Ok = ($code -eq 0); Out = $out; Code = $code }
}

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
$isProd = ($fileName -eq 'Freehandsss_dashboard_current.html')

# --- 2. 生產版守護（僅 POS Dashboard current.html，team 等其他目標非生產系統不受此限） ---
if ($isProd -and -not $Force) {
  Fail "current.html 為生產版，部署需加 -Force（請先確認）。"
}

$localFile = Join-Path $sourceDir $fileName
if (-not (Test-Path $localFile)) { Fail "找不到本機檔案：$localFile" }

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

# ═══════════════════════════════════════════════════════════════════════════
# Gate 0：生產版血統前置檢查（D71-follow3，2026-09-06 跨分支覆寫事故修復）
# ═══════════════════════════════════════════════════════════════════════════
# 背景：current.html 係跨分支共享嘅部署目標，但 git 分支之間互相唔知對方部署過乜。
#   2026-09-03 事故：一條分支連續 4 次部署，覆寫咗另一條分支 31 輪 UI 成果。
#   2026-09-06 事故：本分支（斷點仍為 768）覆寫咗 order-overview 分支（斷點已改 750）
#                    嘅生產版，一次抹走 117 個 commit 嘅 D69續八 UI 工作，
#                    同時令 Fat Mo 部 iPhone 橫向退回卡片版。
#   D70 明文將此列為「刻意不處理」嘅未解課題 —— 本 Gate 即為補位。
#
# 機制：每次部署都喺檔案內注入來源 commit（<meta name="fhs-deploy-src">）。
#   下次部署前先抓生產版，讀返個 commit，用 git 祖先判斷：
#     生產版 commit 係我 HEAD 嘅祖先  → 我哋喺佢之上前進，安全，放行
#     唔係祖先                        → 對方有我冇嘅工作，擋，列出會被抹走嘅 commit
#     讀唔到標記／commit 不存在        → 無法核實，擋，要 -AllowClobber 明確授權
#
# 安全依據：同 D70 Phase 2.6 一樣，用 git 客觀祖先判斷，唔做任何內容猜測。
if ($isProd) {
  Write-Host "⏳ Gate 0：核對生產版血統（防跨分支覆寫）..."
  $liveTmp = Join-Path $env:TEMP ("uploadweb_live_" + [guid]::NewGuid().ToString('N') + '.html')
  $liveCode = & curl.exe -k --ssl-no-revoke -s -o $liveTmp -w "%{http_code}" $publicUrl

  $gateMsg = $null
  if ($liveCode -eq '404') {
    Write-Host "  ℹ️ 生產版尚未存在（HTTP 404），首次部署，跳過血統檢查。"
  } elseif ($liveCode -ne '200') {
    $gateMsg = "讀取生產版失敗（HTTP $liveCode），無法核實血統。"
  } else {
    $utf8NoBom0 = New-Object System.Text.UTF8Encoding($false)
    $liveText = [System.IO.File]::ReadAllText($liveTmp, $utf8NoBom0)
    $m = [regex]::Match($liveText, '<meta name="fhs-deploy-src" content="([^"]*)">')
    if (-not $m.Success) {
      $gateMsg = "生產版冇來源標記（Gate 0 上線前嘅舊部署），無法核實血統。"
    } else {
      $liveSha = ($m.Groups[1].Value -replace '-dirty$','').Trim()
      $exists = Invoke-Git @('cat-file','-t',$liveSha)
      if (-not $exists.Ok) {
        Write-Host "  ⏳ 生產版來源 commit 未喺本機，fetch 中 ..."
        Invoke-Git @('fetch','--all','--quiet') | Out-Null
        $exists = Invoke-Git @('cat-file','-t',$liveSha)
      }
      if (-not $exists.Ok) {
        $gateMsg = "生產版來源 commit $liveSha 喺本 repo 搵唔到（可能嚟自未推送嘅分支）。"
      } else {
        $anc = Invoke-Git @('merge-base','--is-ancestor',$liveSha,'HEAD')
        if ($anc.Ok) {
          $shortSha = $liveSha.Substring(0,[Math]::Min(8,$liveSha.Length))
          Write-Host "  ✅ 生產版來源 $shortSha 係本分支祖先，安全前進。"
        } else {
          $missing = (Invoke-Git @('log','--oneline',"HEAD..$liveSha")).Out
          $missCount = 0
          if ($missing) { $missCount = @($missing).Count }
          Write-Host ""
          Write-Host "  ⛔ 生產版嚟自本分支冇嘅工作：$missCount 個 commit" -ForegroundColor Yellow
          if ($missing) { @($missing) | Select-Object -First 15 | ForEach-Object { Write-Host "     $_" } }
          if ($missCount -gt 15) { Write-Host "     ...（其餘 $($missCount - 15) 個未列出）" }
          Write-Host ""
          $gateMsg = "生產版來源 $liveSha 唔係本分支祖先，一 PUT 就會抹走上列 $missCount 個 commit 嘅工作。"
        }
      }
    }
  }
  Remove-Item $liveTmp -ErrorAction SilentlyContinue

  if ($gateMsg) {
    if (-not $AllowClobber) {
      Write-Host ""
      Write-Host "═══ Gate 0 攔截部署 ═══" -ForegroundColor Red
      Write-Host "  $gateMsg" -ForegroundColor Red
      Write-Host ""
      Write-Host "  正確做法（二選一）：" -ForegroundColor Yellow
      Write-Host "    (a) 先將對方分支 merge 入本分支，令生產版內容成為本分支祖先，再部署" -ForegroundColor Yellow
      Write-Host "    (b) 由擁有該工作嘅分支去部署" -ForegroundColor Yellow
      Write-Host ""
      Write-Host "  已人手核實確實可以取代先加 -AllowClobber（會記入 deploy-log.md）。" -ForegroundColor Yellow
      Fail "Gate 0 血統檢查不通過。"
    }
    Write-Host "  ⚠️ $gateMsg" -ForegroundColor Yellow
    Write-Host "  ⚠️ -AllowClobber 已指定，繼續部署（已記入 deploy-log.md）。" -ForegroundColor Yellow
    $logLine = "$((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')) | Gate0 AllowClobber | $gateMsg"
    $logPath = Join-Path $repoRoot '.fhs/notes/deploy-log.md'
    try { Add-Content -Path $logPath -Value $logLine -Encoding UTF8 } catch { }
  }
}

# --- 4. 生產版標記注入（時間戳 + 來源 commit）---
# fhs-build：S182 iOS「加入主畫面」cache-bust 修復，令頁內自我更新偵測可比對新版本。
# fhs-deploy-src：D71-follow3 Gate 0 血統標記，記錄本次部署嘅來源 commit。
# 注意：Windows PowerShell 5.1 嘅 Get-Content/Set-Content 冇明確 encoding 時對冇 BOM 嘅
# UTF-8 檔案會誤判做系統 ANSI codepage，令全部中文字亂碼；改用 .NET File 類別明確指定
# UTF8Encoding($false)（無 BOM）讀寫，避免呢個陷阱（S182續事故：曾令 current.html 中文全爛）。
if ($isProd) {
  $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $content = [System.IO.File]::ReadAllText($localFile, $utf8NoBom)

  $headSha = ''
  $rp = Invoke-Git @('rev-parse','HEAD')
  if ($rp.Ok) { $headSha = (@($rp.Out) | Select-Object -First 1).Trim() }
  if (-not $headSha) { Fail "攞唔到 HEAD commit，無法注入血統標記。" }
  $dirtySuffix = ''
  $stat = Invoke-Git @('status','--porcelain','--',"Freehandsss_Dashboard/$fileName")
  if ($stat.Ok -and $stat.Out) { $dirtySuffix = '-dirty' }
  $srcTag = "<meta name=`"fhs-deploy-src`" content=`"$headSha$dirtySuffix`">"

  $newContent = $content -replace '<meta name="fhs-build" content="[^"]*">', "<meta name=`"fhs-build`" content=`"$ts`">"
  if ($newContent -match '<meta name="fhs-deploy-src" content="[^"]*">') {
    $newContent = $newContent -replace '<meta name="fhs-deploy-src" content="[^"]*">', $srcTag
  } else {
    $newContent = $newContent -replace '(<meta name="fhs-build" content="[^"]*">)', "`$1`n    $srcTag"
  }
  if ($newContent -ne $content) {
    [System.IO.File]::WriteAllText($localFile, $newContent, $utf8NoBom)
    Write-Host "  🕐 已注入部署時間戳 fhs-build=$ts（iOS home-screen cache-bust）"
    Write-Host "  🔗 已注入血統標記 fhs-deploy-src=$headSha$dirtySuffix"
  }
}

$localSize = (Get-Item $localFile).Length

# --- 5. 通道測試 ---
$davUri = [Uri]$webdavBase
$port = if ($davUri.Port -gt 0) { $davUri.Port } else { 5006 }
Write-Host "⏳ 測試 WebDAV 通道 $($davUri.Host):$port ..."
$t = Test-NetConnection -ComputerName $davUri.Host -Port $port -WarningAction SilentlyContinue
if (-not $t.TcpTestSucceeded) { Fail "WebDAV 埠 $port 不通（防火牆？通道未開？）。" }

# --- 6. WebDAV PUT 上傳 ---
Write-Host "⏳ 上傳 $fileName ($('{0:N0}' -f $localSize) bytes) → $putUrl"
$putCode = & curl.exe -k --ssl-no-revoke -s -o NUL -w "%{http_code}" -u $cred -T $localFile $putUrl
if ($putCode -notin '200','201','204') { Fail "WebDAV PUT 回傳 HTTP $putCode" }
Write-Host "  ✅ PUT HTTP $putCode"

# --- 7. 驗證關卡 ---
# 7a. 公開端點 HEAD
$headOut = & curl.exe -k --ssl-no-revoke -s -I $publicUrl
$httpLine = ($headOut | Select-String -Pattern '^HTTP' | Select-Object -First 1).ToString()
if ($httpLine -notmatch '\b200\b') { Fail "公開端點未回 200：$httpLine（$publicUrl）" }
$remoteLen = (($headOut | Select-String -Pattern '(?i)^Content-Length:\s*(\d+)').Matches.Groups[1].Value)

# 7b. 大小比對
if ([int64]$remoteLen -ne [int64]$localSize) { Fail "大小不符：remote=$remoteLen local=$localSize" }

# 7c. SHA256 比對
$tmp = Join-Path $env:TEMP ("uploadweb_verify_" + [guid]::NewGuid().ToString('N') + '.bin')
& curl.exe -k --ssl-no-revoke -s -o $tmp $publicUrl
$lh = (Get-FileHash $localFile -Algorithm SHA256).Hash
$rh = (Get-FileHash $tmp -Algorithm SHA256).Hash
Remove-Item $tmp -ErrorAction SilentlyContinue
if ($lh -ne $rh) { Fail "SHA256 不符 local=$lh remote=$rh" }

# --- 8. 成功報告 ---
Write-Host ""
Write-Host "✅ PASS — $fileName 已部署並驗證" -ForegroundColor Green
Write-Host "   公開網址 : $publicUrl"
Write-Host "   大小      : $('{0:N0}' -f $localSize) bytes (remote=local)"
Write-Host "   SHA256    : $lh"
exit 0
