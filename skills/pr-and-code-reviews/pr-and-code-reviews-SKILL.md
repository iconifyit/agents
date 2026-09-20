---
name: pr-and-code-reviews
description: Perform adversarial pull request and code reviews that actively attempt to falsify correctness, security, architectural integrity, and verification claims, then report only concrete, reproducible, actionable findings with severity and disposition. Use when reviewing pull requests, diffs, patches, commits, implementation changes, or when asked to review code for defects, architecture violations, unsafe behavior, or inadequate tests.
---

# pr-and-code-reviews

## Usage

Use this skill whenever conducting a pull request or code review. Treat the proposed implementation as an unproven claim: actively attempt to falsify its correctness rather than confirming that it looks reasonable. Review the changed behavior against repository-specific architecture, contracts, engineering rules, tests, and the criteria below.

The reviewer must try to identify concrete failure modes, but must never manufacture findings merely to satisfy the adversarial posture. A finding is valid only when it is specific, reproducible or grounded in a plausible execution path, and actionable. If attempts to falsify the implementation fail, approval is the correct outcome.

When repository-specific instructions, ADRs, architecture documents, implementation plans, or component contracts exist, inspect the relevant sources before reaching a verdict. Repository-specific rules take precedence over generic guidance in this skill.

## Examples

```text
Review PR #90 using the pr-and-code-reviews skill.

Review this diff adversarially for correctness, architecture, security, recovery, idempotency, and verification defects.

Re-review the PR after the latest fixes and report only findings that still apply.
```

## Notes

- The objective is falsification, not fault-finding for its own sake.
- Do not invent findings to populate a review.
- Focus on behavior introduced or materially affected by the change; do not turn unrelated pre-existing issues into PR findings.
- Project-specific rules and architecture are authoritative when they conflict with generic examples here.
- Every reported finding must use the mandatory severity/disposition prefix defined below.

## Review instructions

> ### ⛔ MANDATORY OUTPUT FORMAT — READ THIS FIRST ⛔
>
> **Every single review comment you post MUST begin with this exact prefix, with no exceptions:**
>
> ```
> [SEV: security|core|edge|cosmetic] [fix-now|defer-ok] <one-sentence summary>
> ```
>
> - This is a hard requirement, not a suggestion. A finding without this prefix is **invalid and must not be posted**.
> - Apply it to **every** inline comment on **every** review, including re-reviews.
> - Choose the severity from the actual impact (see "Finding severity" below): `security` and `core` are always `fix-now`; `edge`/`cosmetic` are usually `defer-ok`.
> - If you cannot classify a finding into one of the four severities, do not report it.
> - Before submitting the review, verify that **100% of your comments** carry the prefix. Do not submit an untagged comment.

When performing a pull request review, follow these instructions for selecting, classifying, and reporting findings.

### Review objective

Review the proposed changes for defects that could make the pull request unsafe, incorrect, insufficiently tested, architecturally inconsistent, or unnecessarily difficult to maintain.

#### Adversarial review posture

Treat review as an attempt to **falsify the correctness of the proposed change**, not as an attempt to confirm that the implementation looks reasonable.

Assume that defects may exist and actively try to demonstrate where the change fails its behavioral, architectural, security, safety, or verification contracts. Approve the change only after reasonable attempts to falsify those claims have failed to identify an actionable defect.

For each relevant behavior or contract changed by the pull request:

1. identify the claim the implementation is making (for example: this operation is
idempotent, this state transition is recoverable, this component owns this responsibility, this migration is reversible, or these tests prove the intended behavior);
2. attempt to break or falsify that claim using concrete execution paths, failure
modes, boundary conditions, concurrency, retries, partial execution, downstream consumers, or repository architecture as applicable;
3. if the claim can be falsified, report the defect with concrete evidence and a
plausible triggering condition;
4. if the claim cannot be falsified after reasonable investigation, do not invent a
finding merely to maintain an adversarial posture.

Prefer questions such as:

- What input, state, timing, retry, or dependency failure makes this behave
incorrectly?
- What happens if execution stops between two state transitions or side effects?
- What happens when an operation or message is repeated?
- Can partial failure strand work, corrupt state, lose data, or make recovery
impossible?
- Can downstream consumers correctly interpret every new or changed state/schema?
- Does this create competing authorities, duplicated responsibility, or a bypass of
an established public contract?
- Can authoritative/original data be modified when only staged or derived data
should be touched?
- Would the verification still pass if the important implementation were removed or
materially broken?

