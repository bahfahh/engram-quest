---
name: engram-explainer
description: >
  Write Deep Dive (深入解析) and Insight (洞見) pages for the EngramQuest plugin (Pro). A Deep Dive
  resolves one concept a flashcard failed to teach; an Insight clarifies how a body of notes fits
  together and what follows from it. The skill writes a content spec that the plugin draws as an
  interactive page joined to the owner's notes and review history. Trigger whenever the user says
  "deep dive", "深入解析", "解析", "詳解", "explainer", "insight card", "洞見", asks to "process the
  deep dive queue" / "處理解析" / "處理詳解" / "生成解析", wants a concept "explained properly" /
  "解釋清楚" / "白話解釋" / "圖解", says a flashcard is too hard to understand ("這張卡看不懂"), has
  queued cards in the plugin and asks to handle them, or asks to pull a topic, course, or folder of
  notes together. Also trigger for "make a deep dive about X" / "幫我做一份 X 的深入解析".
---

# Explainer: Deep Dive and Insight

You write the content of a page as one JSON spec. The plugin draws it: it computes every position,
follows the app's light or dark theme, adapts to phone width, opens linked notes, and fills in live
facts from the vault each time the page opens. That division is why a page cannot come out broken,
so a spec holds words and structure only, with no HTML, CSS, script, or coordinates.

A page is reading material. It has no quiz, score, or schedule of its own, and it leaves source notes
and review schedules unchanged.

## Choose the purpose

| Kind | Goal | The reader afterwards |
|---|---|---|
| `deep-dive` | Resolve one specific obstacle: missing background, a blurred distinction, a misunderstood mechanism | Can explain why it works and return to the original card with understanding |
| `insight` | Reorganize accumulated notes, courses, or experiences so a meaningful relationship becomes clear | Can place the parts, explain how they affect one another, and see a justified implication or next step |

A single concept explained well is a Deep Dive, however broad its topic sounds. Several things seen
together are an Insight. Do not force a multi-note synthesis into a failing-card diagnosis, and do not
invent a learner error for a bare topic.

The value of either page is the understanding itself: confusion clearing, a prior experience recognized,
a new possibility seen. Encouragement, grand statements, and motivational prose take its place without
doing its work.

## Two ways to start

**Direct request** ("幫我做一份 HTTPS 的詳解", "make an insight from my Azure notes"). Read the source,
which may be a note, a card, a folder, or a bare topic, and write one page.

**Drain the queue** ("處理詳解", "process the deep dive queue"). The plugin's review session appends
`pending` entries to `engram-quest/explainer/queue.json`.

1. Read the queue. If nothing is pending, say so and offer a direct request instead.
2. For each pending entry, write the page, then set its `status` to `"done"` and fill `explainerId`.
3. An entry that could not be completed stays `pending`, and you say why. An entry that should not get a
   page (see below) becomes `"skipped"` with a one-line `reason`, so it does not come back on every run.
4. Change only the entries you processed. The plugin can add entries while you work, so re-read the file
   immediately before writing it back.
5. Report how many pages were created and rewritten.

An entry with `regenerate: true` already names its page in `explainerId`: rewrite that page under the
same id. Its `a` may be empty, in which case take the card from the page's meta and source note; a page
with no card is rewritten from its existing spec and the notes it drew on.

## Read the evidence

For a Deep Dive, work out why the card failed, because the page differs by cause:

| Cause | Signs | The page must |
|---|---|---|
| Too hard | Assumes background the owner lacks; dense note; repeated Again | Teach the missing prerequisite first |
| Poorly worded | Terse or ambiguous card | Say it again from a new angle, with a concrete case |
| No context | Unrelated to its siblings; steps memorized without the reason | Show where it lives and why it exists |

Sources, all readable without asking the owner:

- The card (`q`, `a`).
- Its review log in `engram-review/sr/{note path with / replaced by __, no .md}.json`: each card's `log`
  holds up to 20 `{ "d": "YYYY-MM-DD", "r": 1-4 }` entries, where `r: 1` is Again.
- Hints in `engram-review/hints/{note path with / replaced by __, no .md}.json` (older files: `{note name}.json`).
- The source note, and the other cards in its deck, which are natural candidates for what gets confused
  with this one.
- Related notes found through Obsidian search; see `references/obsidian-cli.md`.

For an Insight, read enough to know what the material actually records, then select what belongs to one
coherent question. A folder is a place to look, not a scope. Useful connections state why two things relate
and what changes when they are considered together. When the notes are thin, research or reason further,
verify what you bring in, and mark proposals as proposals. Infer no personal events from topic keywords.

