---
trigger: always_on
---

# go-coding-style

Go conventions. Extends `coding-style` (the language-agnostic base); where the two conflict, this file wins.

Canonical sources: **Effective Go**, **Go Code Review Comments**, and the **Google Go Style Guide**. Go's community is unusually settled on these — deviation reads as a mistake, not a preference.

## Formatting

- Run **gofmt** (or `goimports`, which also fixes import grouping). Its output is the standard. There is no formatting debate in Go.
- gofmt uses tabs for indentation. Do not change this.
- There is no line-length limit. Break a long line only when it genuinely aids readability.
- Use **golangci-lint** for static analysis; `go vet` is the minimum bar.

## Naming

- `MixedCaps` for exported identifiers, `mixedCaps` for unexported. **Never use underscores** in Go names.
- An identifier's first letter controls visibility: capitalized is exported, lowercase is package-private. There is no other access modifier.
- Keep acronyms in one case: `URL`, `ID`, `HTTP`, `API` — so `userID` and `ServeHTTP`, never `userId` or `ServeHttp`.
- Package names are short, lowercase, single words, no underscores and no plurals: `http`, `user`, `bytes`.
- Avoid stuttering. In package `http`, the type is `http.Server`, not `http.HTTPServer`.
- Receiver names are one or two characters, consistent across every method on a type: `func (s *Server)`, never `func (this *Server)` or `func (self *Server)`.
- The shorter the variable's scope, the shorter its name may be. `i` in a tight loop is fine; a package-level identifier is not.

## Errors

- Return `error` as the last return value. Handle it immediately; do not defer error checks.
- Never discard an error with `_` unless you can justify it in a comment.
- Wrap with context using `fmt.Errorf("doing thing: %w", err)` so callers can still use `errors.Is` and `errors.As`.
- Error strings are lowercase and carry no trailing punctuation: `"connection refused"`, not `"Connection refused."`.
- Define sentinel errors as `var ErrNotFound = errors.New("not found")` and compare with `errors.Is`.
- Do not `panic` in library code. Reserve panic for genuinely unrecoverable programmer error, and recover only at process boundaries.

## Interfaces and Types

- Accept interfaces, return concrete structs.
- Keep interfaces small — one to three methods. `io.Reader` is the model.
- Define an interface in the package that *consumes* it, not the package that implements it.
- Make the zero value useful where you can. `sync.Mutex` and `bytes.Buffer` are usable without initialization.
- Be consistent about pointer versus value receivers on a given type. If any method needs a pointer receiver, use pointer receivers for all of them.

## Control Flow and Structure

- Go has no ternary operator, by design. Use an `if` statement.
- Keep the happy path at the leftmost indentation. Handle errors and edge cases with early returns so the main flow reads top to bottom.
- Use `defer` for cleanup immediately after acquiring the resource.
- Avoid naked returns in any function longer than a few lines — name the results for documentation, but return them explicitly.

## Concurrency

- Never start a goroutine without knowing how and when it exits.
- Pass `context.Context` as the first parameter, named `ctx`. Never store it in a struct.
- Use channels to communicate ownership and signal completion; use `sync.Mutex` to protect shared state. Pick the one that makes the code simpler.
- Run tests and CI with `-race`.

## Documentation and Testing

- Doc comments begin with the identifier's name and are complete sentences: `// Server handles incoming requests.`
- Every exported identifier gets a doc comment.
- Write table-driven tests using a slice of test-case structs with `t.Run` subtests for each case.
- Use the standard `testing` package. Add `testify` or similar only when it earns its place.
