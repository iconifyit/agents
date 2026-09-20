# ADR-002: Claudify Rewrite — Abandoned; `sync-agents` Already Provides the Capability

- **Status:** Accepted (2026-09-20) — supersedes 0.0.1, which proposed the rewrite
- **Version:** 0.0.2
- **Author:** Scott Lewis (with Claude as collaborator)
- **Supersedes:** [0.0.1](./ADR-002-claudify-node-rewrite-0.0.1.md) (Proposed, 2026-06-18)

## Context

Version 0.0.1 proposed replacing the bash `bin/claudify` with a Node ESM package, executed as three sequential PRs: (A) rename `agentify` → `claudify` and make it runnable, (B) port the bash version's safety features, (C) delete the bash version. That decision never reached Accepted, and none of the three PRs was completed.

The premise was that the Node package brought capability the project did not otherwise have. On examination the premise is false. `bin/claudify` was written before `sync-agents` was fully understood, and it reimplements what `sync-agents` already does.

`claudify/src/desired-state.js` — 95 lines — was the entire specification:

| Source | Destination |
| --- | --- |
| `skills/<name>/` | symlink into `.claude/skills/` |
| `workflows/*.md` | symlink into `.claude/commands/<name>.md` |
| `rules/*.md` | `@`-import block in `CLAUDE.md` |

`sync-agents` produces all three, with **byte-identical link targets**. Verified rather than assumed — `sync-agents global sync --targets claude --dry-run` emits `would link /Users/scott/.claude/commands/bugfix.md -> /Users/scott/.agents/workflows/bugfix.md` for all 11 workflows, matching exactly the links claudify had created in June. The routing is not incidental: `ArtifactWorkflow` defaults to `Invocable` (`internal/agent/semantic.go:72`), and invocable single-file artifacts land in Claude's `commands/` surface (`internal/agent/destination.go:190`).

The three capabilities 0.0.1 credited to the Node implementation:

1. **Lock-file ownership model.** `sync-agents` has the same concept — `.agents/.sync/` state, and commit `845b4de` is "refuse to delete legacy symlinks the tool does not own." claudify's version is more elaborate, but it elaborates a job `sync-agents` already does.
2. **User and project scopes.** `sync-agents global sync` and `sync-agents sync`. Fully covered.
3. **`--audit`, non-zero exit on drift.** The one genuine gap. `sync-agents status` exists but exits 0 on a clean tree; its behavior on a drifted tree was not tested. A flag-sized feature request against `sync-agents`, not grounds for a parallel tool.

Carrying it was not free. The repository shipped three tools for one job — `bin/claudify` (bash, ~700 lines), `claudify/` (Node, ~1,250 lines plus ~400 of tests), and `bin/agentify` (bash, 61 lines) — two of which installed an executable named `agentify`, so which one ran depended on `$PATH` order. 0.0.1 §A5 had itself rejected that outcome. Stale claudify-era symlinks in `~/.claude/` also outlived their source files, producing at least one dangling link (`~/.claude/rules/mundane-tasks.md`).

## Decision

**Abandon the rewrite. `sync-agents` is the single tool for syncing this repository's artifacts into Claude's layout. `claudify` and `agentify` are removed from the repository and archived outside it.**

The three-PR sequence in 0.0.1 is cancelled, not deferred. There is nothing to rename, no safety features to port, and no bash version to retire afterward — the whole line of work was addressing a gap that does not exist.

The one real gap — a drift check with a non-zero exit code for CI — is tracked against `sync-agents` rather than solved with a second tool.

## Code being removed

All of it, in the commit that lands this ADR:

| Path | Lines | What it was |
| --- | ---: | --- |
| `bin/claudify` | ~700 | the bash implementation |
| `bin/agentify` | 61 | bash per-project linker wrapping `sync-agents init`/`inherit`/`sync` |
| `claudify/` | ~1,650 | the Node ESM package, 21 files including tests |
| `docs/claudify.md` | 197 | the reference doc for the bash tool |

`bin/` is now empty and removed. Supporting references in `README.md`, `.gitignore`, `docs/troubleshooting/global-claude-inheritance-setup.md`, and `workflows/agentic-collaboration.md` are updated in the same commit, per `remove-the-obsolete`.

Everything is archived at `/Users/scott/github/_archive/claudify-20260920/` with a README recording this rationale, and everything except `claudify/sync-agents-add-on.zip` (17,683 bytes, never tracked) also remains in git history.

## Consequences

**Positive**

- One tool, one mechanism. No `$PATH` ambiguity, no divergent lock-file semantics, no question about which tool owns a given symlink.
- ~2,600 lines leave the repository without losing any capability.
- The `agentify` naming collision that 0.0.1 §A5 warned about is gone rather than scheduled for a later rename.

**Negative / risks**

- The CI drift-check gap is now unowned here. It should be filed against `sync-agents`.
- claudify's safety features — self-test gate, timestamped backups, inode tamper detection — go with it. They guarded a tool that no longer exists, but the underlying concern (a sync that silently clobbers hand-written content) still applies to `sync-agents` and is worth revisiting there.
- Project-scope equivalence was verified by reading `sync-agents`' routing table, not by running project `sync` against a real consuming repository. If project scope is used anywhere, confirm the output matches before relying on this.

## Alternatives considered

- **Complete PR A (rename) and keep both tools.** Rejected: it resolves the naming collision while preserving the duplication that caused it.
- **Keep the Node package for its `--audit` mode alone.** Rejected: ~1,650 lines to carry one missing exit code, when the exit code belongs in the tool that already does the work.
- **Delete without archiving.** Rejected: the `.zip` was never tracked, so deletion would have been its only copy, and the code represents real design thinking about ownership semantics worth consulting if `sync-agents` ever needs it.
