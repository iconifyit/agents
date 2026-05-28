---
trigger: always_on
---

# Architectural Decomposition & Systems Thinking

This skill defines the REQUIRED mental model for solving any non-trivial coding task.

You are not writing code. You are designing a system.

Failure to follow this process results in junior-level solutions.

---

## Core Principle

All software systems can be decomposed into:

> **Input → Transformation → Output**

This pattern is **fractal** and MUST be applied at every level:
- System
- Feature
- Module
- Function

Never implement directly from examples. Always derive the general rule first.

---

## REQUIRED PROCESS (MANDATORY)

Before writing ANY code, you MUST complete the following steps.

---

### 1. Identify Intent (Solve the Right Problem)

- What problem is actually being solved?
- What is the invariant or business rule?
- What must always be true?

Do not solve symptoms. Solve intent.

---

### 2. Define the System Flow

Break the task into:

- **Inputs**
  - What data enters the system?
  - From where?
  - In what shape?
  - What validation is required?

- **Transformation**
  - What business logic or decisions occur?
  - What must remain pure/deterministic?

- **Outputs**
  - What leaves the system?
  - Who consumes it?
  - In what format?

---

### 3. Decompose into Architectural Domains

You MUST separate responsibilities into the following domains:

#### 1. Data
- Storage, retrieval, persistence
- Database access
- External data sources
- Representation (schemas, models)

#### 2. Business Logic
- Rules, calculations, transformations
- Validation logic
- Domain invariants

#### 3. Presentation / Output
- API responses
- UI/view models
- Formatting and serialization

#### 4. Communication
- Logging
- Alerts
- Notifications
- External messaging/integrations

#### 5. Orchestration
- Workflow coordination
- Sequencing of operations
- Dependency wiring
- Transactions and retries
- Saga/process flow

#### 6. Testing (Verification Layer)
- Unit tests
- Integration tests
- Failure-path tests
- Contract validation

---

### 4. Define Abstractions (Encapsulation Strategy)

Determine the correct abstraction boundaries.

Use the appropriate construct for the problem:
- Services
- Domain objects / entities
- Repositories
- Validators
- Mappers / transformers
- Orchestrators / workflows
- Utilities

Do NOT default to classes.

Use the abstraction style that is:
- Idiomatic to the language
- Consistent with the existing codebase
- Appropriate to the problem

---

### 5. Define Error Strategy (MANDATORY)

For each domain, explicitly define:

- What can fail?
- Where can it fail?
- Is it:
  - Fatal
  - Recoverable
  - Retryable
  - User-visible

Rules:
- Missing required configuration is ALWAYS fatal
- Errors must never be silently swallowed
- Error handling must be intentional and consistent
- Logging and alerts must be meaningful and actionable

Error handling is a **cross-cutting concern across all domains**

---

### 6. System Fit (Respect the Existing Architecture)

Before introducing new patterns:

- Find the closest existing implementation
- Reuse or extend it

Rules:
- Do NOT invent new patterns without justification
- Do NOT violate established architecture
- Do NOT introduce parallel patterns

Consistency > novelty

---

### 7. Orchestration Design

Explicitly define:

- Execution order
- Dependencies
- Failure paths
- Retry behavior
- Transaction boundaries

Orchestration MUST NOT be mixed with:
- Business logic
- Data access

It is a separate concern.

---

### 8. Verification Strategy

Define how correctness will be proven:

- Integration tests (primary)
- Unit tests (secondary)
- Failure-path tests (required)
- Observability (logs, metrics)

Rule:
> If correctness cannot be proven, the implementation is incomplete.

---

### 9. Refactor Pass (REQUIRED)

Initial implementation is NOT final.

You MUST:
- Remove duplication
- Extract reusable logic
- Simplify structure
- Align with system patterns

---

## Anti-Patterns (FORBIDDEN)

The following are explicitly disallowed:

- Implementing directly from examples without generalizing
- Mixing domains (e.g., business logic inside controllers)
- Embedding orchestration inside data or logic layers
- Writing one-off functions without evaluating reuse
- Swallowing errors or ignoring failures
- Asking for clarification when the system implies the answer
- Creating new patterns when existing ones suffice

---

## One-Line Rule

> Always design the system first. Code is the final step, not the first.