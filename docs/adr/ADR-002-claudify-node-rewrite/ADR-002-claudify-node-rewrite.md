# ADR-002: Claudify Rewrite — Node-Based Implementation with Lock-File State Model

This is a pointer document that always reflects the **current accepted version**
of this ADR. When the decision is revised, create a new versioned file in this
folder and update this pointer.

## Current version

[ADR-002-claudify-node-rewrite-0.0.1.md](./ADR-002-claudify-node-rewrite-0.0.1.md) — Proposed (2026-06-18)

## Version history

- **0.0.1** (2026-06-18) — Proposed. Replace the bash `bin/claudify` with the
  Node implementation in `claudify/`, renamed to `claudify` throughout, with
  the bash version's safety features (self-test gate, backup, tamper detection)
  ported in before the bash version is removed. Execute as three sequential
  PRs (rename + path fix → safety-feature port → bash deprecation).
