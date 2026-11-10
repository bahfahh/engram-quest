# Lesson HTML — hard rules and the house style

A lesson is one HTML file. The plugin reads it from the vault and shows it inside Obsidian in a
sandboxed iframe (`srcdoc`, `sandbox="allow-scripts allow-same-origin allow-popups"`), on
desktop and on phones. Two things follow from that and shape everything below: Obsidian's
Content-Security-Policy drops anything the page tries to fetch, without an error, and the page
is read at phone width as often as at desktop width.

## Contents

1. Hard rules (CSP)
2. The house style
3. Both themes
4. Phone width
5. What the shared script does
6. Raster images
7. Build and check
8. Pitfalls

## 1. Hard rules (CSP)

Violations look fine in a normal browser and break inside Obsidian.

1. **One file, fully self-contained.** All CSS in one `<style>` block, all JS in one `<script>`
   block at the end of `<body>`.
2. **Nothing is fetched.** No `<link href="https://…">`, `<script src>`, `@import`,
   `url(https://…)`, or `<img src="https://…">`. That rules out web fonts and CDN libraries:
   write vanilla JS and draw with HTML, CSS and inline SVG. Images are covered in section 6.
3. **Links are fine.** `<a href="https://…" target="_blank">` only navigates on click. Cite
   sources freely.
