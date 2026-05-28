# PROPOSAL — edit to `skills/plan/SKILL.md`

**Why:** Plans in the eagle-ps-plugin session didn't state an explicit scope boundary, so PRs grew by accretion (the open-folder-button PR absorbed ~12 unrelated concerns). A one-line scope contract in the plan, plus a guardrail that enforces it, gives the agent and user a shared test for "does this addition belong?" Pairs with the git-workflow.md scope-contract/three-strike proposal.

**Proposed changes:** two edits to `skills/plan/SKILL.md`.

Scott's Update : This is a great improvement. I think we need to get into the habit of executing each update via a plan that leverages skills and workflows. We need our entire process to be aligned using agentic tools. Rules, Skills, Workflows, agents, and PR reviews should be aligned and reading from the same playbook. This will give us the most predictable, auditable, and consistent results. We will likely have to create a lot of the plumbing as we go initially, but over time we can build out a robust set of tools that make it easier and easier to follow the process. The plan skill is a great place to start, since it's the foundation for how we scope and execute work. By adding a scope contract and guardrails to the plan skill, we can set clear expectations for how work should be scoped



---

## Edit 1 — add a "Scope Contract" line to the Output template

In the `## Output` section's markdown template, add a Scope Contract right after the title, before `## Summary`:

```markdown
# Plan: {task}

## Scope Contract

This plan does **{one sentence: X}**, and nothing else. Anything that surfaces
during implementation but isn't required for X to work or ship becomes a
follow-up, not a mid-stream addition.

## Summary

Brief description of the proposed work.
```

## Edit 2 — add two guardrails to the Guardrails section

Append to the existing `## Guardrails` list:

```markdown
- Open the plan with a one-line scope contract; treat it as the test for whether mid-implementation additions belong (default new concerns to a follow-up PR).
- If implementation would accumulate three additions beyond the scope contract, stop and surface the drift (split / merge-and-restart / abandon-and-recut) rather than letting the PR sprawl.
```
