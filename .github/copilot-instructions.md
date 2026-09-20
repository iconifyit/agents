## Code review instructions

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

1. identify the claim the implementation is making (for example: this operation is idempotent, this state transition is recoverable, this component owns this responsibility, this migration is reversible, or these tests prove the intended behavior);
2. attempt to break or falsify that claim using concrete execution paths, failure modes, boundary conditions, concurrency, retries, partial execution, downstream consumers, or repository architecture as applicable;
3. if the claim can be falsified, report the defect with concrete evidence and a plausible triggering condition;
4. if the claim cannot be falsified after reasonable investigation, do not invent a finding merely to maintain an adversarial posture.

Prefer questions such as:

- What input, state, timing, retry, or dependency failure makes this behave incorrectly?
- What happens if execution stops between two state transitions or side effects?
- What happens when an operation or message is repeated?
- Can partial failure strand work, corrupt state, lose data, or make recovery impossible?
- Can downstream consumers correctly interpret every new or changed state/schema?
- Does this create competing authorities, duplicated responsibility, or a bypass of an established public contract?
- Can authoritative/original data be modified when only staged or derived data should be touched?
- Would the verification still pass if the important implementation were removed or materially broken?

Do not confuse adversarial review with contrarian review. The objective is to find real defects, not to argue against implementation choices. A finding is valid only when it satisfies the evidence and reporting requirements in this document.

Evaluate the change against both:

1. the repository's documented rules and architecture; and
2. the applicable engineering principles in the **SEP² review criteria** below.

Focus on behavior introduced or affected by this pull request. Inspect surrounding code when necessary to understand the change, but do not report unrelated pre-existing problems unless the pull request makes them materially worse.

Report only findings that are specific, reproducible, and actionable. Do not report speculative concerns without identifying a concrete failure mode, violated architectural contract, or maintainability risk introduced or materially exposed by the pull request.

### Review priorities

Review in this order and allocate attention accordingly. The examples are representative, not exhaustive; report other findings that satisfy the category definitions.

1. **Security** — exploitable vulnerabilities or sensitive-data exposure, including but not limited to injection flaws, embedded secrets or credentials, unsafe handling of untrusted input, trust-boundary violations, and sensitive data exposed through logs, errors, diagnostics, or output.
2. **Correctness** — behavior that produces an incorrect result or state, including but not limited to logic errors, broken primary flows, incorrect data mutations, invalid forward or rollback behavior, race conditions, unhandled asynchronous failures, resource leaks, competing authorities, or workflows that can leave work stranded or unrecoverable.
3. **Architecture / responsibility boundaries** — changes that violate an established subsystem/component contract, blur ownership, create invalid dependencies, duplicate architectural responsibility, or collapse distinct responsibilities into one implementation artifact in a way that creates a concrete maintenance or correctness risk.
4. **Edge cases** — incorrect behavior under bounded or unusual conditions, including but not limited to empty, null, zero, maximum, or malformed inputs; off-by-one errors; timezone and encoding issues; pagination boundaries; retries; and concurrent access.
5. **Tests / verification** — inadequate verification of changed behavior, including but not limited to missing coverage, tests that would pass if the implementation were broken, assertions that do not verify the intended outcome, important failure paths that are not exercised, or changed behavior whose verification contradicts the repository's testing strategy.
6. **Maintainability / design quality** — code qualities that create a concrete risk of future defects, including but not limited to dead code, unnecessary duplication, misleading names, incorrect documentation, avoidable complexity, multi-purpose services/classes, procedural orchestration that contains domain policy, infrastructure adapters that own business policy, or new abstractions whose only purpose is symmetry.
7. **Style** — review last and only when the code violates this repository's documented conventions. Do not report personal preferences or formatting that an automated formatter should handle.

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

Call out artifacts that appear to have become unused, obsolete, duplicated, or unintentionally left active as a result of the change. This applies to all implementation and operational artifacts, not only source code. Examples include:

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
- Do not classify code as dead merely because the pull request does not reference it directly. Verify reachability using the repository's composition roots, registrations, configuration, deployment definitions, runtime wiring, public contracts, and other relevant references.

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

A component is **not inherently** a class, service, module, deployable unit, or file.

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

> [SEV: core] [fix-now] The step moves the artifact at its original source path, so authoritative data is relocated instead of a staged working copy.
>
> The completion step moves the artifact identified by the record's path field into the finished location. When that field holds the original source path rather than a staging copy, the move relocates authoritative data out of its source location.
> This pull request changes the record to carry original source paths.
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

Inspect the repository-specific rule sources relevant to the changed code. Depending on the repository, these may include:

- repository or project engineering instructions;
- project overview and usage documentation;
- architecture documents and diagrams;
- implementation plans and inventories;
- decision records;
- change history and migration documentation;
- component or subsystem specifications;
- public-contract, schema, protocol, or compatibility documentation;
- security and operational policies;
- test strategy and coding conventions.

Repository-specific rules supply the concrete technologies, implementation details, naming conventions, deployment environment, compatibility rules, and operational constraints. This global policy must not invent them.

When repository-specific rules conflict with a generic example in this document, the repository-specific rule governs unless it conflicts with a higher-order safety or security requirement.

### Global constraints retained across repositories

The following concerns are globally applicable, but their concrete implementation is determined by each repository:

- **Destructive operations:** protect authoritative or original data. Distinguish source data from staged, derived, temporary, or disposable working data. Flag changes that can unintentionally modify, overwrite, relocate, or delete authoritative data when the intended operation should affect a non-authoritative working representation. For multi-item work, evaluate whether failure isolation matches the documented component contract rather than prescribing fail-fast or continue-on-error globally.
- **Secrets and sensitive information:** never embed credentials, secrets, private keys, tokens, or equivalent sensitive authentication material in inappropriate durable artifacts, and never expose them through logs, errors, diagnostics, telemetry, or output. Respect the repository's established configuration, secret-management, authentication, authorization, encryption, and trust boundaries without prescribing a vendor or mechanism.
- **Public contracts and evolution:** treat externally consumed interfaces, representations, behaviors, and protocols as contracts. Flag incompatible changes that bypass the repository's documented compatibility, migration, deprecation, or versioning policy. Do not assume a particular packaging or versioning scheme.
- **Coding conventions:** apply the repository's documented language, naming, formatting, documentation, and structural conventions. Do not import conventions from unrelated projects, languages, frameworks, or environments.
- **Testing conventions:** require meaningful verification that would detect materially broken behavior. Apply the repository's documented test strategy, data-realism requirements, determinism rules, test organization, and integration boundaries without prescribing a framework or directory structure.
- **Generated or externally maintained artifacts:** do not perform source-level review of generated, vendored, machine-maintained, or externally owned artifacts unless the repository explicitly treats them as reviewable source or the pull request changes how they are generated or consumed.
