---
trigger: always_on
---

# agents-md-is-generated

**Never modify `AGENTS.md`. Not by hand, and not by running the generator. It is not yours to change unless Scott explicitly asks you to, in that instance.**

The same applies to anything `AGENTS.md` is the source of — `CLAUDE.md` symlinks to it, and the per-tool global configs are fanned out from it.

## Why

`AGENTS.md` looks like a finished document and is not one. It is assembled from `AGENTS.preamble.md` plus a generated index of `rules/`, `skills/`, `workflows/` and `agents/`. The real sources are those directories and the preamble; `AGENTS.md` is the artifact built from them. Editing the artifact edits nothing — the next regeneration discards it — and committing a regeneration puts a file Scott maintains into a diff that did not need it.

It is also the highest-blast-radius file in the repository. It is loaded into every session on the machine, so a bad write costs every session until someone notices, and nothing announces the loss. Regenerating with a pre-v0.3.7 build silently strips the entire preamble.

Scott owns this file. Adding your work to the index is his step, taken when he chooses, with the build he chooses.

## How to apply

Write the source and stop. A new rule, skill, workflow or agent means writing the file in `rules/`, `skills/`, `workflows/` or `agents/` and saying it is ready for him to sync. Do not sync it yourself, and do not commit `AGENTS.md`.

**Watch for generators that touch it as a side effect.** `sync-agents add rule` scaffolds the source file *and* rewrites `AGENTS.md` in the same command — it prints `[info] Updated AGENTS.md index`. Scaffolding tools are fine to use; the index change they leave behind is not yours to keep. Check `git diff AGENTS.md` after any `sync-agents` command and revert it if it moved.

If a task genuinely cannot proceed without regenerating, say so and let Scott decide, rather than deciding for him.

## When he does ask explicitly

**Run `./sync-agents.sh` from the repo root. That wrapper is the canonical path — never a hand edit, and never the raw sub-commands.**

It does two things in an order that matters: `global sync --targets claude` fans `.agents/` out to `~/.claude/`, then `index` rebuilds `AGENTS.md` from `AGENTS.preamble.md` plus the index of what sync just placed. Running `index` alone rebuilds an index of the old state. Running the sub-commands by hand also invites the two ways this goes wrong: a missing `--targets claude`, which writes tool directories Scott does not use, and a `sync-agents` build older than v0.3.7, which drops the entire preamble without reporting it.

`index` also rewrites `~/.claude/CLAUDE.md` in the form Claude needs: Claude has no concept of `rules`, so each one is pulled in through `@`-import lines the generator emits. Hand-maintaining that file, or generating it out of order, breaks the imports.
