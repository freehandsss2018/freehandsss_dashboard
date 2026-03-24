# FHS Memory Engine 3.0 Local Storage

This directory stores the local high-fidelity memory for the FHS CTO Intelligence Center.

## Directory Structure

- **lessons/**: Stores atomic `.md` files for specific lessons, pitfalls, and "wrong questions" (errors).
  - Format: `YYYYMMDD_Subject.md`
- **context/**: Stores project-specific context and persistent rules that are loaded into every session.
- **handoff.md**: (Temporary) Stores the transfer state between different Claude/Cursor sessions. This file is consumed and deleted upon startup of a new session.

## Learning Cycle
1. **Detect**: Automatically identifies pitfalls or manual user corrections.
2. **Record**: Atomically writes to `lessons/`.
3. **Refine**: Applies the 4-Question decision tree during `/reflect`.
4. **Sync**: Pushes refined knowledge to the Notion Cloud Brain.
