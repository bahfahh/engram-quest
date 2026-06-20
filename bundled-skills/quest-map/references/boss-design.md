# Boss Design

A Boss is the final integrated challenge for the quest difficulty. It is not just a harder quiz.

## Boss requirements

Every boss must:
- combine at least two earlier concepts
- present a realistic high-stakes situation
- require multi-step reasoning
- include plausible competing choices
- show consequences across stages
- emit a numeric score from 0 to 100

## Cascade rule

The learner's earlier decisions should change later context.

Good cascade effects:
- a metric worsens
- available options narrow
- time pressure increases
- a stakeholder constraint appears
- a later explanation references the earlier decision

Do not use cascade as random punishment. The consequence must have clear cause and effect.

Example:

```js
if (state.misdiagnosedCache) {
  metrics.latency = 920;
  warning.textContent = "Your cache-first rollback delayed DB diagnosis. Latency is now 920 ms and the deploy window is shorter.";
  warning.classList.add("show");
}
```

## Plausible options

Avoid choices where only one option is serious.

Weak:
- Restart the database
- Delete logs
- Ignore the alert
- Inspect request traces

Strong:
- Roll back the function app first
- Disable the new queue trigger first
- Scale out the premium plan first
- Inspect correlation traces before mitigation

All four can be reasonable in some incidents; the scenario determines the best answer.

## Scoring

Use transparent scoring:
- best decision: full or high points
- acceptable but incomplete decision: partial points
- risky decision: low points with explanation

Boss score can be:
- average of stage scores
- weighted score where the final synthesis is heavier
- minimum threshold plus bonus for first-try calculation or diagnosis

Post only one final solved message:

```js
window.parent.postMessage({ type: "engram-quest-solved", score: total }, "*");
```

## Visual tone

Pick tone by domain:
- software/SRE: terminal, traces, metrics, architecture cards
- business/management: board brief, KPI dashboard, stakeholder notes
- medicine: chart, vitals, differential diagnosis, red flags
- math/science: formula panel, simulation, graph, experiment log
- language/history: source excerpt, timeline, evidence board

Do not force every boss into a dark emergency UI. Match the subject.

