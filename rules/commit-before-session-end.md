---
trigger: always_on
---

# commit-before-session-end

Commit (or otherwise durably capture) all work-in-progress changes at the latest by the end of each working session. Never leave changes floating uncommitted across sessions.

Why: floating uncommitted changes are quickly forgotten — what they are, why they were made, whether they were verified — and returning to them cold is how mistakes get made (unrelated changes get swept into the wrong commit, half-finished edits get shipped, or good work gets clobbered by a reset). A commit is a durable, named checkpoint; uncommitted working-tree state is not.

How to apply: before ending a working session (or whenever a coherent unit of work is done), commit the relevant changes to the appropriate branch. Scope each commit properly — stage only the files that belong to that concern, never `git add -A` a tree that also holds unrelated floating files. If work is genuinely mid-stream and not ready for a clean commit, at minimum record it (a WIP commit on a feature branch, or a stash with a descriptive message) so nothing is lost or forgotten. This complements the session-state-handoff / STATE.md practice: STATE.md records the status and resume steps, while this rule ensures the actual code and doc changes are committed rather than left dangling in the working tree.
