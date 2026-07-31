# Canvas Lesson Recipe — generating `type: "canvas"` lesson steps

A canvas lesson is a JSON Canvas file rendered by Obsidian's native Canvas view. Use it when a
lesson step teaches through **visual structure** — the user pans, zooms, drags nodes, and can
add their own annotations (that editability is the point; it stays their map).

## What a canvas step can be

Canvas is a **medium, not a diagram type**. Pick whatever form serves the content:

| Form | Teaches | Typical placement |
|---|---|---|
| Learning map / roadmap | What the course covers, prerequisite flow | Before the lessons it maps (often step 1) |
| Big-picture architecture | How several concepts fit together | Before or between related lessons |
| Mindmap | One central concept radiating into branches | Overview before, or recap after |
| Classification / matrix | Grouping scattered items, quadrant positioning | After the lessons that introduced the items |
| Comparison | A vs B side-by-side (two groups) | After both sides have been taught |
| Flow / decision tree | Steps, branching decisions | With the lesson that teaches the process |
| Section summary | Condensing the last few lessons into one picture | After a section |

## File naming (hard rules)

- Filename: `lsn-<id>-<short-ascii-slug>.canvas` — same pattern as HTML lessons, in the same
  course folder `engram-quest/lessons/{courseSlug}/`.
- **Never end the filename with `-memory.canvas`.** That suffix is the memory-map feature's
  detection pattern; a course canvas matching it would be wrongly listed as a memory map.

## JSON Canvas format

```json
{
  "nodes": [
    { "id": "n1", "type": "text", "text": "# Title\nBody with **markdown**", "x": 0, "y": 0, "width": 400, "height": 140, "color": "4" },
    { "id": "n2", "type": "file", "file": "Study/Some Note.md", "x": 0, "y": 300, "width": 400, "height": 400 },
    { "id": "g1", "type": "group", "label": "Section", "x": -60, "y": -60, "width": 520, "height": 900 }
  ],
  "edges": [
    { "id": "e1", "fromNode": "n1", "fromSide": "bottom", "toNode": "n2", "toSide": "top", "label": "leads to" }
  ]
}
```

- Node `color`: `"1"` red, `"2"` orange, `"3"` yellow, `"4"` green, `"5"` cyan, `"6"` purple.
  Use color to encode meaning (e.g. one color per branch/category), not decoration.
- `file` nodes may point at the user's vault notes (path from vault root). Prefer linking notes
  the course is actually based on — Obsidian keeps the link alive across renames/moves.
- Edge direction follows meaning: `fromNode` is the cause/earlier concept, `toNode` the
  effect/later one. Label edges when the relationship isn't obvious.

## Layout rules (same discipline as memory-map)

- Text node width **320–460px**; estimate height generously (~40px per rendered line).
- Treat `file` nodes as **≥160px** tall when spacing neighbors.
- Adjacent nodes: horizontal gap **≥60px**, vertical gap **≥50px**.
- Adjacent groups: horizontal gap **≥100px**, vertical gap **≥200px** (groups need more air).
- Group bounds = child bounding box + **60px padding** on all four sides; every child must sit
  fully inside its group.
- When in doubt, add more space — a sparse map beats an overlapping one.

**Validate by script, not by eye.** Before writing the file, run a check like:

```bash
python3 - <<'EOF'
import json, itertools, sys
c = json.load(open("engram-quest/lessons/<courseSlug>/<file>.canvas", encoding="utf-8"))
nodes = [n for n in c["nodes"] if n["type"] != "group"]
groups = [n for n in c["nodes"] if n["type"] == "group"]
bad = []
def overlap(a, b, gx, gy):
    return not (b["x"] >= a["x"] + a["width"] + gx or a["x"] >= b["x"] + b["width"] + gx or
                b["y"] >= a["y"] + a["height"] + gy or a["y"] >= b["y"] + b["height"] + gy)
for a, b in itertools.combinations(nodes, 2):
    if overlap(a, b, 60, 50): bad.append(f"nodes too close: {a['id']} / {b['id']}")
for a, b in itertools.combinations(groups, 2):
    if overlap(a, b, 100, 200): bad.append(f"groups too close: {a['id']} / {b['id']}")
for g in groups:
    for n in nodes:
        inside_x = n["x"] >= g["x"] and n["x"] + n["width"] <= g["x"] + g["width"]
        inside_y = n["y"] >= g["y"] and n["y"] + n["height"] <= g["y"] + g["height"]
        if (inside_x != inside_y) or (inside_x and inside_y and (
            n["x"] < g["x"] + 60 or n["x"] + n["width"] > g["x"] + g["width"] - 60 or
            n["y"] < g["y"] + 60 or n["y"] + n["height"] > g["y"] + g["height"] - 60)):
            bad.append(f"node {n['id']} straddles or hugs group {g['id']}")
print("\n".join(bad) or "layout OK"); sys.exit(1 if bad else 0)
EOF
```

Fix every reported pair before delivering (nodes partially outside a group count as straddling;
fully-outside nodes near a group are fine).

## meta.json entry

Canvas lessons live in the same `lessons` array with `"type": "canvas"` — see
`lesson-format.md` for the field contract and the planned-entry (`file: null`) flow. Everything
else (id rules, completion init, merge discipline) is identical to HTML lessons.
