# {{PROJECT_NAME}} — agent entry

Owner: {{OWNER}}. Read this file at the start of repository work. Replace the placeholders before live use.

## Authority and routing

1. User instructions and the current task define the objective. Keep project decisions in `.fhs/notes/decisions.md` and current state in `.fhs/memory/handoff.md`.
2. Load only the document needed for the task. Start with `.fhs/ai/governance/00_INDEX.md`; do not bulk read large histories, generated files, or logs.
3. Commands live in `.fhs/ai/commands/`. Generated platform bridges only point to those masters. Edit the master, then regenerate bridges.
4. Before changing architecture, write a concrete proposal and obtain the owner's decision. Record the decision after implementation.
5. Domain rules belong in the section below and their dedicated source files. An agent must not invent a missing business definition.

## Work discipline

- Check repository status and current handoff before edits. Preserve unrelated changes.
- Identify the smallest affected surface, inspect nearby code, and make focused changes.
- For bulk changes: count exact matches before replacement, edit, then count and inspect the diff.
- For critical changes, use independent review or runtime evidence before claiming completion.
- Keep secrets in environment variables or an approved secret manager; commit examples with placeholders only.
- Record unresolved work in handoff with a named next action and evidence path.
- Report what changed, verification performed, and any remaining limitation.

## Platform access

- Follow `.fhs/notes/Mode_Card.md` for tool choice and the single writer matrix.
- Install agents only in this repository's `.claude/agents/` directory.
- Mobile and read only clients use the portable handoff block; they do not write governed files.
- Antigravity bridges are generated under `.agents/skills/`. Hook enforcement must be checked separately before granting write authority.

## Business rules — fill for this project

- Product or service definitions: [link]
- Data model and primary database: {{DB_PRIMARY}}; [schema link]
- Environment variable prefix: `{{ENV_PREFIX}}_`
- Protected files and approval boundaries: [list]
- Required independent reviewers: [list]
- Deployment and rollback evidence: [link]

Do not begin a domain critical edit while any relevant entry above is unresolved.
