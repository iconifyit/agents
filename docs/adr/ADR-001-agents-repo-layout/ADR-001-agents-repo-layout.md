# ADR-001: Global Agents Repository Layout — Visible Source with a `.agents/` Overlay

This is a pointer document that always reflects the **current accepted version**
of this ADR. When the decision is revised, create a new versioned file in this
folder and update this pointer.

## Current version

[ADR-001-agents-repo-layout-0.0.1.md](./ADR-001-agents-repo-layout-0.0.1.md) — Accepted (2026-05-28)

## Version history

- **0.0.1** (2026-05-28) — Accepted. Initial decision: visible source folders
  (`rules/`, `skills/`, `workflows/`) at the repo root, with a hidden `.agents/`
  overlay of relative symlinks so `sync-agents` works inside the global repo.
