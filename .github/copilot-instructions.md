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

When performing a pull request review, follow these instructions for selecting,
classifying, and reporting findings.

### Review objective

Review the proposed changes for defects that could make the pull request unsafe,
incorrect, insufficiently tested, architecturally inconsistent, or unnecessarily
difficult to maintain.

Evaluate the change against both:

1. the repository's documented rules and architecture; and
2. the applicable engineering principles in the **SEP² review criteria** below.

Focus on behavior introduced or affected by this pull request. Inspect surrounding
code when necessary to understand the change, but do not report unrelated
pre-existing problems unless the pull request makes them materially worse.

Report only findings that are specific, reproducible, and actionable. Do not
report speculative concerns without identifying a concrete failure mode, violated
architectural contract, or maintainability risk introduced or materially exposed
by the pull request.

### Review priorities

Review in this order and allocate attention accordingly. The examples are
representative, not exhaustive; report other findings that satisfy the category
definitions.

1. **Security** — exploitable vulnerabilities or sensitive-data exposure,
   including but not limited to SQL injection, embedded secrets (passwords, keys,
   tokens, or a hash of a secret committed in source), unsafe deserialization,
   and sensitive data exposed through logs, errors, or query output.
2. **Correctness** — behavior that produces an incorrect result or state,
   including but not limited to logic errors, broken primary flows, incorrect
   data mutations, wrong migration up/down behavior, race conditions, unhandled
   asynchronous failures, resource/connection leaks, competing authorities, or
   workflows that can leave work stranded or unrecoverable.
3. **Architecture / responsibility boundaries** — changes that violate an
   established subsystem/component contract, blur ownership, create invalid
   dependencies, duplicate architectural responsibility, or collapse distinct
   responsibilities into one implementation artifact in a way that creates a
   concrete maintenance or correctness risk.
4. **Edge cases** — incorrect behavior under bounded or unusual conditions,
   including but not limited to empty, null, zero, maximum, or malformed inputs;
   off-by-one errors; timezone and encoding issues; pagination boundaries;
   retries; and concurrent access.
5. **Tests / verification** — inadequate verification of changed behavior,
   including but not limited to missing coverage, tests that would pass if the
   implementation were broken, assertions that do not verify the intended
   outcome, important failure paths that are not exercised, or changed behavior
   whose verification contradicts the repository's testing strategy.
6. **Maintainability / design quality** — code qualities that create a concrete
   risk of future defects, including but not limited to dead code, unnecessary
   duplication, misleading names, incorrect documentation, avoidable complexity,
   multi-purpose services/classes, procedural orchestration that contains domain
   policy, infrastructure adapters that own business policy, or new abstractions
   whose only purpose is symmetry.
7. **Style** — review last and only when the code violates this repository's
   documented conventions. Do not report personal preferences or formatting that
   an automated formatter should handle.

### Finding severity

Assign exactly one of the following four severity labels to every finding. These
four labels are exhaustive, but the examples listed under them are not. Classify
unlisted problems according to their actual impact.

- `[SEV: security]` — an exploitable vulnerability, secret exposure, or
  sensitive-data disclosure. Always `fix-now`.
- `[SEV: core]` — breaks, corrupts, or materially compromises a primary feature,
  architectural contract, data path, authority boundary, or expected workflow.
  Always `fix-now`.
- `[SEV: edge]` — produces incorrect behavior in a bounded, non-primary case, or
  creates a concrete but limited maintainability/integration risk. Use `fix-now`
  when the case can cause meaningful harm; otherwise use `defer-ok`.
- `[SEV: cosmetic]` — affects naming, documentation, readability, or documented
  style without changing runtime behavior or architectural correctness. Normally
  `defer-ok`.

Use the impact of the actual failure—not the size of the proposed fix—to assign
severity.

### SEP² review criteria

Use the following engineering principles as **evaluation criteria for the code in
the pull request**.

