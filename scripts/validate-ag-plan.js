#!/usr/bin/env node
// scripts/validate-ag-plan.js
// FHS ag-plan Output Format Guardian
// Purpose: Ensures ag-plan.md from Gemini has required structure for cl-flow Verdict chain.
// Usage: node scripts/validate-ag-plan.js <path-to-ag-plan.md>

'use strict';

const fs = require('fs');

const REQUIRED_SECTIONS = [
  '## 1. 總結',
  '## 2. 任務拆解',
  '## 3. 影響檔案',
  '## 4. 驗證計畫',
  '## 5. 回滾計畫',
  '## 6. 風險',
];

function validateAgPlan(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[validate-ag-plan] ❌ File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  // Check required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`Missing section: "${section}"`);
    }
  }

  // Check at least one checkbox
  if (!content.includes('- [ ]')) {
    errors.push('Missing task checkboxes (- [ ])');
  }

  // Check at least one file action marker
  if (!/\[(NEW|MODIFY|DELETE)\]/i.test(content)) {
    errors.push('Missing file action markers ([NEW] / [MODIFY] / [DELETE])');
  }

  if (errors.length > 0) {
    console.warn('[validate-ag-plan] ⚠️  Format issues detected:');
    errors.forEach(e => console.warn(`  - ${e}`));
    return false;
  }

  console.log('[validate-ag-plan] ✅ ag-plan format OK');
  return true;
}

module.exports = { validateAgPlan };

// CLI usage — only when run directly, NOT when require()'d by cl-flow-runner.
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('[validate-ag-plan] Usage: node scripts/validate-ag-plan.js <path>');
    process.exit(1);
  }

  const ok = validateAgPlan(filePath);
  process.exit(ok ? 0 : 1);
}
