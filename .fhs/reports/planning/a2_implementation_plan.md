# Implementation Plan — Integrating `/rp` Protocol into Command Workflows

This plan outlines the design and integration of the `/rp` (Rewrite Prompt) protocol into the Freehandsss command and workflow system. The goal is to ensure high-risk or complex prompts are structured before execution, while preventing authorization scope expansion.

---

## 1. Integration Strategy

To keep the system token-efficient and secure, we divide the commands into three categories:

| Command Type | Examples | `/rp` Integration Policy |
| :--- | :--- | :--- |
| **High-Risk/Actionable** | `/execute`, `/new-product` | **Selective / Conditional**: Require `/rp` for complex inputs. Must enforce strict authorization boundaries (`<original_auth_scope>`). |
| **Investigatory/Diagnostic** | `/fhs-check`, `/fhs-audit` | **Manual / Recommended**: Suggest `/rp` when the query contains vague instructions. |
| **Purely Automated/Flows** | `/commit`, `/cl-flow` | **Exempt / Bypassed**: Strictly bypass `/rp` to prevent redundant prompt wrapping and token waste. |

---

## 2. Proposed Changes

### Component: Command & Prompt Ecosystem

#### [MODIFY] [docs/FHS_Prompts.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/docs/FHS_Prompts.md)
Add a new pre-flight interceptor rule at the top of the general routing section:
```markdown
### 0. Pre-Flight Prompt Optimization Interceptor
- **Trigger**: When a user query matches Scenario 4 (Error Eye/Debug) or Scenario 20 (Code Analysis) and contains vague keywords (e.g., "優化", "修改", "檢查").
- **Action**: Redirect the user to use `/rp [query]` first, or automatically execute the `/rp` rewrite protocol to refine the request before routing it to the target command.
```

#### [MODIFY] [d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\ai\commands\execute.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/ai/commands/execute.md)
Add a security constraint in Section 2 (Execution Rules) to prevent refined prompts from widening the authorization scope:
```markdown
### 2.4 Safety Boundaries for Refined Prompts
If the execution payload is driven by a prompt rewritten by `/rp`:
- The AI must explicitly declare the `<original_auth_scope>` based on the user's raw message.
- The modification boundaries must strictly conform to `<original_auth_scope>`. Any side-channel expansions (e.g., refactoring unrelated modules during a bug fix) are strictly prohibited.
```

#### [MODIFY] [d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\ai\commands\new-product.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/ai/commands/new-product.md)
Update Step 1 (Product Initialization) to suggest prompt optimization for complex custom SKUs:
```markdown
### Step 1 — Product Initialization
- For standard products, proceed directly with schema definitions.
- For complex composite products (e.g., custom frames with multiple addons), recommend running `/rp /new-product [product details]` first to structure the specifications and pricing components before generating database scripts.
```

#### [MODIFY] [d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\ai\commands\rp.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/ai/commands/rp.md)
Update the command side effects and compatibility mapping table:
```markdown
## Command Compatibility Map

- **`/execute`**: Supported. Focus on safety boundaries and locking `<original_auth_scope>`.
- **`/new-product`**: Supported. Focus on extracting SKU patterns and cost formulas.
- **`/commit`**: Exempt.
- **`/fhs-check`**: Recommended. Focus on specifying test cases.
```

---

## 3. Verification Plan

### Automated Checks
* Run `/fhs-audit` to ensure markdown files are syntax-valid and link references are healthy.

### Manual Verification
* Simulate a user request: `/rp /execute Fix sorting bug`.
* Verify that the rewritten prompt contains the correct `<original_auth_scope>` lock.
* Confirm that purely automated commands (like `/commit`) are not impacted or intercepted.
