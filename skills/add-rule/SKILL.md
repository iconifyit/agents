---
name: add-rule
description: Add a new global agent rule through the sync-agents workflow — scaffold with `sync-agents add rule`, write the rule body, fan it out to the per-tool global dirs (e.g. ~/.claude) with `global sync`, then regenerate the index. Use when Scott asks to create, add, or formalize a rule, standing instruction, coding convention, or mandatory guideline that should apply across all sessions (not just remember it as a project memory).
---

# Skill: add-rule (add a global rule via sync-agents)

Rules live in the `@agents` repo and are fanned out to every agent tool's global config (e.g. `~/.claude/rules/` + the concatenated global `CLAUDE.md`) so they apply to **all** sessions, everywhere — unlike a project memory, which only loads under its own directory tree. This skill is the exact procedure for adding one.

## When to use

When Scott asks to "make a rule", "add a rule", "formalize this as a rule", or otherwise wants a standing instruction that applies across all sessions and projects. If he only wants it remembered for the current project, that's a memory, not a rule — use a memory instead.

## Procedure

1. **Go to the agents repo.** `cd /Users/scott/github/@agents` — all `sync-agents` commands run from here.

2. **Scaffold the rule.** `sync-agents add rule <rule-name>` — creates `.agents/rules/<rule-name>.md` with `trigger: always_on` frontmatter. Use a short kebab-case name (e.g. `no-hard-wrap`). If it already exists, add `--force` or just edit the file in place.

3. **Write the rule body.** Edit `.agents/rules/<rule-name>.md`: keep the `trigger: always_on` frontmatter, set the heading to `# <rule-name>`, and write the rule. Write prose as one line per paragraph — do not hard-wrap (see the `no-hard-wrap` rule). State the rule, then a short "why" so future sessions know its intent.

4. **Fan it out to the tools.** `sync-agents-dev global sync --targets claude` — routes `.agents/` into the per-tool global dirs (`~/.claude/rules/` and the concatenated global `CLAUDE.md`). This is what makes the rule apply to every session. Add more targets comma-separated if other tools are in use.

5. **Regenerate the index.** `sync-agents index` — rewrites `AGENTS.md` so the new rule is listed.

## Verify

After step 5, confirm the rule landed: `ls ~/.claude/rules/<rule-name>.md` and `grep -l <rule-name> ~/.claude/CLAUDE.md`. If either is missing, re-run step 4.

## Notes

- The same flow works for skills and workflows — swap `add rule` for `add skill` / `add workflow` (skills need `name` + `description` frontmatter instead of `trigger: always_on`).
- Rules are **global** (all sessions). A project-scoped fact belongs in memory (`/Users/scott/.claude/projects/.../memory/`), not here.
- Claude runs these `sync-agents` commands only when Scott explicitly asks for a rule/skill/workflow; otherwise Claude writes the content and Scott runs sync-agents.
