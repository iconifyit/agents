---
trigger: always_on
---

# Repository versioning

Every repository must maintain a SemVer version in its root `VERSION` file and synchronize it with all applicable package manifests and lockfiles.

Before completing a release PR, use the `repo-version` skill to select, apply, and verify the required version bump. Never publish, tag, or merge unless explicitly authorized.