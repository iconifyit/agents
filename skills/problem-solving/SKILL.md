---
trigger: always_on
# description: >
#   Scaffold a new SOA service module (Entity, Repository, Service, index.js) following the
#   project's established patterns. Use this skill whenever creating a new service, SOA module,
#   or entity/repository/service layer for a domain concept. Also use when the user mentions
#   "create a service for X", "new SOA module", "entity and repository for X", or similar.
---

# First Principles Problem Solving

At the most basic level, an application is: (a) data in -> (b) transformation/action -> (c) data out. Everything else is layers on top of that basic structure or recursive/fractal expressions of that pattern. The goal is to approach every task from this standpoint. Deconstruct the problem, identify first principles, identify appropriate design patterns (ie, the Gang of Four design patterns), analyze what tools already exist in the code base or can be bought vs. built (metaphorically speaking). Then apply the patterns in a testable, maintainable way. Easy to say, hard to do.

## Engineering First-Principles Rule

Every application behavior is a dataflow:

Input → Transformation / Action → Output

Before writing code, deconstruct the task as:

1. Input
   - What data enters?
   - From where?
   - In what shape?
   - What must be validated?

2. Transformation / Action
   - What type of data operation is this? 
     - classification, 
     - transformation, 
     - validation, 
     - routing
     - persistence
     - event handling
     - migration
     - orchestration
     - policy decision
     - state transition
   - Who or what performs this operation? (human, machine, service, code, etc.)
   - Who or what are the actions taken on? (human, machine, service, code, data, etc.)
   - What changes are made to the data?
   - What decision is being made?
   - What side effects occur?
   - Is this pure logic, orchestration, persistence, integration, or UI?

3. Output
   - What artifacts are produced?
   - To where?
   - In what shape?
   - Who consumes it?
   - What must be guaranteed?

4. Problem Type
   - classification
   - transformation
   - validation
   - routing
   - persistence
   - event handling
   - migration
   - orchestration
   - policy decision
   - state transition
  
5. What are the failure states?
   - What does failure look like?
   - What are the failure modes?
   - How should failures be handled?

7. Pattern / Algorithm
   - Is there an identifiable algorithm being used in this problem?
   - Is there an identifiable design pattern that fits this problem type? (Think Gang of Four design patterns)
   - What are the known pitfalls of this pattern/algorithm?
   - What are the success criteria for this pattern/algorithm?
   - What are the failure modes for this pattern/algorithm?
   - What are the tradeoffs of this pattern/algorithm?
   - Does this pattern/algorithm preserve separation of concerns?
   - Does this pattern/algorithm support testability?
   - Does this pattern/algorithm avoid coupling?
  
8. Existing Tools (build vs. buy vs. reuse)
   - Has this  problem or a similar problem already been solved in this codebase?
   - Has this problem been solved in a well-known library or framework?
   - What patterns are known to fit this problem type?
   - Should this be reused, adapted, or replaced?

8. Placement
   - runtime code
   - service layer
   - domain layer
   - repository
   - adapter
   - migration
   - CLI/admin tool
   - test helper

9.  Test Strategy
   - What can be tested as pure logic?
   - What requires integration tests?
   - What should be mocked?
   - What invariants must tests prove?

Only after this is complete may implementation begin.



## Decision

We will use: <pattern / approach>

## Why this is the right solution

- aligns with problem type: <explain>
- preserves separation of concerns: <how>
- supports testability: <how>
- avoids coupling: <how>
- scales/extends cleanly: <how>

## Alternatives Considered

### Option A: <name>
- why it could work
- why it was rejected

### Option B: <name>
- why it could work
- why it was rejected

## Tradeoffs Accepted

- what we are knowingly sacrificing

## Implementation Constraints (Binding)

### Must Do
- use <pattern>
- isolate <concern> in <layer>
- reuse <existing component>

### Must Not Do
- no one-off logic in runtime paths
- no install-specific branching in shared code
- no side effects outside defined boundaries
- no implicit behavior (everything must be explicit/testable)

### Placement Rules
- this belongs in: <layer/module>
- this must not appear in: <layer/module>

### Dataflow Contract
- input boundary:
- transformation boundary:
- output boundary:

### Test Requirements
- unit tests for transformation logic
- integration tests for boundaries
- invariants that must always hold

## Failure Modes

If implemented incorrectly, this will look like:
- procedural code instead of pattern-based structure
- logic placed in wrong layer
- special-case handling leaking into general flow
- tight coupling between unrelated concerns

These are considered defects.
