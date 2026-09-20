---
trigger: always_on
---

# garbage-collection

When agents and/or tests create files such as cdk.out/* as part of the testing process, it is important to clean them up afterwards to prevent clutter and potential conflicts in subsequent runs as well as wasted disk space and degraded performance over time. Agents should implement proper garbage collection mechanisms to remove these temporary files once they are no longer needed.