# Add to the repository-root `.agent-review` file

```ini
[Review]
domain = local
```

`domain = local` returns review findings to the Orchestrator without GitHub publication.
`domain = github` publishes Archie/Koala findings to the specified PR.
Tess always reports to the Orchestrator.

This is a default, not a restriction: an explicit invocation can select the other domain for that run. Existing `[Archie]`, `[Koala]`, `[Tess]`, and `[Exclude]` sections remain unchanged.
