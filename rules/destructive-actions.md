---
trigger: always_on
---

# CRITICAL: Destructive Actions

**A destructive action is any action that is irreversible or would require significant pain and effort to reverse.**

NB: This is the single most important rule that must never be violated without explicit permission. Always ask for permission before performing any destructive action, and only perform it with explicit approval.

> **Verify the side effects of the action — even if you think you know them — before taking it. Do not act on an unverified assumption.**

That is the root cause of every destructive-action disaster, and the domain is incidental — a git history rewrite, a `DROP TABLE`, an `rm -rf`, a force-deploy, and killing a process all fail the same way. See the `destructive-operations` skill for the verify-and-catalog discipline and the `destructive-operation` workflow for the ordered execution sequence.

This includes but is not limited to:
- Deleting files, folders, or branches (local or remote)
- Overwriting files (including TODO lists, config files, any existing content)
- Git operations that lose commits (reset, force push, etc.)
- Pushing to remote repositories
- Merging PRs
- Discarding git changes
- Any data loss or replacement

**BEFORE any destructive action:**
1. Read/verify the current state first.
2. Verify the action's side effects and blast radius — even if you think you know them. Do not assume.
3. Confirm a recovery path that the action itself cannot destroy.
4. Explain to your human what you intend to do and why, including the verified side effects, blast radius, and recovery path.
5. Get explicit, per-action approval. Intent-level approval ("clean these up") is not approval for a specific destructive action.
6. Only then proceed, working least-destructive → most-destructive: create/copy first, verify the new thing exists and is correct, commit/push the safe changes, and take the irreversible step last. Limit the blast area as much as possible.

**NO DESTRUCTIVE ACTIONS WITHOUT EXPLICIT PERMISSION - NO EXCEPTIONS.**

## Hard-to-reverse operations require a verified dry-run first

Some operations are hard enough to reverse that they get an extra gate **on top of** the approval flow above: reproduce the operation on a disposable copy and confirm its real blast radius before touching the real target. The domain is irrelevant — what matters is that the operation cannot be walked back. These qualify:

- **Version control:** `git filter-repo` / `filter-branch` / BFG, `git rebase -i` / `--onto` on shared branches, `git reset --hard` on a shared branch, `git push --force` / `--force-with-lease`, squash-merges that collapse shared history.
- **Other domains:** schema migrations that drop or rewrite data, bulk deletes/updates without a tested `WHERE`, cache or data-store purges, infrastructure teardown.

Before running any of these on the real target, you must have all three: a **completed dry-run** on a disposable copy, an explicit **enumeration of second-order effects**, and a **recovery path verified to survive the operation itself**. The `destructive-operations` skill carries the procedure for each.

If you cannot complete the dry-run, or the second-order effects are unclear, STOP and explain — do not run the operation on the real target hoping it behaves as expected.
