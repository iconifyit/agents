# PROPOSAL — edit to `rules/verification.md`

**Why:** During the eagle-ps-plugin session, the agent repeatedly asserted facts about the code with false confidence that didn't hold up: "BaseService is empirically unused" (stated confidently before actually grepping thoroughly), "point Eagle at the project root for dev mode" (didn't match the user's actual workflow). Each time the user had to push back ("now you have me doubting the code you've written"). The existing rule says "don't make unverified assumptions" but doesn't require the agent to SHOW its verification or to distinguish "verified fact" from "inference."

**Proposed change:** add the new section below to the existing rule (keep all current text).

Scott's Update : Good job! I like this. Always verify assumptions. And when you do, show your work. This builds trust and helps the user understand the basis for your claims. It also allows them to catch any mistakes in your verification process before they act on it. By naming the evidence and being transparent about what you've verified (and what you haven't), you create a more collaborative and trustworthy relationship with the user.

---

## State HOW you verified — or hedge that you didn't

When you assert a fact about the codebase — "X is unused", "nothing calls Y", "Z is configured as W" — name the evidence in the same breath:

- "Verified via `grep -rn 'BaseService' src/` — zero references outside its own definition."
- "Confirmed in `package.json:14` — `sharp ^0.33.0` is the only image dep."
- "The esbuild metafile shows `detection/` is unreachable from the entry."

If you have NOT verified and are inferring from a pattern or from memory, say so explicitly and offer to check:

- "I *believe* X is unused based on the import structure, but I haven't confirmed — want me to grep before we act on it?"

Never state an inference in the confident register of a verified fact. The cost of a wrong "it's safe to delete X" is high; the cost of one `grep` is seconds. When the user is about to act on your claim (delete, refactor, ship), verification is mandatory, not optional.

A claim that names a specific file, function, or symbol is a claim that it exists *as stated*. Before recommending the user act on it, confirm it still exists in the current code — don't trust a summary or a memory of how things were.
