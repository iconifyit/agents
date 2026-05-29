# PROPOSAL — edit to `rules/idiomatic-beats-clever.md`

**Why:** During the eagle-ps-plugin session, the agent created a `FileReader` class whose single method just delegated to `fs.readFile` with nothing added (no validation, no security gate) — and the runtime bypassed it entirely, calling `fs.readFile` directly. It also kept a `BaseService` class with zero subclasses, and split one filesystem concern across three classes (`FileReader`/`FileWriter`/`FileSystemService`) where Node's own `fs` keeps read+write as one module. The agent was following OOP patterns dogmatically rather than because they added value. The user's framing: "We only want to create a service if we are adding something to it… We don't want to write code just to be elegant or just to follow some dogma."

**Proposed change:** add the new section below to the existing rule (keep all current text).

---

## No gratuitous abstraction

Idiomatic also means *not building structure that doesn't earn its keep*. Before adding any class, wrapper, service layer, or abstraction, state in one sentence what it adds over calling the underlying thing directly:

- A wrapper around `fs.readFile` that adds validation, a security gate, retry logic, or a genuinely-substituted test seam → **justified**.
- A wrapper around `fs.readFile` that just calls `fs.readFile` → **delete it; call `fs.readFile`**.

"Consistency with the pattern", "it might be useful later", and "it's cleaner architecture" are NOT justifications — they're how dead abstraction layers accumulate. If the underlying library/runtime doesn't split a concern (e.g. `fs` keeps read and write as one module), don't invent a split it didn't.

The discipline test for any abstraction: *"what does this add over the thing it wraps?"* If the honest answer is "nothing — it just delegates", it's noise. Three lines of direct code beat a premature abstraction. Apply OOP and layering where they deliver real value (shared behavior across multiple real implementations, a swappable contract someone actually swaps); skip them where a simpler approach suffices.
