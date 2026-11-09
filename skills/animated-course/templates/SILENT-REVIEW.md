# Silent review (task for a separate reviewer)

You review **only the pictures**. A ~6-minute teaching film (<course, one sentence on what it teaches and to whom>) is finished but not yet rendered. You get a set of stills (2–5 per segment, file names carry the second) — **no narration, no script**. Viewers may watch muted or miss a line; the picture itself must teach.

Principle: "The map, or anything, is there to help understanding — that is the main point." A **signpost** is a picture that only tells you *what the topic is*, not how it works, what it relates to, or what differs.

## Step 1 — blind viewing (write it first, never change it afterwards)
Look only at `stills/` (sorted by second). **Do not open any other file in the project folder** (CARD, SCRIPT, NOTES, UNDERSTANDING, script.json, html …). In the project folder write `SILENT.md` §1:
1. One line per still: second | what I understand from this picture (the mechanism or relation, not the topic name) | signpost? (yes / half / no) | what is unclear or could be misread.
2. The whole film: what I think it teaches (three sentences); which still is the most important moment and why.
3. **The glance** (3 seconds per still): where does my eye land first, and is that the thing this frame is about? Frames that are crowded (too much → should be split) and frames that look empty or lost their meaning (→ meaning was removed, put it back). Complex is fine when the real thing is complex (a real screen, real code) as long as the focus is clear on it.
4. Text too small, crowded or unreadable (at 1920×1080: main content ≥ ~28 px, labels ≥ ~22 px).
5. Anything that could make a viewer remember something wrong (numbers that don't add up, cause and effect, terms, a wrong intuition not marked as wrong).
6. **Where do the characters send your eyes?** In each still with a character: is it looking or pointing at the thing that is lit or circled? A character pointing at empty space, looking away from what is marked, or pointing at a different thing from the one lit is a misdirection — list it.
7. **Modules** (only if the host says they are on, `reference/12-modules.md`): `cards` — judge each key-point card as a stand-alone picture: will it make sense months later on its own, as a review card?
8. **Look as a teacher of this subject would**: structures drawn wrong or connected wrong, flows in the wrong direction, wrong relative sizes, labels pointing at the wrong thing, a mechanism shown that is not the real one. (Experiment 12: the reviewer caught a heart with vessels connected wrong, water leaving a water-tight tubule, bacteria bigger than blood cells — producer and host had both missed them.)

## Step 2 — compare
Only after §1 is written, read the project's `UNDERSTANDING.md` (the producer's design card). Write `SILENT.md` §2:
1. What the producer wanted understood: which parts you got blind, which you missed.
2. The producer's "moment of understanding": did you feel it blind? If not, what is missing in the picture?
3. **Fix list**: at most 6 items, most important first. Each: which second / still, the problem, a concrete fix. Only things that affect understanding — no personal taste.

## Rules
- Write only `SILENT.md`. Don't change anything else, don't modify the vault, don't commit, don't read the vault's `Clippings/`.
- Look at stills with Read at full resolution.
- Report (last message, short): what you thought the film teaches (three sentences) and the fix list in order.
