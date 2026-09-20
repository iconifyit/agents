---
trigger: always_on
---

# garbage-collection

Build and test runs leave artifacts behind — `cdk.out/`, coverage output, bundler caches, scratch fixtures. Left in place they accumulate, collide with later runs, and waste disk. Clean them up as part of the run that created them.

This rule authorizes a **narrow, bounded** exception to [destructive-actions](destructive-actions.md), which otherwise requires explicit permission before deleting anything. You may delete a file without asking only when **every** one of these holds:

- the current session created it, as a build or test artifact;
- it lives inside the project working tree; and
- it is gitignored, or it sits in a directory whose entire purpose is generated output (`cdk.out/`, `dist/`, `coverage/`, `.pytest_cache/`, and the like).

Anything failing even one of those conditions stays under `destructive-actions` and needs explicit, per-action permission. In particular this rule never authorizes deleting tracked files, files that predate the session, files outside the working tree, or a whole directory you did not create — and it never authorizes `rm -rf` against a path you have not just listed and verified.

Prefer writing scratch output to a temporary directory outside the repo in the first place. A file that was never created in the working tree needs no cleanup and carries no deletion risk.
