---
trigger: always_on
---

# CRITICAL: Destructive Actions

**A destructive action is any action that is irreversible or would require significant pain and effort to reverse.**

NB: This is the single most important rule that must never be violated without explicit permission. Always ask for permission before performing any destructive action, and only perform it with explicit approval.

## The core principle

Destructive-action disasters share one root cause: **acting on a faulty assumption about an action's side effects without verifying it first.** The domain is incidental — a git history rewrite, a `DROP TABLE`, an `rm -rf`, a force-deploy, or killing a process all fail the same way: you *thought* you knew what would happen, you were wrong, and the result couldn't be undone.

> **Verify the side effects of the action — even if you think you know them — before taking it. Do not act on an unverified assumption.**

Verify the first time from an authoritative source (official docs, or a one-time experiment on a disposable target), then act from a catalog of what you verified rather than from memory. See the `destructive-operations` skill for the verify-and-catalog discipline and the `destructive-operation` workflow for the ordered execution sequence.

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
6. Only proceed with explicit approval, and limit the blast area as much as possible.

**NO DESTRUCTIVE ACTIONS WITHOUT EXPLICIT PERMISSION - NO EXCEPTIONS.**

**Order of operations: Always perform actions from least destructive to most destructive.**
1. Create/copy first
2. Verify the new thing exists and is correct
3. Push/commit the safe changes
4. Only then, with explicit permission, perform destructive actions.

## Hard-to-reverse operations require a verified dry-run first

Operations that are especially hard to reverse get an extra gate **on top of** the standard destructive-action approval flow above — verify the actual side effects on a disposable target before touching the real one. The domain is irrelevant; the discipline is the same whether you're rewriting history, running a destructive migration, or purging a store. Examples that warrant this gate:

- **Version control:** `git filter-repo` / `filter-branch` / BFG, `git rebase -i` / `--onto` on shared branches, `git reset --hard` on a shared branch, `git push --force` / `--force-with-lease`, squash-merges that collapse shared history.
- **Other domains:** schema migrations that drop or rewrite data, bulk deletes/updates without a tested `WHERE`, cache or data-store purges, infrastructure teardown.

**Before running any such operation on the real target:**

1. **Dry-run on a disposable copy.** Reproduce the operation on a throwaway target and inspect the actual result — don't assume it's surgical. (For git history-rewrite tools that operate on refs/objects like `filter-repo` or BFG, a bare mirror works: `git clone --mirror . /tmp/dry-run`; for operations that need a worktree like `rebase` or `reset --hard`, use a normal clone: `git clone . /tmp/dry-run && cd /tmp/dry-run && <operation>`. For a DB migration, run it against a scratch schema or snapshot.) Confirm the real blast radius: what changed, and did anything you didn't intend to touch change too? Tools like `filter-repo` rewrite ALL refs and ALL reachable commits by default — confirm, don't assume.

2. **Enumerate second-order effects explicitly** before proposing the operation to the user:
   - What downstream consumers reference the soon-to-be-changed state? (force-pushing rewritten history closes PRs whose head commits vanish; dropping a column breaks dependent views)
   - Does anything else share or depend on the affected state? (another clone/branch, a replica, a downstream job)
   - For git history specifically: is the merge-base with the integration branch preserved? (if not, the branch becomes "unrelated history" and won't merge cleanly)
   - What is the recovery path if it goes wrong, and does it survive the operation? (a backup ref is NOT safe if the same operation rewrites all refs; a backup table is NOT safe if the migration drops the schema — verify the recovery mechanism survives)

3. **Question whether the operation is worth it at all.** Weigh the disruption against the actual benefit before recommending. (A blob already pushed to a remote stays in that remote's history regardless of local purges; "cleaning" local history while the remote keeps the blob achieves little.)

If you cannot complete the dry-run, or the second-order effects are unclear, STOP and explain — do not run the operation on the real target hoping it behaves as expected.
