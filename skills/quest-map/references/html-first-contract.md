# Quest package contract

What a quest package is on disk and what the plugin does with it. This file states facts about
the plugin; how to design the missions is in `mission-design.md`.

## Files

```text
engram-quest/quests/{questSlug}/
├── meta.json
└── nodes/
    ├── ch1-report.html
    ├── ch2-tuning.html
    └── boss.html
```

`questSlug` is ASCII kebab-case; when the title is not ASCII, use a short English slug. The
plugin scans `engram-quest/quests/`, reads each `meta.json`, and opens the quest in its own
viewer. Mission files can sit in `nodes/` or beside `meta.json`.

## meta.json

```json
{
  "version": 2,
  "title": "讀懂搜尋成效",
  "description": "拿到一份成效報表，判斷每一頁卡在哪、下一步做什麼。",
  "difficulty": "medium",
  "tags": ["SEO"],
  "createdAt": "2026-06-20",
  "nodes": [
    {
      "id": "briefing",
      "title": "任務簡報",
      "type": "briefing",
      "summary": "你剛接手一個部落格的搜尋流量。",
      "points": [
        { "title": "你手上有什麼", "body": "Search Console 最近 28 天的成效報表，和每一頁的搜尋結果畫面。" },
        { "title": "四個數字", "body": "曝光是被看到幾次，點擊是被點幾次，點擊率是兩者相除，排名是平均位置。" }
      ]
    },
    {
      "id": "ch1-report",
      "title": "四頁各卡在哪",
      "type": "mission",
      "mission_goal": "從曝光、點擊率、排名的組合，判斷一頁卡在哪一步，並選出對症的做法",
      "html": "nodes/ch1-report.html"
    },
    {
      "id": "boss-rescue",
      "title": "一季的流量急救",
      "type": "boss",
      "mission_goal": "在時間有限時，決定先救哪幾頁、各用什麼做法",
      "html": "nodes/boss-rescue.html"
    }
  ]
}
```

| Field | Notes |
|---|---|
| `version` | `2` |
| `title`, `description`, `tags` | Shown on the quest's card. Learner's language |
| `difficulty` | `easy`, `medium` or `hard`. Also picks the map's background |
| `createdAt` | `YYYY-MM-DD` |
| `nodes` | **Array order is the path.** The learner unlocks them in this order. The plugin places them on the map itself; `x` / `y` (percent, 0–100) are used only when every node has both, for a route you have laid out and checked |
| `nodes[].id` | What the learner's progress is stored under. Unique in the quest, and unchanged for as long as the node exercises the same ability |
| `nodes[].title` | Shown on the map and above the mission |
| `nodes[].type` | `briefing`, `mission` or `boss` |
| `nodes[].summary` | Optional. One or two sentences shown beside the node on the map, and as a paragraph above the node's content when it is opened: the opening of a briefing, or a line above a mission's frame |
| `nodes[].mission_goal` | On a mission or boss: the ability the node exercises, as something the learner does. The map shows it beside the node when there is no `summary`, so the learner reads it before playing; a later update reads it to know what the node is for |
| `nodes[].points` | Briefing only: `[{ "title", "body" }]`. See below |
| `nodes[].html` | Mission and boss: the HTML file, relative to the package folder |
| `nodes[].height` | Optional starting height of the mission's frame in px, before the mission reports its own |

**A briefing is drawn by the plugin, not by you.** It shows the `summary` and then each entry of
`points` as a numbered block with a bold title and a paragraph. That is everything a briefing can
show, so a briefing with no `points` is a single line of text. Write as many points as the
learner needs to start; `mission-design.md` says what belongs there.

Progress, scores and completion are never written to `meta.json`.

## How a mission runs

The plugin reads the mission file and puts it in a sandboxed frame (`srcdoc`,
`sandbox="allow-scripts"`). The mission and the plugin talk through three messages. The shared
script `assets/quest-base.js` handles all three, so a mission built on the house style does not
write them itself:

| Message | Direction | Meaning |
|---|---|---|
| `{ type: "engram-quest-theme", dark }` | plugin → mission, on load | Obsidian is in light or dark |
| `{ type: "engram-quest-resize", height }` | mission → plugin | The mission's content is this tall. The frame takes that height, so the quest window is the only thing that scrolls |
| `{ type: "engram-quest-solved", score }` | mission → plugin, once | The node is complete. `score` is 0–100. The plugin records it and moves the learner on |

Because completion moves the learner on, it is sent only after they have read the result and
chosen to continue.

## Older markdown quests

Quests written as a markdown block inside a note still work. When updating one, keep its node
ids, do not write `completed:` into it, and move it to a package only when the user asks for
the migration.
