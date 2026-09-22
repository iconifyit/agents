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

Write the source and stop. A new rule, skill, workflow or agent means writing the file in `rules/`, `skills/`, `workflows/` or `agents/` and saying it is ready for him to sync. Do not run `global sync`, do not run `index`, and do not commit `AGENTS.md`.

**Watch for generators that touch it as a side effect.** `sync-agents add rule` scaffolds the source file *and* rewrites `AGENTS.md` in the same command — it prints `[info] Updated AGENTS.md index`. Scaffolding tools are fine to use; the index change they leave behind is not yours to keep. Check `git diff AGENTS.md` after any `sync-agents` command and revert it if it moved.

If a task genuinely cannot proceed without regenerating, say so and let Scott decide, rather than deciding for him.

**When he does ask explicitly, use `sync-agents-dev`** — never a hand edit, and never a `sync-agents` build older than v0.3.7, which drops the preamble without reporting it.
