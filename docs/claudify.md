# claudify

A bash script (`bin/claudify`) that mirrors this repo's **rules**, **skills**, and **workflows** into a Claude config directory (default `~/.claude/`) so every global Claude session has access to them. The repo stays the single source of truth — the target directory holds pointers, never copies.

## What it does

Three artifact types, three sync mechanisms:

| Type      | Where it lives in this repo | Where it goes in the target          | Mechanism                                                       |
|-----------|-----------------------------|--------------------------------------|------------------------------------------------------------------|
| Rules     | `rules/*.md`                | `CLAUDE.md` (managed sentinel block) | `@`-imports with full absolute paths                            |
| Skills    | `skills/<name>/SKILL.md`    | `skills/<name>` (symlink)            | Per-skill symlink to `<repo>/skills/<name>`                     |
| Workflows | `workflows/<name>.md`       | `commands/<name>.md` (symlink)       | Per-file symlink — each workflow becomes a `/<name>` slash command |

Rule paths in the managed block use **full absolute paths** so resolution doesn't depend on `~` expansion or CWD.

## Usage

```
claudify [TYPE] [--dry-run] [--target DIR] [--verbose] [--help]
```

| Arg / flag       | Meaning                                                                 |
|------------------|-------------------------------------------------------------------------|
| `TYPE`           | `rules` \| `skills` \| `workflows` \| `all` (default)                   |
| `--dry-run`      | Print plan only; no writes; no confirmation prompt                      |
| `--target DIR`   | Target Claude config dir (default: `~/.claude`)                         |
| `--verbose`      | Per-item logging (includes negative-scenario verification messages)     |
| `-h`, `--help`   | Show usage                                                              |

**Examples:**

```bash
# Preview what would happen against ~/.claude
bin/claudify --dry-run

# Live apply to ~/.claude — runs self-test gate, takes a backup, prompts for confirmation
bin/claudify

# Single-type live apply
bin/claudify skills

# Apply to a sandbox target (useful for experimentation)
bin/claudify --target "$PWD/tmp/claudify-fixture"
```

## Where output goes

| Path                                       | Purpose                                                          | Lifecycle                                  |
|--------------------------------------------|------------------------------------------------------------------|--------------------------------------------|
| `<target>/CLAUDE.md`                       | Managed sentinel block of `@`-imports for rules                  | Block rewritten on every live run; rest of file untouched |
| `<target>/skills/<name>`                   | Symlink to `<repo>/skills/<name>` for each repo skill            | Created on apply; removed only by hand     |
| `<target>/commands/<name>.md`              | Symlink to `<repo>/workflows/<name>.md` for each repo workflow   | Created on apply; removed only by hand     |
| `@agents/tmp/claude-test/`                 | Self-test sandbox                                                | **Ephemeral** — wiped + re-bootstrapped on every live run; gitignored |
| `@agents/data/claude-backups/<YYYYMMDD-HHMMSS>/` | Pre-apply backup of the target's non-symlink content       | **Persistent** — 7-day retention, pruned at start of each live run; gitignored |

`<target>` defaults to `~/.claude`. The sandbox and backup paths are always inside this repo regardless of `--target`.

## The safety stack (live runs only)

Dry-run skips all of these and writes nothing. Live runs go through every step in order:

### 1. Self-test gate (`tmp/claude-test/`)

Every live invocation first runs the script's full logic against a throwaway sandbox. Only if all assertions pass does the live target get touched.

**Phase 1 — Negative scenarios.** Each re-bootstraps the sandbox in isolation, synthesizes one blocking condition, and asserts the detector catches it:

- **Collision** — creates a real directory at a known skill's symlink path; asserts `COLLISIONS` non-empty and `have_issues=true`.
- **Stale** — creates a symlink at a known skill's path pointing somewhere unexpected; asserts `STALE` non-empty.
- **Orphan** — creates a symlink pointing into the repo at a ghost (non-existent) skill name; asserts `ORPHANS` non-empty.

If any of these don't fire, the script dies — the safety nets aren't working and we don't trust the live run.

**Phase 2 — Happy path apply + tamper checks.**

