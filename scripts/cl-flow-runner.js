#!/usr/bin/env node
// scripts/cl-flow-runner.js
// FHS True 1-Click /cl-flow Coordinator Runner
// Version: v1.0.0
// Purpose: Headless orchestrator — calls Perplexity + Gemini in parallel,
//          writes real artifacts to artifacts/{flow_id}/, then hands off to Claude.

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ─── Environment Check ───────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!PERPLEXITY_API_KEY || !GEMINI_API_KEY) {
  console.error('[cl-flow-runner] ERROR: Missing required API keys.');
  if (!PERPLEXITY_API_KEY) console.error('  Missing: PERPLEXITY_API_KEY');
  if (!GEMINI_API_KEY)     console.error('  Missing: GEMINI_API_KEY');
  console.error('  Add both keys to .env and retry.');
  process.exit(1);
}

// ─── Config ──────────────────────────────────────────────────────────────────
const task = process.argv[2] || 'No task specified';
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const flow_id = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const ROOT_DIR = path.join(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts', flow_id);

// ─── File Utils ──────────────────────────────────────────────────────────────
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// ─── API: Perplexity ─────────────────────────────────────────────────────────
function callPerplexity(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'sonar-reasoning-pro',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000
    });

    const options = {
      hostname: 'api.perplexity.ai',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    let data = '';
    const req = https.request(options, res => {
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error('Perplexity API error: ' + json.error.message));
          resolve(json.choices[0].message.content);
        } catch (e) {
          reject(new Error('Perplexity parse error: ' + e.message + '\nRaw: ' + data.substring(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Perplexity timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── API: Gemini ─────────────────────────────────────────────────────────────
function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4000 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

// ─── Codebase Context (Repomix) ───────────────────────────────────────────────
function getCodebaseContext() {
  try {
    const result = execSync(
      'npx repomix --style plain --ignore "artifacts/,node_modules/,*.xlsx,*.log,.git/" .',
      { cwd: ROOT_DIR, timeout: 60000, maxBuffer: 800 * 1024 }
    );
    const raw = result.toString('utf8');
    // Cap at 25k chars to avoid Gemini token overflow
    return raw.length > 25000 ? raw.substring(0, 25000) + '\n...(truncated)' : raw;
  } catch (e) {
    console.warn('[cl-flow-runner] repomix unavailable, using minimal context');
    return `Project: FHS Dashboard (freehandsss_dashboard)\nTask: ${task}\n(Full codebase context unavailable — repomix not installed or failed)`;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[cl-flow-runner] ═══════════════════════════════════`);
  console.log(`[cl-flow-runner] Flow ID : ${flow_id}`);
  console.log(`[cl-flow-runner] Task    : ${task}`);
  console.log(`[cl-flow-runner] ═══════════════════════════════════`);

  // ── Phase 0: Initialize ───────────────────────────────────────────────────
  const state = {
    flow_id,
    task,
    status: 'planning',
    px_status: 'pending',
    ag_status: 'pending',
    cl_status: 'pending',
    execution_status: 'locked',
    created_at: now.toISOString()
  };

  writeFile(path.join(ARTIFACTS_DIR, 'state.json'), JSON.stringify(state, null, 2));
  writeFile(
    path.join(ARTIFACTS_DIR, 'task-brief.md'),
    `# Task Brief\n\n**Flow ID**: ${flow_id}\n**Date**: ${now.toISOString()}\n\n## Task\n\n${task}\n\n## Execution Lock\n\nStatus: \`locked\` — awaiting \`/execute\` from Fat Mo.\n`
  );

  console.log(`[cl-flow-runner] Phase 0 complete — artifacts/${flow_id}/ initialized`);

  // ── Phase 1: Parallel PX + AG ─────────────────────────────────────────────
  console.log('[cl-flow-runner] Phase 1 — launching PX + AG in parallel...');

  const pxPrompt =
`你是一位外部技術研究員，專門研究業界最佳實踐、技術風險與類似系統案例。
請針對以下軟體開發任務，從**外部技術視角**（業界標準、已知風險、相似系統經驗）產出研究報告。
不需要分析任何內部代碼，只需基於你的技術知識與業界經驗作答。

報告必須包含以下 6 個章節（缺一不可）：
## 1. 目標 (Objective) — 用業界標準語言重新描述此任務的本質
## 2. 限制 (Constraints) — 此類系統通常面臨的技術與環境限制
## 3. 風險 (Risks) — 至少 3 項業界已知風險，每項說明影響等級（High/Med/Low）
## 4. 假設 (Assumptions) — 此方案成立的前提假設
## 5. 成功標準 (Success Criteria) — 可量化的驗收標準
## 6. 範圍外項目 (Out of Scope) — 明確排除哪些常見擴充

任務描述：
${task}

請以繁體中文回答，每節清晰標題，內容基於業界經驗，具體可操作。`;

  const codebaseContext = getCodebaseContext();

  const agPrompt =
`你是 FHS 系統的本地技術實作規劃師（Antigravity A2 角色）。
以下是當前專案代碼庫的上下文（供你理解現有架構）：

<codebase>
${codebaseContext}
</codebase>

請針對以下任務，產出完整的本地技術實作計劃。

計劃必須包含以下 6 個章節（缺一不可）：
## 1. 總結 (Executive Summary)
## 2. 任務拆解 (Task Breakdown) — 分 Phase，每步驟有 checkbox
## 3. 影響檔案 (Impacted Files) — 每項標記 [NEW] / [MODIFY] / [DELETE]
## 4. 驗證計畫 (Verification Plan) — 包含測試步驟與預期結果
## 5. 回滾計畫 (Rollback Plan)
## 6. 風險及緩解措施 (Risks & Mitigations) — 表格格式

任務描述：
${task}

請以繁體中文回答，結構清晰，內容精準可執行。`;

  try {
    const [pxResult, agResult] = await Promise.all([
      withRetry(() => callPerplexity(pxPrompt), 'Perplexity'),
      withRetry(() => callGemini(agPrompt), 'Gemini')
    ]);

    // ── Write Artifacts ────────────────────────────────────────────────────
    writeFile(
      path.join(ARTIFACTS_DIR, 'px-report.md'),
      `# PX Report (A1)\n\n**Flow ID**: ${flow_id}\n**Generated**: ${new Date().toISOString()}\n**Model**: sonar-reasoning-pro\n\n---\n\n${pxResult}\n`
    );

    writeFile(
      path.join(ARTIFACTS_DIR, 'ag-plan.md'),
      `# AG Plan (A2)\n\n**Flow ID**: ${flow_id}\n**Generated**: ${new Date().toISOString()}\n**Model**: Gemini\n\n---\n\n${agResult}\n`
    );

    // ── Update State ───────────────────────────────────────────────────────
    state.px_status = 'done';
    state.ag_status = 'done';
    state.status = 'awaiting_cl_review';
    writeFile(path.join(ARTIFACTS_DIR, 'state.json'), JSON.stringify(state, null, 2));

    console.log('[cl-flow-runner] Phase 1 complete.');
    console.log(`[cl-flow-runner] ✓ artifacts/${flow_id}/px-report.md`);
    console.log(`[cl-flow-runner] ✓ artifacts/${flow_id}/ag-plan.md`);
    console.log('[cl-flow-runner] ═══════════════════════════════════');
    console.log('[cl-flow-runner] READY FOR CLAUDE REVIEW');
    console.log(`[cl-flow-runner] Read: artifacts/${flow_id}/task-brief.md`);
    console.log(`[cl-flow-runner] Read: artifacts/${flow_id}/px-report.md`);
    console.log(`[cl-flow-runner] Read: artifacts/${flow_id}/ag-plan.md`);
    console.log(`[cl-flow-runner] Output: artifacts/${flow_id}/cl-final-plan.md`);
    console.log('[cl-flow-runner] ═══════════════════════════════════');
    // Machine-readable marker for Claude to extract flow_id
    console.log(`FLOW_ID=${flow_id}`);

  } catch (err) {
    state.status = 'error';
    state.error = err.message;
    writeFile(path.join(ARTIFACTS_DIR, 'state.json'), JSON.stringify(state, null, 2));
    console.error('[cl-flow-runner] FATAL ERROR:', err.message);
    console.error('[cl-flow-runner] Check state.json for details.');
    process.exit(1);
  }
}

main();
