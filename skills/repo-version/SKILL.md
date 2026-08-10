---
name: repo-version
description: Maintain and verify repository versions using Semantic Versioning. Use when preparing, updating, reviewing, or completing a release PR; changing a repository version; or checking that VERSION, package manifests, and lockfiles agree.
---

# Repository Versioning

Maintain the repository version according to Semantic Versioning.

## Prepare a release

1. Read the current version from the root `VERSION` file.
2. Inspect the release changes since the previous version.
3. Select the required increment:
   - `major`: incompatible or breaking changes
   - `minor`: backward-compatible functionality
   - `patch`: backward-compatible fixes or maintenance
4. Ask the user when release intent or the appropriate increment cannot be determined safely.
5. Update `VERSION` with the new version followed by a newline and without a `v` prefix.
6. Synchronize the version in `package.json` and any applicable manifests or lockfiles.
7. Run relevant validation to confirm all declared versions match.
8. Report the old version, new version, increment type, and justification in the PR summary.

## Guardrails

- Treat `VERSION` as the canonical repository version.
- Include the version bump in the release PR before it is merged.
- Increment once for the release as a whole, not for every commit.
- Never reuse or decrease a released version.
- Do not change the version for a non-release PR; explicitly identify the PR as non-release.
- Do not commit directly to the default branch.
- Do not merge, tag, publish, or create a release unless explicitly authorized.