Do not confuse adversarial review with contrarian review. The objective is to find real defects, not to argue against implementation choices. A finding is valid only when it satisfies the evidence and reporting requirements in this document.

Evaluate the change against both:

1. the repository's documented rules and architecture; and
2. the applicable engineering principles in the **SEP² review criteria** below.

Focus on behavior introduced or affected by this pull request. Inspect surrounding code when necessary to understand the change, but do not report unrelated pre-existing problems unless the pull request makes them materially worse.

Report only findings that are specific, reproducible, and actionable. Do not report speculative concerns without identifying a concrete failure mode, violated architectural contract, or maintainability risk introduced or materially exposed by the pull request.

### Review priorities

Review in this order and allocate attention accordingly. The examples are representative, not exhaustive; report other findings that satisfy the category definitions.

1. **Security** — exploitable vulnerabilities or sensitive-data exposure,
including but not limited to SQL injection, embedded secrets (passwords, keys, tokens, or a hash of a secret committed in source), unsafe deserialization, and sensitive data exposed through logs, errors, or query output.
2. **Correctness** — behavior that produces an incorrect result or state,
including but not limited to logic errors, broken primary flows, incorrect data mutations, wrong migration up/down behavior, race conditions, unhandled asynchronous failures, resource/connection leaks, competing authorities, or workflows that can leave work stranded or unrecoverable.
3. **Architecture / responsibility boundaries** — changes that violate an
established subsystem/component contract, blur ownership, create invalid dependencies, duplicate architectural responsibility, or collapse distinct responsibilities into one implementation artifact in a way that creates a concrete maintenance or correctness risk.
4. **Edge cases** — incorrect behavior under bounded or unusual conditions,
including but not limited to empty, null, zero, maximum, or malformed inputs; off-by-one errors; timezone and encoding issues; pagination boundaries; retries; and concurrent access.
5. **Tests / verification** — inadequate verification of changed behavior,
including but not limited to missing coverage, tests that would pass if the implementation were broken, assertions that do not verify the intended outcome, important failure paths that are not exercised, or changed behavior whose verification contradicts the repository's testing strategy.
6. **Maintainability / design quality** — code qualities that create a concrete
risk of future defects, including but not limited to dead code, unnecessary duplication, misleading names, incorrect documentation, avoidable complexity, multi-purpose services/classes, procedural orchestration that contains domain policy, infrastructure adapters that own business policy, or new abstractions whose only purpose is symmetry.
7. **Style** — review last and only when the code violates this repository's
documented conventions. Do not report personal preferences or formatting that an automated formatter should handle.

### Finding severity

Assign exactly one of the following four severity labels to every finding. These four labels are exhaustive, but the examples listed under them are not. Classify unlisted problems according to their actual impact.

- `[SEV: security]` — an exploitable vulnerability, secret exposure, or
sensitive-data disclosure. Always `fix-now`.
- `[SEV: core]` — breaks, corrupts, or materially compromises a primary feature,
architectural contract, data path, authority boundary, or expected workflow. Always `fix-now`.
- `[SEV: edge]` — produces incorrect behavior in a bounded, non-primary case, or
creates a concrete but limited maintainability/integration risk. Use `fix-now` when the case can cause meaningful harm; otherwise use `defer-ok`.
- `[SEV: cosmetic]` — affects naming, documentation, readability, or documented
style without changing runtime behavior or architectural correctness. Normally `defer-ok`.

Use the impact of the actual failure—not the size of the proposed fix—to assign severity.

### SEP² review criteria

Use the following engineering principles as **evaluation criteria for the code in the pull request**.

Do not turn process/workflow principles into review comments. For example, do not comment on whether the author should have created a branch, pushed sooner, used more agents, or followed a particular implementation cadence.

Only report a SEP²-related finding when the pull request contains a concrete violation that affects safety, correctness, architecture, verification, or maintainability.

#### 1. Safety and irreversibility

Flag changes that introduce avoidable destructive or irreversible behavior, especially when a safer reversible alternative exists within the intended scope.

Examples include:

- deleting, moving, overwriting, or mutating source/client data when a staged or
recoverable workflow is expected;
- migrations or cleanup paths that cannot be safely rolled back when rollback is
part of the repository's contract;
- destructive recovery behavior that can lose durable state.

Do not demand defensive ceremony where the repository already provides a trusted safety boundary.

#### 2. Risk and blast radius

Prefer the smallest change that satisfies the stated intent.

