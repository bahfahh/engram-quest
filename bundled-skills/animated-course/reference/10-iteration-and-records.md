# 10 Iteration and records

The loop: **make → finished film → the user reviews → record what was good → next round builds on it.** Not everything becomes a template; only reviewed, good experience is kept. Later rounds get better because the record gets better.

## 1. Two places, two jobs

| Place | Job | Language |
|---|---|---|
| The vault lab notebook: (not public) (`實驗N-…/00-紀錄.md`, `00-製作經驗（做片前必讀）.md`, `00-展示方式庫.md`, `00-待辦（影片技能與流程）.md`) | Every round: what was done, the user's exact words, results, rejected versions, open questions | Chinese (the user's notes) |
| This skill | Only the distilled, reviewed rules and the working tools | English |

The vault page `動畫/engram-quest 動畫課程製作手冊.md` is the Chinese entry point that points here.

When a review changes a rule: record the user's words in the lab notebook first, then update the rule here. **Change the old rule; never keep two contradicting rules.** If the two places disagree, fix both.

## 2. Status changes

Only the user's review changes a method's status (`approved` / `trial` / `rejected` / `needs rework`, `05-presentation-methods.md`). A new method you design is `trial` until reviewed. When a method is rejected, write which content it was used for.

## 3. End-of-round checklist (after delivery, and again after the user's review)

- [ ] Lab notebook: what was done, the user's exact words, results, screening-room link.
- [ ] This skill: only reviewed experience; overturned rules replaced; methods table statuses updated; new pitfalls added.
- [ ] Vault to-do list: done items ticked, new ones added (e.g. lines that need a human ear for pronunciation).
- [ ] Cloud render sessions all archived; ask before deleting branches or old films.
- [ ] Commit, push, merge to the main branch (the vault's normal flow).

## 4. Tickets

- **Debug ticket**: the plugin or a skill is broken → `debug/issue-*.md` as the vault's `AGENTS.md` describes, and tell the user.
- **Feature ticket** (new feature or change for the plugin): `feature/feature-YYYY-MM-DD-<topic>.md` in the vault, in the format the vault's `AGENTS.md` gives (concept, why, limits, design, evidence, open decisions, acceptance). Never put it in `debug/`. Tell the user where it is.

## 5. Where this is heading

This skill is the source for the engram-quest plugin: once stable, a development agent packages it (skill + components + tools) into the plugin, so anyone with the plugin can make good animated courses with AI.