Do not turn process/workflow principles into review comments. For example, do not
comment on whether the author should have created a branch, pushed sooner, used
more agents, or followed a particular implementation cadence.

Only report a SEP²-related finding when the pull request contains a concrete
violation that affects safety, correctness, architecture, verification, or
maintainability.

#### 1. Safety and irreversibility

Flag changes that introduce avoidable destructive or irreversible behavior,
especially when a safer reversible alternative exists within the intended scope.

Examples include:

- deleting, moving, overwriting, or mutating source/client data when a staged or
  recoverable workflow is expected;
- migrations or cleanup paths that cannot be safely rolled back when rollback is
  part of the repository's contract;
- destructive recovery behavior that can lose durable state.

Do not demand defensive ceremony where the repository already provides a trusted
safety boundary.

#### 2. Risk and blast radius

Prefer the smallest change that satisfies the stated intent.

Report when the pull request materially broadens blast radius without necessity,
for example:

- rewrites a proven implementation artifact when the change only required
  wrapping/reusing it;
- modifies unrelated behavior to improve style or architecture;
- replaces an existing mechanism with a broader redesign without evidence that
  the existing mechanism blocks the required outcome.

Do not report adjacent cleanup merely because it could be improved. The issue must
be introduced or materially worsened by the pull request.

#### 3. Intent and architectural correctness

Review for the intended system behavior, not merely whether the code compiles or
matches a superficial specification.

Flag changes that:

- satisfy the local implementation while violating the documented architectural
  intent;
- create competing sources of truth;
- move responsibility across a documented component boundary without an
  architectural basis;
- implement behavior at the wrong layer in a way that creates real coupling or
  ownership ambiguity.

When intent and local implementation conflict, the architectural contract and
documented design take precedence.

#### 4. Architectural decomposition

Apply the following thesis:

> **Architectural decomposition identifies responsibility boundaries, not implementation artifacts.**

A component is a cohesive collection of collaborating implementation artifacts
that owns one architectural responsibility behind a public contract.

A component is **not inherently** a class, service, module, Lambda function, or
file.

Review implications:

- Do not request one class/service/module per component merely for symmetry.
- Do not request a new component for every individual responsibility.
- Flag a new component only when the PR creates or requires a distinct
  architectural contract, lifecycle, ownership boundary, external dependency
  boundary, or independent reason to change.
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

Do not mechanically demand dependency injection, classes, interfaces, or new
abstractions for every helper or function.

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

Prefer composition over inheritance, explicitness over magic, clarity over
cleverness, and cohesive functions with minimal side effects.

#### 6. Preserve proven implementation

When architecture/inventory documents classify existing artifacts as fit for
purpose, treat that classification as authoritative.

If the repository uses classifications such as `PRESERVE`, `REUSE`, `REFACTOR`,
`NEW`, or `RETIRE`:

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

Components should collaborate through explicit public contracts; implementation
artifacts collaborate internally.

Flag:

- cross-component access to implementation internals when a public contract
  exists;
- dependency direction that contradicts documented architecture;
- duplicated or competing contracts for the same responsibility;
- mutable shared contract data where immutability/idempotency is part of the
  boundary;
- a low-level adapter leaking infrastructure-specific behavior into domain/core
  code.

Do not require interfaces or ports where there is no meaningful substitution,
boundary, or independently varying dependency.

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

Do not speculate broadly. Identify the specific downstream contract or execution
path affected.

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
  execution path, input, dependency relationship, or maintenance failure mode
  that triggers it.
- Do not duplicate a finding across lines or files. Report it once and mention
  other known occurrences in the same comment.
- Do not request defensive checks on every internal call unless required by a
  documented project rule or a demonstrated failure mode.
- Do not demand dependency injection, interfaces, services, or classes merely
  because a function calls another function. Review abstraction at the
  meaningful architectural seam.
- Do not report issues already enforced reliably by the repository's formatter,
  linter, compiler, or type checker unless the pull request demonstrates that
  the enforcement is absent or bypassed.
