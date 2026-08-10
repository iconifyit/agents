# ADR-002: Claudify Rewrite — Node-Based Implementation with Lock-File State Model

- **Status:** Proposed (2026-06-18)
- **Version:** 0.0.1
- **Author:** Scott Lewis (with Claude as collaborator)
- **Supersedes:** None

## Context

The current `bin/claudify` (bash, ~700 lines) shipped in PR #8 (2026-06-07). It mirrors this repo's rules / skills / workflows into `~/.claude/` via `@`-imports inside a sentinel block in `CLAUDE.md`, plus per-file symlinks under `skills/` and `commands/`. Its safety stack is the load-bearing feature: a self-test gate against `tmp/claude-test/` (with codified negative scenarios + tamper detection) runs before every live invocation, timestamped backups go to `data/claude-backups/<ts>/` with 7-day retention, and a typed-`claude` confirmation prompt guards the final apply.

A structurally more mature design surfaced separately on a work-laptop development branch and was delivered as a patch into `claudify/` (a self-contained Node ESM package, currently named `agentify`). It brings three capabilities the bash version doesn't have:

1. **Lock-file state model** (`.claudify.lock`) that records every managed entry, enabling a principled distinction between "wrong symlink we made before" (safe to repair) and "wrong symlink someone else made" (refuse).
2. **Two scopes** — `user` (global `~/.claude/`) and `project` (per-repo `<project>/.claude/` with relative symlink targets) — for per-project Claude configuration without polluting the global config.
3. **`--audit` mode**, a read-only drift check exiting non-zero on any drift, suited to CI gating.

The Node version also has node:test unit tests (~400 lines), which the bash version lacks. But it lacks the bash version's safety belt — no self-test gate, no pre-write backup, no tamper-detection on pre-existing content.

The question is whether to converge on one implementation and which capabilities to preserve.

## Decision

**Replace the bash `bin/claudify` with the Node-based implementation in `claudify/`, renamed to `claudify` throughout, with the bash version's safety features ported in before the bash version is removed.**

Executed as three sequential, independently-reviewable PRs:

1. **PR A — Make the Node tool runnable here under the name `claudify`.** No new features. Rename `agentify` → `claudify` in every artifact (package name, bin name, env var, lock filename, sentinel-block ID, help text, tests). Fix the hardcoded `DEFAULT_GLOBAL_AGENTS_ROOT` (currently a work-laptop path) to derive from the script's own location with the existing `CLAUDIFY_AGENTS_ROOT` env var as override. Remove the binary `sync-agents-add-on.zip` distribution artifact. Verify the existing test suite passes against the renamed code, plus a manual smoke test against this repo. Both implementations coexist after this PR.

2. **PR B — Port the bash safety features into the Node implementation.** Add `src/backup.js` (timestamped backup of `CLAUDE.md` + non-symlink content under `skills/` and `commands/` to `data/claude-backups/<YYYYMMDD-HHMMSS>/` with 7-day retention prune at start of live run). Add `src/self-test.js` (sandbox-bootstrap → reconcile → assertions → negative-scenario synthesis → idempotency check, gating the live apply). Add inode-based tamper detection for `find-skills/SKILL.md` and any other pre-existing content. Wire both into `index.js` ahead of `applyPlan` in user-scope live mode. Unit tests for each new module.

3. **PR C — Deprecate and remove the bash version.** Delete `bin/claudify`. Update `docs/claudify.md` to reference the Node tool. Add documented `$PATH` integration (via `npm link` or a manual symlink to `~/.local/bin/claudify`). Optionally revise this ADR to 0.0.2 — Accepted — with implementation learnings.

The bash version stays installed and functional after PR A and PR B; PR C is gated on the Node version being demonstrably safe-feature-complete and verified against `~/.claude/` in a real live run.

## Findings / rationale

These shaped the decision; each was checked against the actual code rather than assumed.

1. **The lock-file state model is strictly better than heuristic ownership detection.** The bash version treats every symlink at an expected target path that doesn't point to our `$REPO_ROOT/skills/<name>` as "stale, abort" — conflating "we made it and it drifted" (safe to repair) with "user made it for their own reasons" (must refuse). The Node version's `.claudify.lock` makes ownership explicit and auditable: a `REPAIR` action applies only to entries already in the lock; anything else is a collision. Inspect a JSON file to know what's managed, instead of running scans.

2. **Project scope is a capability the bash version was never going to grow into.** A per-project `.claude/` mirror with relative symlink targets is the right shape for repos that want their own rule layering on top of (or separate from) the global. Adding this to bash would have meant another scope flag, a second sentinel block format, and a different symlink resolution strategy — three meaningful complications.

3. **`--audit` mode unlocks CI integration.** A read-only "is this still in sync?" check is what a pre-merge or pre-deploy job needs. The bash version's `--dry-run` is for interactive preview; its exit-code contract conflates "blocking issue found" with "would write something." `--audit` exits non-zero only on drift, which is a cleaner signal for automation.

4. **Node's unit tests and the bash version's self-test gate are not interchangeable.** node:test unit tests validate the reconcile / lock-file / managed-block logic at the function level. The self-test gate validates the end-to-end safety nets against a realistic sandbox before each live invocation, including synthesized collision / stale / orphan scenarios. They cover different failure surfaces; keep both.

