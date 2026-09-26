#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '../..');
const file = path.join(root, '.fhs/memory/handoff.md');
if (fs.existsSync(file)) {
  const body = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const match = body.match(/^```handoff\r?\n([\s\S]*?)^(?:─── 便攜邊界|```)\s*$/m);
  if (match && match[1].trim()) {
    const block = match[1].trimEnd();
    console.log(`Portable handoff:\n${block}`);
    if (Buffer.byteLength(block, 'utf8') > 4000) console.log('Warning: portable block exceeds 4,000 bytes.');
    const date = block.match(/\b\d{4}-\d{2}-\d{2}\b/);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    if (date && date[0] !== today) console.log(`Handoff date ${date[0]} differs from today ${today}.`);
  } else console.log('Handoff has no extractable fenced portable block.');
} else console.log('Handoff file does not exist yet.');
const health = path.join(__dirname, 'fhs-health-check.js');
if (fs.existsSync(health)) {
  const result = spawnSync(process.execPath, [health], {cwd:root, encoding:'utf8', timeout:5000});
  if (result.stdout) process.stdout.write(result.stdout);
}
