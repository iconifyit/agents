
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
