# Silent review (task for a separate reviewer)

You review **only the pictures**. A ~6-minute teaching film (<course, one sentence on what it teaches and to whom>) is finished but not yet rendered. You get stills (2–5 per segment, file names carry the second) — **no narration, no script**: viewers may watch muted or miss a line; the picture itself has to teach.

Principle: "The map, or anything, is there to help understanding — that is the main point." A **signpost** is a picture that only tells *what the topic is*, not how it works, what it relates to, or what differs. Judge: does a viewer **understand**, **stay with it**, get the **intended feel**?

## Step 1 — blind viewing (write it first, then leave it, so it stays blind)
Look only at `stills/` (sorted by second). **Don't open other project files** (CARD, SCRIPT, NOTES, UNDERSTANDING, script.json, html …): they would unblind you, and the blind read is the test. In the project folder write `SILENT.md` §1:
1. One line per still: second | what I understand from it (the mechanism or relation, not the topic name) | signpost? (yes / half / no) | what is unclear or could be misread.
2. The whole film: what I think it teaches (three sentences); the most important moment and why; how it feels, and whether it would hold me (long stretches of one look lost the user).
3. **The glance** (3 s per still): where does my eye land first, and is that what this frame is about? Crowded frames (→ split) and empty or meaningless ones (→ meaning removed, put it back). Complex is fine when the real thing is complex (a real screen, real code) with a clear focus on it.
4. Text too small or crowded to read at a glance (1920×1080 references: main ≈ 28 px+, labels ≈ 22 px+).
5. Anything a viewer could remember wrong (numbers that don't add up, cause and effect, terms, a wrong intuition not marked as wrong).
6. **Where do the characters send your eyes?** Does each character look or point at the thing lit or circled? Pointing at empty space, looking away from it, or at another thing misdirects — list it.
7. **Modules** (if the host says they are on, `reference/12-modules.md`): `cards` — each key-point card as a stand-alone picture: will it make sense months later on its own, as a review card?
8. **Look as a teacher of this subject would**: structures drawn or connected wrong, flows in the wrong direction, wrong relative sizes, labels on the wrong thing, a mechanism not the real one. (Experiment 12: the reviewer caught a heart with vessels connected wrong, water leaving a water-tight tubule, bacteria bigger than blood cells — producer and host had both missed them.)

## Step 2 — compare
After §1 is written, read the project's `UNDERSTANDING.md` (the producer's design card). Write `SILENT.md` §2:
1. What the producer wanted understood and felt: which parts you got blind, which you missed.
2. The producer's "moment of understanding": did you feel it blind? If not, what is missing in the picture?
3. **Fix list**, most important first (up to ≈ 6). Each: which second / still, the problem, a concrete fix. What affects understanding, staying with it or the feel — not personal taste.

## Rules
- Write only `SILENT.md`. Don't change anything else, don't modify the vault, don't commit, don't read the vault's `Clippings/`.
- Look at stills with Read at full resolution.
- Report (last message, short): what you thought the film teaches (three sentences) and the fix list in order.
