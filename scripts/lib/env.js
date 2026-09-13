// scripts/lib/env.js
// FHS shared .env loader — worktree-aware fallback.
//
// Problem (回報 2026-09-13, flow 2026-09-13-0857): scripts hardcode
// `path.join(__dirname, '..', '.env')` (or bare `dotenv.config()` relying on
// process.cwd()). `.env` is gitignored, so a git worktree checkout
// (`.claude/worktrees/<name>/`) has no local copy — env vars silently come up
// missing (e.g. GEMINI_API_KEY missing → `cl-flow-runner.js --review` fails).
//
// Fix: if `<startDir>/.env` doesn't exist, resolve the main checkout via
// `git rev-parse --git-common-dir` (the common `.git` dir is always inside the
// main worktree; its parent is the main checkout root) and load `.env` from
// there instead. Never copies secrets into the worktree, never logs values —
// dotenv still reads the original file in place at whatever path is chosen.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Load .env for a script, falling back to the main checkout's .env when
 * running from a git worktree that has none of its own.
 * @param {string} startDir - usually the repo root as seen by the caller
 *   (e.g. `path.join(__dirname, '..')` from a script directly under scripts/).
 * @returns {{parsed?: object, error?: Error}} same shape as dotenv's config()
 */
function loadEnv(startDir) {
  const localEnv = path.join(startDir, '.env');
  if (fs.existsSync(localEnv)) {
    return require('dotenv').config({ path: localEnv });
  }

  try {
    const commonGitDir = execSync(
      'git rev-parse --path-format=absolute --git-common-dir',
      { cwd: startDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    const mainRoot = path.dirname(commonGitDir);
    const mainEnv = path.join(mainRoot, '.env');
    if (mainEnv !== localEnv && fs.existsSync(mainEnv)) {
      return require('dotenv').config({ path: mainEnv });
    }
  } catch (_e) {
    // Not a git repo, git unavailable, or common-dir resolution failed —
    // fall through to dotenv's own default behavior below.
  }

  // Last resort: dotenv's default (process.cwd()/.env), same as calling
  // require('dotenv').config() with no options.
  return require('dotenv').config();
}

module.exports = { loadEnv };
