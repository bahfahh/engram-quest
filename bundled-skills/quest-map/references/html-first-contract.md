# HTML-First Quest Package Contract

Read this before creating or updating a plugin-native Quest Map.

## File layout

New Quest Maps are plugin packages, not markdown-first maps:

```text
engram-quest/quests/{questSlug}/
├── meta.json
└── nodes/
    ├── ch1.html
    ├── ch2.html
    └── boss.html
```

`questSlug` must be ASCII kebab-case. If the source title is not ASCII, use a compact English slug such as `procurement-system-dev`.

The Hub scans `engram-quest/quests/`, reads `meta.json`, and opens the quest inside the plugin viewer. Do not make the markdown note renderer the primary surface.

## meta.json shape

```json
{
  "version": 2,
  "title": "Procurement System Dev Quest",
  "description": "Practice procurement data modeling and monthly purchasing logic through applied missions.",
  "difficulty": "medium",
  "tags": ["procurement", "system-design"],
  "createdAt": "2026-06-20",
  "layout": {
    "mode": "dynamic"
  },
  "nodes": [
    {
      "id": "briefing-domain",
      "title": "Domain Briefing",
      "type": "briefing",
      "summary": "Read the procurement scenario and identify the core entities before modeling."
    },
    {
      "id": "ch1-inventory",
      "title": "Inventory Units",
      "type": "mission",
      "html": "nodes/ch1-inventory.html",
      "height": 760
    },
    {
      "id": "boss-monthly-procurement",
      "title": "Monthly Procurement Boss",
      "type": "boss",
      "html": "nodes/boss-monthly-procurement.html",
      "height": 900
    }
  ]
}
```

Rules:
- `version` is `2`.
- `difficulty` is `easy`, `medium`, or `hard`.
- `type` is `briefing`, `mission`, or `boss`.
- `mission` and `boss` nodes need `html` or `file`.
- HTML paths are relative to the quest package folder unless they start with `engram-quest/`.
- Optional `x` and `y` fields are percentages from 0 to 100. Use them only when you intentionally design a fixed map route.
- Prefer `layout.mode: "dynamic"` unless you have a tested coordinate plan. Do not place nodes on top of a painted background path unless coordinates are known.

## Runtime contract

The plugin:
- renders the map and node lock state inside the Hub/plugin viewer
- loads node HTML in a sandboxed iframe using `srcdoc`
- sends theme information
- stores completion and score in `engram-quest/state/`

The HTML file:
- renders the interaction
- grades the learner deterministically
- posts completion and score
- posts resize messages after content changes

## postMessage API

HTML to plugin:

```js
window.parent.postMessage({ type: "engram-quest-resize", height: document.body.scrollHeight + 24 }, "*");
window.parent.postMessage({ type: "engram-quest-solved", score: 86 }, "*");
```

Plugin to HTML:

```js
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "engram-quest-theme") {
    document.body.classList.toggle("dark", Boolean(event.data.dark));
  }
});
```

Score rules:
- `score` must be a number from 0 to 100.
- Use first-try correctness, decision quality, or weighted stage scoring.
- Do not post solved before the learner has made the required decisions.

## Legacy markdown

Legacy markdown quest-map blocks remain supported for old content and explicit embed requests. They are not the default output for new quests.

When updating an existing legacy markdown quest:
- preserve node IDs
- preserve progress by not writing `completed:`
- prefer moving to a package only if the user asks for migration
