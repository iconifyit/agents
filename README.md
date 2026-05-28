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
proposed/     # staged changes under review, not yet promoted
docs/adr/     # architecture decision records
```

## Usage

1. Clone this repo to a global location, outside any project repo.
2. From a project repo, run `agentify` to link the shared resources into the
   project's `.agents/` and sync them to the configured agent tools.
3. Edit resources directly in `rules/` / `skills/` / `workflows/`, or scaffold
   new ones with `sync-agents add <type> <name>` from any agentified project —
   either way changes land here and propagate to every linked project via the
   symlinks.
4. Run `sync-agents index` after edits to regenerate `AGENTS.md`.
