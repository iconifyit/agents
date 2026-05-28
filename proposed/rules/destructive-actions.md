# PROPOSAL — edit to `rules/destructive-actions.md`

**Why:** During the eagle-ps-plugin session (2026-05-27), the agent recommended `git filter-repo` to purge a 91 MB blob from history without understanding that it rewrites the SHA of *every* commit (cascading parent-pointer changes), which orphaned the branch from `develop` (no shared merge-base), auto-closed the PR, and forced a messy recovery. The blob was already pushed to GitHub anyway, so the operation achieved nothing while causing real disruption. History-rewriting tools are chainsaws, not scalpels — they need a dry-run before touching the real repo.

**Proposed change:** add the new section below to the existing rule (keep all current text).

Scott's Update : Should we make this a skill instead of a rule? Or a rule combined with a skill and workflow? The rule is the guardrail, the skill is the how-to, and the workflow is the step-by-step process. I think all three are warranted here given the complexity and risk of these operations. The rule sets the boundary ("don't do this without following the process"), the skill provides the detailed instructions for how to do it safely, and the workflow captures the end-to-end process including approvals, dry-runs, and recovery plans.

---

## History-rewriting operations require a dry-run first

Operations that rewrite git history or are otherwise hard to reverse get an extra gate **on top of** the standard destructive-action approval flow above. This includes:

- `git filter-repo`, `git filter-branch`, BFG repo-cleaner
- `git rebase -i` / `git rebase --onto` on shared branches
- `git reset --hard` on a branch others may have
- `git push --force` / `--force-with-lease`
- Squash-merges that collapse shared history

**Before running any of these on a real repo:**

1. **Dry-run on a disposable clone.** `git clone --mirror . /tmp/dry-run && cd /tmp/dry-run && <operation>`. Then inspect the result: did the merge-base with the integration branch survive? Did refs you didn't intend to touch get rewritten? How many commits changed SHA? Tools like `filter-repo` rewrite ALL refs and ALL reachable commits by default — confirm the actual blast radius, don't assume it's surgical.

2. **Enumerate second-order effects explicitly** before proposing the operation to the user:
   - Which open PRs reference the soon-to-be-rewritten SHAs? (force-pushing rewritten history closes PRs whose head commits vanish)
   - Does any other clone / branch share the affected history?
   - Is the merge-base with the integration branch preserved? (if not, the branch becomes "unrelated history" and won't merge cleanly)
   - What is the recovery path if it goes wrong? (a manually-created backup ref is NOT safe if the same operation rewrites all refs — verify the recovery mechanism survives the operation)

3. **Question whether the operation is worth it at all.** A blob already pushed to a remote is in that remote's history regardless of local purges; "cleaning" local history while the remote keeps the blob achieves little. Weigh the disruption against the actual benefit before recommending.

If you cannot complete the dry-run, or the second-order effects are unclear, STOP and explain — do not run the operation on the real repo hoping it behaves as expected.
