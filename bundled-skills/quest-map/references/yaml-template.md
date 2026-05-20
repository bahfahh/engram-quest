# YAML Template & Style

## Output skeleton

````markdown
---
tags: [topic-tag]
---

# Title

```quest-map
version: 1
style: cyber
difficulty: medium
nodes:
  - id: ch1
    title: Triggers & Bindings
    emoji: ⚡
    summary: Core insight about triggers and bindings.
    points:
      - title: Point one
        body: Why it matters.
      - title: Point two
        body: Key detail.
    insight: Real-world implication.

  - id: ch2
    title: Hosting Plans
    emoji: 💰
    summary: Three hosting options and when to choose each.
    points:
      - title: Consumption Plan
        body: Pay per execution, cold start, 10 min limit.
      - title: App Service Plan
        body: Fixed cost, always on, no time limit.

  - id: round1
    title: Knowledge Auction
    emoji: 🪙
    challenge:
      type: auction
      coins: 100
      questions_json: [{"q":"Which plan for unpredictable traffic + budget priority?","opts":["Consumption","App Service","Premium"],"ans":0,"explanation":"Consumption fits bursty traffic because cost follows execution volume."},{"q":"Which plan eliminates cold start?","opts":["Consumption","App Service","Premium"],"ans":2,"explanation":"Premium keeps instances warm and removes cold-start delay."},{"q":"Which plan charges even when idle?","opts":["Consumption","App Service","Premium"],"ans":1,"explanation":"App Service reserves capacity, so cost continues even without requests."}]

  - id: ch3
    title: Durable Functions
    emoji: 🔄
    summary: How Durable Functions solve long-running workflows.
    points:
      - title: Three roles
        body: Starter → Orchestrator → Activity.
      - title: Deterministic rule
        body: No DateTime.Now in Orchestrator.

  - id: boss
    boss: true
    title: Chain Reaction Boss
    emoji: 💥
    challenge:
      type: chain
      timer: 25
      question: Azure Functions request lifecycle in order
      chain_items: [HTTP Trigger fires, Function host routes, Bindings resolve inputs, Your code executes, Output bindings write]
      answer: [0, 1, 2, 3, 4]
```
````

## Style guide

Pick the style that matches the topic's mood. When in doubt, `cyber` is a safe default for technical content.

| Style | Best fit |
|---|---|
| `sky-island` | airy, philosophical, or conceptual topics |
| `ocean` | flow-based, layered, or biological systems |
| `forest` | organic, ecological, or living systems |
| `galaxy` | abstract, large-scale, or cosmological ideas |
| `dungeon` | gamified, challenge-heavy, or narrative content |
| `space` | technology, science, or futurism |
| `cyber` | programming, AI, architecture, or data systems |

Write `style` inside the quest-map code block — not only in frontmatter.
