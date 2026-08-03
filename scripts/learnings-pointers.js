#!/usr/bin/env node
// scripts/learnings-pointers.js
// FHS learnings 分桶重構（2026-08-03，flow 2026-08-03-2003）— 跨桶指標（pointer）生成器。
//
// 讀取 .fhs/memory/learnings/{supabase,frontend,finance,n8n,governance,tooling}.md
// 中每條教訓的 `` `@主桶 +副桶...` `` tag，為每個副桶生成一行指標，寫回該副桶檔尾
// <!-- POINTERS:BEGIN --> ... <!-- POINTERS:END --> 之間。
//
// 安全機制（A2 對抗評審 #3 採納）：覆寫前先解析現有 POINTERS 區塊，若發現含
// `^\d+\.\s` 正式編號條目（代表有人誤把真教訓寫入此區塊），立即 ERROR 中斷、
// 拒絕覆寫、非零 exit code——防止靜默刪除誤植的正式知識。
//
// Usage: node scripts/learnings-pointers.js [--dry-run]

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LEARNINGS_DIR = path.join(REPO_ROOT, '.fhs/memory/learnings');
const BUCKETS = ['supabase', 'frontend', 'finance', 'n8n', 'governance', 'tooling'];
const DRY_RUN = process.argv.includes('--dry-run');

const TAG_RE = /`@([a-z0-9]+)((?:\s\+[a-z0-9]+)*)`/;
const ENTRY_RE = /^(\d+)\.\s(?:【[^】]*】\s*)?\*\*(.+?)\*\*/;
const ENTRY_PLAIN_RE = /^(\d+)\.\s(.+?)(?:：|$)/;
const POINTERS_BEGIN = /<!-- POINTERS:BEGIN[^>]*-->/;
const POINTERS_END = /<!-- POINTERS:END\s*-->/;

function fail(msg) {
  process.stderr.write(`[learnings-pointers] ERROR: ${msg}\n`);
  process.exit(1);
}

function readBucket(bucket) {
  const p = path.join(LEARNINGS_DIR, `${bucket}.md`);
  if (!fs.existsSync(p)) fail(`桶檔不存在: ${p}`);
  return { bucket, path: p, content: fs.readFileSync(p, 'utf8') };
}

// 抽取單一桶檔內全部「主文」條目（排除 POINTERS 區塊本身，避免生成器讀到自己上次的輸出）
function extractEntries(content) {
  const beginIdx = content.search(POINTERS_BEGIN);
  const body = beginIdx === -1 ? content : content.slice(0, beginIdx);
  const lines = body.split(/\r?\n/);
  const entries = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s/);
    if (!m) continue;
    // 直接沿用文字本身寫死的編號（m[1]）——同一桶內 Patterns/Pitfalls/Preferences/
    // 財務核心 各小節各自從 1 重新起跳，pointer 引用嘅係「該小節內第幾條」，
    // 不是全檔連續計數。桶內若有多個小節同時出現相同數字（如 Pitfalls #1 與
    // Preferences #1），下游使用 pointer 時需連同章節上下文閱讀，此工具僅原樣轉錄
    // 檔內編號，不做去歧義。
    const localNum = parseInt(m[1], 10);
    const tagMatch = line.match(TAG_RE);
    if (!tagMatch) continue;
    const mainBucket = tagMatch[1];
    const secondaryBuckets = (tagMatch[2].match(/[a-z0-9]+/g) || []);
    let title = '';
    const boldMatch = line.match(ENTRY_RE);
    if (boldMatch) {
      title = boldMatch[2];
    } else {
      const plainMatch = line.match(ENTRY_PLAIN_RE);
      title = plainMatch ? plainMatch[2] : line.slice(0, 60);
    }
    entries.push({ localNum, mainBucket, secondaryBuckets, title: title.trim() });
  }
  return entries;
}

// 安全檢查：現有 POINTERS 區塊若含正式編號條目（^\d+\.\s），代表誤植，拒絕覆寫
function assertPointersBlockSafe(bucket, content) {
  const beginMatch = content.match(POINTERS_BEGIN);
  const endMatch = content.match(POINTERS_END);
  if (!beginMatch || !endMatch) {
    fail(`${bucket}.md 缺少 POINTERS:BEGIN/END 標記，無法安全覆寫（請先手動補上空白區塊）`);
  }
  const beginIdx = content.indexOf(beginMatch[0]) + beginMatch[0].length;
  const endIdx = content.indexOf(endMatch[0]);
  if (endIdx < beginIdx) fail(`${bucket}.md 的 POINTERS:END 出現在 BEGIN 之前，格式損毀`);
  const region = content.slice(beginIdx, endIdx);
  const contaminated = region.split(/\r?\n/).some(l => /^\d+\.\s/.test(l.trim()));
  if (contaminated) {
    fail(
      `${bucket}.md 的 POINTERS 區塊內偵測到正式編號條目（^\\d+\\.\\s），疑似有人誤把真教訓寫入此區塊。\n` +
      `拒絕覆寫以防靜默刪除該內容——請人手檢查 ${bucket}.md 的 POINTERS:BEGIN/END 之間，把誤植的條目移回正文小節後，重新執行本腳本。`
    );
  }
}

function main() {
  const buckets = BUCKETS.map(readBucket);

  // 收集全部跨桶指標需求：secondaryBucket -> [{mainBucket, num, title}]
  const pointersNeeded = {};
  for (const b of BUCKETS) pointersNeeded[b] = [];

  for (const { bucket, content } of buckets) {
    const entries = extractEntries(content);
    for (const e of entries) {
      for (const sec of e.secondaryBuckets) {
        if (!BUCKETS.includes(sec)) {
          fail(`${bucket}.md 條目 #${e.localNum} 的 +${sec} 不在白名單桶名內（${BUCKETS.join('/')}）`);
        }
        pointersNeeded[sec].push({ mainBucket: e.mainBucket, num: e.localNum, title: e.title });
      }
    }
  }

  let totalWritten = 0;
  for (const { bucket, path: bucketPath, content } of buckets) {
    assertPointersBlockSafe(bucket, content);

    const needed = pointersNeeded[bucket];
    let block;
    if (needed.length === 0) {
      block = '### 跨領域指標（全文在別桶）\n（本桶目前無跨領域條目）';
    } else {
      const lines = needed
        .map(n => `- → \`${n.mainBucket}.md\` #${n.num} ${n.title}`)
        .join('\n');
      block = `### 跨領域指標（全文在別桶）\n${lines}`;
    }

    const newRegion = `<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->\n${block}\n<!-- POINTERS:END -->`;
    const newContent = content.replace(
      new RegExp(POINTERS_BEGIN.source + '[\\s\\S]*?' + POINTERS_END.source),
      newRegion
    );

    if (newContent === content) {
      continue; // 無變化，不寫檔
    }

    totalWritten += 1;
    if (DRY_RUN) {
      process.stdout.write(`[dry-run] ${bucket}.md 將更新 POINTERS 區塊（${needed.length} 條指標）\n`);
    } else {
      fs.writeFileSync(bucketPath, newContent, 'utf8');
      process.stdout.write(`[learnings-pointers] ${bucket}.md 已更新（${needed.length} 條指標）\n`);
    }
  }

  if (totalWritten === 0) {
    process.stdout.write('[learnings-pointers] 全部桶檔 POINTERS 區塊已是最新，無需更動\n');
  }
}

main();