## Find what becomes clearer, then write

Before choosing a form, state privately the one thing that becomes clearer and the evidence for it. If you
cannot, improve the reasoning first; a well-drawn page around a vague claim is still vague.

Then read `references/spec-guide.md`, which sets out how to choose among the four forms and every field of
the spec. `assets/examples/` holds one finished spec per form; they show the expected finish, and their note
names are placeholders. An Insight usually has no flashcard, so it omits `card` and uses `origin` to say which
material it draws on.

Revise each sentence against these questions:

1. Could it describe any topic without changing? Replace it with a claim specific to this one, or remove it.
2. Does an adjective stand where a mechanism or observable result belongs? Say what happens, why, and when.
3. Is the same point repeated in the title, figure, and points? Keep repetition only when each place teaches
   something different.
4. Did shortening it lose a condition, exception, or term needed for correctness? Restore it.

## Output

Write in the language of the source. Authoring words such as diagnosis, shallow, or layer never appear on the
page. JSON keys and file names stay in English.

**`engram-quest/explainer/{id}.spec.json`**: the spec, as defined in the guide. Field limits are checked when
the page opens, and a page that fails shows an error instead of content, so count before you save.

**`engram-quest/explainer/meta/{id}.json`**:

```jsonc
{
  "id": "<slug>-<timestamp>",
  "kind": "deep-dive",                  // or "insight"; a missing kind means deep-dive
  "title": "HTTPS 到底是什麼",
  "sourceCard": { "note": "path/to/note.md", "front": "HTTPS 是什麼？" },  // null when there is no card
  "deck": "network",                    // the card's flashcard tag deck, else the note's folder, else a short topic
  "diagnosis": "too-hard",              // too-hard | poor-description | no-context; Deep Dive with a card only
  "created": "YYYY-MM-DD",
  "rewriteCount": 0
}
```

`id` is a filesystem-safe slug of the concept plus a timestamp suffix, such as `https-basics-1785489701`. A
rewrite keeps the existing `id` and bumps `rewriteCount`, so links and the owner's reading state carry over. A
spec takes precedence over an older `{id}.html` of the same id.

The plugin owns `engram-quest/explainer/state.json`; leave it alone.

Queue entry shape:

```jsonc
{ "entries": [ {
  "status": "pending",        // "done" after processing
  "source": "path/to/note.md",
  "q": "card front", "a": "card back",
  "deck": "network",          // can be null or a session label; meta.deck comes from the note's tag
  "markedAt": "ISO timestamp",
  "regenerate": false,
  "explainerId": null         // filled when done, or already set on a regenerate
} ] }
```

## Rewriting pages that did not help

A Deep Dive that did not help must change. After draining the queue, check each existing `meta/*.json` that has
a `sourceCard`: if the card's log has at least two `r: 1` entries dated after the page's `created` or last
rewrite, read the card and its context, then rewrite the page. No log means no such inference. A rewrite takes a
different route, such as a shallower entry point, a different form, or more of the prerequisite. Light rephrasing
gives the owner the same page again. Insights have no failing card and are rewritten only on request.

## When not to write a page

- The topic needs many missing prerequisites, a course's worth: say so and suggest Lesson Academy.
- The card is pure lookup, with nothing to confuse it with and no case where it stops applying: say the
  flashcard was already the right tool.

## Refresh Synapse when it is already on

Synapse links review cards the owner still struggles with to what they have studied, these
pages included, and an owner who has it running should not have to refresh it separately. So
when this run wrote at least one new page (a rewrite keeps its id and adds nothing for
Synapse to link), check both, after the pages, their meta and the queue are saved:

- `engram-review/synapse/_status.json` exists and holds `"enabled": true`
- the Synapse skill is available in the tool you are running in (`engram-synapse`, installed
  as `engram-quest-synapse` next to this skill)

Both hold → run the Synapse skill in its default mode (no `--full`) without asking, and put
the one line it hands back into your report, such as `Synapse: 4 cards paired, 2 relations
added` or `Synapse: already up to date`; if it hands back nothing, add nothing. Anything
else → skip it and do not mention Synapse: starting Synapse is the owner's own step, not
something to suggest here.

The pages are the deliverable and Synapse is a follow-up. If it fails, the pages are still
done: report them as written and add `Synapse: not updated (<reason>)`.

## Before finishing

- Can you name the confusion resolved or the insight gained, and is it supported by the material?
- Are observations distinguished from your own proposals?
- Does every point advance understanding rather than repeat the figure?
- Could the reader rebuild the card's answer from the page?
- Does every `note` name a real note, or a note genuinely worth writing?
