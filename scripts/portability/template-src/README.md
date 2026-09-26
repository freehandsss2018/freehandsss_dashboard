# {{PROJECT_NAME}} governance template

This repository is a starting point for one project. Begin here; `AGENTS.skeleton.md` and `CLAUDE.router.skeleton.md` become root files during bootstrap. The template uses project level files and contains no live credentials.

## Bootstrap in ten minutes

1. Copy the exported template into a new repository, preserving hidden directories. Run all commands from that repository root.
2. Run `node scripts/bootstrap.js --project-name "Example Project" --owner "Maintainer" --db-primary "none" --env-prefix GOV`. Use your actual values. This fills the placeholders and creates root `AGENTS.md`, `CLAUDE.md`, and project hook settings. Add this project's real domain sources to `AGENTS.md`; keep secrets outside Git.
3. Fill `.fhs/notes/Mode_Card.md` and `.claude/agents/domain-gatekeeper.skeleton.md` for the project's authority boundaries. Rename the latter to `.claude/agents/domain-gatekeeper.md` only after its source table is complete. Keep all agents in this repository's `.claude/agents/`; never install them in a user wide agent directory.
4. Review `.mcp.json.example`, `scripts/hooks/guard-rules.fhs.json`, and `.claude/settings.json` against the local environment. Supply environment variables using your secret manager. Enable hooks only after verifying each hook points inside this checkout and runs with the intended blocking semantics.
5. Run `node scripts/generate-bridges.js`. Inspect generated `.claude/commands/` and `.agents/skills/` bridges. Edit command masters under `.fhs/ai/commands/`, not generated copies. The core hooks and four suites run without downloaded packages; run `npm install` when you choose to use the optional `cl-flow` API runner and have registry access.
6. Run the four portable suites from the repository root:

   ```sh
   node scripts/hooks/test/run-fixtures.js
   node scripts/hooks/test/run-kgov-fixtures.js
   node scripts/hooks/test/run-health-fixtures.js
   node scripts/hooks/test/run-handoff-gate-tests.js
   ```

7. Put the first task and its next action in `.fhs/memory/handoff.md`; run `node scripts/hooks/session-start-sop.js` and confirm it prints the portable block. Then open a fresh local coding session and check that SessionStart prints the same block. If any step fails, keep governed writes paused and record the gap in handoff.

## Platform connections

| Platform | Entry point | Write scope |
|---|---|---|
| Claude Code | Root `CLAUDE.md`, project `.claude/commands/` and `.claude/agents/`, project hook settings | Governed writes only after hooks and project gates pass |
| VS Code local coding session | Open repository root and run the same Node commands in its terminal | Check the session's actual hook support before governed writes |
| Antigravity | Project `.agents/skills/` generated bridges | Read only until hook behavior is verified for this project |
| Mobile or chat without repository hooks | Paste the portable handoff block | Read only; return findings to a protected local writer |

The Mode Card defines the single writer matrix. A project level agent definition never belongs in a global agent directory; a global copy can silently affect another repository. In a dry run, use a clean home directory or verify agent and hook load paths explicitly.

## First work cycle

Read `AGENTS.md`, the portable block, and the one source routed by `CLAUDE.md`. Use the appropriate command master for planning, execution, or commit. Review the diff, run relevant tests, update the handoff, and record a decision when authority or architecture changes. Save planning reports under `.fhs/reports/planning/YYYY-MM-DD_topic.md` and completion reports under `.fhs/reports/completion/YYYY-MM-DD_topic.md`.

## Cross device handoff

1. Before leaving a protected local session, update the fenced `handoff` block at the top of `.fhs/memory/handoff.md`: date, objective, verified state, blockers, next action, and evidence links. Keep it readable in about one minute.
2. Copy only that block into the new conversation. On mobile or another read only client, analyze and return findings; do not edit governed repository files there.
3. Back in a protected session, compare branch and commit with the block, check for newer work on other branches, then apply findings and refresh the block. The repository handoff remains the source of truth.

## Memory and upkeep

Use `.fhs/notes/knowledge-map.md` to locate a decision, lesson, or domain source without reading the full history. `.fhs/notes/rotation-triggers.md` states when to archive and how to verify the retained portable block. Optional external note synchronization is a project decision; the repository files remain authoritative.

## Template maintenance and re-export

This exported project is a consumer. Its one writer is the hook protected local session named in the Mode Card. Keep project edits here; upstream template changes are made in the source repository, reviewed there, then exported again. In that source repository, update the manifest and clean forks, run its manifest checker, run `node scripts/portability/export-template.js --out <output-directory>`, and verify file parity, the sensitive string scan, and four portable suites in the output. Compare the new output with this project before adopting changes; do not overwrite project domain rules or memory.

See `VERSION` and `CHANGELOG.md` for template provenance and the upgrade boundary.
