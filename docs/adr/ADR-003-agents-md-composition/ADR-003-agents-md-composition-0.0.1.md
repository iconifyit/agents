# ADR-003: `AGENTS.md` Composition — A Hand-Authored Preamble Prepended to the Generated Index

- **Status:** Accepted (2026-09-20)
- **Version:** 0.0.1
- **Author:** Scott Lewis (with Claude as collaborator)
- **Supersedes:** None (first ADR on index composition)
- **Related:** [ADR-001 v0.0.2](../ADR-001-agents-repo-layout/ADR-001-agents-repo-layout-0.0.2.md) defines the repository *layout*; this ADR defines what the generated index *contains*.

## Context

ADR-001 established the repository layout and treated `AGENTS.md` as a single-source artifact: the output of `sync-agents index` over the `.agents/` overlay. That is no longer accurate.

`AGENTS.md` now has **two** content sources concatenated in a fixed order:

1. A generator-emitted header (three lines: the auto-generated notice, the regeneration instruction, and a one-line description of what the file indexes).
2. The full verbatim body of `AGENTS.preamble.md` — a hand-authored file at the repo root, exposed to the generator as `.agents/AGENTS.preamble.md`.
3. The generated index of `rules/`, `skills/`, `workflows/`, `agents/`, and State.
4. The `@`-import block that pulls each rule into the consuming tool's context.

`CLAUDE.md` is a symlink to `AGENTS.md`, and `~/.agents` symlinks to this repository's `.agents/`. The composed file is therefore the always-on instruction set for every Claude session on the machine and every consuming project. It is the highest-blast-radius artifact in the repository.

Three properties of this arrangement were undocumented, and each has already caused a concrete problem.

### The composition depends on an unreleased generator

Preamble support exists only in `sync-agents` v0.3.7 and later. No released build has it — the version on `PATH` is v0.3.0. Running `sync-agents index` with a pre-0.3.7 build does not fail, warn, or degrade: it writes an `AGENTS.md` containing the header and index with the entire ~280-line preamble removed. Verified on disposable copies: released `index` produces a 569-line diff with every principles heading gone; `sync-agents-dev index` produces a 0-line diff.

The generator's own emitted header says "Run `sync-agents index` to regenerate." Following that instruction with the tool a reader actually has destroys the preamble.

### The preamble duplicates rule content, with no stated precedence

Four preamble sections restate material that also exists as a rule file, and both land in the same composed `AGENTS.md`:

| Preamble section | Overlapping rule |
| --- | --- |
| `## Testing` | `rules/testing.md` (124 lines) |
| `## Documentation` | `rules/documentation.md` (43 lines) |
| `## Language & Style` | `rules/coding-style.md` (55 lines) and the three language rules |
| `## Standard Workflow` | `rules/workflow.md` (65 lines) |

In every case the rule file is longer and more specific. The preamble's only precedence statement is "They apply to every repository unless explicitly overridden by a more specific project `CLAUDE.md`" — which addresses a *downstream* override and says nothing about the `rules/` content sitting a few hundred lines below it in the same file. A reader hitting the preamble's four-line Testing summary and `rules/testing.md`'s Strict Mode guard rails has no stated basis for choosing.

### The overlay carries a file, not just directories

ADR-001's overlay was described purely as directory symlinks, one per artifact class. `.agents/AGENTS.preamble.md` is a symlink to a *file*, and it is not an artifact class at all — nothing distributes it. It is an input the generator reads. ADR-001 v0.0.2's invariant has been revised to account for this; the substance of why it exists lives here.

## Decision

**`AGENTS.md` is a composed artifact: a hand-authored preamble prepended to a generated index. The preamble carries principles; `rules/` elaborates them into enforceable specifics; where they conflict, the preamble wins.**

### Composition order is fixed and generator-owned

The order above is not configurable from this repository. The header is emitted by the generator before the preamble, which is why the regeneration warning cannot be placed above the regeneration instruction — the instruction is line 8, the warning is line 11. That inversion is a generator defect, tracked in iconifyit/agents#11, not something this repository can correct.

### Precedence: the preamble wins

**Where `AGENTS.preamble.md` and a `rules/` file conflict, the preamble governs.** It is the authored statement of how Scott wants decisions made; the rules elaborate it. A rule that contradicts the preamble is wrong and gets corrected, not accommodated.

