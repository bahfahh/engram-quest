# Create a Memory Map

## Goal

Build a new `-memory.canvas` file that helps the user understand and remember a concept.

## Minimum Structure

- one central concept
- one novelty or contrast node
- one or more association nodes from real vault context when available
- one analogy or elaboration node
- several chunked support nodes
- one file node linking back to the source note (use `type: "file"` with the vault-relative path in the `file` field, e.g. `"file": "Study/OS概論.md"`)

## Design Rules

- Prefer 3 to 6 major branches
- Keep each node short and useful
- Use layout to make the core contrast obvious
- Favor meaningful memory structure over decorative complexity

### Layout patterns by content type

Choose the layout that matches the underlying structure of the content. **Flow clarity always wins over grid compactness.**

- **Sequential flow** (Step 1 → 2 → 3 → 4, cause→effect chains, hierarchical levels like L1→L2→L3): use a **single vertical column**, arrows top-to-bottom. Do NOT compress into a 2×2 grid — mixed horizontal/vertical arrows will cross.
- **Contrast / comparison** (A vs B, before/after, problem/solution): two parallel columns side by side, central concept above or between them.
- **Radial / hub-and-spoke** (one core concept with branches): central node surrounded by groups. **Cap edges from the central node at 6**; if more branches exist, introduce intermediate grouping nodes to avoid spider-web visuals.
- **Cluster / chunked** (independent themed groups, no strong order): grid of groups, each group internally laid out per its own structure.

When the content does not match any pattern cleanly, prefer vertical sequential flow as the default — it scales better than grids for memory maps.

## Output

### Determine save location

Before creating the canvas file:

1. Read `.memory-map/config.json` if it exists.
2. If `memoryMapFolder` is set (non-empty string), save the file there:
   `<memoryMapFolder>/<source-note-name>-memory.canvas`
   Create the folder if it does not exist.
3. If the config file does not exist, or `memoryMapFolder` is empty or missing,
   save next to the source note:
   `<source-note-folder>/<source-note-name>-memory.canvas`

### AI workflow preference

For EngramQuest runtime discovery, folder placement matters:

- Preferred: save the map next to the source note
- If the map is synthesized across several related notes, save it in the most representative shared topic folder
- Only use a dedicated `memoryMapFolder` when the user or config explicitly requires it

The Review Deck runtime searches same-folder candidates before weaker relation signals, so keeping AI-generated maps in the source/topic folder maximizes automatic linkage success.

### Canvas node sizing rules

**Text node height estimation:**
- `## heading` line: ~42px each
- Regular text line (including **bold**, list items): ~30px each
- Node internal padding: 32px total (16px top + 16px bottom)
- Formula: `height = (heading_lines × 42) + (body_lines × 30) + 32`
- When uncertain, **overestimate generously** — too large is fine, too small breaks layout

**Node width:**
- Latin / English content: 220px for short nodes, 280px for longer content. Never go below 180px.
- **CJK content (Chinese / Japanese / Korean)**: glyphs are wider and denser than Latin — the English defaults will overflow. Use:
  - Single-column nodes: **320–460px** (use the upper range when a node has 4+ lines or contains `**bold**` runs)
  - Two-column / side-by-side nodes: **200–230px each** (only acceptable when each column is 1–2 short lines; if a column is multi-line, promote it to single-column 320px+)
- When mixing CJK and Latin in the same node, follow the CJK rule.

**Minimum spacing between nodes (CRITICAL — prevents overlap):**
- Horizontal gap between adjacent nodes in the same row: **at least 60px**
- Vertical gap between nodes in the same column: **at least 50px**
- Before finalizing coordinates, verify: for every pair of nodes that share a group or are visually adjacent, confirm `node_B.x >= node_A.x + node_A.width + 60` (horizontal) or `node_B.y >= node_A.y + node_A.height + 50` (vertical).
- File nodes (type `file`) are typically taller than text nodes — treat their height as **at least 160px** when computing spacing for neighbors.
- When in doubt, **add more space**. A sparse map is always better than an overlapping one.

**Minimum spacing between groups (CRITICAL — groups need MORE breathing room than nodes):**
- Horizontal gap between adjacent groups: **at least 100px** (measured between the right edge of one group and the left edge of the next)
- Vertical gap between stacked groups: **at least 200px** (group labels and visual weight need clear separation)
- Do NOT reuse the 60/50px node-spacing values for groups — adjacent groups will look glued together.
- Verification: for every pair of adjacent groups, confirm `group_B.x >= group_A.x + group_A.width + 100` or `group_B.y >= group_A.y + group_A.height + 200`.

**Group bounding box:**
- Add 60px padding on all four sides around child nodes
- `group_x = min(nodes.x) - 60`
- `group_y = min(nodes.y) - 60`
- `group_width = (max(nodes.x + nodes.width) - min(nodes.x)) + 120`
- `group_height = (max(nodes.y + nodes.height) - min(nodes.y)) + 120`

**Group containment validation (CRITICAL — Obsidian will silently reposition orphan child nodes):**

After computing all group bounding boxes, run this check for every group and every child node assigned to it. Any failure means the child has escaped its parent and will be auto-corrected by Obsidian's linter — usually to the wrong place.

For each child node `C` inside group `G`:
- `C.x >= G.x + 60`
- `C.x + C.width <= G.x + G.width - 60`
- `C.y >= G.y + 60`
- `C.y + C.height <= G.y + G.height - 60`

If any inequality fails, expand the group bounding box (or move the child) until all four hold. Do this **before** writing the canvas file, not after — once Obsidian rewrites coordinates, the layout intent is lost.

### Save the file

**CRITICAL MANDATE: Filename Requirement**

You **MUST** save the file using the exact format:
`<source-note-name>-memory.canvas`

**NEVER** use descriptive or contextual names (e.g., `Azure_Full_Ecosystem_Map.canvas`). The EngramQuest plugin detects Memory Maps by the `-memory.canvas` suffix. Files without this exact suffix are invisible to the plugin and the user.
