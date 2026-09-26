#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('Usage: node check-export.js <export-directory>');
const blacklist = /freehandsss|FHS_|app9GuLsW9frN4xaT|yanhei\.synology|6Ljih0hSKr9RpYNm|cztGsFXZYtvBUDA6|sbp_|X-N8N-API-KEY|final_sale_price|raw_form_state|captureFormState|Fat Mo|Edwin|SynologyDrive|Free_recorder|Lovart|canva_auto|param_memory|placement_memory|freehandsss2018/i;
const hits = [];
let scanned = 0;
function visit(dir) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    if (ent.name === '.git' || ent.name === 'node_modules') continue;
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) visit(file);
    else if (ent.isFile()) {
      scanned++;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => { if (blacklist.test(line)) hits.push(`${path.relative(root,file)}:${i+1}`); });
    }
  }
}
visit(root);
if (!blacklist.test('synthetic FHS_TEST')) throw new Error('Blacklist positive control failed');
const manifest = require('./manifest.json');
const nonSkip = manifest.files.filter(x=>x.action!=='SKIP');
const missing = nonSkip.filter(x=>!fs.existsSync(path.join(root,x.dest))).map(x=>x.dest);
const lines = rel => fs.readFileSync(path.join(root,rel),'utf8').split(/\r?\n/).length;
const budgets = {README:lines('README.md'), AGENTS:lines('AGENTS.skeleton.md')};
const ok = !hits.length && !missing.length && budgets.README <= 150 && budgets.AGENTS <= 120;
console.log(JSON.stringify({ok,scanned,blacklistHits:hits,positiveControl:'PASS',mapped:nonSkip.length,missing,budgets},null,2));
process.exitCode = ok ? 0 : 1;
