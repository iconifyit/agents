# PROPOSAL — edit to `workflows/architecture-change.md`

**Why:** ADR-002 in the eagle-ps-plugin superseded the Orchestrator/detection subsystem, but the workflow's Implement stage said only "do not introduce unrelated refactors" — nothing about *removing* the code the ADR supersedes. So the dead subsystem lingered for days, kept alive in the bundle by a ghost re-export, and bloated the packed plugin until the user noticed. The pivot PR should delete the superseded code in the same PR that lands the new design.

**Proposed change:** extend the `### 6. Implement` stage's Rules list, and add a verification bullet to `### 7. Verify`.

---

## Edit 1 — add to the `### 6. Implement` Rules

Append to the Implement-stage Rules list:

```markdown
- If the ADR supersedes existing code (its "Code being removed" section is non-empty), DELETE that code in THIS PR. The pivot and the cleanup are one change, not two. Leaving superseded code "for reference" is what git history is for.
- Before deleting, confirm reachability with a real tool — an esbuild `--metafile` audit, `knip`, or the stack's equivalent. Re-exports in `index.js` files keep superseded code reachable from the bundle even when nothing invokes it directly; eyeball analysis misses these "ghost imports."
```

## Edit 2 — add to the `### 7. Verify` checklist

Append to the Verify list:

```markdown
- Dead-code sweep: confirm the superseded code is actually gone from the reachable graph (not just unreferenced in source but still bundled via a re-export), and that the dependency manifest dropped any packages only the removed code needed.
```
