#!/usr/bin/env node
// Two-stage draft review: init creates artifacts; review calls independent reviewers.
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const ROOT = path.resolve(__dirname, '..');
require('./lib/env').loadEnv(ROOT);
const setting = key => process.env[`{{ENV_PREFIX}}_${key}`] || '';
const args = process.argv.slice(2);
const mode = args[0];
function fail(message) { console.error('[cl-flow-runner] ' + message); process.exitCode = 1; }
function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value, 'utf8'); }
function fileOrNull(file) { try { const raw = fs.readFileSync(file, 'utf8'); return raw.trim() ? raw : null; } catch (_) { return null; } }
function stateFile(dir) { return path.join(dir, 'state.json'); }
function updateState(dir, state) { write(stateFile(dir), JSON.stringify(state, null, 2) + '\n'); }
function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const raw = JSON.stringify(body);
    const req = https.request({ ...options, method: 'POST', headers: { ...options.headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          const parsed = JSON.parse(text);
          if (res.statusCode < 200 || res.statusCode >= 300 || parsed.error) throw new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || text.slice(0, 160)}`);
          resolve(parsed);
        } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => req.destroy(new Error('review request timed out')));
    req.write(raw);
    req.end();
  });
}
function reviewPrompt(task, draft, external) {
  const role = external ? 'external technical validator' : 'adversarial implementation reviewer';
  const boundary = external
    ? 'You cannot inspect the repository. Assess only external technical assumptions; do not invent file paths or claim source behavior.'
    : 'Find concrete logic gaps, edge cases, and violations of stated constraints. Do not rewrite the whole plan.';
  return `You are an ${role}. ${boundary}\nReturn numbered findings with severity BLOCKER, MAJOR, or MINOR and supporting evidence. If none, say so explicitly.\n\nTask:\n${task}\n\nDraft:\n<draft>\n${draft}\n</draft>`;
}
async function reviewGemini(prompt) {
  const key = setting('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is missing');
  const models = setting('GEMINI_MODEL_CHAIN').split(',').map(s => s.trim()).filter(Boolean);
  if (!models.length) models.push('gemini-2.5-flash');
  const errors = [];
  let partial = null;
  for (const model of models) {
    try {
      const response = await requestJson({ hostname: 'generativelanguage.googleapis.com', path: `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}` },
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: Number(setting('GEMINI_MAX_OUTPUT_TOKENS')) || 16384 } });
      const candidate = response.candidates?.[0];
      const text = (candidate?.content?.parts || []).map(p => p.text || '').join('');
      if (!text.trim()) throw new Error('empty review');
      const result = { text, model, truncated: candidate.finishReason !== 'STOP' };
      if (!result.truncated) return result;
      if (!partial || text.length > partial.text.length) partial = result;
    } catch (error) { errors.push(`${model}: ${error.message}`); }
  }
  if (partial) return partial;
  throw new Error(errors.join(' | ') || 'all model attempts failed');
}
async function reviewPerplexity(prompt) {
  const key = setting('PERPLEXITY_API_KEY');
  if (!key) throw new Error('PERPLEXITY_API_KEY is missing');
  const response = await requestJson({ hostname: 'api.perplexity.ai', path: '/chat/completions', headers: { Authorization: `Bearer ${key}` } },
    { model: setting('PERPLEXITY_MODEL') || 'sonar-pro', messages: [{ role: 'user', content: prompt }], max_tokens: 8000 });
  const choice = response.choices?.[0];
  if (!choice?.message?.content?.trim()) throw new Error('empty review');
  return { text: choice.message.content, model: response.model || 'configured model', truncated: choice.finish_reason === 'length' };
}
function init() {
  const task = args.slice(1).join(' ').trim();
  if (!task) return fail('Usage: --init "task description"');
  const now = new Date();
  const flow = `${now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)}-${process.pid}`;
  const dir = path.join(ROOT, 'artifacts', flow);
  updateState(dir, { flow_id: flow, task, status: 'awaiting_a3_draft', execution_status: 'locked', degraded: false, created_at: now.toISOString() });
  write(path.join(dir, 'task-brief.md'), `# Task Brief\n\nFlow ID: ${flow}\n\nTask: ${task}\n\nNext: write a3-draft.md with repository evidence, implementation steps, and open risks. Then run --review ${flow} [--fast]. Execution remains locked until user authorization.\n`);
  process.stdout.write(`FLOW_ID=${flow}\n`);
}
async function review() {
  const flow = args[1];
  if (!flow || !/^[a-zA-Z0-9_-]+$/.test(flow)) return fail('Usage: --review {flow_id} [--fast]');
  const fast = args.includes('--fast');
  const dir = path.join(ROOT, 'artifacts', flow);
  let state;
  try { state = JSON.parse(fs.readFileSync(stateFile(dir), 'utf8')); } catch (_) { return fail('state.json missing; run --init first'); }
  const draft = fileOrNull(path.join(dir, 'a3-draft.md'));
  if (!draft) return fail('a3-draft.md missing or empty');
  if (!setting('GEMINI_API_KEY')) return fail('GEMINI_API_KEY missing');
  if (!fast && !setting('PERPLEXITY_API_KEY')) return fail('PERPLEXITY_API_KEY missing; use --fast only when appropriate');
  const tasks = [reviewGemini(reviewPrompt(state.task, draft, false))];
  if (!fast) tasks.push(reviewPerplexity(reviewPrompt(state.task, draft, true)));
  const results = await Promise.allSettled(tasks);
  const degraded = [];
  const ag = results[0];
  if (ag.status === 'fulfilled') {
    write(path.join(dir, 'ag-review.md'), `# Adversarial review\n\nModel: ${ag.value.model}\nCoverage: ${ag.value.truncated ? 'truncated' : 'complete'}\n\n${ag.value.text}\n`);
    state.ag_review_status = ag.value.truncated ? 'done_truncated' : 'done';
    if (ag.value.truncated) degraded.push('adversarial review truncated');
  } else { state.ag_review_status = 'error'; degraded.push(`adversarial review failed: ${ag.reason.message}`); }
  if (fast) state.px_review_status = 'skipped';
  else {
    const px = results[1];
    if (px.status === 'fulfilled') {
      write(path.join(dir, 'px-review.md'), `# External validation\n\nModel: ${px.value.model}\nCoverage: ${px.value.truncated ? 'truncated' : 'complete'}\n\n${px.value.text}\n`);
      state.px_review_status = px.value.truncated ? 'done_truncated' : 'done';
      if (px.value.truncated) degraded.push('external validation truncated');
    } else { state.px_review_status = 'error'; degraded.push(`external validation failed: ${px.reason.message}`); }
  }
  state.a3_draft_status = 'done';
  state.degraded = degraded.length > 0;
  state.degraded_reason = degraded.join('; ');
  state.status = 'awaiting_cl_verdict';
  state.cl_status = 'pending';
  state.execution_status = 'locked';
  updateState(dir, state);
  process.stdout.write(`${state.degraded ? 'DEGRADED: ' + state.degraded_reason + '\n' : ''}FLOW_ID=${flow}\n`);
}
if (mode === '--init') init();
else if (mode === '--review') review().catch(error => fail(error.message));
else fail('Usage: --init "task" | --review {flow_id} [--fast]');