Report when the pull request materially broadens blast radius without necessity, for example:

- rewrites a proven implementation artifact when the change only required
wrapping/reusing it;
- modifies unrelated behavior to improve style or architecture;
- replaces an existing mechanism with a broader redesign without evidence that
the existing mechanism blocks the required outcome.

Do not report adjacent cleanup merely because it could be improved. The issue must be introduced or materially worsened by the pull request.

#### 2.1. Superseded, duplicate, and unused artifacts

When a pull request replaces, rewrites, supersedes, or substantially refactors existing behavior, actively inspect whether the previous implementation and its associated artifacts are still reachable, referenced, deployed, scheduled, configured, or otherwise active.

Call out artifacts that appear to have become unused, obsolete, duplicated, or unintentionally left active as a result of the change. This applies to implementation and operational artifacts, not only source code. Examples include:

- superseded functions, classes, modules, services, commands, handlers, adapters, tests, configuration, or documentation;
- duplicate implementations of the same responsibility when the new implementation should have replaced or refactored the existing one;
- obsolete deployment, runtime, scheduling, automation, integration, storage, messaging, monitoring, or other operational resources;
- old entry points or triggers that can still invoke superseded behavior;
- unreachable code or resources with no remaining consumer;
- compatibility paths retained without a documented compatibility requirement;
- tests that exclusively exercise behavior that has been retired.

Distinguish **inactive clutter** from **active duplication**:

- Unused or unreachable artifacts that merely create maintenance burden should normally be reported as `[SEV: edge] [defer-ok]`. They do not automatically block the pull request.
- Superseded artifacts that remain active, reachable, deployable, scheduled, triggered, or capable of competing with the replacement can create duplicate processing, conflicting state changes, competing authorities, unexpected cost, or other runtime effects. Classify these according to their actual impact; if they materially compromise the primary workflow or architectural ownership, report them as `[SEV: core] [fix-now]`.
- Do not classify an artifact as dead merely because the pull request does not reference it directly. Verify reachability using the repository's composition roots, registrations, configuration, deployment definitions, runtime wiring, public contracts, and other relevant references.

Prefer **refactoring or replacing an existing artifact** when it already owns the responsibility and can satisfy the new contract. Creating a parallel artifact is justified only when there is a concrete architectural, compatibility, migration, isolation, or lifecycle reason for both to exist.

When a new artifact supersedes an old one, review the **cutover**, not just the new implementation. Ask:

- What did this replace?
- Is the previous implementation still referenced or reachable?
- Can both old and new implementations run?
- Can both consume, mutate, publish, schedule, or otherwise act on the same logical work?
- Are obsolete triggers, registrations, routes, resources, configuration, tests, or documentation still present?
- Is coexistence intentional and documented, or accidental?
- If temporary coexistence is required, is there a clear boundary preventing the two implementations from competing for the same responsibility or work?

Do not demand deletion when an artifact is intentionally retained for compatibility, rollback, migration, historical evidence, or another documented purpose. In those cases, verify that the retained artifact cannot unintentionally participate in the new runtime path.

#### 3. Intent and architectural correctness

Review for the intended system behavior, not merely whether the code compiles or matches a superficial specification.

Flag changes that:

- satisfy the local implementation while violating the documented architectural
intent;
- create competing sources of truth;
- move responsibility across a documented component boundary without an
architectural basis;
- implement behavior at the wrong layer in a way that creates real coupling or
ownership ambiguity.

When intent and local implementation conflict, the architectural contract and documented design take precedence.

#### 4. Architectural decomposition

Apply the following thesis:

> **Architectural decomposition identifies responsibility boundaries, not implementation artifacts.**

A component is a cohesive collection of collaborating implementation artifacts that owns one architectural responsibility behind a public contract.

A component is **not inherently** a class, service, module, Lambda function, or file.

Review implications:

- Do not request one class/service/module per component merely for symmetry.
- Do not request a new component for every individual responsibility.
- Flag a new component only when the PR creates or requires a distinct
architectural contract, lifecycle, ownership boundary, external dependency boundary, or independent reason to change.
- Flag implementation artifacts that bypass their owning component's public
contract when that creates coupling or responsibility leakage.
- Flag duplicated architectural responsibility across components.
- Flag orchestration or adapters that absorb domain responsibility belonging to
another component.

The hierarchy is:

```text
System
    → Capability
        → Subsystem
            → Component
                → Service
                    → Class
                        → Function
```

