# Quest Package Template

Use this package template for new Quest Maps. Legacy markdown examples live in `challenge-formats.md`.

## Folder

```text
engram-quest/quests/{questSlug}/
├── meta.json
└── nodes/
    ├── ch1-domain.html
    ├── ch2-calculation.html
    └── boss-cascade.html
```

## meta.json

```json
{
  "version": 2,
  "title": "Procurement System Dev Quest",
  "description": "Practice procurement workflow modeling through applied missions.",
  "difficulty": "medium",
  "tags": ["procurement", "software-engineering"],
  "createdAt": "2026-06-20",
  "layout": {
    "mode": "dynamic"
  },
  "nodes": [
    {
      "id": "briefing-domain",
      "title": "Domain Briefing",
      "type": "briefing",
      "summary": "Understand purchase requests, inventory units, suppliers, and monthly procurement constraints."
    },
    {
      "id": "ch1-domain-model",
      "title": "Domain Model",
      "type": "mission",
      "html": "nodes/ch1-domain-model.html",
      "height": 760
    },
    {
      "id": "ch2-monthly-calculation",
      "title": "Monthly Calculation",
      "type": "mission",
      "html": "nodes/ch2-monthly-calculation.html",
      "height": 760
    },
    {
      "id": "boss-procurement-cascade",
      "title": "Procurement Cascade Boss",
      "type": "boss",
      "html": "nodes/boss-procurement-cascade.html",
      "height": 900
    }
  ]
}
```

## Notes

- Keep user-facing text in the source/request language.
- Keep keys in English.
- Keep node IDs stable across updates.
- Do not include completion state in `meta.json`.
- Do not use decorative map background coordinates unless every node has tested `x` and `y` percentages.
