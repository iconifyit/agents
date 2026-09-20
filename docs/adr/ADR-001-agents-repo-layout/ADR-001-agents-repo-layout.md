# ADR-001: Global Agents Repository Layout — Visible Source with a `.agents/` Overlay

This is a pointer document that always reflects the **current accepted version**
of this ADR. When the decision is revised, create a new versioned file in this
folder and update this pointer.

## Current version

[ADR-001-agents-repo-layout-0.0.2.md](./ADR-001-agents-repo-layout-0.0.2.md) — Accepted (2026-09-19)

## Version history

- **0.0.2** (2026-09-19) — Accepted. Adds `agents/` as a fourth artifact class
  (real directory at the repo root, `.agents/agents -> ../agents` in the overlay),
  and states the invariant that every root artifact directory must have a matching
  overlay symlink and vice versa. The overlay mechanism is unchanged.
- **0.0.1** (2026-05-28) — Superseded by 0.0.2. Initial decision: visible source
  folders (`rules/`, `skills/`, `workflows/`) at the repo root, with a hidden
  `.agents/` overlay of relative symlinks so `sync-agents` works inside the global
  repo.
