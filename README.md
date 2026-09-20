# agents

Single source of truth for shared agentic resources — **rules**, **skills**, and
**workflows** — consumed across projects via symlinks.

Managed with [`@brickhouse-tech/sync-agents`](https://github.com/brickhouse-tech/sync-agents).

## Layout

The source folders are visible at the repo root; a hidden `.agents/` overlay of relative symlinks points back to them so `sync-agents` (which expects a `.agents/` directory) works inside this repo. See
[ADR-001](docs/adr/ADR-001-agents-repo-layout/ADR-001-agents-repo-layout.md) for the rationale.

```
rules/        # shared rules (edit here)
skills/       # shared skills (<name>/SKILL.md)
workflows/    # shared workflows
agents/       # shared agent definitions (<name>.md)
AGENTS.md     # generated index — run `sync-agents-dev index` after edits (v0.3.7+ required)
.agents/      # overlay: rules -> ../rules, skills -> ../skills, workflows -> ../workflows, agents -> ../agents
cli/          # wrapper scripts (the canonical execution path)
proposed/     # staged changes under review, not yet promoted
docs/adr/     # architecture decision records
```

> **Browsing on GitHub:** the `.agents/` entries are directory symlinks (mode 120000), so GitHub won't render `.agents/.../<file>` paths. `AGENTS.md` is primarily for local tooling — on GitHub, browse the visible `rules/`, `skills/`, and `workflows/` folders directly.

> **⚠️ Regenerating `AGENTS.md` requires `sync-agents` v0.3.7 or newer.** `AGENTS.md` is `AGENTS.preamble.md` plus the generated index, and only v0.3.7+ carries preamble support. Running `index` with an older build — including the currently released v0.3.0 — silently strips the entire ~280-line preamble. `CLAUDE.md` symlinks to `AGENTS.md` and `~/.agents` symlinks to this repo, so that deletes the always-on instruction set for every Claude session on this machine. Check `sync-agents --version` first; use the `sync-agents-dev` build until v0.3.7 is released.

## Usage

1. Clone this repo to a global location, outside any project repo.
2. From a project repo, run `sync-agents init` then `sync-agents sync` to link the shared resources into the project's `.agents/` and fan them out to the configured agent tools.
3. Edit resources directly in `rules/` / `skills/` / `workflows/`, or scaffold new ones with `sync-agents add <type> <name>` from any agentified project — either way changes land here and propagate to every linked project via the symlinks.
4. Run `sync-agents-dev index` after edits to regenerate `AGENTS.md`. **This requires `sync-agents` v0.3.7 or newer** — see the warning above.

## Syncing globally to `~/.claude` with `sync-agents`

This is how this repo reaches **every** Claude Code session. One-time bridge, then one command per change.

> A bash `claudify` and a Node `agentify` previously did this. Both duplicated `sync-agents` and were removed on 2026-09-20 — see [ADR-002 v0.0.2](docs/adr/ADR-002-claudify-node-rewrite/ADR-002-claudify-node-rewrite-0.0.2.md).

**1. One-time bridge.** Symlink the tool's expected global root to this repo's `.agents/` subtree:

```bash
# from the root of this repo checkout:
ln -s "$(pwd)/.agents" ~/.agents
```

Why the symlink (and not just pointing `--global-root` here): `sync-agents global` derives the per-tool output dirs from the **parent** of the global root, *lexically* — it does not resolve the symlink. With the root at `$HOME/.agents`, the parent is `$HOME`, so output lands in `~/.claude`. (Pointing the root straight at `…/@agents/.agents` would instead derive `…/@agents/.claude`.)

**2. Sync** (run after adding or editing any rule / skill / workflow):

```bash
sync-agents-dev global sync --targets claude
```

It fans the repo out to:

- **rules** → an `@`-imports block in `~/.claude/CLAUDE.md`
- **skills** → `~/.claude/skills/<name>/SKILL.md` symlinks
- **workflows** → `~/.claude/commands/<name>.md` (slash commands)

**Caveat — multi-file skills.** The sync links only `<name>/SKILL.md`, so any sibling files (scripts, `.gql`, `references/`) are stranded. Single-file skills migrate cleanly; for a skill with sibling files, keep the older whole-directory symlink (`~/.claude/skills/<name> -> …/@agents/skills/<name>`) instead. **Never run `--force`** against an existing whole-dir symlink — it writes *through* the link into this repo and can rename the real `SKILL.md` files.
