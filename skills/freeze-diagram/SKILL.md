---
name: freeze-diagram
description: >
  Freeze inline Mermaid diagrams in a markdown file (typically an ADR) into committed
  artifacts: save each ```mermaid block's source to diagrams/<name>.mmd, render it to
  diagrams/<name>.png in the house style, and REPLACE the inline block in the markdown with
  the PNG image reference. This makes the diagram a frozen, portable part of the document (the
  PNG renders everywhere; the .mmd stays as the editable source). Use when finalizing an ADR
  or doc whose diagrams must be committed as PNG + Mermaid source. Pairs with `create-diagram`
  (which authors the house-styled Mermaid) and complements the `document` skill (which keeps
  Mermaid inline instead of replacing it).
---

# freeze-diagram

Turn the live Mermaid in a markdown file into a committed **PNG + `.mmd` source** pair, and
swap the inline block for the PNG. The Mermaid markup is preserved as the regenerable source;
the markdown shows the frozen image.

## When to use

- Finalizing an ADR (architecture / Step Function / workflow) or any doc whose diagrams must be
  committed as images + source.
- Re-rendering after editing a `.mmd` source (update mode).

Do NOT use when the doc should keep rendering Mermaid inline (use the `document` skill for that).

## File layout

For a markdown file at `<dir>/doc.md`, diagrams live in a sibling `diagrams/` folder:

```
<dir>/
  doc.md
  diagrams/
    <name>.mmd      # Mermaid source (house init header included) — the source of truth
    <name>.png      # rendered image — referenced from doc.md
```

For an ADR (`docs/adr/ADR-NNN-title/ADR-NNN-title-X.Y.Z.md`) the folder is
`docs/adr/ADR-NNN-title/diagrams/`, keeping the ADR folder self-contained and version-frozen.

## Naming

Each Mermaid block is named by a marker comment on the line immediately above its fence:

```
<!-- diagram: upload-poller-flow | UploadPoller State Machine -->
```​`mermaid
...
```​
```

- `upload-poller-flow` → `<name>` for the `.mmd`/`.png` files.
- `UploadPoller State Machine` → caption / image alt text (optional; after the `|`).
- If no marker is present: derive `<name>` from the doc slug + a 2-digit index
  (`adr-029-01`), caption from the nearest preceding heading. Log what was inferred.

## Procedure (freeze mode)

For each ```mermaid block in the target markdown, in document order:

1. **Resolve `<name>` and caption** from the marker (or infer — see Naming).
2. **Write the source** to `diagrams/<name>.mmd`. Ensure it carries the house init header
   (default direction `LR`); if the block has no `%%{init` line, prepend the house header from
   the `create-diagram` skill. Do NOT double-prepend if one is already present.
3. **Render** `diagrams/<name>.png` (see Rendering). Confirm the file exists and is non-empty.
4. **Replace** the fenced block (and its marker line, if any) in the markdown with:
   ```
   <!-- diagram: <name> | <Caption> (source: diagrams/<name>.mmd) -->
   ![<Caption>](diagrams/<name>.png)
   ```
   The retained marker maps PNG ↔ source for future re-runs. Preserve all other markdown byte
   for byte.
5. After all blocks: confirm every `![...](diagrams/*.png)` reference resolves to a real file.

## Procedure (update / re-render mode)

When the markdown already shows PNGs (no inline ```mermaid blocks) and a `.mmd` source changed:

1. For each `diagrams/<name>.mmd`, re-render `diagrams/<name>.png` (same Rendering step).
2. The markdown already points at the PNG via its marker — no markdown edit needed unless the
   caption changed.

## Rendering (pick the first available)

The `.mmd` carries the `%%{init}%%` house theme, so every renderer reproduces the palette.

1. **`mmdc` (mermaid-cli) — preferred when installed** (deterministic, local, no egress):
   ```bash
   mmdc -i diagrams/<name>.mmd -o diagrams/<name>.png -b white
   ```
   Install once: `brew install mermaid-cli` (or `npm i -g @mermaid-js/mermaid-cli`).

2. **Mermaid MCP connector — in-session, no install/egress:** call
   `validate_and_render_mermaid_diagram` with the `.mmd` contents. The result is large and is
   saved to a tool-results file — do NOT read it into context. Extract the PNG with jq +
   base64 (strip any data-URI prefix):
   ```bash
   jq -r '.renderedPNG' <result-file> | sed 's#^data:image/png;base64,##' | base64 -d > diagrams/<name>.png
   ```
   Also check `.valid == true` before trusting the output.

3. **mermaid.ink — egress fallback:**
   ```bash
   b64=$(base64 -i diagrams/<name>.mmd | tr -d '\n' | tr '+/' '-_')
   curl -fsSL "https://mermaid.ink/img/${b64}?type=png&bgColor=white" -o diagrams/<name>.png
   ```

After rendering, verify: `test -s diagrams/<name>.png` (non-empty).

## Verification

- Every former ```mermaid block is now an `![](diagrams/<name>.png)` reference.
- Each `.png` has a matching `.mmd`, and each `.mmd` has the house init header.
- All image paths resolve. Open/preview at least one PNG to confirm the house palette landed
  (lavender `#e3cff3` fill, `#730FC3` border).
- The diff touched only the target markdown and the `diagrams/` folder — nothing else.

## Notes

- ADRs are immutable per version: a new ADR version gets new diagram names (or a version
  suffix), and the old `.mmd`/`.png` stay with the old version.
- The PNG is generated; the `.mmd` is the source of truth. Never hand-edit the PNG.
- Related: `create-diagram` (authoring the house-styled Mermaid, the init header, LR default),
  `document` (keeps Mermaid inline rather than freezing to PNG).
