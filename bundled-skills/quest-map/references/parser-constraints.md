# Parser Constraints

The plugin still supports a lightweight line-oriented YAML parser for legacy markdown quest-map blocks. These rules apply only to legacy content. New Quest Maps should use the package contract in `html-first-contract.md`, not parser YAML.

Plugin-native quest files live under:

```text
engram-quest/quests/{questSlug}/meta.json
engram-quest/quests/{questSlug}/nodes/{nodeId}.html
```

The constraints below apply to legacy `challenge:` YAML.

## Arrays must be inline

Correct:
```yaml
options: [A, B, C, D]
answers: [CloudFront CDN, CDN]
```

Wrong:
```yaml
options:
  - A
  - B
```

## Avoid ASCII commas inside array values

The parser splits on commas. Rephrase option text or accepted answers to avoid accidental splits.

## Cloze: one blank per challenge

Each cloze challenge **must** contain exactly ONE `{{c1::...}}` blank. Multi-blank (`{{c1::}}` + `{{c2::}}`) is not supported — the UI reveals all blanks together, which destroys the recall test.

Wrong:
```yaml
sentence: "{{c1::Azure}} uses {{c2::RBAC}} for access control"
```

Correct:
```yaml
sentence: "Azure uses {{c1::RBAC}} for access control"
```

## Flat fields for image-occlusion bbox

Canonical: percentage-based coordinates with `region_left_pct`, `region_top_pct`, `region_width_pct`, `region_height_pct` (0–100, relative to image width/height). Pixel coords (`region_x`, `region_y`, `region_width`, `region_height`) are legacy-compatible.

Only Gemini should produce these coordinates (it has native bounding-box detection). Other models should use `image-quiz` instead.

Correct:
```yaml
region_left_pct: 20
region_top_pct: 22
region_width_pct: 32
region_height_pct: 28
```

Legacy-compatible:
```yaml
region_x: 295
region_y: 292
region_width: 640
region_height: 86
```

Wrong:
```yaml
region:
  x: 295
```
