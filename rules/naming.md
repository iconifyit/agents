---
trigger: always_on
---

# naming

Human-facing elements, such as UI components, labels, spreadsheet tabs, document names, and messages, should have clear, descriptive, and consistent names that convey their purpose and function to users. Do not use jargon, code names, or abbreviations that may confuse users. Instead of "poller-upload-carried", use "Uploaded" (just an example, not prescribing a specific name).

Code-facing elements — variables, functions, classes, files — are governed by [coding-style](coding-style.md) and the per-language rules it defers to. This rule does not restate them.

**Note:** Naming for a user and naming for a developer are separate problems with separate readers. This rule is about the first: a name the user reads should make sense to someone who has never seen the code behind it.