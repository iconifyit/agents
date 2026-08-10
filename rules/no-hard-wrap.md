---
trigger: always_on
---

# no-hard-wrap

In any file you create or edit — ADRs, plans, docs, READMEs, emails, commit bodies, any markdown or plain text — write prose as one continuous line per paragraph and let the editor soft-wrap it. Do NOT insert hard line breaks mid-paragraph to simulate a fixed column width (~80 chars or any other). Insert newlines only where they are semantic: between paragraphs (blank line), list items, table rows, code blocks, and headings.

For copy-paste artifacts such as client emails, write them to a file (e.g. `tmp/email.md`) rather than only printing them in the chat, so they can be copied as clean unwrapped text instead of terminal-wrapped output.

**Why:** No terminal or tool setting wraps the *content* of files — a file contains exactly the text that was written to it. Hard-wrapped prose is therefore an authoring choice, and it forces the reader to manually reflow every document before use. One-line-per-paragraph keeps the source clean and lets each viewer's editor wrap to its own width.
