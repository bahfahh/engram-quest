# Create a Memory Map

## Goal

Build a new `-memory.canvas` file that helps the user understand and remember a concept.

## Minimum Structure

- one central concept
- one novelty or contrast node
- one or more association nodes from real vault context when available
- one analogy or elaboration node
- several chunked support nodes
- one file node linking back to the source note

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

**Group bounding box:**
- Add 60px padding on all four sides around child nodes
- `group_x = min(nodes.x) - 60`
- `group_y = min(nodes.y) - 60`
- `group_width = (max(nodes.x + nodes.width) - min(nodes.x)) + 120`
- `group_height = (max(nodes.y + nodes.height) - min(nodes.y)) + 120`

### Save the file

Save as `<source-note-name>-memory.canvas` in the resolved location above.