4. **System fonts only.** The house style sets the font stacks; do not name others.
5. **No `eval()` / `new Function()`.**
6. **`<title>` is the lesson title** (the plugin's import flow reads it). Start with
   `<!DOCTYPE html>`, `<meta charset="UTF-8">` and a viewport meta.

## 2. The house style

Every lesson is built on two shared files, so lessons across all courses look like one
publisher's work:

- `assets/lesson-base.css` — colour tokens for light and dark, the five course colour schemes,
  type, the page frame, the surfaces a figure sits on, controls, tables.
- `assets/lesson-base.js` — theme, and a few behaviours a figure can use (section 5).

Read both once before the first lesson; their comments say what each piece is for. A lesson
starts from this skeleton:

```html
<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lesson title</title>
<style>
/*! lesson-base.css */
/* this lesson's own rules */
</style></head>
<body class="lz c-indigo">
  …
<script>
/*! lesson-base.js */
/* this lesson's own script */
</script>
</body></html>
```

`lz` turns the house style on. `c-<colorScheme>` is the course's `colorScheme` from
`meta.json`, whatever it is (`c-indigo`, `c-teal`, …; the stylesheet has all twelve), so every
lesson of a course shares one accent with its card in the plugin. The two `/*! … */` lines are markers; the build step in section 7
replaces them with the shared files. The `<script>` block stays the last thing in `<body>`.

The page frame, with the pieces that have a fixed place. Everything inside a section, and
everything inside a stage, is yours:

```html
<header class="bar"><div class="bar-in">
  <div class="crumb"><b>Course title</b>第 2 課，共 6 課</div>
  <nav class="pips"></nav>                      <!-- filled from the sections' data-pip -->
</div></header>
<main class="wrap">
  <div class="hero">                            <!-- title only; the accent rule is drawn under it -->
    <p class="over">閱讀約 12 分鐘</p>
    <h1>Lesson title</h1>
  </div>
  <p class="lead">Opening paragraph: the running example and the question.</p>

  <section class="sec" data-pip="短名">
    <h2>A heading that states the point.</h2>
    <p>Prose.</p>
    <figure class="fig">
      <div class="stage"> … the figure, drawn for this content … </div>
      <figcaption><b>What to take from it.</b> Any qualification.</figcaption>
    </figure>
  </section>

  <div class="src"> sources, and the ask-your-AI-teacher line </div>
</main>
```

Text with a note beside it is `<div class="pw"><div class="tx">paragraphs</div><div
class="notes-col"><aside class="note"><h4>label</h4><p>…</p></aside></div></div>`; below 780px
the note drops in after its paragraphs. `body.numbered` with `<span class="no">01</span>` in
each `h2` gives numbered sections. The rest of the base is small surfaces and marks — a window
(`.win`), a label (`.flag`), a value (`.val`), a table (`.tb`), a caution (`.guard`), marked
phrases (`mark`, `u`, `.k`) — described by the comments in the CSS.

**What the house style decides, and what it leaves to you.** It decides how things look: the
paper and ink, one accent, how a heading, a note in the margin, a figure's stage, a window, a
button and a table are drawn. It does not decide what a lesson contains or how a figure is
composed. Draw each figure for its content with the lesson's own CSS, SVG and script, built
from the tokens (`var(--accent)`, `var(--stage)`, `var(--card)`, `var(--ink)`, `var(--muted)`,
`var(--ok)`, `var(--bad)`, `var(--warn)`, `var(--link)`, each with a `-soft` background) so it
belongs to the same page. A piece of the base is used because this lesson needs it, never
because it is available.

## 3. Both themes

The plugin tells the lesson which theme Obsidian is in; the shared script switches the `dark`
class on `<body>`, and every token changes with it. A lesson stays correct in both themes as
long as its own rules take colour from tokens. A literal colour is acceptable only on a
surface that is the same in both themes, such as a dark terminal window. When the subject has
colours of its own (a liquid, a metal, a map), define them as the lesson's tokens under `.lz`
and `.lz.dark`.

A token's hue shifts between themes (a warning is brown on light paper and yellow on dark), so
prose and captions name a figure's parts by what they are, or show a swatch, and never by
colour word. `--ok`, `--bad` and `--warn` carry meaning; for plain categories use `--accent`,
`--link` and `--muted` first, and tell categories apart by shape or fill as well as hue.

## 4. Phone width

The page must read at 390px wide. The plugin's automatic rescue for unresponsive grids is
switched off for house-style lessons, because it would also flatten grids that are narrow on
purpose; the lesson is responsible for its own layout.

- Nothing scrolls sideways, and no text column gets narrower than about eight characters.
- Side-by-side layouts stack or reflow below 640px. The base does this for its own pieces;
  the lesson's own layouts need their own rule.
- Text never goes below 12px; controls are at least 36px tall.
- A figure drawn by script should draw at its container's real width (and redraw on resize)
  instead of scaling a fixed drawing down, so labels keep their size.
- Wide code wraps or scrolls inside its own block, never the page.

## 5. What the shared script does

Each behaviour switches on when its markup is present and does nothing otherwise. Use one when
the content calls for it; none is required.

| Markup | Behaviour |
|---|---|
| `<section class="sec" data-pip="short name">` with a `.bar` containing `<nav class="pips">` | Section dots in the top bar that show the reader's place and jump there |
| `<b class="t" data-ref="x">` in prose, `data-part="x"` on any part of a figure | Hovering or tapping the word lights that part and dims the rest of its `.stage` |
| `<div class="seg" data-tabs>` with `<button data-v="a">`, and elements with `data-when="a"` in the same `<figure class="fig">` | Views of one figure; the figure also gets `data-v` and an `lz:view` event |
| `LZ.player(button, count, ms, at, go)` — `count` states, `ms` per state, `at()` returns the current index, `go(i)` shows state `i` | A play button that walks a figure through its states, restarting from the first when pressed at the last. It returns `{ stop }`; call `stop()` from the figure's own step controls |
| `.ana` containing `<pre>` with `<b data-n="1">` marks and an `<ol>` | Marks in code pair with the numbered explanations |
| `<button class="cp">` beside a `<pre>` | Copies the command |
| `.ask[data-answer="i"]` with `.opt[data-why]` buttons and an empty `.fb` | An understanding check: each option explains itself, a wrong pick can be retried |

`data-ref` names are matched across the whole page, so give each figure its own names. A held
word lets go when the reader taps anywhere else. `LZ.$` / `LZ.$$` are `querySelector` helpers.
After a script redraws a figure that has `data-part` nodes, call `LZ.relight()`.

## 6. Raster images

An image is embedded in the lesson as a `data:image/…;base64` URI; the lesson cannot reference
a file path or a URL. Keep a copy of the source image in
`engram-quest/lessons/{courseSlug}/assets/`. Give it real `alt` text, a caption that says what
to take from it, and `width:100%; height:auto`. Watch the file size: resize or compress before
embedding, and if one lesson grows past a few megabytes, cut images or split the lesson.
`visual-teaching.md` covers when an image is the right way to show something.

## 7. Build, then look

After writing a lesson (and again after any edit to it), from the vault root:

```bash
python <this skill's folder>/scripts/build_lesson.py engram-quest/lessons/{courseSlug}/{filename}
```

(`python3` where that is the interpreter's name.) It rewrites the lesson file in place, inlining the two
shared files at their markers, and reports anything that breaks the hard rules of section 1. If no Python is
available, paste each shared file under its marker line by hand and close it with
`/*! end lesson-base.css */` (or `.js`), so a later build can refresh it.

The script cannot see layout. Sections 3 and 4 are checked by looking: if you have any way to
render the page, view it at phone and desktop width, in light and dark, and operate every
control once. A figure that depends on script is not finished until it has been seen working.

## 8. Pitfalls

- **Folder trees and other indented text go in `<pre>`**, never `<div>`: HTML collapses
  whitespace in a `<div>` and the tree becomes one line.
- **A figure must make its point before anyone touches it.** Choose the default state so the
  main idea is visible on load; interaction adds to it. A figure that builds up in steps rests
  on its finished state and replays from the start.
- **A lesson cannot link to another lesson.** Name the next lesson in text.
- **Length**: 10–20 minutes of reading. If a topic needs more, split it in the outline.
