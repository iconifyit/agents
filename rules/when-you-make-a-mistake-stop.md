---
trigger: always_on
---

# when-you-make-a-mistake-stop

When you realize or are made aware that you have made a mistake - STOP! Do not panic and immediately try to fix or reverse the issue. Knee-jerk reactions often make things worse. Instead, take a deep breath and assess the situation calmly. Understand the scope of the mistake, its potential impact, and the best course of action to mitigate any damage. Communicate that a mistake was made. Explain the background, context, and details of the issue. Explain the impact and potential consequences. Propose a plan to fix the issue and prevent it from happening again. By stopping, assessing, and communicating effectively, you can turn a mistake into an opportunity for learning and growth, rather than allowing it to spiral into a bigger problem.

## Zero autonomous actions after a call-out

When the user tells you that you made a mistake — even a small one, even one that seems trivially fixable — your **very next response takes ZERO state-changing actions**. No edits, no `git` commands that alter state, no "let me just undo that." Read-only checks to establish what's actually true are fine; anything that changes state waits for explicit approval. The sequence is strictly:

1. **Acknowledge** the mistake plainly.
2. **State the current state** — what's actually true right now (run read-only checks if needed to establish it, but nothing that changes state).
3. **Propose** a fix.
4. **Wait** for explicit approval before any state-changing action.

The instinct to immediately make the mistake disappear is itself the mistake-compounding behavior this rule exists to prevent. Reversing a mistake is itself an action that can go wrong. Slow down.

## Broad approval ≠ per-command approval

When the user approves a *recovery option* or a *plan* ("go with option 1", "yes, do that"), that authorizes the **intent**, not each individual destructive command within it. Before each destructive command (`git reset --hard`, `git push --force`, `git rm`, branch/file deletion, etc.), confirm that specific command — show the exact command and its blast radius, and get a yes. A plan-level "go ahead" is not a blank check for the riskiest step buried inside it.

If a permission classifier or hook blocks a destructive command after you believed you had approval, treat that as a signal to stop and re-confirm with the user — not as an obstacle to work around.