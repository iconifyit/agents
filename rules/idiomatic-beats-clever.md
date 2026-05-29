---
trigger: always_on
---

# idiomatic-beats-clever

When proposing any code change or solution, prioritize idiomatic code that is clear and straightforward over clever or overly complex approaches. Idiomatic code is easier to read, understand, and maintain, while clever code can often be confusing and may require additional effort to decipher. Always aim for simplicity and clarity in your code.

## No gratuitous abstraction

Idiomatic also means *not building structure that doesn't earn its keep*. Before adding any class, wrapper, service layer, or abstraction, state in one sentence what it adds over calling the underlying thing directly:

- A wrapper around `fs.readFile` that adds validation, a security gate, retry logic, or a genuinely-substituted test seam → **justified**.
- A wrapper around `fs.readFile` that just calls `fs.readFile` → **delete it; call `fs.readFile`**.

"Consistency with the pattern", "it might be useful later", and "it's cleaner architecture" are NOT justifications — they're how dead abstraction layers accumulate. If the underlying library/runtime doesn't split a concern (e.g. `fs` keeps read and write as one module), don't invent a split it didn't.

The discipline test for any abstraction: *"what does this add over the thing it wraps?"* If the honest answer is "nothing — it just delegates", it's noise. Three lines of direct code beat a premature abstraction. Apply OOP and layering where they deliver real value (shared behavior across multiple real implementations, a swappable contract someone actually swaps); skip them where a simpler approach suffices.