5. **Renaming now is the right time to standardize the name.** "agentify" already names the per-project linker described in ADR-001's "Tooling direction" section. Keeping the Node sync tool named "agentify" guarantees ambiguity (two tools, both named agentify, doing different things). The name `claudify` matches what the tool does — sync content into Claude's expected layout — and matches the bash version it replaces.

6. **Deferring the rewrite costs more than executing it.** The Node version exists, has tests, and is structurally better. Continuing to iterate on the bash version means later porting any new bash work to Node as well, plus carrying two mental models in the interim.

## Code being removed

- `bin/claudify` (bash, ~700 lines) — removed in PR C, after the Node version is feature-complete and validated.
- `claudify/sync-agents-add-on.zip` (43 KB binary; a packaged duplicate of the source) — removed in PR A as a distribution artifact, not source.
- All `agentify` naming inside `claudify/` (npm package name, bin name, `AGENTIFY_AGENTS_ROOT` env var, `.agentify.lock` filename, `agentify:rules` sentinel-block ID, help text, test fixtures, comments) — replaced with `claudify` in PR A.
- The hardcoded `DEFAULT_GLOBAL_AGENTS_ROOT = '/Users/qia377/github/acme/cof-sandbox/acme-context'` constant in `claudify/src/config.js` — replaced with a script-location-derived default in PR A.

## Consequences

### Positive

- **One tool, one mental model.** `claudify` becomes the single name to learn; behavior is consistent across user and project scopes.
- **Managed state is explicit.** The lock file is inspectable, version-controlled in shape, and recoverable from `git history` if accidentally deleted.
- **Project scope enables per-repo Claude configuration** without polluting `~/.claude/`. A project can layer its own rules on top of (or differently from) the global set.
- **`--audit` mode unlocks CI drift detection.**
- **Two layers of safety net:** node:test unit tests verify the logic; the ported self-test gate verifies the end-to-end behavior against a sandbox each live run.
- **Easier to extend.** Future features (e.g., `--remove`, `--force-repair`, per-scope retention) are straightforward in Node and would have been substantial in bash.

### Negative / risks

- **More moving parts.** A Node package with its own `package.json`, `src/`, `test/`, and eventually `node_modules/` after `npm install`. The bash version was zero-dependency. Mitigation: `claudify/` is self-contained; running it requires only Node ≥18.
- **Lock file is a new failure mode.** If hand-edited or accidentally deleted, the reconcile model loses its ownership memory and falls back to collision-refuse for every previously-managed entry. Recoverable (remove our symlinks → reconcile rebuilds them) but adds a friction point.
- **Hardcoded-path footgun under `npm install -g`.** Deriving `DEFAULT_GLOBAL_AGENTS_ROOT` from the script's own location works when the tool runs from the repo or via a symlink in `$PATH`; under `npm install -g` the script lives under `<prefix>/lib/node_modules/`, not in the agents repo. Documented limitation; the `CLAUDIFY_AGENTS_ROOT` env var is the supported workaround.
- **Both implementations coexist during PRs A and B.** Documented as transitional; users default to the Node version once PR A lands; PR C resolves the duplication.

### Neutral

- **Confirmation UX differs.** The bash version uses typed-`claude`; the Node version currently uses `y/N`. Decision deferred to PR B: switching to typed-`claudify` matches the bash discipline; staying with `y/N` is lower-friction. The default in this ADR is to switch to typed-`claudify` for consistency, but is open to revision.
- **Backup-and-self-test apply to both scopes** by default. The self-test sandbox is more obviously useful for user-scope (touching `~/.claude/`) than for project-scope (touching `<project>/.claude/`); applying both unconditionally is the conservative default and can be revisited if friction emerges.

## Alternatives considered

- **A1 — Keep both implementations indefinitely.** Bash for user-scope global sync, Node for project-scope + audit. Rejected: two implementations of the same idea is real maintenance debt, splits documentation, and creates "which one do I use?" ambiguity. The Node user-scope is functionally a superset once safety features are ported.

- **A2 — Port the Node version's structural improvements (lock file, scopes, `--audit`) back into bash.** Rejected: bash is poorly suited to the lock-file state machine. Adding a JSON lock to bash requires Python or `jq` as a runtime dependency; the per-scope path handling, the diff algorithm, and the lock-aware collision resolution grow substantially harder in shell. Implementation complexity grows faster in bash than in Node for this shape of problem.

- **A3 — Drop the bash safety features (self-test gate, backup) and ship the Node version as-is.** Rejected: those features have caught real conditions in testing — collision, stale, and orphan synthesis were each verified by the self-test gate during PR #8 development. The Node version's lock-file model addresses *part* of one (principled collision detection by ownership) but does not replace pre-write backup or sandbox-gated apply.

- **A4 — Defer the rewrite; continue iterating on the bash version.** Rejected: the Node version exists, has tests, and is structurally better. Deferring discards the existing work, accumulates more bash changes that would later need porting anyway, and prolongs the "which tool?" ambiguity.

- **A5 — Keep the Node version named `agentify` (its current internal name).** Rejected: "agentify" already names the per-project linker described in ADR-001's "Tooling direction." Two tools with the same name doing different things is a documentation and onboarding hazard. Renaming to `claudify` matches what the tool does and matches the bash version it replaces.

## Implementation plan reference

The per-PR work plan lives at `docs/plans/claudify-node-rewrite/claudify-node-rewrite-0.0.1.md` (to be created on the implementation branch before any code, per the `plan-doc-checklist` skill). The plan's "Implementation order" section is the literal commit checklist that PRs A, B, and C walk.
