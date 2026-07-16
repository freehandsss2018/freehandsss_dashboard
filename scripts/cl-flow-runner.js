#!/usr/bin/env node
// scripts/cl-flow-runner.js
// FHS /cl-flow Coordinator Runner — A3-first Review Pipeline
// Version: v2.0.0 (2026-07-15, D37)
// Purpose: Two-stage headless orchestrator.
//   --init   : create flow_id + task-brief.md + state.json (no API calls, no A1/A2 involvement)
//   --review : send A3's draft (written by Claude in-session as artifacts/{flow_id}/a3-draft.md)
//              to Gemini (AG, always) and Perplexity (PX, unless --fast) as ADVERSARIAL REVIEWERS
//              of that draft — not as blind authors. Writes ag-review.md / px-review.md.
// Rationale (D37): A1/A2 producing plans from scratch with no repo access hallucinated
// repeatedly (fabricated file paths, invented Postgres Functions, misread domain terms).
// A3 (Claude Code, has repo access) now writes the first draft; A1/A2 critique it instead.

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawnSync } = require('child_process');

// ─── Environment ─────────────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_A2_MODEL_DEFAULT || 'gemini-3.5-flash';
const ROOT_DIR = path.join(__dirname, '..');

// ─── CLI Parsing ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const mode = args[0];

function usageAndExit() {
  console.error('[cl-flow-runner] Usage:');
  console.error('  node scripts/cl-flow-runner.js --init "[task description]"');
  console.error('  node scripts/cl-flow-runner.js --review {flow_id} [--fast]');
  process.exit(1);
}

if (mode !== '--init' && mode !== '--review') usageAndExit();

// ─── File Utils ──────────────────────────────────────────────────────────────
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFileOrNull(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.trim() ? content : null;
  } catch (_) {
    return null;
  }
}

// ─── API: Perplexity ─────────────────────────────────────────────────────────
// NOTE (2026-06-23 fix, kept from v1.0.0): Cloudflare (Perplexity front) fingerprints
// client TLS/HTTP and resets Node https/urllib connections — only curl is let through.
// PX calls go through a curl subprocess (body written to temp file, --data @file).
function callPerplexity(promptText, tmpDir) {
  return new Promise((resolve, reject) => {
    const artifactsDir = tmpDir || path.join(ROOT_DIR, 'artifacts', '.tmp');
    const body = JSON.stringify({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: promptText }],
      max_tokens: 8000
    });
    const tmpFile = path.join(artifactsDir, `.px_body_${Date.now()}.json`);
    try {
      fs.mkdirSync(artifactsDir, { recursive: true });
      fs.writeFileSync(tmpFile, body, 'utf8');
      const res = spawnSync('curl', [
        '-s', '--max-time', '180',
        '-X', 'POST', 'https://api.perplexity.ai/chat/completions',
        '-H', `Authorization: Bearer ${PERPLEXITY_API_KEY}`,
        '-H', 'Content-Type: application/json',
        '--data', `@${tmpFile}`
      ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });

      if (res.error) return reject(new Error('Perplexity curl spawn error: ' + res.error.message));
      if (res.status !== 0) {
        return reject(new Error('Perplexity curl exit ' + res.status + ': ' + String(res.stderr || '').slice(0, 200)));
      }
      const data = res.stdout;
      if (!data || !data.trim()) {
        return reject(new Error('Perplexity curl returned empty (likely connection reset / timeout from upstream)'));
      }
      const json = JSON.parse(data);
      if (json.error) return reject(new Error('Perplexity API error: ' + json.error.message));
      const choice = json.choices && json.choices[0];
      const content = choice && choice.message && choice.message.content;
      if (!content || !content.trim()) {
        return reject(new Error(
          'Perplexity returned empty content (finish_reason=' + (choice && choice.finish_reason) +
          ') — reasoning model likely exhausted max_tokens before producing an answer.'
        ));
      }
      if (choice.finish_reason === 'length') {
        console.warn('[cl-flow-runner] ⚠️  Perplexity response truncated (finish_reason=length).');
      }
      resolve(content);
    } catch (e) {
      reject(new Error('Perplexity parse/call error: ' + e.message));
    } finally {
      try { fs.unlinkSync(tmpFile); } catch (_) { /* best effort */ }
    }
  });
}

