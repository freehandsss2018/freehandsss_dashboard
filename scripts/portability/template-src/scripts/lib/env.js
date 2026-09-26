// Load local environment values without copying secrets between worktrees.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function loadEnv(startDir) {
  const local = path.join(startDir, '.env');
  if (fs.existsSync(local)) return require('dotenv').config({ path: local });
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd: startDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const primary = path.join(path.dirname(common), '.env');
    if (primary !== local && fs.existsSync(primary)) return require('dotenv').config({ path: primary });
  } catch (_) { /* Git or worktree metadata unavailable */ }
  return { parsed: {} };
}
module.exports = { loadEnv };
