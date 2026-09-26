# {{PROJECT_NAME}} — Claude Code router

Read `AGENTS.md` first. This file routes work; the rule text stays in the linked source.

| Need | Open |
|---|---|
| Current task and next action | `.fhs/memory/handoff.md` portable block |
| Tool choice and write ownership | `.fhs/notes/Mode_Card.md` |
| Governance topic | `.fhs/ai/governance/00_INDEX.md`, then one relevant file |
| Command workflow | `.fhs/ai/commands/<name>.md` |
| Prior decision | `.fhs/notes/decisions.md` targeted search |
| Prior lesson | `.fhs/notes/knowledge-map.md`, then a targeted file |
| Agent role | `.claude/agents/<role>.md` in this repository |

Run `node scripts/generate-bridges.js` after editing command masters. Never edit generated bridges as their source of truth.
