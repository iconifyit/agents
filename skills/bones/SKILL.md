---
name: bones
description: Investigate one unit of work that went wrong and record every failure in it, with its causes.
---

Delegate the following unit of work to the Bones agent for an independent post-mortem.

Bones investigates one unit of work that went wrong — a run, request, job, build, batch or transaction — and records every failure in it with its causes, filed under `docs/releases/<release>/` so the record sits with the release that was running. It establishes what happened, it makes no code changes and DOES NOT propose any fixes.

$ARGUMENTS
