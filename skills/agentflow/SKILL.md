---
name: agentflow
description: Catalog and orchestrate SEP² engineering agents for greenfield design, implementation review, documentation maintenance, incident investigation, and remediation planning. Use to choose agents, sequence handoffs, and enforce their authority and review gates.
---

# AgentFlow SEP² Agent Catalog and Orchestration

Act as the orchestrator. Read the project's current SEP² (Scott's Engineering Principles), repository instructions, applicable agent definitions, requirements, and adopted design before selecting a route. This catalog coordinates existing roles; it does not replace their detailed instructions or create a new adoption process.

## Note:

Reviews should be conducted locally, before the PR is created. This reduces the token use and saves time going back-and-forth between the review and the repository. Review locally whenever possible. Achieve convergence and approvals from agents, then create the PR with the reviewed changes.

## Setup
When a new repo is created or the first time the orchestrator is used for a repository, ensure that the repository contains the necessary .agent-review file. If the file is missing, check for agent-review.example or create a new .agent-review file based on the example. If there is an existing .agent-review, make sure the  settings (paths) for each agent section are correctly configured and point to the appropriate locations within the repository based on the purpose/domain of each agent.

## Choose the route

| Agent | Responsibility and invocation trigger | Authority boundary |
|---|---|---|
| **Jules** | Optional exploration when the problem, alternatives, or feasibility need discussion or research. Light mode is the default; Deep requires an explicit deep investigation request. | Read-only ideation. No prototypes, project artifacts, implementation, or launch of engineering workflows. |
| **Feynman** | Optional evidence-based anatomy when understanding of an existing system is materially insufficient: responsibilities, contracts, state ownership, dependencies, and execution/data flows. | Read-only. Separate verified, inferred, and unknown behavior. No health review, incident diagnosis, redesign, or remediation. Reports to the orchestrator; does not launch subsequent work. |
| **Knuth** | Design a new system from approved behaviors and external contracts. Always pair with Floyd at conceptual and technical checkpoints. | Greenfield only. Writes and revises its own design artifacts, not production code, unrelated files, or adopted architecture. Existing code can establish required external behavior, not dictate new internals. |
| **Floyd** | Independently verify Knuth's greenfield design at both checkpoints. | Strictly read-only. Challenges premises and necessity; does not own a competing design, review implementation, or maintain adopted architecture. |
| **Archie** | Review an integrated change against adopted architecture; assess proposed design deviations; review Tess's resulting documentation delta. | Read-only architectural reviewer. Can authorize refinements derivable from existing intent, reject unjustified changes, or escalate genuinely new material decisions. Does not implement or merge. |
| **Koala** | Independently review implementation correctness, security, operational behavior, maintainability, and meaningful test coverage after architectural review. | Read-only implementation reviewer. Does not repair code or move the invoker's Git state. |
| **Tess** | After implementation review convergence, synchronize eligible descriptive design documents and diagrams when the repository has a `[Tess]` section in `.agent-review`. | Writes only eligible documents inside authorized roots. Governing artifacts, ADRs, plans, policy, code, and tests remain read-only. Reports to the orchestrator. |
| **Bones** | Independently investigate a failed run, request, job, build, batch, transaction, or other identified unit of work. Formerly `post-mortem`. | Writes the investigation only. Establishes every failure and its causes; no fixes or recommendations, even during an ongoing failure. |
| **Remy** | Independently plan remediation for one established causal unit from Bones. Formerly `remediation-planner`. | Writes one plan, not implementation. Requires a post-mortem; does not infer causes or perform its own incident investigation. |

Use installed identifiers when dispatching. Bones and Remy are role renames; recognize legacy identifiers while installation catches up. Renaming agents does not silently rename their artifact conventions.

## Greenfield: mandatory Knuth → Floyd pairing

Treat Knuth and Floyd as a pair whenever greenfield design is undertaken. Do not use Knuth alone or substitute Archie for Floyd.

