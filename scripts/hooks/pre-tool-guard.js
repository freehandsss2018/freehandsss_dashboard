#!/usr/bin/env node
// scripts/hooks/pre-tool-guard.js
// FHS PreToolUse Hook — AGENTS.md Hard Rule Enforcer
// Intercepts Write/Edit/Bash tool calls that violate FHS constitutional rules
// Version: 1.0.0 | 2026-04-28
//
// Exit codes:
//   0 = pass (allow execution)
//   2 = block (deny execution, show stderr to Claude)
// Warnings use stderr + exit 0 (non-blocking alert)

'use strict';

const fs = require('fs');
const path = require('path');

// ── Deploy authorization flag (S140, F8) ────────────────────────────────────
// Fat Mo manually `touch`es this file in his own terminal (never via an AI
// tool call — R10 below blocks the AI from creating it) to grant ONE current.html
// promote. 10-minute TTL: stale flags left over from an earlier approval must
// not silently authorize an unrelated later write.
const DEPLOY_FLAG_FILE = path.join(__dirname, '../../.fhs/.deploy-ok');
const DEPLOY_LOG_FILE = path.join(__dirname, '../../.fhs/notes/deploy-log.md');
const DEPLOY_TTL_MS = 10 * 60 * 1000;

// ── kgov shell-write observation log (S140, F12) ────────────────────────────
// Warn-only for now: log shell writes that touch finance content so we can
// measure real hit rate before promoting this to a hard PostToolUse flag.
const KGOV_OBSERVE_LOG = path.join(__dirname, '../../.fhs/.kgov-observe.log');

