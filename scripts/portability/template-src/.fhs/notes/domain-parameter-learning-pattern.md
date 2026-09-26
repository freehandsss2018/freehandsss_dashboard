# Domain parameter learning pattern

**Maturity: 2 examples, not converged (2實例未收斂).** This is a design pattern document, not executable code or an automatic learning system.

Two independent production workflows suggest the same structure: one adjusts physical production parameters; another adjusts media layout parameters. Both compare an agent's proposed values against a human approved final artifact. Their business rules and data remain outside this template.

## Three layers

1. `rules_frozen`: owner approved invariants, units, phase gates, and prohibited transformations. A case never rewrites this layer. Any change requires an explicit owner decision and separate versioned review.
2. `cases`: one record per completed job, with input context, proposed parameters, final approved parameters, evidence path, reviewer, date, and `learned` state. Store only the minimum safe information needed for comparison.
3. `convergence_log`: group repeated corrections by context and parameter. Record sample count, exceptions, and whether an observed pattern is still a hypothesis.

## Work loop

Before a new job, perform a **catch up check**: if the latest completed case is not learned, compare its final artifact with the proposal and record the difference first. Read applicable frozen rules, then find the nearest comparable cases. When no case is comparable, use documented defaults and label the proposal uncalibrated.

After review, compute a field by field difference from proposed to approved values. Record evidence and the correction in the case; set `learned: true` only when the final artifact was actually checked. Keep individual corrections in cases. Do not turn one anecdote into a rule.

## Promotion gate

A candidate rule needs **at least three independent completed cases** with the same correction direction in comparable conditions, no unexplained counterexample, and an owner or domain reviewer decision. Write the rule, the scope where it applies, and the regression evidence in a versioned domain source. A change to `rules_frozen` has its own explicit approval regardless of case count.

Only after this pattern itself has converged in at least three distinct project implementations may maintainers promote this document into an executable skeleton. Until then, treat the fields above as a review checklist.
