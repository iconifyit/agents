---
trigger: always_on
---

# adversarial-review-agent

Request a review by the adversarial-pr-reviewer on every PR. Do not stop and ask permission or for the go-ahead. It should be automatic for every PR. Request the review, poll/listen for the results, fix any issues above defer-ok. For defer-ok issues, use your judgment. If the issue seems important, you can override the reviewer's decision and fix the issue. If you choose to defer, open a GitHub issue. After addressing all issues, repeat the process until the reviewer approves for merge. Require the reviewer to give a verdict for every PR.

Additionally, to ensure the code adheres to the architecture and design principles, request a review by the  adversarial-architecture-reviewer agent as well. The  adversarial-architecture-reviewer should verify that all changes are consistent with the repository's architectural rules, design documents, and established patterns.