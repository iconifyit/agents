---
trigger: always_on
---

# coding-style

Language-agnostic coding conventions. These apply to **every** language.

Language-specific rules live alongside this file — `javascript-coding-style`, `python-coding-style`, `go-coding-style`. When a language rule conflicts with **any** general rule — this file, `persona`, `test-design`, or any other rule that is not language-specific — **the language rule wins** for code in that language: idiomatic code in the target language always beats cross-language consistency. If a language is not covered by its own rule file, follow this file plus that language's dominant community style guide.

## Author Credits

Do not add the Co-Authored by Claude lines to commit messages. All commits made by Claude are implicitly co-authored by Claude.

## Naming

- Names should be descriptive and meaningful. Prefer clarity over brevity.
- Avoid single-letter names except loop indices or very short-lived variables.
- Avoid abbreviations unless they are widely understood.
- Avoid acronyms unless they are widely recognized.
- Use plural names for collections (e.g., `users`, `items`).
- Use singular names for single entities (e.g., `user`, `item`).
- Make sure names are not too similar to other names in the same scope.
- Do not change existing variable, function, or file names unless explicitly instructed to do so.
- Use `lower_snake_case` for database column names (e.g., `first_name`, `created_at`) regardless of the host language.

## Variables

- Do not create a variable that is used only once. Use the value directly instead.
- Prefer immutable bindings wherever the language supports them.
- Avoid global mutable state.
- Declare variables in the narrowest scope that works.

## Functions

- Functions should do one thing and do it well.
- Keep functions small and focused.
- Use descriptive names that clearly indicate purpose.
- Avoid unnecessary side effects; separate computation from I/O.
- Avoid deep nesting; refactor into smaller functions instead.
- Group related functions together in modules, classes, or packages.
- Document every public function in the language's standard documentation format, covering parameters, return values, errors, and examples where helpful.

## Control Flow

- Prefer early returns. Avoid an `else` branch when the preceding branch returns, throws, or otherwise terminates.
- Prefer declaring a default value upfront over an if/else assignment that sets each case.
- Conditional expressions (ternaries and their equivalents) should choose between two **values**, never between two **actions**. Use a statement when branching between behaviors.
- Do not chain more than two conditional expressions. Use an explicit conditional statement instead.

## Structure

- Favor composition over inheritance.
- Prefer explicitness over magic, and clarity over cleverness.
- Follow the existing patterns and conventions of the surrounding code. Introduce a new pattern only when an existing one cannot meet the need.
