# PROPOSAL — edit to `rules/when-you-make-a-mistake-stop.md`

**Why:** During the eagle-ps-plugin session (2026-05-27), after the user called out a one-PR-rule violation, the agent immediately ran `git rm` then `git restore` to "fix" it — taking destructive actions without stopping or asking. Each step compounded the original mistake. The agent also treated a broad "go with option 1" approval as authorization for every destructive command inside that recovery, rather than getting per-command approval. The existing rule says "stop and assess" but doesn't make the zero-actions-until-reauthorized expectation explicit.

**Proposed change:** append the two sections below to the existing rule (keep all current text).

---

## Zero autonomous actions after a call-out

When the user tells you that you made a mistake — even a small one, even one that seems trivially fixable — your **very next response takes ZERO tool actions**. No `git` commands, no edits, no "let me just undo that." The sequence is strictly:

1. **Acknowledge** the mistake plainly.
2. **State the current state** — what's actually true right now (run read-only checks if needed to establish it, but nothing that changes state).
3. **Propose** a fix.
4. **Wait** for explicit approval before any state-changing action.

The instinct to immediately make the mistake disappear is itself the mistake-compounding behavior this rule exists to prevent. Reversing a mistake is itself an action that can go wrong. Slow down.

## Broad approval ≠ per-command approval

When the user approves a *recovery option* or a *plan* ("go with option 1", "yes, do that"), that authorizes the **intent**, not each individual destructive command within it. Before each destructive command (`git reset --hard`, `git push --force`, `git rm`, branch/file deletion, etc.), confirm that specific command — show the exact command and its blast radius, and get a yes. A plan-level "go ahead" is not a blank check for the riskiest step buried inside it.

If a permission classifier or hook blocks a destructive command after you believed you had approval, treat that as a signal to stop and re-confirm with the user — not as an obstacle to work around.
