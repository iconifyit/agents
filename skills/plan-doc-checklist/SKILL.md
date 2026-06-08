---
name: plan-doc-checklist
description: >
  Persist an APPROVED plan (from the `plan` skill) as a durable, drivable
  artifact: a versioned doc at docs/plans/{slug}/{slug}-N.N.N.md whose
  "Implementation order" section IS the literal commit checklist the
  implementation walks. Committed FIRST on the new branch, before any code. Use
  after Discuss/approval, when the work is non-trivial. The `plan` skill produces
  the plan content; this skill owns persistence, versioning, and driving it.
---

# plan-doc-checklist

A plan that lives only in chat evaporates. This skill turns an **approved** plan
into a durable artifact committed on the branch *before* the first line of
implementation, whose implementation-order section is the exact list of commits
you then walk.

The discipline that makes it work: **the plan doc is not aspirational prose — it
is the checklist.** If the plan is wrong, fix the plan before writing the code.

## Relationship to the `plan` skill (don't restate — reference)

The **`plan` skill** produces the plan *content* and its section structure
(Scope Contract, Summary, Assumptions, Proposed Approach, Likely Files, Design
Notes, Risks / Edge Cases, Test Plan, Verification Plan, Documentation / ADR
Needs, Approval Required). **Do not re-derive or re-template those sections
here** — run the `plan` skill, get approval, and use its output as the body of
the doc.

This skill adds only what persistence requires on top of that body:

1. **A `docs/plans/{slug}/` home with semantic versioning.**
2. **An `## Implementation order` section** — the heart of the doc and the one
   thing the `plan` skill's output doesn't already give you in commit-walkable
   form (see below).
3. **A `## Code being removed` section** — if the `plan` output didn't already
   enumerate it (the `documentation` rule requires it for ADRs; carry the same
   discipline into plan docs).
4. **The commit-first + amend-in-PR discipline.**

## When to use

- After the Discuss stage, once the `plan` skill's output is **approved** and
  the work is non-trivial (more than a one-or-two commit change).
- Skip for trivial work (typo, one-line fix) — the ceremony would exceed the
  task.
- For changes with a significant *design decision*, also write an ADR (the
  `adr-authoring` skill); the plan doc covers *how/when*, the ADR covers *why*.

## Where it lives

```
docs/plans/
  {slug}/
    {slug}-0.0.1.md      # initial version
    {slug}-0.0.2.md      # revision (previous marked [DEPRECATED])
```

- `{slug}` is a short kebab-case name for the effort (e.g.
  `output-folder-guardrails`, `filename-versioning`).
- Use **semantic versioning** in the filename. Revisions create a new file;
  the superseded version gets a `[DEPRECATED]` h1 at the top with a forward
  pointer. Do not overwrite history. (This mirrors the `documentation` rule for
  ADRs.)
- If the project keeps plans elsewhere, match the project's convention — the
  artifact matters more than the path.

## The `## Implementation order` section (the part the `plan` skill doesn't give you)

A numbered list where **each item is one focused commit**: what changes, which
files, which test proves it. This is the literal sequence the Implement stage
walks — a structured todo list mirrors it one-to-one.

```markdown
## Implementation order
1. {commit 1: what changes, which files, which test proves it}
2. {commit 2: ...}
3. {commit 3: ...}
```

Quality bar for this section:

- **Each item is independently committable and leaves the suite green.** If item
  3 can't be committed without item 4, merge them.
- It is a **checklist, not paragraphs.** If it can't be walked commit-by-commit,
  it isn't an implementation order yet.

## How to drive it

1. Take the approved `plan` output as the doc body; add the `## Implementation
   order` and `## Code being removed` sections. Fill `{slug}` and version.
2. **Commit it first** on the new branch — before any implementation code:
   `docs: add plan for {slug}`.
3. Walk the **Implementation order** list commit-by-commit. Each numbered item
   becomes one commit; mark it done as you go.
4. When implementation reveals the plan was wrong — an assumption that didn't
   hold, an edge case that was actually the common case, an API that behaves
   differently than documented — **amend the plan in the same PR.** A brief
   honest parenthetical ("original assumption X was wrong; actually Y") beats
   leaving the inaccuracy as a historical curiosity. Future readers consult the
   plan to understand why the code looks the way it does; it must read as honest.

## Anti-patterns

- **Plan-as-prose.** A narrative essay that can't be walked commit-by-commit.
  The implementation-order section must be a checklist.
- **Writing the doc after the code.** Then it's documentation, not a plan, and
  it tends to rationalize whatever got built rather than guide it.
- **Overwriting the previous version.** Revisions get a new semver file; the
  old one is marked `[DEPRECATED]`. The history is the point.
- **Skipping "Code being removed."** Dead code doesn't announce itself; naming
  removals at plan time makes cleanup part of the same PR (the
  `remove-the-obsolete` rule). Verify reachability with a real tool (esbuild
  metafile, knip, grep), not eyeballs — re-exports hide dead code.
- **Restating the `plan` skill's sections here.** Reference them; don't fork the
  template.

## See also

- `plan` skill — produces the plan content this skill persists.
- `adr-authoring` skill — for the *why* behind a significant design decision.
- `agentic-collaboration` workflow — this skill is the Document-stage artifact.
- `documentation` rule — semantic versioning and the "Code being removed"
  requirement this skill inherits.