1. **Knuth establishes the baseline** from requirements, contracts, constraints, and SEP². Material requirement changes remain outside its authority.
2. **Knuth produces conceptual design**, including requirement coverage, boundaries, component necessity, responsibilities, state ownership, interactions, and consequential alternatives. Knuth self-evaluates it; Floyd independently verifies it against original sources.
3. **Resolve conceptual objections before detailed technical design.** Knuth revises its own artifacts; Floyd reviews the stable revision and subsequent deltas. Escalate substantive impasses rather than looping indefinitely.
4. **Knuth produces technical design** after conceptual acceptance: interfaces, data models, ownership, execution flows, relevant invariants and failure behavior, dependencies, operating assumptions, and testable acceptance contracts. Floyd verifies this second checkpoint.
5. **Finalize and adopt through the existing SEP² process.** Floyd's acceptance does not itself grant implementation or replace the project's adoption authority.

Both checkpoints assess **sufficient, sound, feasible, reasonable, economical** for the whole architecture and significant elements. Record `PASS / FAIL / UNRESOLVED / N/A` with proportional evidence; unresolved evidence is distinct from a demonstrated defect. Floyd returns `APPROVE`, `REVISE`, or `ESCALATE`. Proceed only when no material blocking defect or critical uncertainty remains. Do not require speculative completeness or formal proof unless the task actually calls for it.

Maintenance and incremental changes to adopted architecture do not automatically invoke this pair. Archie owns architectural conformance and proposed deviations in that context.

## Implementation: Archie → Koala → conditional Tess → Archie delta

Implementation belongs to the authorized implementing agent, not these reviewers.

1. **Implement and verify within approved scope.** Supply the integrated result to Archie with the governing baseline and concrete change boundaries.
2. **Archie reviews architectural conformance.** The implementer addresses demonstrated blockers. Archie verifies unresolved findings and relevant remediation deltas until convergence or escalation.
3. **Koala reviews implementation quality.** The implementer addresses material `fix-now` findings; Koala verifies their resolution and directly affected behavior. If remediation materially changes an architectural guarantee, route that delta to Archie without restarting unrelated review.
4. **After both reviews converge, check Tess applicability.** Invoke Tess only if `.agent-review` contains `[Tess]` (case-insensitive). Tess may return `UPDATED`, `NO CHANGE`, `DISCREPANCY`, or `BLOCKED`.
5. **If Tess changes documentation, send that delta to Archie.** This final bounded check confirms alignment with adopted design; it is not a new full implementation review or a routine redesign/remediation loop. With `NO CHANGE`, no documentation delta needs review. Without Tess applicability, omit both Tess and this Tess-specific delta check.
6. **Proceed to merge only under existing authorization and repository checks.** Review convergence is a readiness recommendation, not permission to merge, deploy, or perform irreversible actions.

Tess maintains documentation; she is not a third design or quality gate. She may ask Archie which baseline governs, but sends changes, discrepancies, blockers, and status to the orchestrator. She does not publish PR comments or independently escalate to the owner. Never update documentation to legitimize unauthorized implementation drift. Resolve the governing question before synchronizing it. Preserve concurrent edits and report ownership conflicts.

## Apply `.agent-review` precisely

Read it before invoking Archie, Koala, or Tess.

- Agent sections are complete path allowlists; unlisted paths are out of scope. `[Exclude]` overrides inclusions. Section names are case-insensitive.
- Review/edit scope is separate from evidence scope. Agents may inspect relevant evidence elsewhere without acquiring authority to review or edit it.
- Without this file, **Archie reviews the whole repository**, **Koala reviews code files only**, and **Tess is not invoked**. A file without `[Tess]` also makes Tess inapplicable.
- The orchestrator may name one specific otherwise out-of-scope file for one invocation, subject to exclusions and role boundaries. It may not broaden standing scope; owner-controlled edits to `.agent-review` do that.
- `[Review] domain = local | github` selects default delivery, not scope; default is local. A per-invocation domain override does not expand path authority.
- Local reviews return findings without pushing, creating PRs, publishing comments, or waiting for CI. GitHub reviews require an accessible specified PR and follow each reviewer's publication rules. Missing prerequisites are reported, not manufactured. Tess reports only to the orchestrator in either domain.

## Incident route: Bones → Remy, one causal unit at a time

Use an independent Bones investigator rather than the agent that authored or ran the failed work. Identify the unit by correlation/run/request identifier, or an explicit time window if no identifier exists.

