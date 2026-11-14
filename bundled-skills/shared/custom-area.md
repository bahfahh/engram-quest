# The custom area: the user's own preferences and assets

Every EngramQuest skill carries this same file. `engram-quest/custom/` belongs to the user. Plugin installs and updates never write there, and this skill's own folder is overwritten by every update. So the custom area is where the user's lasting wishes and reusable assets live, and the reason the work still comes out the way the user wants after this skill changes.

## What is there

```
engram-quest/custom/
  preferences/
    all.md            preferences every skill follows (language, tone, how many pictures, ...)
    <skill>.md        one skill's preferences, e.g. animated-course.md, voice.md, review-deck.md
  assets/
    index.json        the asset list (machine-read)
    looks/  music/  images/  templates/
  cast/
    teachers/<id>.json   custom video teachers (Pro)
    skins/<id>/          custom teacher skins (Pro)
```

- Preferences are Markdown the user reads and edits in Obsidian: one item per line, each with its date and why it was added.
- `assets/index.json` lists each asset: `id`, `kind` (look, music, image, template), `skill` it is for, `description`, `source` and `licence`, `created`, and the list's `schema` version. Skip fields you don't understand, and keep them when you rewrite the file, so an older or newer list still works.
- Any part may be missing. A missing file means nothing was set there, not an error.

## Before you start

Read `preferences/all.md`, this skill's own preference file and `assets/index.json` when they exist. The plan you show the user lists which preferences and which custom assets this run uses, so the user can see their wishes were taken into account.

## How each choice is decided

For each choice, go down this list and stop at the first level that says something about it:

1. What the user asks for in this conversation.
2. The series' or project's own settings (for example a series `meta.json`).
3. A value the user explicitly picked in the plugin (for example `engram-quest/videos/settings.json`). "Auto" or "follow" counts as not picked.
4. Custom preferences: `preferences/<skill>.md` first, then `all.md`.
5. This skill's own defaults.

Settings the plugin already has a control for (teacher, voice engine, subtitles, quality, narration language) are decided in the plugin, never in a preference file: one thing is recorded in one place.

When a preference works against this skill's teaching principles for some part (a blackboard style is preferred, but one segment is clearer shown on the real interface), follow the preference and name that trade-off in the plan, so the user decides whether to make an exception.

A preference records an intention ("blackboard style, lots of diagrams"), not this skill's internal file names, so it keeps working when the skill changes. Map it to the closest way of doing it this skill has now. When something it names no longer exists, carry on with the closest choice, tell the user what you used instead, and leave the preference file as it is.

## Custom items next to official ones

A custom item is always called `custom:<name>`, so it never collides with an official item, even one added later under the same name; both stay available. To make a custom item the usual choice, record that as a preference. Never edit this skill's files or copy custom items into its folder: the next update would undo it.

Free and Pro: preferences and custom assets (looks, music, images, templates) work for everyone. Custom teachers and skins are Pro, because choosing a teacher other than the default is Pro. Without Pro, a custom teacher falls back to the default teacher, exactly like a Pro teacher, and you tell the user it needs Pro.

## Writing to the custom area

Write only with the user's agreement.

- **Preferences**: record only what lasts: the user says it should always be done this way, or the same correction comes up a second time. A wish about this one piece of work is not a preference. Add the line with its date and reason to the narrowest file that fits, then tell the user the line you added.
- **Assets**: save one only when all three hold: it is costly to make again, it is not tied to this topic, and the file is small enough to keep in version control. Register it in `assets/index.json`.
- **Older places**: still read custom teachers and skins from `engram-quest/cast/custom/`, `engram-quest/cast/skins/` and `engram-quest/video/teachers/`; write anything new only under `engram-quest/custom/`.

## Keys never go into files

API keys, tokens and passwords belong in environment variables only. A preference names the service (engine, voice name, rate), never its key. The vault is often synced to git or a cloud drive, so a key written into any file is as good as published. If the user hands you a key, do not write it anywhere; tell them which environment variable to set. If you notice something that looks like a key in the custom area, point it out to the user.

## The custom area is not study material

Nothing under `engram-quest/` (the custom area included) is a study note. When you search the user's notes to make cards, questions, maps, lessons or films, leave out every result under `engram-quest/`, so a preference file is never taught back as content.
