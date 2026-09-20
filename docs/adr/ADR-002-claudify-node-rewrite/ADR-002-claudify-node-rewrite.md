# ADR-002: Claudify Rewrite

This is a pointer document that always reflects the **current accepted version**
of this ADR. When the decision is revised, create a new versioned file in this
folder and update this pointer.

## Current version

[ADR-002-claudify-node-rewrite-0.0.2.md](./ADR-002-claudify-node-rewrite-0.0.2.md) — Accepted (2026-09-20)

## Version history

- **0.0.2** (2026-09-20) — Accepted. Abandons the rewrite. `sync-agents` already
  produces byte-identical output for all three things claudify did, so the tool
  duplicated existing behavior. `bin/claudify`, `bin/agentify`, `claudify/`, and
  `docs/claudify.md` are removed and archived outside the repository.
- **0.0.1** (2026-06-18) — Superseded, never promoted past Proposed. Had proposed
  replacing the bash `bin/claudify` with a Node ESM package across three
  sequential PRs. The sequence was cancelled.