This is the opposite direction from `rules/coding-style.md`'s language-over-general precedence, and deliberately so. That clause resolves specificity *within* the rules layer — a Python rule beating a cross-language rule. This clause resolves authority *between* layers, and the preamble is the higher layer.

**One carve-out:** `AGENTS.preamble.md` §Language & Style does not outrank the language rules. That section is a list of cross-language defaults and several items are JavaScript-flavored ("Prefer const"), so under between-layers precedence it would otherwise govern Python and Go code against `rules/python-coding-style.md` and `rules/go-coding-style.md`, which explicitly disclaim JS conventions. The section states its own exception inline. This is the only part of the preamble that yields to a rule, and it yields only to a language-specific one, for code in that language.

**Where a rule is a true duplicate of preamble content — same scope, nothing added — the rule is deleted and the preamble kept.** Two copies of one instruction in one composed file is a drift hazard with no upside.

Assessed at the time of writing, **no current rule meets that bar.** Every overlapping pair has a rule substantially larger than the preamble section:

| Preamble section | Rule | Preamble | Rule | Ratio |
| --- | --- | ---: | ---: | ---: |
| `## Testing` | `rules/testing.md` | 288 w | 530 w | 1.8× |
| `## Documentation` | `rules/documentation.md` | 15 w | 481 w | 32× |
| `## Language & Style` | `rules/coding-style.md` | 32 w | 440 w | 14× |
| `## Standard Workflow` | `rules/workflow.md` | 21 w | 1,018 w | 48× |

In each case the preamble states the principle and the rule carries the enforceable detail that exists nowhere else — the Testing Strict Mode guard rails, the ADR folder structure and versioning scheme, the naming and control-flow conventions, the seven-stage task workflow. Deleting any of them to honor the preamble would delete content the preamble does not contain. So all four stay, and the preamble governs on conflict.

The rule to apply going forward: when a preamble section and a rule cover the same ground, check whether the rule adds anything. If it does, keep both and let the preamble win on conflict. If it does not, delete the rule.

### Regeneration has one canonical path

Regenerating `AGENTS.md` requires a build with preamble support. Naming a raw binary in prose is not a guard — the branch that introduced the preamble shipped three artifacts instructing the destructive form, and one of them was the canonical add-a-rule procedure. Per Principle 9 (Operational Wrappers), the regeneration command should be a wrapper that verifies the generator version and refuses below the minimum, with every in-repo reference pointing at the wrapper. Until that wrapper exists, every reference names `sync-agents-dev` explicitly and carries the version requirement.

## Code being removed

None. This ADR records a mechanism that is already implemented and in use; it retires no code, directory, or symlink. It does supersede ADR-001 v0.0.1's implicit claim that `AGENTS.md` is generated from the overlay alone — that claim is corrected in ADR-001 v0.0.2 and given its substance here.

## Consequences

**Positive**

- The always-on instruction set has a design record. Its two content sources, their order, and their precedence are stated rather than inferred.
- The preamble/`rules/` precedence question has an answer, so a reader hitting both on one topic knows which governs.
- The version dependency is recorded next to the mechanism that creates it, rather than only in a README warning.

**Negative / risks**

- Two content sources means two places to look and two places for the same statement to drift. The stated precedence bounds the damage but does not prevent the duplication; the preamble sections that already overlap `rules/` are candidates for trimming in a follow-up.
- The composition cannot be reproduced by any released tool. Until v0.3.7 ships, a contributor without the dev build cannot regenerate the index at all — correctly refusing is better than silently stripping, but it is still a barrier.
- `AGENTS.md` is tracked, so `git checkout AGENTS.md` recovers a stripped preamble — but only if someone notices. There is no CI in this repository (`.github/` contains only `copilot-instructions.md`), so nothing detects the loss before it is committed.

## Alternatives considered

- **Keep the preamble content in `rules/` and drop the second source.** Cleanest in principle — one mechanism, no precedence question, reproducible by the released tool. Rejected because the preamble is prose that reads as a document; splitting it into always-on rule files would fragment an argument that works because it is continuous, and the index would list a dozen new pseudo-rules that are really one essay.
- **Keep the preamble outside `AGENTS.md` and `@`-import it like a rule.** Considered and rejected earlier in this work: the requirement is that `CLAUDE.md` *be* the full text, not a pointer to it.
- **Pin the preamble into `AGENTS.md` by hand and stop regenerating.** Removes the version dependency, but makes the index permanently stale and abandons the generator for the thing it exists to do.
