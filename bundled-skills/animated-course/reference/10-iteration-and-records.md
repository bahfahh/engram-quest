# 10 Iteration and records

The loop: **make → finished film → the user reviews → record what was good → next round builds on it.** Not everything becomes a template; reviewed, good experience is kept, so later rounds get better as the record does.

## 1. Two places, two jobs

| Place | Job | Language |
|---|---|---|
| The vault lab notebook: (not public) (`實驗N-…/00-紀錄.md`, `00-製作經驗（做片前必讀）.md`, `00-展示方式庫.md`, `00-待辦（影片技能與流程）.md`) | Every round: what was done, the user's exact words, results, rejected versions, open questions | Chinese (the user's notes) |
| This skill | Only the distilled, reviewed guidance and the working tools | English |

The vault page `動畫/engram-quest 動畫課程製作手冊.md` is the Chinese entry point that points here.

When a review or experiment teaches something, record the user's words in the lab notebook first, then write it here as **purpose**, **reason** (the quote or experiment) and **options** with when they fit and when not; numbers are what approved films measured. Firm rules only for product decisions, technical contracts and truthfulness. Replace old guidance rather than keep two that contradict; if the two places disagree, fix both.

## 1b. Found a possible improvement? Show it, don't ask


When research or a review turns up a change that might make the films better (rhythm, voice, structure, visuals, anything), do not ask the user whether it is worth trying; make a **short A/B comparison film** right away for them to judge by watching:
- **A = the current way, B = the new way, same content**: take the same stretch of an approved lesson (30–90 s) and change only what is being tested, so the difference is the only thing that differs.
- **Picture and sound together.** A voice-only change may also be offered as audio, but the default is the clip with its picture, because the user judges the whole.
- Deliver the clips (screening room, A and B side by side, one line each on what changed and what to listen/look for) and record them in the lab notebook as `trial`. A change enters this skill only with the user's approval after watching (§2).

## 2. Status changes

Only the user's review changes a method's status (`approved` / `trial` / `rejected` / `needs rework`, `05-presentation-methods.md`). A new method you design is `trial` until reviewed. When a method is rejected, write which content it was used for.

An approval covers what the user judged. Experiment 20's tests 1–28 were filmed on the Engram-studio base (`x19-a-light` → x33) and approved as methods — timing, order, what moves, what is said — not as the studio look (lab notebook, 2026-11-10); so they are recorded and reused as methods, rebuilt in the lesson's own classroom and stage (`05-presentation-methods.md` §1). When a test has to be filmed on some look, writing down which look it was keeps the approval from being read as approving that look.

## 3. End-of-round checklist (after delivery, and again after the user's review)

- [ ] Lab notebook: what was done, the user's exact words, results, screening-room link.
- [ ] This skill: only reviewed experience, as purpose, reason, options; overturned guidance replaced; methods table statuses updated; new pitfalls added (what went wrong, what helped).
- [ ] Vault to-do list: done items ticked, new ones added (e.g. lines that need a human ear for pronunciation).
- [ ] Cloud render sessions all archived; ask before deleting branches or old films.
- [ ] Commit, push, merge to the main branch (the vault's normal flow).

## 4. Tickets

- **This skill is broken**: it is still in development, so fix it directly, verify, and tell the user what changed — no ticket.
- **Debug ticket**: the plugin, or a skill that already ships in engram-quest, is broken → `debug/issue-*.md` as the vault's `AGENTS.md` describes, and tell the user.
- **Feature ticket** (new feature or change for the plugin): `feature/feature-YYYY-MM-DD-<topic>.md` in the vault, in the format the vault's `AGENTS.md` gives (concept, why, limits, design, evidence, open decisions, acceptance); it goes in `feature/`, not `debug/`. Tell the user where it is.

## 5. Where this is heading

This skill is the source for the engram-quest plugin: once stable, a development agent packages it (skill + components + tools) into the plugin, so anyone with the plugin can make good animated courses with AI.
