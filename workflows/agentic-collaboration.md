---
name: agentic-collaboration
description: >
  A portable, multi-step cadence for collaborating with AI coding agents on
  non-trivial work — describe, analyze, plan, discuss, document, implement,
  verify — plus the standing disciplines (one PR at a time, scope contracts,
  plan-doc-as-checklist) and guidance on scaling from single- to multi-agent.
  Use when setting up or running an agentic collaboration workflow on a project.
---

# Agentic Collaboration Workflow

> Version: 0.0.2 · Date: 2026-05-25
> A portable pattern for working with AI coding agents on non-trivial software projects.

This document captures a multi-step collaboration pattern between a human and one or more coding agents that has held up across bug fixes, feature work, refactors, and architecture-level changes. It is **portable** — written to apply to any project a team runs with AI assistance, not tied to one codebase. Concrete examples from one team's adoption are cited where they illustrate the pattern but never as required context.

The pattern's purpose is to prevent the default failure mode of agentic coding: *"user asks → agent does → user reviews diff."* That loop works for trivial changes; it breaks down for anything with design surface, cross-cutting concerns, or non-obvious tradeoffs. The cadence below has different work happening at different steps so the small stuff stays cheap while the big stuff stays correct.

---

## The seven-step cadence

Each step has a distinct purpose. Not every step runs for every task — small work can collapse Describe + Analyze + Plan into a single sentence; large work expands every step into its own round.

### 1. Describe (human → agent)

The human states intent, context, references, target outcome. **Not the implementation — the problem.** The instinct to pre-design the solution at this step costs more turns than it saves; the agent's analysis often surfaces options the human didn't see.

A good describe is one to three sentences plus any pointers to files / issues / prior conversations the agent will need.

### 2. Analyze (agent → human)

