
---
trigger: always_on
---

# Task Execution Workflow

Each task should follow the workflow below. This workflow is designed to ensure that we are building the right thing, building it right, and maintaining a high standard of quality and reliability in our codebase. It also makes sure we are on the same page and are coordinating expectations and plans before taking action.

Do not think of tasks as discreet items to be checked off of a list. Every task is connected to a larger whole - to a system. View each task as a piece of a larger puzzle, and always consider how it fits into the bigger picture. Always consider the long-term implications of your design and implementation choices on the overall system.

## Describe

I will describe the task, in as much detail as possible, including the context, source or sources, any relevant references, and target outcomes.

## Analyze

You will analyze the existing code and docs to understand the current state and background. You will also analyze the task requirements and constraints to understand what needs to be done and any limitations or considerations that need to be taken into account.

## Plan

We will PLAN first. You are not to start building, writing code, or making changes until we are in agreement and I have explicitly given you permission to start. Planning includes:
   - Discussing the requirements and constraints of the task
   - Discussing the implementation approach and design
   - Discussing potential edge cases and failure modes
   - Discussing how to test the implementation
   - Discussing how to verify the implementation
   - Creating an ADR if the task involves a significant design decision or architectural change

## Discuss

We will discuss the plan until we are in agreement and I have explicitly given you permission to start. This is a critical step to ensure that we are aligned on the approach and that you have a clear understanding of the task and how to execute it.

## Document (ADRs, Plans, etc.)

You will document the plan, including any design decisions, implementation details, and testing strategies. This documentation will serve as a reference for the implementation and will help ensure that we are on the same page throughout the execution of the task. Documentation will be maintained in ./docs/ and linked to the relevant code and PRs.

## Implement

You will implement the code according to the plan and design we have agreed upon. You will follow the coding standards and guidelines we have established, and you will ensure that your code is clean, maintainable, and well-documented. You will not deviate from the plan without first discussing and getting explicit permission to do so. If a change is to be made, it must first be discussed and agreed upon, then documented in the plan and/or ADRs as necessary.

## Verify

We will verify the implementation by running tests, checking logs, and performing any necessary manual verification steps. We will ensure that the implementation meets the requirements and constraints of the task, and that it does not introduce any new issues or regressions. We will also verify that the implementation is maintainable, extensible, and follows best practices.

When verifying new code, don't just look at what it does and the happy path. Consider edge cases, failure modes, and how it interacts with the rest of the system. Consider how it will be maintained and extended in the future. Consider whether it follows best practices and coding standards. Be thorough in your verification to ensure that we are maintaining a high standard of quality in our codebase. Also actively look for regressions. Just because you do not touch a file, does not mean there is no impact on it. Always consider the system as a whole and how changes can have downstream effects. Every piece of code, no matter how seemingly unrelated, can be impacted and can contain regressions. Do not assume there are no regressions - VERIFY! by actively testing.

DO NOT ignore or skip errors. Regardless if the issue was pre-existing, it is part of the system and must be addressed. I never want to hear, "Oh that error is pre-existing, it's not related to the change I made, so I'm going to ignore it." If you encounter an error, stop and investigate it. Understand why it is happening and what the implications are. If you need to ask for help or clarification, do so. Do not proceed until you have a clear understanding of the error and how to address it.

## Iterate

If any issues are found during verification, we will iterate on the implementation to fix them. We will follow the same process of planning, discussing, and documenting any changes that need to be made. We will not make any changes without first discussing and getting explicit permission to do so.

## Planning

It is better to spend more time planning and verifying before taking an action than to have to clean up a mess after taking an incorrect action. Always take the time to plan, verify, and ask for clarification if needed before taking any action.

## Workflow Management

Each task should be performed within a single branch with a clear, descriptive name. Commits should be atomic and focused on a single concern. Pull requests should be focused on a single concern and should not mix unrelated changes. Always resolve one PR before starting another.

There should only ever be one feature branch open at a time. If you need to switch to a new task, first resolve the open PR (merge or close), then create a new branch for the new task.

## Mistakes / Errors

Mistakes and errors happen, even for AI. If you realize you have made a mistake or taken an incorrect action, STOP immediately. Do not continue taking actions until you have assessed the situation and come up with a plan to fix it. Explain the mistake to your human, including what happened, why it happened, and what you plan to do to fix it. Always ask for permission before taking any corrective action, especially if it involves destructive actions.
