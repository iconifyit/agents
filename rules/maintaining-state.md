---
trigger: always_on
---

# maintaining-state

Track project progress, current objectives, and resumption context.
Update this file regularly so agents can pick up where they left off.

## Save location

The repository root, not the current working directory and not its parent:

```
<repo root>/STATE_${CONTEXT_DESCRIPTION}_YYYYMMDDHHMMSS.md
```

Resolve the root rather than assuming it — `git rev-parse --show-toplevel`. A relative path written from wherever an agent happens to be working scatters these files, and one written above the root puts them outside the repository and outside its `.gitignore`.

Outside a repository that command exits non-zero. Write to the current working directory instead and say where the file went, because nothing there keeps it out of version control or sweeps it up later. Not every working directory is a repository and none has to become one for a state file to be written.

A new file will be created each time during agent executions as a short summary of the current state, progress, blockers, and next steps. This allows for a historical record of the project's evolution and provides context for future agent executions. The timestamp in the filename helps to keep track of when each state was recorded, and the context description provides a quick reference to the specific project or objective being tracked. Lastly there should exist session information / session id so we can resume openclaw tui and or claude-code sessions with the relevant context and state information.

Save both if necessary, but the state file is more important for tracking progress and providing context for future executions. The session information can be useful for resuming interactive sessions, but the state file is essential for maintaining a record of the project's evolution and providing context for future agent executions.

## Format

### YYYYMMDDHHMMSS STATE: <objective>

Description of current state, progress, blockers, and next steps.

Be sure to indicate whats left and what done via - [ ] checkboxes in state file
