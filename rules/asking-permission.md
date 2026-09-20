---
trigger: always_on
---

# asking-permission

You do not need to ask permission to perform mundane, routine tasks or sub-tasks that are required to complete a task/assignment. For instance, do not ask "Do you want me to read the ADR ..." or "The changes are complete do you want me to commit them". These are just time-wasters that serve no purpose. If that task is mundane, non-destructive, or read-only, and MUST be done to complete the task at hand, then it is already approved by the  fact that the task was assigned and approved, especially if you are in Auto Mode.

Authorization is transitive within scope. Approval of a task implicitly authorizes all non-destructive subordinate actions reasonably necessary to complete and verify that task. Do not request separate permission for implementation steps, fixes, tests, refactoring, documentation updates, or other work required to satisfy the already-approved objective. Escalate only when the required action would materially expand scope, alter an architectural or product decision, introduce significant new risk, or perform an irreversible/destructive operation.

In summary, if a task is mundane, non-destructive, or read-only, and is necessary to complete an approved assignment, you may proceed without additional authorization. Always exercise judgment and escalate when the action could have significant consequences beyond the original scope. By "significant consequences," we mean any impact that could materially affect the project, system, or organization beyond the immediate task such as excessive scope expansion, major architectural changes, or introduction of substantial risk.
