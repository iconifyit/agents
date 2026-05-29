---
name: analyze
description: >
  Deeply analyzes a code target before implementation work. Use when the user asks to
  understand, inspect, prepare for work on, investigate, or start work in a repo, folder,
  module, lambda, route, component, service, or file. Recursively reads relevant code,
  identifies architecture, dependencies, conventions, risks, and likely edit points, then
  produces a concise working analysis for the current task without generating full
  documentation.
---

# Analyze Skill

Analyze a code target deeply enough to safely perform follow-up engineering work.

This skill is for building working context, not producing polished documentation.

## Output

Produce one concise analysis response unless the user asks for a saved artifact.

If durable context would help future work, create one of these:

```text
.agents/analysis/{target-name}.md
```

Use this only when the target is large, the task will span multiple sessions, or the analysis contains decisions the agent should preserve.

Do not create diagrams, PNGs, or full documentation unless explicitly requested.

## Process

### 1. Establish the Target

Identify:

- Target path
- Target type: repo, package, folder, module, service, route, lambda, component, IaC stack, test suite, or single file
- Primary language/framework
- Relevant entry points
- Existing guidance files such as `AGENTS.md`, `CLAUDE.md`, `README.md`, package manifests, build files, and test config

Read guidance and entry-point files first.

### 2. Recursive Code Analysis

Recursively inspect the target, prioritizing files that explain behavior or will likely be edited.

Ignore:

- node_modules
- dist
- build
- coverage output
- generated files
- lockfiles unless dependency resolution matters
- vendored code unless directly relevant

For each significant area, determine:

- Responsibility
- Public API or exported surface
- Internal dependencies
- External dependencies
- Data shapes and contracts
- Side effects
- Error handling
- Configuration and environment requirements
- Tests and validation paths
- Conventions already present in the code

Prefer reading fewer files deeply over skimming many files shallowly.

### 3. Build the Working Model

Identify:

- How control enters the target
- How data moves through it
- What abstractions are important
- Where business logic lives
- Where persistence or external I/O happens
- Where tests should be added or updated
- Which files are likely edit points for follow-up work
- Which files are examples/pattern references
- Risks, hidden coupling, or unclear behavior

Do not guess. If something is unknown, mark it as unknown.

### 4. Report the Analysis

Return a concise working analysis with this structure:

```markdown
# Analysis: {target}

## Purpose

What this target appears to do.

## Architecture / Shape

The main components and how they relate.

## Key Files

- `{path}` — why it matters

## Execution / Data Flow

How work enters, moves through, and exits the target.

## Conventions to Preserve

Patterns, naming, layering, testing style, error handling, dependency style.

## Likely Edit Points

Files or modules most likely involved in follow-up work.

## Tests / Validation

Relevant tests and commands, if discoverable.

## Risks / Unknowns

Anything unclear, fragile, missing, or requiring runtime access.
```

Keep this practical. The goal is to prepare for correct implementation, not to explain everything.

### 5. Optional Durable Artifact

Create `.agents/analysis/{target-name}.md` when:

- The target is large
- The analysis will be reused across tasks
- The user is beginning a multi-step workflow
- The agent needs persistent context to avoid rediscovery

The artifact should be short and operational:

```markdown
# Analysis: {target}

## Target

`{path}`

## Purpose

...

## Working Model

...

## Key Files

...

## Conventions

...

## Likely Edit Points

...

## Validation

...

## Unknowns

...
```

Do not treat this as formal documentation. Treat it as working memory.

## Guardrails

- Read before modifying.
- Do not edit code during analysis unless explicitly asked.
- Do not run destructive commands.
- Do not invent architecture that is not visible in the source.
- Do not document every file.
- Do not create diagrams unless requested.
- Do not create broad docs in `docs/`; use `.agents/analysis/` only for working memory.
- Prefer the project’s existing terms and patterns.
- Surface uncertainty clearly.
