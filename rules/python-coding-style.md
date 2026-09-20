---
trigger: always_on
---

# python-coding-style

Python conventions. Extends `coding-style` (the language-agnostic base); where the two conflict, this file wins.

Canonical sources: **PEP 8** (style), **PEP 257** (docstrings), **PEP 484** (type hints), and the **Google Python Style Guide** for docstring structure.

## Formatting

- Formatting is not a matter of opinion. Use **Black** (or `ruff format`) and accept its output.
- Line length is Black's default of 88 characters. Do not hand-wrap to a different width.
- Use **Ruff** for linting and import sorting. It replaces flake8, isort, pyupgrade, and pylint for most purposes.
- Indent with 4 spaces. Never tabs.
- Two blank lines between top-level definitions, one between methods.

## Naming

- `snake_case` for variables, functions, methods, modules, and packages.
- `PascalCase` for classes, exceptions, and type variables.
- `UPPER_SNAKE_CASE` for module-level constants. **Do not prefix constants with `k`** — that is a JavaScript convention in this ruleset and is not idiomatic Python.
- `_leading_underscore` marks an attribute or function as internal to its module or class.
- `__double_leading_underscore` triggers name mangling; use it only when you actually need that, which is rare.
- Never use `l`, `O`, or `I` as single-character names — they are visually ambiguous.
- Name the first argument of an instance method `self`, and of a class method `cls`.

## Type Hints

- Annotate all public functions, methods, and module-level constants.
- Use built-in generics (`list[str]`, `dict[str, int]`) rather than the deprecated `typing.List` / `typing.Dict`.
- Use `X | None` rather than `Optional[X]`. Add `from __future__ import annotations` when targeting versions where the syntax is not yet native.
- Prefer specific types over `Any`. Reach for `Protocol` when you need structural typing.

## Docstrings

- Every public module, class, and function gets a docstring, in triple double quotes, per PEP 257.
- Use **Google style** sections: `Args:`, `Returns:`, `Raises:`, `Yields:`, `Example:`.
- The summary line is a single imperative sentence ending in a period.
- Document *why*, not *what*, in inline comments. The code already says what.

## Imports

- One import per line. Absolute imports only; no wildcard imports.
- Group as stdlib, then third-party, then first-party/local, separated by blank lines. Ruff enforces this.
- Do not run import-time side effects. Importing a module must not mutate global state, read secrets, open connections, or perform I/O.

## Idioms

- Prefer comprehensions and generator expressions over `map`/`filter` with lambdas. Keep them to one level of nesting.
- Use context managers (`with`) for anything that must be released.
- Use `pathlib.Path` over `os.path` string manipulation.
- Use f-strings for formatting, not `%` or `.format()`.
- Use `enumerate` and `zip` rather than manual index arithmetic.
- Prefer `dataclasses` (or `pydantic` where validation is needed) over hand-written `__init__` boilerplate for data containers.
- Follow EAFP ("easier to ask forgiveness than permission") — try the operation and handle the exception — rather than defensive pre-checks, which is the idiomatic Python posture.
- Use `is` / `is not` only for `None`, `True`, and `False`. Use `==` for value comparison.
- Conditional expressions read `value_if_true if condition else value_if_false`. Keep them to a single, simple choice between values.

## Errors

- Catch the most specific exception that fits. Never use a bare `except:`, and avoid a blanket `except Exception:` unless you re-raise or the boundary genuinely requires it.
- Never silently swallow an exception with `pass`. Log it, handle it, or let it propagate.
- Define domain-specific exception classes deriving from `Exception` rather than raising built-ins for application errors.
- Never use a mutable default argument (`def f(items=[])`). Default to `None` and construct inside the function.

## Testing

- Use **pytest**. Prefer plain `assert`, fixtures for setup, and `@pytest.mark.parametrize` for equivalence classes.
- Test through public interfaces. Inject collaborators rather than patching internals; reach for `unittest.mock` only at true external boundaries.