Each level represents a progressively narrower responsibility.

#### 5. SOLID / Clean Code

Evaluate SOLID and Clean Code **at the appropriate abstraction level**.

Do not mechanically demand dependency injection, classes, interfaces, or new abstractions for every helper or function.

Report concrete design defects such as:

- a class/service with multiple materially independent reasons to change;
- orchestration code containing substantial domain policy;
- infrastructure adapters implementing business decisions;
- high-level policy directly coupled to a replaceable low-level dependency where
an established port/contract should be used;
- duplicated policy that should have one owner;
- hidden side effects that make behavior difficult to reason about or verify;
- giant procedural functions whose responsibilities should be split into
cohesive services/policies/value objects;
- a new abstraction with no meaningful boundary, variation, or ownership
benefit.

Do **not** flag:

- small pure helper functions merely because they are called by a class;
- local deterministic implementation details that do not need substitution;
- simple functions that are clearer as functions than as injected services;
- inheritance/composition choices that do not create a concrete problem.

Prefer composition over inheritance, explicitness over magic, clarity over cleverness, and cohesive functions with minimal side effects.

#### 6. Preserve proven implementation

When architecture/inventory documents classify existing artifacts as fit for purpose, treat that classification as authoritative.

If the repository uses classifications such as `PRESERVE`, `REUSE`, `REFACTOR`, `NEW`, or `RETIRE`:

- `PRESERVE` — flag unnecessary rewrites or behavioral changes.
- `REUSE` — flag replacement done only for style/symmetry when reuse satisfies
the contract.
- `REFACTOR` — review only the scoped structural change; do not encourage
unrelated cleanup.
- `NEW` — flag duplicate implementation when an adequate existing artifact
already owns the responsibility.
- `RETIRE` — flag removal before replacement/cutover/reachability evidence exists.

Architectural reclassification does not imply an implementation rewrite.

#### 7. Explicit contracts and dependency direction

Components should collaborate through explicit public contracts; implementation artifacts collaborate internally.

Flag:

- cross-component access to implementation internals when a public contract
exists;
- dependency direction that contradicts documented architecture;
- duplicated or competing contracts for the same responsibility;
- mutable shared contract data where immutability/idempotency is part of the
boundary;
- a low-level adapter leaking infrastructure-specific behavior into domain/core
code.

Do not require interfaces or ports where there is no meaningful substitution, boundary, or independently varying dependency.

#### 8. Verification quality

Verification must demonstrate intended behavior.

Flag tests that:

- pass when the implementation is removed or materially broken;
- assert call sequences instead of meaningful outcomes when the repository uses
behavior/contract-oriented tests;
- depend on external availability/credentials/network in the normal offline test
suite when controlled integration boundaries are expected;
- use unrealistic placeholder data where repository rules require realistic
domain data;
- fail to freeze time when time-dependent behavior requires deterministic tests;
- omit an important changed failure/recovery path.

Use the repository's documented test layering where applicable:

- deterministic domain/core logic → unit/TDD;
- component boundaries → contract tests;
- adapters/orchestration → controlled integration tests;
- live/sandbox validation → separate explicit tier where required.

#### 9. Systems thinking

Review the change in its actual downstream context.

Flag concrete issues such as:

- state written in one stage that downstream consumers cannot interpret;
- message/schema changes that break a dependent component;
- idempotency changes that create duplicates or collapse distinct work;
- lifecycle changes that make recovery/reconciliation impossible;
- local optimizations that violate an authority boundary or durable-state model.

Do not speculate broadly. Identify the specific downstream contract or execution path affected.

### Reporting findings

- Report one distinct finding per comment.
- Anchor the comment to the smallest relevant changed line or range.
- Use this exact opening format:

`[SEV: <security|core|edge|cosmetic>] [<fix-now|defer-ok>] <one-sentence summary>`

- After the opening line, explain:

  1. the conditions that trigger the problem;
  2. the incorrect, unsafe, architecturally invalid, or materially
unmaintainable result; and
  3. why the pull request causes or exposes that result.

