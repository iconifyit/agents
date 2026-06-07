---
name: session-state-handoff
description: >
  Write a self-contained STATE.md before a long break or end of session so the
  next session (or next agent) resumes cold without context excavation: current
  branch, what landed, what's pending, standing policies, and the exact resume
  sequence. Also defines the cold-check to run on resume. Use at the Wind-down
  stage of the agentic-collaboration workflow, or any time work will be paused
  and picked up later. Distinct from memory: STATE.md is per-repo and ephemeral;
  memory is cross-session durable truths.
---

# session-state-handoff

Agentic work spans sessions, context compactions, and sometimes multiple
agents. The single biggest resume cost is **re-excavating "where were we?"** —
re-reading diffs, re-deriving which branch is live, re-discovering the standing
policies. This skill eliminates that by writing a `STATE.md` the next session
reads first.

The rule: **before any long break, leave a self-contained handoff.** A good
STATE.md lets a fresh agent — with zero memory of this session — pick up
correctly from a cold start.

## STATE.md vs. memory (don't confuse them)

| | STATE.md | Memory |
|---|---|---|
| Lifespan | This effort / branch; deleted or rewritten when the work lands | Cross-session, durable |
| Scope | One repo, local only — never synced globally | Cross-session, cross-task |
| Content | "Where we are *right now* on this task" | "Truths that outlive this task" |
| Examples | current branch, pending commits, next step, blockers | user preferences, slow-changing project facts, validated approaches, external-system references |
| Authority | Snapshot in time — verify against `git` before acting on it | Verify against current code before recommending |

If you're tempted to put a code pattern, file path, or git history into
STATE.md, don't — that's derivable by reading the repo. STATE.md is about
*task state*, not *codebase state*.

## When to write it

- End of a working session.
- Before a long break (lunch, EOD) mid-task.
- Before handing the effort to another agent.
- When context is about to compact and the task isn't finished.

## Where it lives

**Default: `.claude/STATE.md` at the repo root — one live handoff, local to the
repo, overwritten each session.**

- It is **per-repo and local only.** Do NOT sync it to a global location (e.g.
  `~/.claude/`): state is specific to one project's in-flight work and is
  meaningless — or actively misleading — in another repo's context.
- One file, not a dated trail. The current state is what matters; git history
  already preserves how the work evolved.
- If a project's own rules mandate a different location/format, follow that
  project rule — but the default is `.claude/STATE.md`.

## What goes in it

1. **Objective** — one line: what this effort is trying to accomplish.
2. **Current branch & base** — branch name, what it's based on, ahead/behind.
3. **What landed** — commits/PRs already merged or pushed this effort.
4. **What's pending** — `- [ ]` checklist of remaining work, in order. The
   *next* action should be unambiguous.
5. **Blockers** — anything waiting on a human, an external system, or a
   decision.
6. **Standing policies in force** — the non-obvious rules this effort is
   operating under (e.g. "do not merge — that's the human's action", "one PR at
   a time", review-response policy). So the next agent doesn't violate them.
7. **Resume sequence** — the exact commands to run on pickup (the cold-check
   below), plus any effort-specific first step.
8. **Session pointers** — session/conversation ID if the tool supports resuming
   an interactive session, and the PR/issue numbers in play.

## The cold-check (run this on resume, before acting)

```bash
git fetch origin --prune
git status
gh pr list --state open        # or your forge's open-PR command
git branch --list 'claude/*'   # claude/ marks agent branches
```

Then read `STATE.md`. **Trust `git`, not the file, where they disagree** — the
file is a point-in-time snapshot and the world may have moved (a PR merged, a
branch deleted). Reconcile, then proceed from "What's pending."

## Quality bar

- A fresh agent with **no memory of the session** can resume correctly from the
  file alone.
- The **next action is unambiguous** — not "continue the work" but "run
  `npm test`, then commit item 4 from the plan doc."
- Standing policies that would cause harm if violated (don't-merge,
  don't-force-push, don't-delete-remote-branches) are stated explicitly.

## Anti-patterns

- **Narrating history instead of state.** "We discussed X, then tried Y, then
  Z failed…" — the next agent needs *where we are*, not a transcript. Keep it
  to current state + next step.
- **Putting codebase facts in STATE.md.** File paths, patterns, git log — all
  derivable by reading the repo. STATE.md is task state only.
- **Stale STATE.md treated as truth.** Always run the cold-check first; the
  file can lie after a merge or branch deletion.
- **No resume sequence.** A handoff without the exact next commands forces the
  next session to re-derive them.
- **Syncing STATE.md globally.** It is repo-local by design; a global copy
  bleeds one project's state into another.

## Template

```markdown
# STATE: {objective in a few words}

> Updated: YYYY-MM-DD HH:MM · Branch: {branch} · PR: #{n} · Session: {id}

## Objective
{One line: what this effort accomplishes.}

## Current state
- Branch `{branch}` based on `{base}`, {N} commits ahead / {M} behind.
- Working tree: {clean | uncommitted changes in X}.

## Landed
- {commit/PR already merged or pushed}

## Pending
- [ ] {next action — unambiguous}
- [ ] {then this}
- [ ] {then this}

## Blockers
- {waiting on human/external/decision, or "none"}

## Standing policies in force
- {e.g. Do NOT merge — human's action.}
- {e.g. One PR at a time against develop.}
- {e.g. Review-response: fix code, leave cosmetic with a policy reply.}

## Resume sequence
1. `git fetch origin --prune && git status && gh pr list --state open && git branch --list 'claude/*'`
2. Read this file; reconcile against git (trust git on conflict).
3. {effort-specific first step}
```

## See also

- `agentic-collaboration` workflow — this skill is the Wind-down artifact.
- The `documentation` rule — for durable, versioned docs (distinct from this
  ephemeral per-repo handoff).
