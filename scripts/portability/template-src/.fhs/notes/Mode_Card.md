# Platform decision card

Use a hook protected local coding session for governed writes. Use read only clients for research and handoff.

| Situation | Platform and authority |
|---|---|
| Code, governance, memory, schema, deployment edits | Claude Code or a local CLI session with this repository's hooks verified |
| Inspection, planning, long form analysis | Any read only client |
| VS Code workflow | Use the repository checkout; verify hook configuration before governed edits |
| Antigravity | Read only by default; command bridges live in `.agents/skills/`. Verify hook blocking semantics separately before any governed write |
| Mobile or chat client without repository hooks | Read only; carry the portable handoff block into a protected local session |

## Single writer matrix

| Asset | Writer | Other clients |
|---|---|---|
| `.fhs/memory/`, `.fhs/notes/`, `.fhs/ai/governance/` | Hook protected local coding session | Read only |
| Project domain rules and production configuration | Hook protected local coding session after project approval gates | Read only |
| `.fhs/ai/commands/` masters | Hook protected local coding session | Read only |
| Generated `.claude/commands/` and `.agents/skills/` bridges | `node scripts/generate-bridges.js` from protected session | Read only |
| Ordinary code | A project approved writer with diff review | Read or review |
| This template repository and export sources | One hook protected local coding session | Read only |

If a client lacks verified hooks, transfer findings through the handoff block. A local writer checks the diff and runs required gates before committing.
