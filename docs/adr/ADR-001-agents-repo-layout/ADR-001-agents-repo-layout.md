# ADR-001: Global Agents Repository Layout — Visible Source with a `.agents/` Overlay

This is a pointer document that always reflects the **current accepted version**
of this ADR. When the decision is revised, create a new versioned file in this
folder and update this pointer.

## Current version

[ADR-001-agents-repo-layout-0.0.4.md](./ADR-001-agents-repo-layout-0.0.4.md) — Accepted (2026-09-22)

## Version history

- **0.0.4** (2026-09-22) — Accepted. Records `remediation-planner` as a second
  non-reviewer, artifact-producing member of `agents/`: its tool grant (identical
  to `post-mortem`'s) and its narrowing (it may not implement). Every section
  enumerating the class or its members is extended to include it; the layout,
  the overlay mechanism and the tool-grant policy itself are untouched.
- **0.0.3** (2026-09-22) — Superseded by 0.0.4. Restates the `agents/` class rationale to
  cover non-reviewer, artifact-producing agents; adds a tool-grant policy
  (the narrowest grant that makes the agent's job legible, stated per agent, and the
  allowlist is not a sandbox); and
  adds a precedence entry: an agent definition may narrow the preamble and
  `rules/` for its own run, never widen them. Layout and overlay invariant
  unchanged.
- **0.0.2** (2026-09-19) — Superseded by 0.0.3. Added `agents/` as a fourth
  artifact class and stated the three-category overlay invariant.
- **0.0.1** (2026-05-28) — Superseded by 0.0.2. Initial decision: visible source
  folders (`rules/`, `skills/`, `workflows/`) at the repo root, with a hidden
  `.agents/` overlay of relative symlinks so `sync-agents` works inside the
  global repo.
