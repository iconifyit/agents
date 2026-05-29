---
trigger: always_on
---

# Coding Style

## Author Credits

Do not add the Co-Authored by Claude lines to commit messages. All commits made by Claude are implicitly co-authored by Claude.

## Variables

- Do not use snake_case for variable names. Always use camelCase.
- Variable names should be descriptive and meaningful.
- Use clear and descriptive names for functions and variables.
- Avoid single-letter variable names except for loop indices or very short-lived variables.
- Do not create variables that are only used once. Use the value directly instead.
- Prefer `const` for variables that do not change and `let` for those that do.
- Avoid using `var` or global-scope variables.
- Avoid abbreviations unless they are widely understood.
- Avoid acronyms unless they are widely recognized.
- Use plural names for arrays and collections (e.g., `users`, `items`).
- Use singular names for single entities (e.g., `user`, `item`).

## Variable Naming Conventions

- Use `camelCase` for variable and function names
- Use `PascalCase` for class names, enums, and static objects
- Use `UPPER_SNAKE_CASE` for globally-scoped constants, prefix with `k` (e.g., `const kMAX_RETRIES = 5;`)
- Use `UPPER_SNAKE_CASE` for environment variable names
- When casting environment variables to JS vars, prefix with `k` (e.g., `const kENV_NAME = process.env.ENV_NAME;`)
- Use plural names for arrays and collections (e.g., `users`, `items`)
- Use singular names for single entities (e.g., `user`, `item`)
- Use `UPPER_SNAKE_CASE` for enum key names (e.g., `const UserRole = { ADMIN: 'admin', USER: 'user' };`)
- Use `lower_snake_case` for database column names (e.g., `first_name`, `created_at`)
- DO NOT use `lower_snake_case` for JS variable or function names

## Functions

- Functions should do one thing and do it well.
- Keep functions small and focused.
- Use descriptive names for functions that clearly indicate their purpose.
- Use arrow functions for anonymous functions and callbacks.
- Avoid unnecessary side effects in functions.
- Use default parameters for functions when applicable.
- Use async/await for asynchronous code instead of callbacks or promises directly.
- Prefer named functions over anonymous functions for better stack traces.
- Avoid deeply nested functions; refactor into smaller functions if necessary.
- Use JSDoc comments to document functions, including parameters and return values. Include examples when helpful.
- Group related functions together in modules or classes.
- Prefer arrow functions unless a named function is needed for recursion or clarity.

## Object Properties

- Align object properties on the colon for better readability. Align one space before the colon, aligned to the longest property name.
  - Good:
    ```js
    const user = {
        firstName : 'John',
        lastName  : 'Doe',
        age       : 30,
    };
    ```
  - Bad:
    ```js
    const user = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
    };
    ```
- Use trailing commas in multi-line object and array literals.
- Sort object properties alphabetically unless there is a logical grouping that makes more sense.

## Conditional Blocks and Simplification Guidelines

Always format conditional blocks with consistent style:

Preferred style:

```javascript
if (condition) {
    // code block
}
else if (anotherCondition) {
    // another code block
}
else {
    // default code block
}
```

Avoid this style:

```javascript
if (condition) {
    // code block
} else if (anotherCondition) {
    // another code block
} else {
    // default code block
}
```

## Eliminate Redundant `else` Branches

Avoid unnecessary `else` blocks when the `if` branch contains a `return`, `throw`, or other terminating statement.

Overly verbose:

```js
if (condition) {
    return 1;
}
else {
    return 2;
}
```

Simplified:

```javascript
if (condition) {
    return 1;
}
return 2;
```

Similarly, avoid verbose if/else assignments when a default value can be declared upfront.

Overly verbose:

```javascript
let value;
if (condition) {
    value = 1;
}
else {
    value = 2;
}
```

Simplified:

```javascript
let value = 2;
if (condition) {
    value = 1;
}
```

## Ternary Operator Usage

Use ternary operators for simple assignments, but avoid them for complex logic or multiple statements. Ternary operators should choose between two values, never to choose between actions/function calls.

Correct usage:

```javascript
const value = condition ? 1 : 2;
```

Incorrect usage:

```javascript
condition ? doSomething() : doSomethingElse();
```

Do not include more than 2 ternary operators in a single expression. If you need to use more than 2, use an `if` statement instead.

Incorrect usage:

```javascript
const value = condition1 ? 1 : condition2 ? 2 : condition3 ? 3 : 4;
```

Correct usage:

```javascript
let value = 4;
if (condition1) {
    value = 1;
}
else if (condition2) {
    value = 2;
}
else if (condition3) {
    value = 3;
}
```
