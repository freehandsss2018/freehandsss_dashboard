# Memory rotation triggers

Rotation preserves searchability and lowers startup cost. Back up before trimming, and leave a pointer to every archive. Never delete a decision merely to meet a line budget.

| Asset | Trigger | Required action | Verification |
|---|---|---|---|
| `.fhs/memory/handoff.md` | More than 800 lines | Copy full file to `.fhs/memory/archive/handoff-YYYY-MM.md`; retain portable block, master task table, and last five sessions | Read back block; run SessionStart hook and confirm extraction |
| `.fhs/memory/learnings.md` | More than 50 active entries | Review each candidate for supersession or duplication; archive only with evidence and index pointer | Count active entries and inspect retained links |
| Any governance document | More than 400 lines | Propose a focused reduction before changing its authority text | Owner decision and diff review |
| Example section in governance | More than 15 examples | Consolidate repeated cases while preserving distinct failures | Check every original case has a destination |
| `.fhs/notes/session-log.md` | Hard to scan in one minute | Move older entries to a dated archive; preserve newest context | Follow archive pointer from knowledge map |

For handoff rotation: create the archive directory, copy the full original, edit the active file, compare portable block and master table with the backup, then run the hook. Stop and restore from the backup if extraction fails.