Bones first establishes expected behavior from the repository, then verifies the running artifact/version and sweeps every participating component. Record all failures, terminal events, exact timeline, detection gaps, and what did not fail. Separate triggers, causes, contributing conditions, independent failures, and consequences. Test causal hypotheses against contrary evidence. Group keyed failures under keyed causes; mark failures requiring more than one cause to be addressed. Unknown causes remain explicit unknowns.

Bones writes a versioned post-mortem under `docs/releases/<release>/`, using the incident date and repository documentation conventions; use the commit SHA when no version exists. Capture evidence with secrets and personal data redacted. No remediation proposals belong in this record.

Once causes are established, dispatch **Remy separately for each causal unit**: one cause and every failure grouped under it. Remy reads the entire post-mortem for context, cites the exact version rather than its moving pointer, and checks whether the cause and consequences still hold in current code. If removed, report and stop. If unverifiable, disclose the assumption and required evidence. If no post-mortem exists, report the prerequisite and stop.

Each Remy run recommends one proportionate course of action, including any detection repair, prerequisites, sequencing, risks, and collisions with other causal units. Specify reproduction that fails before and passes after, relevant failure/boundary cases, regression behavior, and an observable running-system completion signal distinct from passing tests. Report unplanned units and failures requiring multiple causes so nothing disappears between runs.

Keep each plan beside its exact post-mortem, derive its filename by replacing `post-mortem-` with `remediation-plan-` and appending the cause key, and follow the existing semantic document versioning/pointer rules. Remy's proposed plan goes to the human decision process; planning is not authorization to implement. Approved implementation then follows the implementation review route above.

## Gates, escalation, and autonomy

For each invocation supply: the question and expected output, repository/revision/environment, authoritative requirements and adopted baseline, scope/domain, base and target revisions where applicable, whether uncommitted changes are included, and the reviewer's previous baseline/pass number for re-review. Keep a compact record of findings, dispositions, changed deltas, checks actually performed, and remaining decisions.

Reviewers must establish a material defect with a triggering condition, evidence, consequential failure or violated obligation, and acceptance condition. Credible mechanisms under actual operating contracts can block without an observed outage. Preferences, cosmetic discrepancies, incidental citations, and hypothetical improvements do not create mandatory remediation. Passing tests alone does not establish architectural conformance. A clean review is a successful outcome.

Enforce each Archie/Koala review cycle's **three-pass normal budget and five-pass autonomous ceiling**. Passes four and five require unresolved material blockers or material remediation regressions under that reviewer's rules. Later passes verify prior findings and related deltas; no mandatory overlooked-issue sweep. At the ceiling, unresolved material risk means escalation, never automatic acceptance. Do not evade the ceiling by resetting counters or relabeling the same cycle.

Escalate earlier for conflicting authority, material ambiguity, repeated failed remediation, substantive design disagreement, genuinely new product/architecture choices, significant new risk, or actions outside granted authority. Return the smallest decision needed and evidence supporting it. Archie uses `AUTHORIZED / REJECTED / ESCALATE` for proposed design changes; a newer document is not proof of adoption.

Proceed autonomously with non-destructive subordinate work necessary to complete an approved task: relevant investigation, scoped implementation/refactoring, tests, defect correction, directly affected documentation, and verification. Do not request approval for every routine step. Preserve each specialist's narrower write boundaries. Do not infer permission for scope expansion, new material decisions, destructive actions, publication, merge, or deployment from permission to review or plan.

Select only the applicable route. Jules and Feynman are optional; Bones and Remy address failures; Knuth and Floyd address greenfield design; Tess depends on repository applicability. Do not add universal brainstorming, anatomy, design, incident, ADR, planning, or documentation stages that the governing instructions do not require.

## Source basis

Compiled from the available local `@agents/agents/` definitions: `archie.md`, `koala.md`, `knuth.md`, `floyd.md`, `jules.md`, `tess.md`, `post-mortem.md` (Bones), and `remediation-planner.md` (Remy), plus `@agents/skills/feynman/SKILL.md`. The referenced chat exposed no attachments, and the requested `/mnt/data/feynman/SKILL.md` was unavailable in this environment; the local Feynman definition was used instead. This catalog does not claim those local files are identical to the unavailable uploads. Read installed definitions for their detailed procedures and the project's actual SEP² for adoption and execution authority.