- Propose a concrete correction. Include a code suggestion when the change is
local and unambiguous.
- When the finding is architectural, name the violated responsibility boundary,
public contract, dependency direction, or source-of-truth rule.
- When the finding is based on SEP² or a project architecture rule, cite the
relevant repository document when available.
- Do not report a theoretical concern unless you can describe a plausible
execution path, input, dependency relationship, or maintenance failure mode that triggers it.
- Do not duplicate a finding across lines or files. Report it once and mention
other known occurrences in the same comment.
- Do not request defensive checks on every internal call unless required by a
documented project rule or a demonstrated failure mode.
- Do not demand dependency injection, interfaces, services, or classes merely
because a function calls another function. Review abstraction at the meaningful architectural seam.
- Do not report issues already enforced reliably by the repository's formatter,
linter, compiler, or type checker unless the pull request demonstrates that the enforcement is absent or bypassed.
- Do not report unrelated opportunities for cleanup or architectural
improvement. Review the scope of the pull request.

Example of a correctly formatted finding (note the bare prefix, with no surrounding backticks):

> [SEV: core] [fix-now] The stage moves the file at its original client path, so a client's source artwork is relocated instead of a staged copy.
>
> `upload-to-flickr` moves `file.pathDisplay` into the done folder. When the manifest record points at the original Dropbox path rather than a CANDIDATES staging copy, that move relocates the client's original file out of its source folder.
> This pull request changes the manifest to carry original paths.
>
> Suggested fix: stage a working copy and point the record at it, so the move never touches the original.

### Review summary

Conclude with a short summary containing:

- the number of findings at each severity;
- whether any `fix-now` findings remain;
- the highest-risk area reviewed;
- any important behavior that could not be verified from the pull request; and
- an explicit approval recommendation on its own final line.

State the recommendation as exactly one of the following:

- `RECOMMENDATION: Request changes` — one or more `fix-now` findings remain.
- `RECOMMENDATION: Approve with suggestions` — only `defer-ok` findings remain.
- `RECOMMENDATION: Approve` — no actionable findings remain.

If there are no actionable findings, state explicitly:

`No actionable security, correctness, architecture, edge-case, testing, maintainability, or documented-style issues found.`

Do not invent findings merely to populate the review.

### Project rules that constrain the review

Treat repository-specific rules and architecture as authoritative. Do not flag code that follows them. When a finding depends on a project rule, cite the relevant rule or file in the comment.

At minimum, inspect the repository-specific rule sources relevant to the changed code, such as:

- `CLAUDE.md` / project engineering instructions;
- `README.md`;
- architecture documents and diagrams;
- implementation-plan/inventory documents;
- `CHANGELOG.md`;
- relevant `docs/adr/` decision records;
- component/subsystem specifications.

Repository-specific rules override generic examples in this document.

The following rules from the existing review configuration remain authoritative when they apply to this repository:

- **Destructive Dropbox operations:** consumers rely on this library to perform
Dropbox file and folder operations, including moves and deletes. Any change that could move, delete, or overwrite a client's original source file (rather than a staged working copy) is `[SEV: core] [fix-now]`. When the library processes a batch, a single-item failure must be skipped and logged, never fail the whole batch, unless the caller's contract explicitly says otherwise.
- **Secrets and tokens:** configuration comes from the consumer's environment
(read via `process.env`) and, increasingly, AWS Secrets Manager; never hardcode a password, key, token, or a hash of a secret in source — any such literal is `[SEV: security] [fix-now]`. `DropboxAuthService` handles OAuth refresh and access tokens; a change that logs, prints, or otherwise exposes a token or refresh token is `[SEV: security] [fix-now]`.
- **Public API and versioning:** because this is a shared package, its exports are
a contract. Flag any change that removes, renames, or alters the signature of an exported symbol (in `index.js` or a `src/**/index.js`) that is not accompanied by a corresponding SemVer version bump in `package.json` and a `CHANGELOG.md` entry — a breaking public-API change without a major bump is `[SEV: core] [fix-now]`.
- **Coding conventions:** `camelCase` for variables/functions; `PascalCase` for
classes, enums, and static objects; `UPPER_SNAKE_CASE` for global constants (prefix env-derived constants with `k`); `lower_snake_case` only for database column names. Align object properties on the colon. Put `else`/`else if` on its own line; prefer an early `return`/`throw` over a redundant `else`. Use ternaries only to choose between two values, never actions, and no more than two per expression. Document functions with JSDoc.
- **Testing conventions:** Jest. Tests live under `src/test/`. Every test opens
with a comment stating its scenario. Seed realistic domain data — no `foo`/`bar`/arbitrary IDs. Freeze time to a fixed ISO timestamp; no future dates. A test must fail if the implementation it covers is removed.
- **Generated or vendored code:** Do not give source-level review to lockfiles
(`package-lock.json`) or Jest `__snapshots__`.
