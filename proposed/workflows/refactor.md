# PROPOSAL — edit to `workflows/refactor.md`

**Why:** Two lessons from the eagle-ps-plugin session apply to the refactor workflow specifically: (1) dead-code removal is a legitimate refactor that should verify reachability with a tool, not eyeballs (the agent confused "in the bundle" with "actually live" until it ran an esbuild metafile audit); (2) the workflow already says "avoid broad cleanup outside scope" but the session showed refactors still sprawled — worth reinforcing with the scope-contract language now in the plan skill + git-workflow rule.

**Proposed change:** add an Analyze-stage focus item and a Verify-stage check for reachability-tool-backed dead-code work.

---

## Edit 1 — add to the `### 2. Analyze` focus list

Append:

```markdown
- Reachability: if the refactor removes code, confirm what's actually reachable using a tool (esbuild `--metafile`, `knip`, dependency-cruiser, or the stack's equivalent) — NOT eyeball analysis. Re-exports and ghost imports keep "dead-looking" code alive in the bundle, and conversely make live code look unreferenced.
```

## Edit 2 — reinforce the `### 6. Implement` Rules

The existing rules already include "Avoid bundling feature work" and "Avoid broad cleanup outside scope." Add the scope-contract tie-in:

```markdown
- Hold to the plan's scope contract. A refactor that starts touching adjacent code "while we're in here" is how a clean refactor becomes an unreviewable tangle. New cleanup opportunities discovered mid-refactor are follow-ups, not additions to this one.
```

## Edit 3 — add to the `### 7. Verify` checklist

Append:

```markdown
- If code was removed: confirm via the reachability tool that it's gone from the reachable graph (not merely unreferenced in source but still bundled), and that any dependencies only the removed code needed were dropped from the manifest.
```
