---
trigger: always_on
---

# CRITICAL: Destructive Actions

**A destructive action is any action that is irreversible or would require significant pain and effort to reverse.**

NB: This is the single most important rule that must never be violated without explicit permission. Always ask for permission before performing any destructive action, and only perform it with explicit approval.

This includes but is not limited to:
- Deleting files, folders, or branches (local or remote)
- Overwriting files (including TODO lists, config files, any existing content)
- Git operations that lose commits (reset, force push, etc.)
- Pushing to remote repositories
- Merging PRs
- Discarding git changes
- Any data loss or replacement

**BEFORE any destructive action:**
1. Read/verify the current state first
2. Explain to your human what you intend to do and why, including the potential risks and consequences.
3. Ask explicit permission from the user
4. Only proceed with explicit approval
5. Limit the blast area as much as possible.

**NO DESTRUCTIVE ACTIONS WITHOUT EXPLICIT PERMISSION - NO EXCEPTIONS.**

**Order of operations: Always perform actions from least destructive to most destructive.**
1. Create/copy first
2. Verify the new thing exists and is correct
3. Push/commit the safe changes
4. Only then, with explicit permission, perform destructive actions.

## History-rewriting operations require a dry-run first

Operations that rewrite git history or are otherwise hard to reverse get an extra gate **on top of** the standard destructive-action approval flow above. This includes:

- `git filter-repo`, `git filter-branch`, BFG repo-cleaner
- `git rebase -i` / `git rebase --onto` on shared branches
- `git reset --hard` on a branch others may have
- `git push --force` / `--force-with-lease`
- Squash-merges that collapse shared history

**Before running any of these on a real repo:**

1. **Dry-run on a disposable clone.** For history-rewrite tools that operate on refs/objects (`filter-repo`, BFG), a bare mirror works: `git clone --mirror . /tmp/dry-run`. For operations that need a worktree (`rebase`, `reset --hard`, branch-level rehearsals), use a normal clone: `git clone . /tmp/dry-run && cd /tmp/dry-run && <operation>`. Then inspect the result: did the merge-base with the integration branch survive? Did refs you didn't intend to touch get rewritten? How many commits changed SHA? Tools like `filter-repo` rewrite ALL refs and ALL reachable commits by default — confirm the actual blast radius, don't assume it's surgical.

2. **Enumerate second-order effects explicitly** before proposing the operation to the user:
   - Which open PRs reference the soon-to-be-rewritten SHAs? (force-pushing rewritten history closes PRs whose head commits vanish)
   - Does any other clone / branch share the affected history?
   - Is the merge-base with the integration branch preserved? (if not, the branch becomes "unrelated history" and won't merge cleanly)
   - What is the recovery path if it goes wrong? (a manually-created backup ref is NOT safe if the same operation rewrites all refs — verify the recovery mechanism survives the operation)

3. **Question whether the operation is worth it at all.** A blob already pushed to a remote is in that remote's history regardless of local purges; "cleaning" local history while the remote keeps the blob achieves little. Weigh the disruption against the actual benefit before recommending.

If you cannot complete the dry-run, or the second-order effects are unclear, STOP and explain — do not run the operation on the real repo hoping it behaves as expected.