- Bootstrap fresh sandbox (copy `~/.claude/CLAUDE.md` + `~/.claude/skills/` into `tmp/claude-test/`).
- Capture bootstrap signatures: inode of `find-skills/SKILL.md`, the set of bootstrap-copied entries.
- Apply against the sandbox.
- Assert `CLAUDE.md` has the sentinel block with the expected count of rule `@`-imports.
- Assert each repo skill is a symlink at the expected path with the expected target.
- Assert each repo workflow has a symlink under `commands/` with the expected target.
- Assert `find-skills/` exists, is **not** a symlink, and its `SKILL.md` inode is unchanged from bootstrap (tamper detection — proves apply didn't touch pre-existing content).
- Assert no unexpected entries exist under `skills/` or `commands/` (only bootstrap content + repo-source symlinks are allowed).

**Phase 3 — Idempotency.** Re-scan the sandbox; only the rules entry is allowed to remain in TODO (the sentinel block is always rewritten on each run). Any skill/workflow TODO entry means the second run wanted to make changes — that's not idempotent, and the script dies.

### 2. Pre-flight against the live target

After the self-test passes, the script scans the **real** target dir for three classes of blocking issue:

| Class      | Meaning                                                                                | Block action                          |
|------------|----------------------------------------------------------------------------------------|---------------------------------------|
| **Collision** | A real file or directory exists at a path where we'd write a symlink                | Exit 1, print full report, no writes  |
| **Stale**     | A symlink at an expected path points somewhere we don't expect                       | Exit 1, print full report, no writes  |
| **Orphan**    | A symlink we created points to a source that's been removed from the repo            | Exit 1, print full report, no writes  |

**One report, one decision point.** User resolves the issues by hand, then re-runs. The script never partially applies.

### 3. Backup before write

Before any live writes, the script copies the target's at-risk content to `@agents/data/claude-backups/<YYYYMMDD-HHMMSS>/`:

| Backed up                              | Why                                                                            |
|----------------------------------------|--------------------------------------------------------------------------------|
| `CLAUDE.md` (full copy)                | The only file we modify; backup is the recovery point                          |
| Non-symlink entries under `skills/`    | Anthropic-shipped skills (e.g. `find-skills`) — losable, not git-versioned     |
| Non-symlink entries under `commands/`  | Same logic — anything you put there manually                                   |
| `skills-manifest.txt`                  | Newline list of `<path> -> <target>` for every symlink we did **not** copy     |
| `commands-manifest.txt`                | Same for `commands/`                                                           |

Symlinks themselves aren't backed up because their content lives in the `@agents` repo, which is already git-versioned. The manifest records what they pointed at, which is enough to recreate them.

**Retention:** 7 days. At the start of each live run, the script prunes any backup directory whose `mtime` is older than 7 days.

### 4. Typed-confirmation prompt

User must type the literal string `claude` to proceed. Anything else aborts. Skipped on `--dry-run`.

## The sentinel block

Inside `<target>/CLAUDE.md`, the rules block looks like:

```
<!-- BEGIN @agents managed imports — do not edit by hand. Managed by bin/claudify. -->
@/Users/scott/github/@agents/rules/adr-required.md
@/Users/scott/github/@agents/rules/ask-first.md
...
<!-- END @agents managed imports -->
```

- The block is regenerated from a fresh `find rules/*.md | sort` on every run. Adding or removing a rule in the repo auto-propagates on the next claudify invocation.
- Content **outside** the markers is preserved verbatim. You can write your own rules above or below the block; claudify won't touch them.
- The block is appended (with a leading blank line) if there isn't one. If there is one, it's replaced in place.

## Recovering from a bad run

If a live apply produces an unexpected state, the latest backup in `data/claude-backups/<ts>/` has what you need:

```bash
# Restore CLAUDE.md
cp data/claude-backups/<ts>/CLAUDE.md ~/.claude/CLAUDE.md

# Restore non-symlink skills (e.g. find-skills) — only if claudify removed them
cp -R data/claude-backups/<ts>/skills/<name> ~/.claude/skills/<name>

# Remove any symlinks claudify created (find them in skills-manifest.txt)
cat data/claude-backups/<ts>/skills-manifest.txt
# then `rm` each one as appropriate
```

In practice claudify will never remove non-symlink content (pre-flight refuses to touch collisions), so this is more of a "in case of weird filesystem state" path than a routine recovery.

## When blocking issues are reported

If pre-flight reports collisions / stale / orphans against the live target, the script prints the full list and exits non-zero. **No writes happen.**

Common causes and fixes:

| Issue class | Likely cause                                                                                         | Fix                                                                                       |
|-------------|------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| collision   | You manually copied content into `~/.claude/skills/<name>` instead of symlinking                     | Decide whether to keep your copy (rename it) or replace it with a claudify symlink (delete it) |
| stale       | A previous claudify run pointed somewhere else, or you hand-edited a symlink                         | Delete the symlink; let claudify recreate it                                              |
| orphan      | A skill was removed from the `@agents` repo but its claudify-created symlink still exists in target  | Delete the orphan symlink                                                                 |

Resolve, re-run. Pre-flight is pre-flight-everything-or-abort — you only need one report → one decision.

## What claudify does NOT do

- It does not modify or remove anything that isn't part of its managed set. `find-skills` (or anything else under `~/.claude/skills/` that's a real directory, not one of our symlinks) is left alone.
- It does not auto-prune orphan symlinks. Detection only — user removes them by hand.
- It does not run on a schedule. Manual invocation only.
- It does not currently support a `--remove` mode (planned for v2 if needed).
- It does not work on Linux without checking; macOS-only assumptions in the script include `stat -f` (BSD-style).

## Limitations and known issues

- **Symlinks vs. file copy.** Some tools may not follow symlinks correctly. If a Claude tool ever has issues with symlinked skills, the alternative is a `--copy` mode — not implemented yet.
- **Single source of truth assumption.** Two different `@agents` repos pointed at the same `~/.claude` would clobber each other's CLAUDE.md sentinel block. Don't do that.
- **macOS-only.** `stat -f` (used for inode capture in the tamper assertion) is BSD-style. Linux uses `stat -c` and would need a portability shim.

## File locations summary

```
bin/claudify                          # the script itself (executable)
docs/claudify.md                      # this document
tmp/claude-test/                      # ephemeral self-test sandbox (gitignored)
data/claude-backups/<ts>/             # persistent backups, 7-day retention (gitignored)
```

And in the target dir (default `~/.claude/`):

```
CLAUDE.md                             # holds the managed sentinel block + your own content
skills/<name>                         # symlink → <repo>/skills/<name>
commands/<name>.md                    # symlink → <repo>/workflows/<name>.md
```
