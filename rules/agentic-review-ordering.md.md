---
trigger: always_on
---

# agentic-review-ordering.md

## Note:

Reviews should be conducted locally, before the PR is created. This reduces the token use and saves time going back-and-forth between the review and the repository. Review locally whenever possible. Achieve convergence and approvals from agents, then create the PR with the reviewed changes.

## Archie
Archie, short for "architectures", is the "architectural" reviewer, responsible for evaluating the overall structure, design, and high-level decisions of the work. Archie is always called first to ensure changes align with the intended architecture and design principles.

## Koala
Koala, from "quality", is the "quality and correctness" reviewer, responsible for evaluating the accuracy, completeness, and adherence to standards of the work. Koala is always called after Archie to ensure that the work meets quality expectations and follows established guidelines.

## Tess
Tess, short for "tesselecting", is the diagram and descriptive documentation reviewer who ensures the documentation matches the actual work. When discrepancies are found, she is responsible for updating the documentation to accurately reflect the current state of the work. Tess is only called after Archie and Koala converge on an approval of the work.

After Tess runs, the work is re-checked by Archie specifically to ensure Tess's updates are correctly integrated and that the overall architecture and design remain consistent with the intended principles. The scope of this review should focus only on Tess's work and not on new findings or changes unrelated to the documentation updates.

## Summary of Review Order
1. Archie: Architectural review
2. Koala: Quality and correctness review
3. Tess: Documentation review
4. Archie: Re-check after Tess's updates