function checkDeployAuthorization() {
  try {
    if (!fs.existsSync(DEPLOY_FLAG_FILE)) return false;
    const ts = fs.readFileSync(DEPLOY_FLAG_FILE, 'utf8').trim();
    const flagTime = new Date(ts).getTime();
    if (isNaN(flagTime) || Date.now() - flagTime > DEPLOY_TTL_MS) {
      try { fs.unlinkSync(DEPLOY_FLAG_FILE); } catch (_) { /* silent */ }
      return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

function consumeDeployAuthorization(target) {
  try { fs.unlinkSync(DEPLOY_FLAG_FILE); } catch (_) { /* silent */ }
  try {
    const dir = path.dirname(DEPLOY_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | R1/R9 bypass | ${String(target).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

// ── Handoff sync gate (R13, D68, 2026-08-21) ────────────────────────────────
// 為何存在：`/commit` P0.7 一直只係散文指示「便攜塊『更新:』必須改成今日日期」，
// 冇任何機械強制。實測 D67(08-19)/D66-follow(08-20) 兩次 `/commit` 都改咗內容
// 但個日期戳三日冇郁 —— AI 記得改內容記唔住改標籤，因為冇嘢會攔。
// D66 已判定歷來三次修復（S118/S144/D60）全部落喺「內容·紀律層」故零效果；
// SessionStart hook 只做**事後偵測**（下一個 session 先警告）。呢條係補返
// 「寫入時點」嗰個真空 —— commit 前擋，唔係 commit 後嘈。
//
// 兩個條件（任一不過即 exit 2）：
//   (1) 便攜塊頂部 `更新: YYYY-MM-DD` ≠ 今日本地日期
//   (2) handoff.md 有未 staged 嘅改動（改咗但冇入今次 commit）
// 條件(1)幂等：同一日第二個 commit（例如 Phase 2.5 部署 commit）自動過關，
// 唔使開後門 flag，亦即冇「AI 自我授權」漏洞——檢查本身就係驗證。
//
// 已知邊界（刻意 fail-open，寧鬆莫死鎖）：
//   • `git -C <path> commit` 形式唔會命中 regex（放行，非誤擋）
//   • 指令字串內夾住 "git commit" 字樣（如 echo）會誤擋——用下方逃生口
//   • git 不可用／唔係 repo／讀唔到 handoff → 一律放行
//   • 擋唔到「日期戳啱但內容根本冇更新」——機械層無法驗證內容新鮮度
// 逃生口：FHS_SKIP_HANDOFF_GATE=1（每次繞過記入 deploy-log.md 供稽核）
// 測試用：FHS_HANDOFF_GATE_FILE 覆寫檔案路徑（同時跳過條件(2)嘅 git 探測）
const REPO_ROOT = path.join(__dirname, '../..');
const HANDOFF_REL = '.fhs/memory/handoff.md';
const HANDOFF_FILE = process.env.FHS_HANDOFF_GATE_FILE || path.join(REPO_ROOT, HANDOFF_REL);

function todayLocalISO() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function readHandoffStamp() {
  try {
    const head = fs.readFileSync(HANDOFF_FILE, 'utf8').split(/\r?\n/).slice(0, 6).join('\n');
    const m = head.match(/更新:\s*(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  } catch (_) { return null; }
}

function handoffHasUnstagedEdits() {
  if (process.env.FHS_HANDOFF_GATE_FILE) return false; // 測試覆寫模式：跳過 git 探測
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync('git', ['diff', '--name-only', '--', HANDOFF_REL], {
      cwd: REPO_ROOT, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore']
    });
    return out.trim().length > 0;
  } catch (_) {
    return false; // git 不可用 → fail open，絕不死鎖 repo
  }
}

function logGateBypass(reason, commandHead) {
  // 夾具測試唔可以污染真實稽核檔（同 logKgovObserve 嘅 S148 B1 防污染同源）。
  // 註：呢度用 FHS_HANDOFF_GATE_FILE 而非 FHS_GUARD_FIXTURE，因為 R13 喺
  // FHS_GUARD_FIXTURE=1 之下根本唔會行到，R13 專屬 runner 用嘅係前者。
  if (process.env.FHS_HANDOFF_GATE_FILE) return;
  try {
    const dir = path.dirname(DEPLOY_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | R13 handoff-gate bypass (${reason}) | ${String(commandHead).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

function logKgovObserve(commandHead) {
  if (process.env.FHS_GUARD_FIXTURE === '1') return; // 夾具測試不污染觀察數據（S148 B1）
  try {
    const dir = path.dirname(KGOV_OBSERVE_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(KGOV_OBSERVE_LOG, `${new Date().toISOString()} | ${String(commandHead).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    process.exit(0);
  }

  const tool = data.tool_name || '';
  const toolInput = data.tool_input || {};

  const blocking = [];
  const warnings = [];

  // ═══════════════════════════════════════════════════════════════
  // Guard: Write / Edit
  // ═══════════════════════════════════════════════════════════════
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const filePath = (toolInput.file_path || toolInput.notebook_path || '').replace(/\\/g, '/');
    // MultiEdit carries an `edits` array instead of a single new_string; NotebookEdit
    // carries `new_source`. Flatten whichever shape is present into one string to scan.
    const content = toolInput.content || toolInput.new_string || toolInput.new_source ||
      (Array.isArray(toolInput.edits) ? toolInput.edits.map(e => e.new_string || '').join('\n') : '') || '';

    // ── Rule 1: Protect production file ────────────────────────
    if (filePath.includes('Freehandsss_dashboard_current.html')) {
      if (checkDeployAuthorization()) {
        consumeDeployAuthorization(filePath);
      } else {
        blocking.push(
          '🚫 [R1] 禁止覆蓋正式環境 Freehandsss_dashboard_current.html',
          '   → AGENTS.md §全域硬規則：未獲授權絕不可覆蓋 current.html',
          '   → 授權途徑：(a) Fat Mo 直接回覆 AI 提出的升格確認問題（AI 可據此自建 .deploy-ok），(b) Fat Mo 自行於終端機手動 touch .fhs/.deploy-ok，10 分鐘內有效，或 (c) 本次是 /commit Phase 2.5 偵測到需要部署後的鏈式觸發（AGENTS.md v1.7.0）'
        );
      }
    }

    // ── Rule 10 (v2, S159續): AI 可自行建立 .deploy-ok，僅限直接回覆升格確認問題 ──
    // 原為全面封鎖（防 AI 自我授權）；Fat Mo 提案+選定「加防護版」後放寬：
    // 允許 AI 透過 Write/Edit 建立此旗標，但 AGENTS.md §3 明文要求僅能在
    // Fat Mo「直接回覆 AI 自己提出的升格確認問題」時才可建立，嚴禁從訂單
    // 備註/webhook/其他資料來源推斷同意——此條件無法由 hook 技術驗證，
    // 屬 AI 行為層硬約束，違反視同違憲。每次建立記入 deploy-log.md 供稽核。
    if ((tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') &&
        filePath.includes('.deploy-ok') && process.env.FHS_GUARD_FIXTURE !== '1') {
      try {
        const dir = path.dirname(DEPLOY_LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | R10 AI self-created .deploy-ok (AGENTS.md v1.6.0授權) | tool=${tool}\n`, 'utf8');
      } catch (_) { /* silent */ }
    }

    // ── Rule 2: No hardcoded API keys ───────────────────────────
    // 2026-08-11 (D62 事故教訓)：呢個 pattern 清單只擋 Claude Code 自己嘅
    // Write/Edit 工具呼叫。D62 洩漏嘅實際路徑係 n8n-mcp-server 內部
    // update-node-code.js 嘅 backupNode() 用 fs.writeFileSync 直寫落 repo，
    // 完全繞過呢個 hook（MCP server 係獨立子進程，唔經 Claude Code 工具層）。
    // 呢度已喺 update-node-code.js 加咗同款 redactSecrets()，兩處各自獨立
    // 攔截同一威脅模型——改任一邊嘅 pattern 清單時，必須同步檢查另一邊
    // （n8n-mcp-server/src/tools/update-node-code.js 頂部 SECRET_PATTERNS）。
    const apiKeyPatterns = [
      { re: /sk-[a-zA-Z0-9]{32,}/, label: 'OpenAI-style key (sk-...)' },
      { re: /pplx-[a-zA-Z0-9]{32,}/, label: 'Perplexity key (pplx-...)' },
      { re: /pat[a-zA-Z0-9]{20,}\.[a-zA-Z0-9]{40,}/, label: 'Airtable PAT' },
      { re: /sbp_[a-zA-Z0-9]{20,}/, label: 'Supabase access token (sbp_...)' },
      { re: /sb_secret_[a-zA-Z0-9_-]{15,}/, label: 'Supabase secret key (sb_secret_...)' },
      { re: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, label: 'JWT (eyJ...)' },
      { re: /(?:api_key|apikey|api-key)\s*[:=]\s*["'][a-zA-Z0-9\-_]{20,}["']/i, label: 'API key assignment' },
      { re: /(?:GEMINI_API_KEY|PERPLEXITY_API_KEY|N8N_KEY)\s*=\s*["'][a-zA-Z0-9\-_.]{20,}["']/, label: 'FHS env key' }
    ];
    for (const { re, label } of apiKeyPatterns) {
      if (re.test(content)) {
        blocking.push(
          `🚫 [R2] 偵測到硬編碼 API Key：${label}`,
          '   → AGENTS.md §全域硬規則：一律使用 .env + process.env'
        );
        break;
      }
    }

    // ── Rule 3: Protect captureFormState & Raw_Form_State ───────
    const protectedSymbols = ['captureFormState', 'Raw_Form_State', 'rawFormState'];
    for (const sym of protectedSymbols) {
      // Check if content appears to modify (not just reference) these symbols
      const modPatterns = [
        new RegExp(`function\\s+${sym}\\s*\\(`, ''),       // redefining the function
        new RegExp(`${sym}\\s*=\\s*function`, ''),          // reassigning
        new RegExp(`delete\\s+.*${sym}`, '')               // deleting
      ];
      if (modPatterns.some(p => p.test(content))) {
        warnings.push(
          `⚠️  [R3] 偵測到可能修改受保護符號：${sym}`,
          '   → AGENTS.md §資料結構守護：captureFormState 禁止改動'
        );
      }
    }

    // ── Rule 4: .env file write alert ───────────────────────────
    if (filePath.endsWith('.env') && !filePath.endsWith('.env.example')) {
      warnings.push(
        '⚠️  [R4] 正在寫入 .env 檔案',
        '   → 請確認 .env 已在 .gitignore，禁止 commit 真實 key'
      );
    }

    // ── Rule 12 (S156, Fat Mo 裁決同意；2026-08-03 分桶重構後 path 擴至 learnings/ 目錄) ──
    // md-only-warn 哲學（同 kgov v2.0.0）：不 block，僅提醒 Rule 3.17 三個交付邊界之一。
    if (filePath.endsWith('learnings.md') || filePath.includes('.fhs/memory/learnings/')) {
      warnings.push(
        '⚠️  [R12] 正在寫入 learnings/',
        '   → 提交前請確認已依 AGENTS.md Rule 3.17 完成【交付前雙紀律自檢】兩行（驗收/Subagent）'
      );
      if (filePath.endsWith('finance.md')) {
        warnings.push(
          '   → [finance 桶特殊守護] 新增/修改條目前，須引用對應 FHS_Pricing_Bible.md / FHS_Finance_Bible.md 章節，受 finance-gatekeeper 管轄'
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Guard: Bash
  // ═══════════════════════════════════════════════════════════════
  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = toolInput.command || '';

    // ── Rule 9: Block Bash/PowerShell commands targeting current.html ──
    // R1 above only checks Write/Edit file_path; commands like `cp`, `sed -i`,
    // shell redirection, or PowerShell Set-Content/Copy-Item can overwrite
    // current.html without ever going through Write/Edit. Catch the filename
    // appearing alongside a write-shaped command/cmdlet.
    if (/current\.html/i.test(command) &&
        /(?:^|\s)(?:cp|mv|sed\s+-i|cat\s+.*>|>{1,2}|tee|Set-Content|Copy-Item|Move-Item|Out-File)\b/i.test(command)) {
      if (checkDeployAuthorization()) {
        consumeDeployAuthorization(command);
      } else {
        blocking.push(
          '🚫 [R9] 偵測到 Bash 指令疑似寫入 current.html',
          '   → AGENTS.md §全域硬規則：未獲授權絕不可覆蓋 current.html',
          '   → 授權途徑：(a) Fat Mo 直接回覆 AI 提出的升格確認問題（AI 可據此自建 .deploy-ok），(b) Fat Mo 自行於終端機手動 touch .fhs/.deploy-ok，10 分鐘內有效，或 (c) 本次是 /commit Phase 2.5 偵測到需要部署後的鏈式觸發（AGENTS.md v1.7.0）'
        );
      }
    }

    // ── Rule 10 (shell variant, v2, S159續): 同上，見 Write/Edit 變體註解 ──
    if (/\.deploy-ok\b/i.test(command) &&
        /(?:^|\s)(?:touch|echo\s.*>|Set-Content|New-Item|Out-File)\b/i.test(command) &&
        process.env.FHS_GUARD_FIXTURE !== '1') {
      try {
        const dir = path.dirname(DEPLOY_LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | R10 AI self-created .deploy-ok via shell (AGENTS.md v1.6.0授權) | cmd=${String(command).slice(0, 80)}\n`, 'utf8');
      } catch (_) { /* silent */ }
    }

    // ── Rule 11 (observe-only, S140 F12): shell write touching finance content ──
    // Not blocking yet — logs to .fhs/.kgov-observe.log for a ~2-week hit-rate
    // review before this graduates to a hard flag (see governance/05 §4).
    if ((/(?:^|\s)(?:Set-Content|Out-File|tee|sed\s+-i)\b/i.test(command) || />>?/.test(command)) &&
        /handmodel_cost|keychain_cost|necklace_cost|accessory_cost|cost_configurations|final_sale_price|total_cost|net_profit|calculatePricing|CREATE\s+OR\s+REPLACE\s+FUNCTION/i.test(command)) {
      logKgovObserve(command);
      warnings.push(
        '⚠️  [R11-observe] 偵測到 Shell 寫入指令疑似涉及財務欄位（觀察期，未攔截）',
        '   → 已記錄至 .fhs/.kgov-observe.log，觀察期後複查決定是否轉正為攔截'
      );
    }

    // ── Rule 13 (D68): handoff 同步閘 — 攔 git commit ────────────
    // 設計理由與已知邊界見檔頭 HANDOFF_FILE 區塊註解。
    if (process.env.FHS_GUARD_FIXTURE !== '1' &&
        /\bgit\s+(?:-[^\s]+\s+)*commit\b/.test(command) &&
        !/--dry-run\b/.test(command)) {
      if (process.env.FHS_SKIP_HANDOFF_GATE === '1') {
        logGateBypass('FHS_SKIP_HANDOFF_GATE=1', command);
        warnings.push(
          '⚠️  [R13] handoff 同步閘已被 FHS_SKIP_HANDOFF_GATE=1 繞過',
          '   → 已記入 .fhs/notes/deploy-log.md 供稽核；請確認 handoff.md 確實唔需要更新'
        );
      } else {
        const stamp = readHandoffStamp();
        const today = todayLocalISO();
        if (stamp === null) {
          warnings.push(
            '⚠️  [R13] 讀唔到 handoff.md 便攜塊「更新:」日期戳，本次放行（fail-open）',
            '   → 若便攜塊仍在，請檢查格式係咪被改壞（預期：【FHS 交接摘要 — 更新: YYYY-MM-DD）'
          );
        } else if (stamp !== today) {
          blocking.push(
            `🚫 [R13] handoff 便攜塊日期戳過時：${stamp}（今日 ${today}），禁止 commit`,
            '   → /commit P0.7：便攜塊七類欄位須反映本 session 最新狀態，「更新:」必須改成今日日期',
            `   → 請編輯 ${HANDOFF_REL} 第 2 行「【FHS 交接摘要 — 更新: ${stamp}」→「更新: ${today}」，`,
            '     並同步核對 🎯目標／✅已定決策／🔬驗證／📋待辦／⏰時限待辦／➡️下一步 六欄',
            '   → 純查詢 session 無狀態改變時，依 P0.7 只更新日期即可',
            '   → 確認今次真係唔關 handoff 事：FHS_SKIP_HANDOFF_GATE=1 <你條 git 指令>（會記入稽核）'
          );
        } else if (handoffHasUnstagedEdits()) {
          blocking.push(
            '🚫 [R13] handoff.md 有未 staged 嘅改動，禁止 commit',
            '   → 日期戳係今日但改動未入 index，commit 落去會令 repo 同你手上版本 drift',
            `   → 請先 git add ${HANDOFF_REL} 再 commit`
          );
        }
      }
    }

    // ── Rule 5: Block git add .env ──────────────────────────────
    if (/git\s+add\s+[^-]*\.env(?!\.example)/.test(command)) {
      blocking.push(
        '🚫 [R5] 禁止 git add .env',
        '   → AGENTS.md §全域硬規則：.env 禁止 commit'
      );
    }

    // ── Rule 6: Warn on git add . or -A ─────────────────────────
    if (/git\s+add\s+(-A|--all|\.)(\s|$)/.test(command)) {
      warnings.push(
        '⚠️  [R6] git add . / -A 可能意外包含 .env',
        '   → 建議改用 git add <specific files>，或確認 .gitignore 正確'
      );
    }

    // ── Rule 7: Block force push ─────────────────────────────────
    if (/git\s+push\s+.*(--force|-f)\b/.test(command)) {
      blocking.push(
        '🚫 [R7] 禁止 git push --force（需 Fat Mo 明確授權）',
        '   → 如確認需要，請明確說明理由並獲授權後再執行'
      );
    }

    // ── Rule 8: Warn on rm -rf / Remove-Item -Recurse -Force targeting project subdirs ──
    const isRmRf = /rm\s+-rf\s+(?!tmp\/|artifacts\/)/.test(command);
    const isRemoveItemForce = /Remove-Item\b/i.test(command) && /-Recurse\b/i.test(command) && /-Force\b/i.test(command);
    if (isRmRf || isRemoveItemForce) {
      const safeExceptions = ['node_modules', '/tmp/', 'artifacts/'];
      const isSafe = safeExceptions.some(s => command.includes(s));
      if (!isSafe) {
        warnings.push(
          '⚠️  [R8] 偵測到 rm -rf / Remove-Item -Recurse -Force，請確認目標目錄安全',
          '   → 安全目標：node_modules/、tmp/、artifacts/ 以外需謹慎'
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Output
  // ═══════════════════════════════════════════════════════════════
  if (blocking.length === 0 && warnings.length === 0) {
    process.exit(0); // All clear, allow
  }

  if (warnings.length > 0) {
    process.stderr.write('─── FHS 安全警告 ───\n');
    warnings.forEach(w => process.stderr.write(w + '\n'));
    process.stderr.write('──────────────────\n');
  }

  if (blocking.length > 0) {
    process.stderr.write('═══ FHS 安全守護：攔截操作 ═══\n');
    blocking.forEach(b => process.stderr.write(b + '\n'));
    process.stderr.write('═══════════════════════════════\n');
    process.exit(2); // BLOCK
  }

  process.exit(0); // Warnings only, allow with caution
});