- Do not report unrelated opportunities for cleanup or architectural
  improvement. Review the scope of the pull request.

Example of a correctly formatted finding (note the bare prefix, with no
surrounding backticks):

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

Treat repository-specific rules and architecture as authoritative. Do not flag
code that follows them. When a finding depends on a project rule, cite the
relevant rule or file in the comment.

At minimum, inspect the repository-specific rule sources relevant to the changed
code, such as:

- `CLAUDE.md` / project engineering instructions;
- `README.md`;
- architecture documents and diagrams;
- implementation-plan/inventory documents;
- `CHANGELOG.md`;
- relevant `docs/adr/` decision records;
- component/subsystem specifications.

Repository-specific rules override generic examples in this document.

The following rules from the existing review configuration remain authoritative
when they apply to this repository:

- **What this repo is:** `@atomiclotus/gh-core`, a shared library published to npm
  and consumed by other repositories (for example gh-flickr and gh-pngme). It has
  no application entry point, CDK stack, or deployment of its own — its public
  surface is the exports from `index.js` and the per-directory `index.js` files
  under `src/` (`src/services/`, `src/aws/`, `src/entities/`, `src/utils/`). It
  provides service classes (`DropboxService`, `DropboxAuthService`,
  `FlickrService`, `ClientCodeService`), AWS wrappers (`S3Service`, `SnsService`,
  `SqsService`), entities (`DropboxFile`, `ClientCodes`, `FileTypes`,
  `Resolutions`), and utilities that wrap the Dropbox, Flickr, and AWS SDKs.
  Dependencies are injected through constructor options (auth providers, HTTP
  request functions, SDK clients) so behavior is testable at real boundaries;
  do not request redundant defensive validation on trusted internal calls or
  documented library guarantees.
- **Destructive Dropbox operations:** consumers rely on this library to perform
  Dropbox file and folder operations, including moves and deletes. Any change
  that could move, delete, or overwrite a client's original source file (rather
  than a staged working copy) is `[SEV: core] [fix-now]`. When the library
  processes a batch, a single-item failure must be skipped and logged, never
  fail the whole batch, unless the caller's contract explicitly says otherwise.
- **Secrets and tokens:** configuration comes from the consumer's environment
  (read via `process.env`) and, increasingly, AWS Secrets Manager; never hardcode
  a password, key, token, or a hash of a secret in source — any such literal is
  `[SEV: security] [fix-now]`. `DropboxAuthService` handles OAuth refresh and
  access tokens; a change that logs, prints, or otherwise exposes a token or
  refresh token is `[SEV: security] [fix-now]`.
- **Public API and versioning:** because this is a shared package, its exports are
  a contract. Flag any change that removes, renames, or alters the signature of
  an exported symbol (in `index.js` or a `src/**/index.js`) that is not
  accompanied by a corresponding SemVer version bump in `package.json` and a
  `CHANGELOG.md` entry — a breaking public-API change without a major bump is
  `[SEV: core] [fix-now]`.
- **Coding conventions:** `camelCase` for variables/functions; `PascalCase` for
  classes, enums, and static objects; `UPPER_SNAKE_CASE` for global constants
  (prefix env-derived constants with `k`); `lower_snake_case` only for database
  column names. Align object properties on the colon. Put `else`/`else if` on its
  own line; prefer an early `return`/`throw` over a redundant `else`. Use
  ternaries only to choose between two values, never actions, and no more than
  two per expression. Document functions with JSDoc.
- **Testing conventions:** Jest. Tests live under `src/test/`. Every test opens
  with a comment stating its scenario. Seed realistic domain data — no
  `foo`/`bar`/arbitrary IDs. Freeze time to a fixed ISO timestamp; no future
  dates. A test must fail if the implementation it covers is removed.
- **Generated or vendored code:** Do not give source-level review to lockfiles
  (`package-lock.json`) or Jest `__snapshots__`.
