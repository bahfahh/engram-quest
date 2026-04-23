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

### Canvas node sizing rules

**Text node height estimation:**
- `## heading` line: ~42px each
- Regular text line (including **bold**, list items): ~30px each
- Node internal padding: 32px total (16px top + 16px bottom)
- Formula: `height = (heading_lines × 42) + (body_lines × 30) + 32`
- When uncertain, **overestimate generously** — too large is fine, too small breaks layout

**Node width:**
- Default width: 220px for short nodes, 280px for nodes with longer content
- Never go below 180px

**Minimum spacing between nodes (CRITICAL — prevents overlap):**
- Horizontal gap between adjacent nodes in the same row: **at least 60px**
- Vertical gap between nodes in the same column: **at least 50px**
- Before finalizing coordinates, verify: for every pair of nodes that share a group or are visually adjacent, confirm `node_B.x >= node_A.x + node_A.width + 60` (horizontal) or `node_B.y >= node_A.y + node_A.height + 50` (vertical).
- File nodes (type `file`) are typically taller than text nodes — treat their height as **at least 160px** when computing spacing for neighbors.
- When in doubt, **add more space**. A sparse map is always better than an overlapping one.

**Group bounding box:**
- Add 60px padding on all four sides around child nodes
- `group_x = min(nodes.x) - 60`
- `group_y = min(nodes.y) - 60`
- `group_width = (max(nodes.x + nodes.width) - min(nodes.x)) + 120`
- `group_height = (max(nodes.y + nodes.height) - min(nodes.y)) + 120`

### Save the file

**CRITICAL MANDATE: Filename Requirement**

You **MUST** save the file using the exact format:
`<source-note-name>-memory.canvas`

**NEVER** use descriptive or contextual names (e.g., `Azure_Full_Ecosystem_Map.canvas`). The EngramQuest plugin detects Memory Maps by the `-memory.canvas` suffix. Files without this exact suffix are invisible to the plugin and the user.
