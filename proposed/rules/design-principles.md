# DRAFT / STUB — proposed `design-principles` (Scott to author)

> **Status:** stub for Scott to author. Not yet a live rule.
>
> **Purpose:** capture the *why* behind your design decisions — the philosophy that
> *generates* the specific conventions — so an agent can apply **judgment in novel cases**
> instead of pattern-matching a checklist. This is deliberately distinct from
> `coding-style` (the concrete conventions: naming, formatting, alignment). Conventions
> answer "how do we write it"; principles answer "why, and when does the rule bend."
>
> **Open questions for Scott:**
> - Rule vs top-level doc? It's general always-on guidance, so a rule fits — but a
>   "principles" doc some rules *point at* might read better. Your call.
> - The headings below are seeds drawn from existing rules + things you've said. Keep,
>   cut, merge, reorder — and most importantly, fill in the **why** in your own words.

---

Each principle below is a seed: a one-line statement + where it already shows up. The
`_Why (Scott):_` lines are placeholders for you to expand with the reasoning — that's the
part that lets an agent generalize.

## 1. Solve for intent, not symptoms

Understand what the code/feature is *for* and fix the root cause, not the surface error.
_Why (Scott):_ …
_(seeds: `solve-for-intent` rule)_

## 2. Idiomatic beats clever

Prefer the clear, conventional solution over the clever one; match the codebase's existing
patterns before introducing your own.
_Why (Scott):_ …
_(seeds: `idiomatic-beats-clever` rule)_

## 3. No abstraction without added value

Every class, wrapper, layer, or service must add something concrete over calling the
underlying thing directly. "Consistency with the pattern" and "might be useful later" are
not value. Mirror what the runtime/library already models unless you're adding to it.
_Why (Scott):_ …
_(seeds: `idiomatic-beats-clever` "no gratuitous abstraction"; the FileReader/BaseService episode)_

## 4. Pragmatic OOP / SOA — apply the pattern, don't worship it

OOP and the SOA layering (Entity / Repository(or Store) / Service + Base classes) earn
their keep only when there's real shared behavior across ≥2 implementations. Use mixins
(`withCacheable`, …) for behavior shared by *some* subclasses. Don't scaffold empty layers.
_Why (Scott):_ …
_(seeds: `soa-module` skill; your notes on Base* + mixins)_

## 5. Systems thinking

Design for the whole system: separation of concerns, SOLID, downstream effects, edge cases
and failure modes — not just the happy path of the unit in front of you.
_Why (Scott):_ …
_(seeds: `persona` rule)_

## 6. Verify; don't act on assumptions

Ground decisions in evidence — read the code, confirm the behavior — rather than a
confident guess. Especially before anything hard to reverse.
_Why (Scott):_ …
_(seeds: `verification` rule; `destructive-operations`)_

## 7. _(add your own)_

_Why (Scott):_ …
