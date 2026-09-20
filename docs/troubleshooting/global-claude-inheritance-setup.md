# Troubleshooting: Global Claude Inheritance Setup

> **Note (2026-09-20):** `bin/claudify` no longer exists. It was removed along with `bin/agentify` and the `claudify/` Node package — see [ADR-002 v0.0.2](../adr/ADR-002-claudify-node-rewrite/ADR-002-claudify-node-rewrite-0.0.2.md). This document is kept as the record of the incident; the tool names below are historical.

How the `@agents` repo's rules, skills, and workflows reach Claude globally
(in every repo, every session), the problems hit while wiring it up, and the
resolutions. Written after a debugging session on 2026-06-20.

## TL;DR — the working setup

- **Source of truth:** the version-controlled repo at `/Users/scott/github/@agents`,
  whose canonical tree is `@agents/.agents/` (with `.agents/rules`, `.agents/skills`,
  `.agents/workflows` symlinked to the repo's top-level `rules/`, `skills/`, `workflows/`).
- **The bridge:** a symlink `~/.agents -> /Users/scott/github/@agents/.agents`.
- **The sync:** `sync-agents-dev global sync --targets claude` (run with the **default**
  global root, i.e. no `SYNC_AGENTS_GLOBAL_ROOT` override).
- **Result:** rules become an `@`-imports block in `~/.claude/CLAUDE.md`; skills become
  `~/.claude/skills/<name>/SKILL.md` symlinks; workflows become `~/.claude/commands/<name>.md`
  slash commands. All sourced from the repo via the `~/.agents` symlink.

```bash
# One-time bridge (the key insight):
ln -s /Users/scott/github/@agents/.agents ~/.agents

# Sync global scope to Claude (default root resolves to $HOME/.agents):
env -u SYNC_AGENTS_GLOBAL_ROOT sync-agents-dev global sync --targets claude
```

---

## Problem 1 — Outputs landed in the wrong `.claude` directory

**Symptom:** running `global sync` with `--global-root /Users/scott/github/@agents`
(or `.../@agents/.agents`) wrote symlinks and the `CLAUDE.md` block into
`/Users/scott/github/@agents/.claude/` (or `/Users/scott/github/.claude/`), **not**
`~/.claude/`. Claude never reads those locations, so nothing took effect globally.

**Root cause:** sync-agents derives per-tool directories from the **parent** of the
global root, not from `$HOME`:

```
globalRootParent = filepath.Dir(globalRoot)          // internal/agent/globalroot.go
claudeGlobalDir  = filepath.Join(globalRootParent, ".claude")   // globalsync.go
```

There is **no independent CLI flag** to override the parent (the `App` field exists for
tests only). So the per-tool dirs are *always* a sibling of the global root. Pointing the
root *into* the repo sends the output *into* the repo.

**Resolution:** the global root must sit **directly under `$HOME`** so the parent is `$HOME`.
Keep the content source-controlled in the repo and bridge with a symlink:

```bash
ln -s /Users/scott/github/@agents/.agents ~/.agents
```

`filepath.Dir`/`filepath.Abs` are purely lexical — they do **not** resolve the symlink — so
the resolved root is `$HOME/.agents`, parent is `$HOME`, and output lands in `~/.claude`.
Run with the **default** root (no `SYNC_AGENTS_GLOBAL_ROOT`).

**Note:** `~/.agents` already existed as an empty `global init` skeleton; it was moved aside
(`mv ~/.agents ~/.agents.bak-<date>`) before creating the symlink.

---

## Problem 2 — Two tools fighting over `~/.claude/CLAUDE.md`

**Symptom:** the `@`-imports block already present in `~/.claude/CLAUDE.md` used markers
`<!-- BEGIN @agents managed imports … Managed by bin/claudify. -->`, while sync-agents-dev
writes a block with **different** markers (`<!-- sync-agents:claude-rules:start -->`).
Running sync-agents-dev would have left **two** import blocks (duplicate imports).

**Root cause:** two independent mechanisms had both been used to "claudify":
- `bin/claudify` — a bash script in this repo (on the `claudify` branch) that wrote the
  original block (sourcing `@agents/rules/`).
- `sync-agents-dev` — the chosen tool going forward (sourcing `@agents/.agents/rules/`,
  which is the same files via the `.agents/rules -> ../rules` symlink).

**Resolution:** pick **one** owner. We standardized on sync-agents-dev. The stale claudify
block was removed from `~/.claude/CLAUDE.md` once, then `global sync` regenerated its own
block (24 rules, including the `state` rule claudify's stale block lacked). **Do not run
`bin/claudify` again**, or it will re-add its competing block.

---

## Problem 3 — `--force` would have corrupted the source repo

**Symptom:** after the first `global sync`, 17 pre-existing skills were **skipped** with
`non-symlink at ~/.claude/skills/<name>/SKILL.md; pass --force to overwrite`.

**Why the skip:** those 17 were old claudify-style **directory** symlinks
(`~/.claude/skills/<name> -> @agents/skills/<name>`), whereas sync-agents-dev wants
**file-level** links (`<name>/SKILL.md -> ~/.agents/skills/<name>/SKILL.md`).

**The danger in `--force` (verified in `globalsync.go:applySymlinkDestination`):** because
`~/.claude/skills/<name>` was a directory symlink *into the repo*, the destination path
`~/.claude/skills/<name>/SKILL.md` **resolves through that symlink into the repo**. The
force path does:

```go
backup := dest.Path + ".replaced-by-sync-agents"
os.Rename(dest.Path, backup)   // resolves THROUGH the dir-symlink → renames the REAL repo file
```

So `--force` would have **renamed the real `SKILL.md` files inside `@agents/skills/`** to
`SKILL.md.replaced-by-sync-agents` and left broken self-referential symlinks — mutating
source-controlled content across 17 folders.

**Secondary issue (multi-file skills):** sync-agents-dev links **only `SKILL.md`**
(`destination.go`), not the whole skill directory. So even a "safe" migration strands
sibling files for multi-file skills. Affected: `copilot-reviews`
(`listener.sh`, `fetch-threads.gql`, `resolve-threads.py`), `api-endpoint-testing`
(`references/`), `stripe-best-practices` (`references/`), `cover-letter-writing`
(`example.md`), `adr-authoring` (`.collision-marker`).

**Resolution — never `--force` against directory symlinks into the source tree.** Instead:

1. **Remove** the stale directory symlinks first (deletes only the *links*, never repo files),
   guarded so only actual symlinks are removed:
   ```bash
   [ -L "$HOME/.claude/skills/$s" ] && rm "$HOME/.claude/skills/$s"
   ```
2. **Re-run** `global sync` (no `--force`) — paths are now clear, so it creates clean links
   without writing through anything.
3. **Only migrate single-file skills.** Leave multi-file skills on their working
   directory-symlinks (full content intact) until sync-agents-dev links whole skill dirs.

We migrated the **12 single-file** skills this way and **left the 5 multi-file** skills as
directory symlinks. Verified afterward: no `.replaced-by-sync-agents` files in the repo;
`copilot-reviews/listener.sh` still reachable.

---

## Final verified state

| Surface | Mechanism | Count | Check |
|---|---|---|---|
| Rules | `@`-imports block in `~/.claude/CLAUDE.md` (`sync-agents:claude-rules` markers) | 24 | 0 broken |
| Skills (single-file) | `~/.claude/skills/<name>/SKILL.md -> ~/.agents/skills/<name>/SKILL.md` | 12 | 0 dangling |
| Skills (multi-file) | old dir-symlink `~/.claude/skills/<name> -> @agents/skills/<name>` | 5 | full content intact |
| Workflows | `~/.claude/commands/<name>.md -> ~/.agents/workflows/<name>.md` (slash commands) | 10 | 0 dangling |

---

## Open follow-ups for the sync-agents repo

1. **Multi-file skill routing** — make the Claude skill destination symlink the whole
   `<name>/` directory (or all files), not just `SKILL.md`, so multi-file skills can be
   managed without losing siblings.
2. **`--force` safety bug** — `applySymlinkDestination` renames *through* an existing
   directory symlink, which can mutate the source repo. It should detect when `dest.Path`
   resolves through a symlink into the global root and refuse / handle it safely.

---

## Reference: how sync-agents resolves the global root

Precedence (`internal/agent/globalroot.go`, first match wins):

1. `--global-root <path>` CLI flag
2. `$SYNC_AGENTS_GLOBAL_ROOT` env var
3. `$HOME/.agents` (default)

Per-tool dirs are derived from `filepath.Dir(globalRoot)` (lexical — symlinks not resolved).
Therefore the global root must live directly under `$HOME` for output to reach `~/.claude`.