The agent reads the actual code, docs, and state. Reports findings (and any gaps in the human's description) *before* proposing anything.

**Read the actual file every time** rather than paraphrasing from prior context. Summaries decay; the file is canonical. There is a recurring failure mode where an agent cites a doc from a prior conversation's summary, misses a section that was added since, and recommends the wrong thing. The cost of one extra file read is dwarfed by the cost of a wrong-direction PR.

**Sometimes "analyze" means a small spike, not just reading.** When the relevant behavior isn't documented — a third-party library's edge cases, an encoder's undocumented defaults, an OS-level interaction — the only way to know the truth is to probe it. Write a 50-line script, run it, inspect the output, throw the script away. Doing this BEFORE the plan is cheap; discovering the behavior was different during implementation costs a planning round AND a rewrite. The spike's findings belong in the plan doc (so a future reader knows the assumption was tested, not assumed).

### 3. Plan (agent → human)

The agent proposes a concrete approach: files to change, tests to write, ADR or doc impact, explicit out-of-scope items, risks. **No code at this step.**

When there are real branches in the decision tree, use a structured-choice mechanism (e.g. the agent presents 2–4 concrete options with a "Something else" escape) rather than asking open-ended *"what should we do?"* questions. Option-laden questions compress decision loops dramatically.

### 4. Discuss (human ↔ agent)

The human accepts, redirects, or asks for another planning round. **Still no code.** Most planning rounds resolve in one turn; the ones that don't typically have a missing constraint that the agent didn't know about.

### 5. Document (agent → repo)

For non-trivial work, the plan goes into a file: `docs/plans/{slug}/{slug}-N.N.N.md` (or whatever convention the team uses). It is **committed first on the new branch** as the implementation's checklist — the "Implementation order" section gets walked commit-by-commit during the next step.

For substantial design decisions, an ADR with semantic versioning. Mark superseded ADR versions `[DEPRECATED]` at the top with a forward pointer to the current version. **Supersession can be scoped to specific sections** — e.g. v0.0.3 supersedes v0.0.2's §4 only; the rest of v0.0.2 remains canonical. This preserves the history of decisions without forcing every doc rewrite to be all-or-nothing.

### 6. Implement (agent → repo)

Branch off the integration branch (typically `develop`). Branch names prefixed with a convention that distinguishes agent-authored work (e.g. `claude/`). Tasks tracked via a structured todo list with one item in-progress at a time; commit-per-task with focused messages. Each task ends with the test suite green — never accumulate broken intermediate states.

When the implementation deviates from the plan, **update the plan or stop and re-discuss**. Don't silently drift.

### 7. Verify (agent → human → agent)

Tests + lint + build artifact rebuild. Open a PR whose body cites the plan doc and the acceptance criteria. Request an AI code review (e.g. GitHub Copilot's pull-request reviewer) at PR creation; spawn a background watcher to poll for the review without burning the main session's context.

Apply a **review-response policy**: code findings get fixes; cosmetic / wording findings get a brief "leaving per policy" reply. Push fixes; re-request review (note: some AI reviewers' re-request endpoints silently no-op after submit — the UI "re-request" button is the reliable path).

### Iterate

If verification surfaces issues, return to Plan (or Describe if the surface changed materially). Don't paper over a real design issue with a quick code patch.

---

## Standing disciplines that make the cadence work

These are the rules that, if dropped, cause the cadence to collapse back into the default failure mode.

- **One PR at a time** against the integration branch. Resolve the current PR (merge or close) before starting the next branch. Two parallel PRs fragment review attention and complicate merge ordering.
- **No co-author lines in commit messages.** Agent-authored commits are implicitly co-authored; explicit "Co-Authored-By" lines add noise without information.
- **`.claude/STATE.md` (or equivalent) for resume.** Before closing a long session, write a self-contained state file: current branch, what landed, what's pending, standing policies, how-to-resume sequence. The cold-check on resume is `git fetch origin --prune && git status && <your PR-listing command>` — e.g. `gh pr list --state open` if the team uses GitHub + the `gh` CLI; substitute whatever shows open PRs against the integration branch for your forge.
- **Memory for cross-session truths.** Use a persistent memory layer for: user preferences, project facts that change slowly, references to external systems, validated approaches (confirmation memories, not just correction memories). Do *not* use memory for: code patterns derivable by reading the repo, ephemeral task state, anything already in project-level instruction files.
- **Plan doc as implementation checklist.** The plan committed in step 5 is not aspirational — it is the literal list of commits the implementation step walks. If the plan is wrong, fix the plan before writing the code.
- **Amend the plan in the same PR when implementation surfaces a planning-time inaccuracy.** Plans are durable artifacts that future readers consult to understand *why* the code looks the way it does. When implementation discovers the plan was wrong about something — an assumption that didn't hold, an edge case that was actually the common case, a library API that doesn't behave as documented — fix the plan text in the same PR rather than leaving the inaccuracy as a "historical curiosity." Future readers shouldn't have to cross-reference the implementation against the plan to know which parts of the plan are still true. The amendment can be a brief parenthetical noting the original assumption was wrong, not a wholesale rewrite — just enough that the plan reads as honest documentation of what was learned.
- **ADR semantic versioning with scoped supersession.** Don't rewrite history; mark old versions `[DEPRECATED]` and link forward. Allow supersession to be scoped to sections so partial revisions don't invalidate unrelated material.
- **Atomic git commits via heredoc-to-file when in doubt.** Inline `git commit -m "$(cat <<'EOF'…EOF)"` is fragile under shell escaping when the body contains backticks or apostrophes. Write the message to `/tmp/commit-msg-X.txt` and use `git commit -F <file>`.
- **Verify post-commit on case-insensitive filesystems.** macOS / Windows can swallow case mismatches in `git add` paths. `git show --stat HEAD` after every commit catches the "I added the file but git already tracked it under a different case" trap.

---

## Scaling: single-agent → multi-agent

The default is **single-agent**. Multi-agent should only be added when serial work is the actual bottleneck — not when "more agents sounds faster." Brooks' law (adding people to a late project makes it later) applies to agents too; coordination cost can swamp parallelism gains.

### Configuration heuristic

| Project shape | Configuration | Rationale |
|---|---|---|
| Single fix / small feature | Single agent, current workflow | Coordination overhead exceeds parallelism savings |
| Larger feature with independent subsystems | Lead + 2–3 worker agents in isolated worktrees | Lead owns plan; workers execute disjoint pieces; lead integrates at PR boundary |
| Big refactor / migration | Planner + N layer-workers + reviewer | Planner does architecture once; workers parallel on layers; reviewer cross-checks |
| Spike / research | One agent issues parallel research subagents | A pattern most agentic tools already support — formalize it as a pattern, not a new tool |

### Patterns worth using

- **Map-reduce on independent units.** Lead decomposes the work; workers execute in isolated worktrees; lead integrates results. The plan-doc-as-checklist from step 5 is the natural handoff artifact — each worker gets the plan and a section of the implementation order to walk.
- **Role specialization (often serial, not parallel).** Different prompts / contexts for different cognitive jobs — planner, implementer, reviewer. They take turns rather than running concurrently. This is what the seven-step cadence above is implicitly doing within a single agent; formalizing the roles is the iteration.
- **Independent feature branches.** Git is the coordination layer. Worktrees + PRs are how human teams handle independent parallel work; multi-agent inherits the same primitives.

### Patterns to avoid

- **Custom messaging bus between agents.** Real-time chatter has high context-switching cost — every message read is a token spent.
- **Central coordinator registry.** State to maintain is not work getting done.
- **File-level locks.** Git is already the lock for code-shaped work.
- **Agents that "talk" mid-task.** Each turn doubles context window pressure.

### What modern agentic tooling already gives you

No new infrastructure is required to start with multi-agent — most tools (e.g. Claude Code) already expose:

- A subagent / Agent tool for spawning specialized workers
- Worktree-isolated execution so parallel workers don't trample each other
- Background tasks for async polling / watching
- A memory layer for cross-session state
- The plan-doc artifact for sequential handoff

The deeper coordination-mechanism design (when to use shared state vs. message passing, role taxonomy, conflict resolution policy) is a follow-up topic. Start with the patterns above; iterate based on what friction actually emerges.

---

## Design philosophy the agent should adopt (not impose)

The agent's instinct is often to apply textbook OOP patterns everywhere — interfaces, base classes, getter/setter ceremony, single-responsibility splits for every concern. That instinct produces clean-looking architecture diagrams and bloated, unused code.

**Match the codebase's actual style, not the architecture you'd write fresh.** Read the existing modules. If they use a specific pattern (factory functions, mixin composition, no-base-class flat services), follow it. If you find yourself proposing a different pattern, **first ask whether the existing pattern is wrong, OR whether you're substituting your taste for the codebase's discipline**.

**Don't wrap system APIs without adding value.** A class that wraps `fs.readFile` and adds nothing is just noise — call `fs.readFile` directly. Wrap only when the wrapper does something concrete (validation, security gate, retry, race-safety, an actually-substituted test seam). `fs` itself doesn't split read/write into separate modules; don't invent splits the underlying library didn't.

**The discipline test for adding any abstraction:** ask *"what does this add over calling the underlying thing directly?"* If the answer is "nothing — it's just delegation" or "consistency with the pattern," delete it. If the answer is concrete, keep it.

**For service-oriented architecture (SOA) modules, OOP earns its keep** — but apply the pattern, don't worship it:

- **`BaseService`** — shared properties + behavior across services. Subclasses extend it. **Only if there's actually shared content** — an empty base class waiting for subclasses to fill in is YAGNI cosplay.
- **`BaseRepository` / `BaseStore`** (or whatever name matches the actual storage mechanism — pick the name that fits the domain, don't force "Repository" everywhere) — shared storage behavior.
- **`BaseEntity`** — shared entity behavior (field storage, freezing, cloning, serialisation, schema versioning).
- **Mixins** (`withCacheable`, `withFreezable`, `withCloneable`, etc.) — for behavior shared by SOME but not ALL subclasses. Don't force an unwanted behavior onto a subclass via inheritance; compose via mixin so subclasses opt in.

**The anti-pattern this rule was added to prevent**: across a project's lifetime, the agent created `FileReader`, `FileWriter`, and `FileSystemService` as three separate classes. `FileReader` had one method (`readFile`) that just delegated to `fs.readFile`. Nothing actually used `FileReader` — the runtime called `fs.readFile` directly. `FileWriter` had real value (a test-mode protected-path guard). `FileSystemService` composed only `FileWriter`. The architecture was asymmetric, and the read-side abstraction was pure dead weight. The lesson: **one `FileSystemService` with `readFile` + `writeFile` methods** would have matched what Node's `fs` does, would have been simpler, and would have avoided creating dead code in the first place.

---

## Anti-patterns observed in real sessions

These are mistakes from actual collaboration sessions. Concrete enough to teach with.

- **Paraphrasing instead of reading.** Citing a file from a prior conversation's summary instead of opening the file. Misses anything added since the summary was written. Lesson: when a file is referenced, read it before recapping.
- **Letting commits drift via case-sensitive `git add`.** Adding `src/common/fileWriter.js` (lowercase) on a macOS case-insensitive filesystem where git tracks the file as `FileWriter.js` (capital). Only the test gets staged; the source file change goes missing. Lesson: `git show --stat HEAD` after every commit.
- **Test assertions too strict for race scenarios.** Asserting a concurrent operation will produce a specific deterministic outcome (e.g. *"the two suffixes will be `''` and `'-1'`"*) when the actual race can resolve multiple correct ways. Lesson: assert *invariants* (no overwrites, complete pairs, all results distinct), not specific outcomes, when the test exercises real concurrency.
- **Inline heredoc commit messages.** Single-quoted heredoc delimiters in `git commit -m "$(cat <<'EOF'…EOF)"` get tripped by literal apostrophes or backticks inside the body under some shell-escaping paths. Lesson: write commit messages to a temp file and use `git commit -F <file>`.
- **Adding optional fields with defaults instead of making them required.** Tempting because it "doesn't break existing tests." But optional-with-default fields hide state — required fields force every construction site to think about the value, which catches the regression of "I forgot to wire this through." Lesson: prefer required + explicit-default-at-construction over optional + magic-default.
- **Re-requesting an AI reviewer after a code change and assuming it ran.** Some review bots' re-request APIs silently no-op after the bot has already reviewed once. The reply on the comment is the audit trail either way; the UI button is the reliable path for a fresh pass.
- **Starting a "small" parallel PR while the current one is in review.** Two parallel PRs fragment review attention, complicate merge ordering, and erode the linear-history discipline. Resolve current before next, even when next "seems orthogonal."
- **Cross-module contract drift between caller and callee.** When the same shared module is called from multiple places, validating inputs differently at each call site leads to format-dependent or caller-dependent surprises that are hard to debug — value X is accepted via one path and rejected via another, with the error surface depending on which downstream code happens to break first. Lesson: validate the same shape at every entry point that funnels into the shared module. The cleanest implementation is a shared validator helper that the entry points all call; the discipline alone (without the helper) drifts as code evolves.
- **Overwrite-only-the-last-instance for "exactly one of X" constraints.** When a format spec or invariant says "exactly one of X is allowed" and the implementation walks a list while tracking only the *last* X seen (`while …: lastX = current`), a malformed input with multiple X's leaves duplicates in the output — the loop overwrites the cursor on each match but never strips the earlier ones. Lesson: collect *all* instances and strip them, then insert exactly one fresh. The "rebuild the stream skipping all matches" pattern is two lines longer than "track the last match" and always produces a spec-conformant output regardless of input pathology.

---

## Pointers to artifacts (from one team's adoption)

The team that derived this pattern (an Eagle plugin project) uses these artifacts as the as-written form of the abstractions above. They're concrete examples, not required context.

- **Plan docs:** `docs/plans/{slug}/{slug}-N.N.N.md` per implementation effort. Each plan opens with goal + acceptance criteria, lists the implementation order as the literal commit checklist, and explicitly enumerates out-of-scope items.
- **ADR supersession chain:** `docs/adr/ADR-001/` runs from v0.0.1 (deprecated) through v0.0.4 (current). Each superseded version carries a `[DEPRECATED]` h1 + forward-pointer note. v0.0.3 superseded v0.0.2's §4 only; v0.0.4 superseded v0.0.3's §2 only. Demonstrates scoped supersession.
- **PR + review-watcher pattern:** AI reviewer requested at PR creation; a background subagent polls the reviews API for the response and reports back when the review posts.
- **STATE handoff:** `.claude/STATE.md` is written before any long break (lunch, end of day, end of session). The cold-check sequence at the bottom (`git fetch && git status && gh pr list`) lets the next session pick up cleanly without context excavation.
- **Memory for promises:** when a discussion surfaces a follow-up that isn't this PR's job, the promise gets saved to a memory file (typed "project" or "feedback") so the next session sees it automatically.

---

## Out of scope of this document

- **Coordination-mechanism design for multi-agent.** The framing is here; the protocol design (shared state schema, message format, role taxonomy, conflict resolution) is a deferred topic. Pick a small experiment when the need arises.
- **Tooling automation around the pattern.** No CLI, no template generator, no project-init script. The pattern is described; teams adopt it manually. Automation comes later if/when actual reuse demands it.
- **Prescriptive templates.** This doc describes the shape of plan docs and ADRs in prose rather than shipping template files. Each project's templates should reflect the project's own conventions.
- **Tool-specific instructions.** Agentic tooling evolves rapidly; pinning commands or flags here would date the doc within months. Adapt the pattern to whatever tool the team is using.

---

## Evolve this document

This document started as v0.0.1 (written immediately after the pattern that produced it was fresh in head). v0.0.2 added four patterns surfaced over the next session: the "spike as part of Analyze" extension in step 2, the "amend the plan in the same PR when implementation surfaces a planning-time inaccuracy" standing discipline, and two new anti-patterns (cross-module contract drift, overwrite-only-the-last-instance for exactly-one constraints). Continue to refine through reuse:

- Each session that adopts the pattern should be willing to amend this doc when something doesn't translate — that's exactly what produced v0.0.2.
- New anti-patterns observed in real work belong in the anti-patterns section.
- The scaling section will get sharper as multi-agent experiments accumulate.
- Promote to a shared-across-projects location (`@agents` skill, team wiki, etc.) once two or three teams have used it and the project-specific seams have been smoothed.
