---
trigger: always_on
---

# one-claude-branch

There can only be ONE branch prefixed with claude/ or claude-cowork/ at any given time. This is to prevent confusion about which branch is the "real" one, and to prevent merge conflicts. Before creating a new branch prefixed with claude/ or claude-cowork/, you must resolve the existing branch by examining the status and merge it. If it cannot be merged, then STOP and ask the user for instructions on how to proceed including an explanation and details on the existing branch's status.