# PROPOSAL — edit to `skills/soa-module/SKILL.md` (and the parallel `skills/filesystem-soa-module/SKILL.md`)

**Why:** The eagle-ps-plugin codebase ended up with a `BaseService` class that no service extended, and a three-class split (`FileReader`/`FileWriter`/`FileSystemService`) for what is one filesystem concern. The SOA pattern is genuinely valuable when there's shared behavior across multiple real implementations — but scaffolding the full Entity/Repository/Service/Base-class set "because that's the pattern" produces empty base classes and dead layers when the domain doesn't actually have the shared structure. The skill should make the agent confirm the pattern fits *before* scaffolding.

This applies to BOTH `soa-module` (DB/Objection-backed) and `filesystem-soa-module` (fs-backed) — add the same check to each skill's "Before You Start".

**Proposed change:** add the check below to the `## Before You Start` section of each SOA-module skill.

Scott's Update : I need to spend some time thinking about how to capture my design philosophy in an easy-to-understand "manifesto" or set of principles I use. Given that I like repeatable patterns and idiomatic code, this should be doable. It's just a matter of taking the time to do it. Even a rough first draft gives us something to work with and to refine. I think it's important to capture not just the "how" but the "why" behind my design decisions, so that we can ensure that the agents are not just following patterns blindly but are also understanding the reasoning behind them. This will help us maintain a high-quality codebase and make informed decisions about when to apply certain patterns and when to deviate from them based on the specific needs of the project.

---

## Add to "Before You Start"

**Confirm the SOA pattern actually fits before scaffolding.** This skill produces a full Entity/Repository/Service/Base-class structure. That structure earns its keep only when the domain has the shared behavior the base classes factor out and the separation of concerns the layers provide. Before generating any of it, check:

- **Will the base classes have real shared content?** If this is the only service and there's no second implementation on the horizon, a base class is an empty placeholder (YAGNI). Extend a base class only when ≥2 concrete classes genuinely share behavior.
- **Does each layer add value?** Entity (data shape + validation), Repository (data access), Service (business logic) are distinct concerns *when the domain has all three*. If the "repository" would just delegate one call to the underlying API with nothing added, collapse it — don't wrap `fs.readFile`/`db.query` in a layer that adds nothing (see the `idiomatic-beats-clever` rule's "no gratuitous abstraction" clause).
- **Does the underlying library already model the concern?** Node's `fs` keeps read and write as one module; don't split them into separate `Reader`/`Writer` classes unless each side adds something concrete (a validation gate, a protected-path guard, a retry policy). Mirror the underlying model unless you're adding value on top of it.

If the pattern doesn't fit — a single service with a heterogeneous dependency shape, no shared base, a concern the runtime already models cleanly — say so and propose the simpler structure instead. The pattern serves the code, not the reverse.

**Mixins for partial-shared behavior.** When some (not all) concrete classes share a behavior, compose it via a mixin (`withCacheable`, `withFreezable`, etc.) rather than forcing it onto a base class that every subclass inherits. Don't push a behavior onto a subclass that doesn't need it.
