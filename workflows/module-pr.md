---
name: module-pr
description: >
  Human-in-the-loop workflow for shipping ONE SOA module (or one cohesive
  concern) as a small, single-concern pull request. Use for incremental,
  multi-PR feature builds where each piece is independently mergeable.
trigger: always_on
---

# Module PR Workflow

Use this workflow to deliver a feature as a sequence of small, focused PRs —
one concern per branch/PR, merged before the next starts. It exists because
large bundled PRs cause repeated, churning reviews (one big diff is re-audited
on every push). Smaller PRs are more upfront work but far less back-and-forth.

## When to use

- Building a multi-part feature from an approved roadmap (e.g. an ADR with a
  phased plan).
- Any change large enough that bundling it would mix unrelated concerns.

## Pre-conditions

- The overall design is approved (ADR / roadmap exists).
- Working tree is clean and on the latest integration branch (`develop`).
- Only ONE feature branch open at a time (resolve the current PR first).

## Stages

### 1. Branch

`git checkout develop && git pull`, then `git checkout -b claude/<concern>`.
One concern only. Never target `main`/`master`.

### 2. Analyze

Use the `analyze` skill. Re-read the relevant ADR/roadmap section, the
conventions skill for the layer (e.g. `filesystem-soa-module`), and the real
data the module reads/writes. Confirm any decided design points.

### 3. Plan + confirm

Post a short design: entity shape, reader/writer source, service methods, and —
explicitly — the error / failure / corner cases and the test plan. Get sign-off
before writing code. (Trivial PRs may confirm inline.)

### 4. Implement

Scaffold per the conventions skill: Entity → Reader/Writer → Service → index.
JSDoc on every function; match house style. Do not import pipeline-only
surfaces; import other modules only via their `index.js`. Fix problems at the
root — never ship known-bad code or defer a fix.

### 5. Test

Unit + integration with REAL fixtures. Cover happy path, edge cases, and error
cases explicitly (not just the happy path). AI behind an injected mock agent
(assert structure, not wording); network/MCP stubbed for units, real behind
integration guards; writes honor `IS_TEST_MODE`; freeze time where it matters.
Run the targeted suite, then the FULL suite — zero regressions.

### 6. Verify

`lint:yaml` if YAML changed; manual smoke where applicable; confirm unrelated
systems still run (e.g. the pipeline). Investigate every error — never dismiss
one as "pre-existing".

### 6.5. Pre-flight review — spawn a review SUB-AGENT (do this BEFORE pushing)

Automated PR review (e.g. Copilot) re-audits the whole diff and surfaces a few
findings per push, so each unaddressed issue costs a full round-trip. Front-load
that review with a **dedicated review sub-agent** (via the Agent tool,
`general-purpose`) pointed at `git diff develop...HEAD`. A separate agent reviews
more adversarially than re-reading your own work, and catches the next round's
findings before they're filed. Address everything it flags (real issues), then
push. Also run a security review — e.g. the `security-review` skill in Claude Code — if the change touches
security-sensitive surface.

Give the sub-agent: the branch + base, the changed files, the bucket checklist
below, and the project context it needs to avoid false positives (e.g. which
files are intentionally gitignored, known-broken tooling, what's deferred to a
later PR). Require concrete findings (file:line, severity, fix) and an explicit
"nothing substantive" if clean.

Buckets the review must cover (these reviews reliably hit them):

- **Input validation:** every external/user value (settings, args, file
  contents) — guard wrong types (non-string, non-array), empty, and out-of-range
  before use; warn + fall back rather than throw.
- **Path / filesystem safety:** reject traversal (absolute, `..`); resolve
  symlinks (`realpathSync`) before containment checks; confirm a path is a
  **file** (`statSync().isFile()`) before reading; never write outside intended
  dirs; honor `IS_TEST_MODE`.
- **Portability:** no machine-specific absolute paths or personal details in
  committed code/docs — use placeholders or repo-relative refs.
- **Doc ↔ impl consistency:** JSDoc/return types/examples match what the code
  actually does; comments aren't stale.
- **Test self-containment:** tests don't depend on gitignored/personal files;
  use temp dirs + fixtures; deterministic (no readdir-order or time reliance).
- **Error paths:** failures are handled at the root (fail loud vs degrade — per
  the decided behavior), never silent.

Fix everything found here. The goal is that the pushed PR has nothing left for
the bot to flag except taste.

### 7. PR

Single concern. Honest title/body listing the real changes (no docs-only PRs;
docs/templates ride with their code). Push, address review, merge. Then delete
the branch and return to stage 1 for the next concern.

## Definition of done (every PR)

- Full suite green; new code has happy + edge + error tests.
- JSDoc complete; house style followed.
- No `src/core/pipeline` / `src/core/sources` imports from app modules.
- Each module imported only via its `index.js`.
- PR scope matches its description.

## Anti-patterns (stop and split if you see these)

- A review surfacing issues across UNRELATED areas → the branch has bundled
  concerns. Stop and split.
- A branch accreting tangential work → move it to its own branch.
- A docs-only or "ship now, fix later" impulse → fold docs into the code PR;
  fix now.

## Output

A merged, single-concern PR that advances the roadmap by exactly one piece,
with the integration branch green and ready for the next module.
