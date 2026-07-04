---
name: Subagent & Skill Installation Learnings
description: Key patterns from curating 3 subagents + 1 skill from 230+ external modules
type: feedback
---

## Problem: Module Overload
**Situation**: Three GitHub sources (agency-agents ~150 modules, andrej-karpathy-skills 4 items, everything-claude-code 36+ agents + 156+ skills) = 230+ candidates for only 6 enhancement goals.

**Solution Pattern**: Goal-driven filtering matrix
1. Segment by FHS tech stack (HTML/CSS/JS/Python, not Go/Rust/Java)
2. Evaluate against specific use case (Airtable optimization, Dashboard execution, Database/n8n writing, Code/debug/testing, Finance calc, System memory)
3. Reject modules that would add hooks (continuous token cost per action)
4. Select only on-demand architectures (zero baseline cost)

**Why**: Hook-based patterns like ECC commands fire on every action, turning one-time installation into permanent cost overhead. On-demand subagents cost only when explicitly invoked.

**How to apply**: When evaluating external agent repos, first ask "Does this fire automatically?" If yes, redesign as on-demand. For future agent sourcing, filter GitHub repos by README keywords: "on-demand", "stateless", "pay-per-use".

---

## Problem: Skill Redundancy
**Situation**: karpathy-principles skill would duplicate AGENTS.md rules (both define best practices). Risk: two sources of truth, contradictory guidance.

**Solution Pattern**: Merge at principle level, not as standalone skill
1. Extract single novel concept (Goal-Driven Execution = define success criteria + verification loop + stop-when-uncertain)
2. Merge into constitutional layer (AGENTS.md §Goal-Driven Execution)
3. Skip standalone skill file (avoid duplication)

**Why**: AGENTS.md is authoritative rule source. Adding skill creates maintenance debt and splits authority.

**How to apply**: Before creating new skill, ask "Is this already covered by AGENTS.md?" If overlapping, merge the novel part into AGENTS.md instead of standalone file.

---

## Problem: Finance Calculator Scope Creep
**Situation**: Initial version too detailed (~50+ lines with examples, edge case commentary). Conflicts with token optimization goal and finance-calculator's intended use as reference layer only.

**Solution Pattern**: Size-capped reference skills (≤30 lines)
1. Include only core formulas (Profit, Gross_Margin%, AOV)
2. Link to authoritative source (FHS_Product_Bible_V3.7.md)
3. State front-end priority rule (profit≠0 is final)
4. Skip redundant commentary (keep SKILL.md executable, not pedagogical)

**Why**: Skills are read on-demand, not cached. Larger = slower lookup, higher token cost per read. Reference layers should be queryable, not tutorial-style.

**How to apply**: For finance/calculation skills, measure in "executable lines" (formulas + inputs + outputs) not "documentation lines". Treat like database schema design—normalized, not denormalized.

---

## Problem: Runtime Sync Pattern Ambiguity
**Situation**: Are subagents source-of-truth in `.fhs/ai/subagents/freehandsss/` or in `~/.claude/agents/freehandsss/`? Do edits go to one or both?

**Solution Pattern**: Copy pattern with source priority
1. Source of truth: `.fhs/ai/subagents/freehandsss/` (version controlled, can be git-tracked)
2. Runtime copies: `~/.claude/agents/freehandsss/` (symlinks or manual mirrors, consumed by agent invocation)
3. Edit rule: Always modify source, then propagate to runtime copies

**Why**: Single source prevents version skew. Runtime copies need identical content so agent behavior is predictable regardless of invocation path.

**How to apply**: When updating subagent, create checklist: (1) Edit .fhs source, (2) Verify copy in ~/.claude, (3) Test agent behavior. If copy is missing, agent invocation will fail silently.

---

## Problem: Completion Report Requirement Clarity
**Situation**: When does a task require formal completion report? Initial uncertainty about "制度任務" (systemic/institutional task) vs regular code work.

**Solution Pattern**: Completion report triggers
- **Triggers formal report**: AGENTS.md modified, new subagent/skill added to MANIFEST.md, .fhs/ai/ architecture changed, repo-map.md updated
- **Does NOT trigger**: Regular bug fixes, code edits to business logic, n8n workflow updates, dashboard styling

**Why**: Completion reports are audit trail for structural changes. They help future sessions understand why architectural decisions were made.

**How to apply**: If your change touches `.fhs/ai/` layer or AGENTS.md, assume formal report needed. Create in `.fhs/notes/completion_reports/YYYY-MM-DD_task_slug_completion_report.md` per AGENTS.md §制度任務完成記錄強制律.

---

## Problem: Token Optimization Metrics
**Situation**: How to verify "token optimization" actually achieved? Need concrete baselines.

**Solution Pattern**: Measure five dimensions
1. **Baseline cost**: Zero for on-demand (invoked only when user requests)
2. **Runtime copy sync**: 2x file size (acceptable, both needed)
3. **Model selection**: Haiku for diagnostic (50% cost vs Sonnet for same task)
4. **Skill size**: ≤30 lines for reference layers (vs 50+ line tutorials)
5. **Hook frequency**: Zero hook-based patterns in installation

**Why**: Without metrics, "optimized" is subjective. Baseline zero cost is only achievable with on-demand, not hook-based.

**How to apply**: When installing future modules, measure against these five criteria and document in completion report.
