#!/usr/bin/env node
/**
 * scripts/canva_memory_validate.js — canva_auto/placement_memory.json schema v2 防退化校驗
 *
 * 用法：
 *   require 用法（生成器內部）：
 *     const { validateCanvaMemory } = require('./canva_memory_validate');
 *     const { errors, infos } = validateCanvaMemory(canvaData);
 *
 *   CLI 用法（canva-auto.md Stage④ 寫入後即跑，或人手隨時檢查）：
 *     node scripts/canva_memory_validate.js [path/to/placement_memory.json]
 *     （不帶參數時預設 canva_auto/placement_memory.json）
 *     exit 0 = 冇 error（可能有 info 提示）；exit 1 = 有 error，唔准當寫入完成
 *
 * 對應：/cl-flow-fast flow 2026-09-13-0857 Verdict §2.批評#5
 * 一律只做唯讀檢查，唔改任何檔案。
 */
'use strict';

const VALID_TYPES = new Set(['ai_error', 'fatmo_technique', 'tool_bug', 'manual_only', 'material']);
const PROMOTE_THRESHOLD = 3; // canva-auto.md「≥3 單收斂先升格」

function validateCanvaMemory(data) {
  const errors = [];
  const infos = [];

  if (!data || typeof data !== 'object') {
    errors.push('canva_memory_validate: 頂層唔係物件');
    return { errors, infos };
  }

  if (data.schema_version !== 2) {
    // v1 舊格式（冇 schema_version）唔算 error——只喺升級後先強制檢查
    if (data.schema_version !== undefined) {
      errors.push(`schema_version=${data.schema_version} 唔係支援嘅版本（預期 2）`);
    }
    return { errors, infos };
  }

  const rules = Array.isArray(data.rules) ? data.rules : [];
  const ruleIds = new Set();
  for (const r of rules) {
    if (!r.id) { errors.push('rules[] 有一條冇 id 嘅規則'); continue; }
    if (ruleIds.has(r.id)) errors.push(`rules[] 重複 id：${r.id}`);
    ruleIds.add(r.id);
    if (!VALID_TYPES.has(r.type)) errors.push(`規則 ${r.id} 嘅 type「${r.type}」唔屬五類`);
  }

  const cases = Array.isArray(data.cases) ? data.cases : [];
  const ruleUsageCount = {}; // rule id -> Set(order)，用嚟計未升格門檻

  for (const c of cases) {
    if (!c.order) { errors.push('有 case 冇 order 欄位'); continue; }
    if (!Array.isArray(c.lessons)) {
      errors.push(`case ${c.order} 冇 lessons[]（schema v2 下必填）`);
      continue;
    }
    if (!c.category) errors.push(`case ${c.order} 冇 category`);
    if (!c.page_count) errors.push(`case ${c.order} 冇 page_count`);

    for (let i = 0; i < c.lessons.length; i++) {
      const l = c.lessons[i];
      const where = `case ${c.order} lessons[${i}]`;
      if (l.rule !== null && l.rule !== undefined) {
        if (!ruleIds.has(l.rule)) {
          errors.push(`${where} 引用不存在嘅 rule「${l.rule}」`);
        } else {
          if (!ruleUsageCount[l.rule]) ruleUsageCount[l.rule] = new Set();
          ruleUsageCount[l.rule].add(c.order);
        }
      } else if (!l.type) {
        errors.push(`${where}：rule=null 但冇 type（單次個案必須填 type）`);
      }
      if (l.type && !VALID_TYPES.has(l.type)) {
        errors.push(`${where} 嘅 type「${l.type}」唔屬五類`);
      }
      if (!l.text) errors.push(`${where} 冇 text`);
      if (!l.page) errors.push(`${where} 冇 page`);
    }
  }

  // 💡達門檻未升格提示（non-fatal）
  for (const [ruleId, orders] of Object.entries(ruleUsageCount)) {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && !rule.promoted_to && orders.size >= PROMOTE_THRESHOLD) {
      infos.push(`💡 規則 ${ruleId} 已被 ${orders.size} 單引用（≥${PROMOTE_THRESHOLD}）但未升格（promoted_to=null）：${[...orders].join(', ')}`);
    }
  }

  // 孤兒規則（冇任何 case 引用且未升格）——資訊性，唔阻擋
  for (const r of rules) {
    if (!r.promoted_to && !ruleUsageCount[r.id]) {
      infos.push(`規則 ${r.id} 未被任何單引用亦未升格（孤兒）`);
    }
  }

  return { errors, infos };
}

module.exports = { validateCanvaMemory, VALID_TYPES, PROMOTE_THRESHOLD };

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const target = process.argv[2] || path.join(__dirname, '..', 'canva_auto', 'placement_memory.json');
  let data;
  try {
    let raw = fs.readFileSync(target, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`[canva_memory_validate] 讀取/解析失敗：${target}\n${e.message}`);
    process.exit(1);
  }
  const { errors, infos } = validateCanvaMemory(data);
  for (const w of infos) console.log(`[canva_memory_validate] ${w}`);
  for (const e of errors) console.error(`[canva_memory_validate] ✗ ${e}`);
  if (errors.length > 0) {
    console.error(`[canva_memory_validate] FAIL：${errors.length} 個 error，寫入未完成，唔准當 Stage④ 完成`);
    process.exit(1);
  }
  console.log(`[canva_memory_validate] ✓ PASS（${infos.length} 個提示，0 個 error）`);
  process.exit(0);
}
