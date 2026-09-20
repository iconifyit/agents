---
name: capture-idea
description: Capture any idea Scott has — product, platform, marketing, automation, business — to the central ideas inbox at v1/docs/ideas/inbox.md, quickly and without derailing current work. Use when Scott says "capture this idea", "make a note", "idea:", "/capture-idea", or "before I forget". Blog-POST ideas are the exception — those go through capture-post-idea to the content engine's 03-ideas inboxes instead.
---

# Skill: capture-idea (the general idea inbox)

Scott has ideas constantly, in the middle of other work. This skill files
them in one central place so they survive the session and get reviewed on a
schedule, instead of living and dying in chat.

## Where ideas go

Append to `v1/docs/ideas/inbox.md`, newest first. One file, one list, so
review is a single read. Blog-post ideas are the one exception: route those
through the `capture-post-idea` skill to the content engine's
`03-ideas/` inboxes, and say so in one line if Scott aimed a post idea
here by mistake.

## When to trigger

When Scott explicitly asks — "capture this idea," "make a note of this,"
"before I forget," "/capture-idea …" — or when he describes something as a
future want ("at some point I'd like…", "eventually we should…") AND
confirms with one question ("Want that in the ideas inbox?") if he did not
explicitly ask. Never file an idea silently, and never skip filing one he
asked for because it seems small.

## The cardinal rule: capture must be cheap

One append and a one-line confirmation, then return to the interrupted
work. Do not interview Scott about the idea, do not start designing the
solution, and do not turn the entry into a plan. The entry preserves the
idea and its context; the thinking happens later, at review.

## Entry format (complete sentences, per Scott's standing style rule)

```markdown
## <short searchable title>
Captured <ISO date> · Category: <product | platform | marketing |
automation | business | process> · Status: new

<The idea in Scott's words, lightly cleaned. One or two sentences of
context about what prompted it, so future-Scott remembers why it
mattered. Any raw material worth preserving — links, file paths, names,
numbers — goes here too, because the session context will be gone later.>
```

The status lifecycle is: `new` → `reviewed` (seen in a weekly review) →
`promoted` (it became a decision-queue entry, a plan, or a backlog item —
name which) → `done` or `dropped`. Statuses are updated by hand or during
the weekly review, not by the capturing session.

## Review cadence

The ideas inbox is a standing item in the weekly review ritual defined in
`v1/docs/ops/operating-model.md`: the orchestrator skims `new` entries,
Scott decides promote, park, or drop, and statuses get updated. An idea
that stays `new` for a month should be surfaced explicitly rather than
silently aging.
