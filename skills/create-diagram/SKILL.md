---
name: create-diagram
description: >
  Create diagrams in Scott's house style (lavender #e3cff3 fill / #730FC3 border / #293845
  text / #788896 connectors). Two paths: MERMAID (house-themed, the default for anything
  committed to the repo — ADRs, docs, READMEs — renders inline, frozen in git) and WHIMSICAL
  (the same look as an interactive cloud board, for exploratory/non-committed visuals). Use
  for ANY diagram request: flowcharts, state machines, ER, architecture, mind maps, sequence,
  wireframes. Default direction is LR. For ADRs, pair with the `freeze-diagram` skill.
---

# create-diagram

Author diagrams in a consistent house style derived from `scratch/whimsical-example.svg`.

## Choose the tool by destination

| Destination | Tool | Why |
| --- | --- | --- |
| **Committed to the repo** (ADRs, docs, READMEs) | **Mermaid** (house-themed) | Text source lives in git, diffable, renders on GitHub, no cloud dependency, frozen with the doc |
| **Interactive / exploratory** (a quick visual, a working board) | **Whimsical** | Polished cloud board; same house look |

Default to **Mermaid** unless the user specifically wants a Whimsical board. **Default direction is `LR`** (left-right) for both.

For ADR / committed diagrams the full flow is: author the Mermaid block (below) → run the
**`freeze-diagram`** skill to emit `diagrams/<name>.mmd` + `diagrams/<name>.png` and replace
the inline block with the PNG.

---

## Mermaid house style (the committed default)

Start every diagram with this verified init header (renders the exact house palette — confirmed
in the SVG: `#e3cff3` fill, `#730FC3` border, `#293845` text, `#788896` lines):

```
%%{init: {'theme':'base','themeVariables':{
'fontFamily':'system-ui, sans-serif',
'primaryColor':'#e3cff3','primaryBorderColor':'#730FC3','primaryTextColor':'#293845',
'lineColor':'#788896','clusterBkg':'#ffffff','clusterBorder':'#788896','edgeLabelBackground':'#ffffff'
}}}%%
flowchart LR
  ...
  classDef house fill:#e3cff3,stroke:#730FC3,stroke-width:2px,color:#293845;
```

The `themeVariables` style every node by default; the `classDef house` + `:::house` is
belt-and-suspenders for any node that needs it explicitly.

**Shapes carry the semantics** (color is uniform — do not introduce other colors unless the
user asks for semantic coloring):

| Role | Mermaid shape |
| --- | --- |
| start / end / terminal | `id([Label])` (stadium) |
| decision / Choice | `id{Label}` (diamond) |
| process / task / Lambda | `id[Label]` (rect) |
| data store (S3, DB, Dropbox) | `id[(Label)]` (cylinder) |
| input / output | `id[/Label/]` (parallelogram) |

- **Catch / error / secondary edges:** dotted — `A -. catch .-> B`.
- **Groups / phases:** `subgraph Name ... end` (styled gray-outline by `clusterBorder`/`clusterBkg`).
- Verify before delivering: render once (Mermaid MCP `validate_and_render_mermaid_diagram`)
  and confirm `valid:true`. Minor nit: arrowheads may render near-black; pin with
  `linkStyle default stroke:#788896` if pixel-exact arrows matter.

Worked header + a few nodes:

```
%%{init: {'theme':'base','themeVariables':{'fontFamily':'system-ui, sans-serif','primaryColor':'#e3cff3','primaryBorderColor':'#730FC3','primaryTextColor':'#293845','lineColor':'#788896','clusterBkg':'#ffffff','clusterBorder':'#788896','edgeLabelBackground':'#ffffff'}}}%%
flowchart LR
  start([Init]):::house
  check{Valid?}:::house
  work[Process]:::house
  store[(Save to S3)]:::house
  start --> check
  check -->|valid| work
  check -. invalid .-> stop([Reject]):::house
  work --> store
  classDef house fill:#e3cff3,stroke:#730FC3,stroke-width:2px,color:#293845;
```

---

## Whimsical house style (interactive path)

Same look, as a cloud board. The catch: the structured **`create`** path ignores hex/extended
colors on nodes (renders White) — node color only takes via the **`edit`/`update`** path, by
node ID, *after* create.

1. `how_to('flowchart')`, then `create` the structure (shapes, edges, `groups` with
   `color:"silver"`/`style:"outline"`). `direction:"left-right"`.
2. `fetch` (`detail:"detailed"`, `expand_groups:true`, `select_kinds:["shape"]`) for node IDs.
3. `edit` one `update` op per node: `{op:"update", id:"<id>", color:"#730FC3", deco:"outline"}`
   (`outline` gives the lavender-tint fill + `#730FC3` border; `fill` gives a solid dark fill).
4. `fetch` (`image:true`) to confirm. Leave connectors default gray. Return the `fileURL`.

**Color trap:** Whimsical's keyword `purple` is `#BD34D1` (pink), NOT the house color. Use the
literal hex `#730FC3` (== its `dark-purple` swatch).

---

## Always

- **Derive every node and edge from verified source** — read the actual code/config/schema;
  never diagram from memory.
- Mind maps: `data.markdown` (Whimsical) / `mindmap` (Mermaid). Sequence: arrow syntax.
- Related: global memory "Prefer Whimsical for interactive; Mermaid (house-themed) for
  committed docs/ADRs", and the `freeze-diagram` skill for committing Mermaid into ADRs.
