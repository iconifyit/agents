# agents

Single source of truth for shared agentic resources — **rules**, **skills**, and
**workflows** — consumed across projects via symlinks.

Managed with [`@brickhouse-tech/sync-agents`](https://github.com/brickhouse-tech/sync-agents).

## Layout

The source folders are visible at the repo root; a hidden `.agents/` overlay of
relative symlinks points back to them so `sync-agents` (which expects a
`.agents/` directory) works inside this repo. See
[ADR-001](docs/adr/ADR-001-agents-repo-layout/ADR-001-agents-repo-layout.md) for the rationale.

```
rules/        # shared rules (edit here)
skills/       # shared skills (<name>/SKILL.md)
workflows/    # shared workflows
AGENTS.md     # generated index — run `sync-agents index` after edits
.agents/      # overlay: rules -> ../rules, skills -> ../skills, workflows -> ../workflows
bin/          # scripts (see docs/claudify.md)
proposed/     # staged changes under review, not yet promoted
docs/adr/     # architecture decision records
```

> **Browsing on GitHub:** the `.agents/` entries are directory symlinks (mode 120000), so GitHub won't render `.agents/.../<file>` paths. `AGENTS.md` is primarily for local tooling — on GitHub, browse the visible `rules/`, `skills/`, and `workflows/` folders directly.

## Usage

1. Clone this repo to a global location, outside any project repo.
2. From a project repo, run `agentify` to link the shared resources into the
   project's `.agents/` and sync them to the configured agent tools.
3. Edit resources directly in `rules/` / `skills/` / `workflows/`, or scaffold
   new ones with `sync-agents add <type> <name>` from any agentified project —
   either way changes land here and propagate to every linked project via the
   symlinks.
4. Run `sync-agents index` after edits to regenerate `AGENTS.md`.

## Syncing globally with `claudify`

To make this repo's rules, skills, and workflows available to **every** Claude
Code session globally (not just per-project), use the `bin/claudify` script. It
syncs into `~/.claude/` via `@`-imports + symlinks, with a self-test gate,
backups, and pre-flight safety checks.

See [`docs/claudify.md`](docs/claudify.md) for full details, output locations,
the safety stack, and recovery procedures.
