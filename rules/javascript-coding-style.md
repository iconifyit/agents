---
trigger: always_on
---

# JavaScript Coding Style

JavaScript, TypeScript, and Node conventions. Extends `coding-style` (the language-agnostic base); where the two conflict, this file wins.

## Variables

- Prefer `const` for variables that do not change and `let` for those that do.
- Avoid `var` entirely, and avoid global-scope variables.

## Naming Conventions

- Use `camelCase` for variable and function names.
- Use `PascalCase` for class names, enums, and static objects.
- Use `UPPER_SNAKE_CASE` for globally-scoped constants, prefixed with `k` (e.g., `const kMAX_RETRIES = 5;`).
- Use `UPPER_SNAKE_CASE` for environment variable names.
- When casting environment variables to JS vars, prefix with `k` (e.g., `const kENV_NAME = process.env.ENV_NAME;`).
- Use `UPPER_SNAKE_CASE` for enum key names (e.g., `const UserRole = { ADMIN: 'admin', USER: 'user' };`).
- DO NOT use `lower_snake_case` for JS variable or function names. (Database *column* names remain `lower_snake_case` — see the base rule.)

## Functions

- Use arrow functions for anonymous functions and callbacks.
- Prefer arrow functions unless a named function is needed for recursion or clarity.
- Prefer named functions over anonymous functions for better stack traces.
- Use default parameters where applicable.
- Use `async`/`await` for asynchronous code instead of raw callbacks or promise chains.
- Use JSDoc comments to document functions, including parameters and return values. Include examples when helpful.

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

## Conditional Blocks

Place `else` and `else if` on their own line, not on the closing brace.

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

## Early Returns

The base rule requires early returns; these are the JavaScript forms.

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