// ─── API: Gemini ─────────────────────────────────────────────────────────────
function callGemini(promptText) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { maxOutputTokens: 8192 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    let data = '';
    const req = https.request(options, res => {
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error('Gemini API error: ' + json.error.message));
          resolve(json.candidates[0].content.parts[0].text);
        } catch (e) {
          reject(new Error('Gemini parse error: ' + e.message + '\nRaw: ' + data.substring(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Gemini timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── Retry Wrapper ───────────────────────────────────────────────────────────
async function withRetry(fn, label, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.error(`[cl-flow-runner] ${label} attempt ${i}/${retries} failed: ${err.message}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

// ─── Review Prompt Builders (D37) ────────────────────────────────────────────
// PX (A1): external validator. No repo access — forbidden to comment on repo internals.
function buildPxReviewPrompt(task, draft) {
  return `你是外部技術驗證員（A1 角色）。以下是本地工程師（A3）針對 FHS 系統寫嘅基礎分析＋部署方案草案。

你嘅任務：從外部技術視角（業界標準／已知風險／相似系統經驗／技術限制）逐條驗證草案入面嘅技術假設，
搵出草案未察覺嘅外部風險。

**嚴格限制**：
- 你冇 repo 存取權限，**禁止評論 repo 內部結構、檔案是否存在、程式碼邏輯對錯**——呢啲你見唔到，
  評咗就係幻覺，會被直接丟棄，唔計入 Severity。
- 只評「呢個技術假設喺業界係咪站得住腳」「呢個做法有冇已知陷阱」「有冇更成熟嘅業界慣例／已知風險」。

**輸出格式**（逐條編號，最多 8 條；如全部站得住腳，寫「本草案外部假設均可站立，無批評」）：
## 批評 #1
- **標的**：草案第幾節／邊個假設
- **Severity**：BLOCKER / MAJOR / MINOR
- **問題**：具體講乜錯／乜風險
- **依據**：業界慣例／已知案例／技術限制（禁止用「可能」「或許」軟化）

任務背景：
${task}

草案內容：
<draft>
${draft}
</draft>

請以繁體中文回答。`;
}

// AG (A2): adversarial red-team. Forbidden to author a replacement plan.
function buildAgReviewPrompt(task, draft) {
  return `你是本地對抗式評審員（A2 角色，red-team）。以下是 A3 針對 FHS 系統寫嘅基礎分析＋部署方案草案，
草案已包含實際檔案路徑／現況引用。

你嘅任務：**專職挑錯**，唔係重寫方案。逐條搵出：
- 邏輯漏洞
- 遺漏嘅 edge case
- 更優嘅替代做法（如有，一句話簡述方向，唔展開全新方案）
- 若草案有違反 FHS 硬規則（AGENTS.md）嘅地方

強制自問：「如果我要整死呢個方案，我會攻擊邊度？」每條攻擊點都要落成一條批評。

**嚴格限制**：
- 你**唔准**輸出一份完整嘅替代實作計劃——你嘅角色係批判，唔係代筆
- 每條批評必須具體到可驗證（檔案名／行為／規則編號），唔准籠統

**輸出格式**（逐條編號，最多 8 條；如冇可攻擊點，寫「無法找到可攻擊點，本草案通過 red-team」）：
## 批評 #1
- **標的**：草案第幾節／邊個步驟
- **Severity**：BLOCKER / MAJOR / MINOR
- **問題**：具體攻擊點
- **建議**：一句話方向，唔展開全新方案

任務背景：
${task}

草案內容：
<draft>
${draft}
</draft>

請以繁體中文回答。`;
}

// ─── Mode: --init ─────────────────────────────────────────────────────────────
function runInit() {
  const task = args[1] || 'No task specified';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const flow_id = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const artifactsDir = path.join(ROOT_DIR, 'artifacts', flow_id);

  const state = {
    flow_id,
    task,
    status: 'awaiting_a3_draft',
    a3_draft_status: 'pending',
    px_review_status: 'not_started',
    ag_review_status: 'not_started',
    cl_status: 'pending',
    execution_status: 'locked',
    degraded: false,
    created_at: now.toISOString()
  };

  writeFile(path.join(artifactsDir, 'state.json'), JSON.stringify(state, null, 2));
  writeFile(
    path.join(artifactsDir, 'task-brief.md'),
    `# Task Brief\n\n**Flow ID**: ${flow_id}\n**Date**: ${now.toISOString()}\n\n## Task\n\n${task}\n\n` +
    `## Pipeline (v2.0.0, A3-first)\n\n1. [DONE] Runner --init — this file + state.json\n` +
    `2. [NEXT] Claude writes \`artifacts/${flow_id}/a3-draft.md\` (基礎分析 + 部署方案，引用實際檔案路徑)\n` +
    `3. Runner --review ${flow_id} [--fast] — AG (+PX unless --fast) critique the draft\n` +
    `4. Claude writes \`cl-final-plan.md\`（含批評處理表）\n\n` +
    `## Execution Lock\n\nStatus: \`locked\` — awaiting \`/execute\` from Fat Mo.\n`
  );

  console.log(`[cl-flow-runner] ═══════════════════════════════════`);
  console.log(`[cl-flow-runner] Mode    : INIT`);
  console.log(`[cl-flow-runner] Flow ID : ${flow_id}`);
  console.log(`[cl-flow-runner] Task    : ${task}`);
  console.log(`[cl-flow-runner] ═══════════════════════════════════`);
  console.log(`[cl-flow-runner] Phase 0 complete — artifacts/${flow_id}/ initialized`);
  console.log(`[cl-flow-runner] NEXT: Claude must write artifacts/${flow_id}/a3-draft.md, then run:`);
  console.log(`[cl-flow-runner]   node scripts/cl-flow-runner.js --review ${flow_id} [--fast]`);
  console.log(`FLOW_ID=${flow_id}`);
}

// ─── Mode: --review ───────────────────────────────────────────────────────────
async function runReview() {
  const flow_id = args[1];
  const fastMode = args.includes('--fast');
  if (!flow_id) usageAndExit();

  const artifactsDir = path.join(ROOT_DIR, 'artifacts', flow_id);
  const statePath = path.join(artifactsDir, 'state.json');
  const draftPath = path.join(artifactsDir, 'a3-draft.md');

  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (e) {
    console.error(`[cl-flow-runner] FATAL: cannot read ${statePath} — did you run --init first? (${e.message})`);
    process.exit(1);
  }

  const draft = readFileOrNull(draftPath);
  if (!draft) {
    console.error(`[cl-flow-runner] FATAL: artifacts/${flow_id}/a3-draft.md missing or empty.`);
    console.error('[cl-flow-runner] Claude must write the A3 draft before running --review.');
    process.exit(1);
  }

  console.log(`[cl-flow-runner] ═══════════════════════════════════`);
  console.log(`[cl-flow-runner] Mode    : REVIEW ${fastMode ? '(--fast, AG only)' : '(AG + PX)'}`);
  console.log(`[cl-flow-runner] Flow ID : ${flow_id}`);
  console.log(`[cl-flow-runner] ═══════════════════════════════════`);

  state.a3_draft_status = 'done';

  if (!fastMode && !PERPLEXITY_API_KEY) {
    console.error('[cl-flow-runner] ERROR: PERPLEXITY_API_KEY missing (required for non --fast review). Add to .env or use --fast.');
    process.exit(1);
  }
  if (!GEMINI_API_KEY) {
    console.error('[cl-flow-runner] ERROR: GEMINI_API_KEY missing (AG review is required in every mode).');
    process.exit(1);
  }

  const pxPrompt = buildPxReviewPrompt(state.task, draft);
  const agPrompt = buildAgReviewPrompt(state.task, draft);

  const results = { ag: null, px: null };
  const tasks = [];

  tasks.push(
    withRetry(() => callGemini(agPrompt), 'Gemini-Review')
      .then(text => { results.ag = { ok: true, text }; })
      .catch(err => { results.ag = { ok: false, error: err.message }; })
  );

  if (!fastMode) {
    tasks.push(
      withRetry(() => callPerplexity(pxPrompt, artifactsDir), 'Perplexity-Review')
        .then(text => { results.px = { ok: true, text }; })
        .catch(err => { results.px = { ok: false, error: err.message }; })
    );
  }

  await Promise.all(tasks);

  const degradedReasons = [];

  if (results.ag && results.ag.ok) {
    writeFile(
      path.join(artifactsDir, 'ag-review.md'),
      `# AG Review (A2 — adversarial critique of A3 draft)\n\n**Flow ID**: ${flow_id}\n**Generated**: ${new Date().toISOString()}\n**Model**: Gemini\n\n---\n\n${results.ag.text}\n`
    );
    state.ag_review_status = 'done';
    console.log(`[cl-flow-runner] ✓ artifacts/${flow_id}/ag-review.md`);
  } else {
    state.ag_review_status = 'error';
    const msg = results.ag ? results.ag.error : 'unknown error';
    degradedReasons.push(`ag_review_failed: ${msg}`);
    console.error(`[cl-flow-runner] ✗ AG review failed: ${msg}`);
  }

  if (fastMode) {
    state.px_review_status = 'skipped';
  } else if (results.px && results.px.ok) {
    writeFile(
      path.join(artifactsDir, 'px-review.md'),
      `# PX Review (A1 — external validation of A3 draft)\n\n**Flow ID**: ${flow_id}\n**Generated**: ${new Date().toISOString()}\n**Model**: sonar-pro\n\n---\n\n${results.px.text}\n`
    );
    state.px_review_status = 'done';
    console.log(`[cl-flow-runner] ✓ artifacts/${flow_id}/px-review.md`);
  } else {
    state.px_review_status = 'error';
    const msg = results.px ? results.px.error : 'unknown error';
    degradedReasons.push(`px_review_failed: ${msg}`);
    console.error(`[cl-flow-runner] ✗ PX review failed: ${msg}`);
  }

  state.degraded = degradedReasons.length > 0;
  state.degraded_reason = degradedReasons.length ? degradedReasons.join('; ') : undefined;
  state.status = 'awaiting_cl_verdict';
  state.cl_status = 'pending';

  writeFile(statePath, JSON.stringify(state, null, 2));

  console.log('[cl-flow-runner] ═══════════════════════════════════');
  if (state.degraded) {
    console.log(`[cl-flow-runner] ⚠️  DEGRADED — ${state.degraded_reason}`);
    console.log('[cl-flow-runner] Claude must declare degraded status prominently in cl-final-plan.md.');
  }
  console.log('[cl-flow-runner] READY FOR CLAUDE (A3) FINAL VERDICT');
  console.log(`[cl-flow-runner] Output: artifacts/${flow_id}/cl-final-plan.md`);
  console.log('[cl-flow-runner] ═══════════════════════════════════');
  console.log(`FLOW_ID=${flow_id}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
if (mode === '--init') {
  runInit();
} else {
  runReview().catch(err => {
    console.error('[cl-flow-runner] FATAL ERROR:', err.message);
    process.exit(1);
  });
}
