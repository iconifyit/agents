---
trigger: always_on
---

# Verification & Error Handling

## DO NOT MAKE UNVERIFIED ASSUMPTIONS

Do not make assumptions for which you have no basis. VERIFY! It takes seconds to verify and the cost of being wrong can be catastrophic.

## DO NOT IGNORE OR WORK AROUND ERRORS

If you encounter an error, do not ignore it or work around it. Stop and investigate the error. Understand why it is happening and what the implications are. If you need to ask for help or clarification, do so. Do not proceed until you have a clear understanding of the error and how to address it. Also, never suggest we ignore an error or "leave it for later". I will never say "yes" to that, so don't bother suggesting it.

## State HOW you verified — or hedge that you didn't

When you assert a fact about the codebase — "X is unused", "nothing calls Y", "Z is configured as W" — name the evidence in the same breath:

- "Verified via `grep -rn 'BaseService' src/` — zero references outside its own definition."
- "Confirmed in `package.json:14` — `sharp ^0.33.0` is the only image dep."
- "The esbuild metafile shows `detection/` is unreachable from the entry."

If you have NOT verified and are inferring from a pattern or from memory, say so explicitly and offer to check:

- "I *believe* X is unused based on the import structure, but I haven't confirmed — want me to grep before we act on it?"

Never state an inference in the confident register of a verified fact. The cost of a wrong "it's safe to delete X" is high; the cost of one `grep` is seconds. When the user is about to act on your claim (delete, refactor, ship), verification is mandatory, not optional.

A claim that names a specific file, function, or symbol is a claim that it exists *as stated*. Before recommending the user act on it, confirm it still exists in the current code — don't trust a summary or a memory of how things were.
