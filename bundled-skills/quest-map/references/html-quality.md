# Mission HTML — the frame's rules and the house style

A mission or boss node is one HTML file. The plugin shows it inside Obsidian's quest window, in a
sandboxed frame, on desktop and on phones. This file covers what that frame allows, the shared
files every mission is built on, and how to check the result. What goes into a mission is in
`mission-design.md`.

## Contents

1. What the frame does not allow
2. The house style
3. What the shared script does
4. Both themes
5. Phone width and the frame's height
6. Images
7. Build, then look
8. Pitfalls

## 1. What the frame does not allow

The frame is `sandbox="allow-scripts"` under Obsidian's Content-Security-Policy. Each of these
fails without an error, so a mission that breaks one looks fine in a normal browser and is
broken for the learner:

1. **Nothing is loaded from anywhere.** No `<script src>`, `<link href>`, `@import`, web fonts,
   CDN libraries, `fetch`, or images by URL or file path. One file: all CSS in one `<style>`,
   all JS in one `<script>` at the end of `<body>`, drawing in HTML, CSS and inline SVG.
2. **No storage.** `localStorage`, `sessionStorage`, cookies and IndexedDB do not exist here,
   and touching them stops the script. A mission keeps its state in memory and starts fresh
   each time it is opened; the plugin keeps the score.
3. **No dialogs, no new windows, no links out.** `alert`, `confirm`, `prompt` and `window.open`
   do nothing, and an `<a href>` to a web page cannot open. Say things on the page; name a
   source in text.
4. **No `eval()` / `new Function()`.**

Start the file with `<!DOCTYPE html>`, `<meta charset="UTF-8">`, a viewport meta and a
`<title>`.

## 2. The house style

Every mission is built on two shared files, so quests on any subject look like one publisher's
work and all of them talk to the plugin correctly:

- `assets/quest-base.css` — colour for light and dark, type, the case header, the surfaces
  material sits on, controls, the states a learner's mark can be in, the verdict.
- `assets/quest-base.js` — the frame's height, the theme, and the verdict with its finish
  button (section 3).

Read both once before the first mission; their comments say what each piece is for. A mission
starts from this skeleton:

```html
<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mission title</title>
<style>
/*! quest-base.css */
/* this mission's own rules */
</style></head>
<body class="qz">
<main class="wrap">
  <header class="case">
    <p class="role">Who the learner is here, and when</p>
    <h1>What they have to get done</h1>
    <p>The situation and what is asked of them, in a few sentences.</p>
    <p class="goal"><b>Label</b>The ability this mission exercises.</p>
  </header>

  <section class="stage">
    … the desk: this mission's material and controls …
  </section>
</main>
<script>
/*! quest-base.js */
/* this mission's own script */
</script>
</body></html>
```

`qz` turns the house style on. The two `/*! … */` lines are markers; the build step in section 7
replaces them with the shared files. The `<script>` block stays the last thing in `<body>`.
`<html lang>` is the mission's language; the verdict's built-in wording follows it. The bold
label in the `.goal` line is a short phrase in that language meaning "this mission practises".

A quest has one accent. Leave it at the default, or put one of `c-green c-amber c-rose c-cyan
c-violet c-blue c-teal c-lime c-orange c-fuchsia c-slate` on `<body>` in every mission of the
quest; a quest made from a Lesson Academy course uses that course's `colorScheme`.

**What the house style decides, and what it leaves to you.** It decides how things look: paper
and ink, one accent, how a case header, a surface, a window, a button, a marked item, a reason
and the verdict are drawn. It does not decide what is on the desk or what the learner does
there. Design that for the mission, with its own CSS, SVG and script built from the tokens
(`var(--accent)`, `var(--stage)`, `var(--card)`, `var(--ink)`, `var(--muted)`, `var(--ok)`,
`var(--bad)`, `var(--warn)`, `var(--link)`, each with a `-soft` background), so it belongs to
the same page. A piece of the base is used because this mission needs it, never because it is
there.

The pieces, by what they are for (the CSS comments have the details):

| For | Piece |
|---|---|
| Material | `.stage` the desk · `.win` something on a screen · `.paper` something on paper · `.flag` a small label · `.hand` handwriting · `.sim` the line that says data is invented |
| Controls | `.btn` (`.pri` commits) · `.sel` · `.fld` a text or number field or a textarea · `.seg` a few short options, pressed ones `aria-pressed="true"` · `.choice` one of several longer answers · `.chk` any of a list · range inputs |
| A mark on the material | An HTML box with `data-pick`, and every `.choice`, looks markable; `.picked` is the learner's mark. After judging, put `.judged` on an ancestor and `.hit` / `.part` / `.miss` on what was marked, `.was` on what should have been, with the word for the state in a `.pick-tag` child. A judged `.fld` takes `.hit` / `.part` / `.miss` too. These states are drawn with border and background, so on a part of an SVG or a table row, draw the same states yourself from the tokens (stroke, fill, cell background) |
| Progress toward committing | `.act` with `.act-note` (what has been done so far) and the commit button |
| Reasons | `.why` with `.good`, `.part` or `.off`, opening with a bold phrase |
| Several stages | `.board` for the state of the situation (`.steps`, `.tiles` of `.tile`, `.news`) · `details.past` for a finished stage folded to one line |

The base also styles bare elements (`h1`, `p`, `b`, `a`, `code`, `button`, inputs) and uses
more class names than this table lists; the stylesheet is the full list. Name the mission's own
classes after the things in the mission, so a rule written for one of them does not land on a
piece of the base.

## 3. What the shared script does

Without being asked:

- **Height.** It tells the plugin how tall the page is whenever that changes, so the frame fits
  the mission. Nothing in a mission sets or reports height.
- **Theme.** It switches the `dark` class on `<body>` to follow Obsidian. Opened on its own in
  a browser, the page follows the system's light or dark setting instead.

When the mission calls it:

```js
QZ.verdict({
  title: "One sentence: how it went",
  lead: "Optional: the point to take away",
  parts: [
    { label: "What this part of the score is", got: 20, max: 40, note: "Why" },
    { label: "Another part", got: 60, max: 60 }
  ]
});
```

This draws the verdict at the end of `.wrap` (or in `into: element`), with every part, the
total, and the finish button. The score is the points earned as a share of the points possible,
0–100, and it is sent to the plugin once, when the learner presses finish. Send completion this
way and no other: a mission that posts its own message can move the learner on before they have
read anything. Calling it again replaces the verdict, until the learner has pressed finish. The
built-in wording is Chinese when `<html lang>` starts with `zh` and English otherwise; for
another language pass `finish`, `sent` and `of`.

`QZ.$` / `QZ.$$` are `querySelector` helpers, `QZ.el(tag, class, text)` makes an element, and
`QZ.flash(element)` draws the eye to something that has just changed. `QZ.show(element)` brings
a part of the page to the top of the view; use it instead of `scrollIntoView`, which runs before
the frame has grown to the new content and leaves the learner somewhere else.

## 4. Both themes

The page is correct in light and dark as long as the mission's own rules take colour from
tokens. A literal colour is acceptable only for something that looks the same in both, such as
a dark terminal or the colour of a real substance; when the subject has colours of its own,
define them as the mission's tokens under `.qz` and `.qz.dark`.

A token's hue shifts between themes, so text names a thing by what it is and never by a colour
word. `--ok`, `--bad` and `--warn` mean right, wrong and caution after judging; before judging,
use `--accent` and `--muted`, and tell categories apart by shape or label as well as hue. A
state the learner must notice is also said in words.

## 5. Phone width and the frame's height

The mission gets about 750px of width on a desktop and about 300px on a phone, and must work at
both: nothing scrolls sideways, no text column narrower than about eight characters, text at
least 12px, anything tappable at least 36px tall. Side-by-side layouts need their own rule to
stack or reflow on a narrow screen. A figure drawn by script draws at its container's real
width.

The frame is as tall as the mission, and the learner scrolls the quest window to move through
it. On a phone a mission is several screens long, so arrange it for someone who cannot see two
parts at once: what the learner needs in order to act is next to where they act, what changes
after a decision appears where they made it, and a part that is finished folds away. Nothing is
sized from the frame's height (`vh`, `height:100%`), because the frame takes its height from
the page.

## 6. Images

An image is embedded as a `data:image/…;base64` URI; a mission cannot point at a file or a URL.
Give it real `alt` text and `width:100%; height:auto`, and resize or compress it first, since
the whole file is loaded every time the mission opens. `mission-design.md` says when an image
is the right material.

## 7. Build, then look

After writing a mission, and again after any edit, from the vault root:

```bash
python <this skill's folder>/scripts/build_quest.py engram-quest/quests/{questSlug}/nodes/*.html
```

(`python3` where that is the interpreter's name.) It rewrites each file in place with the
shared files inlined at their markers, and reports what it can recognise of section 1, a size
taken from the frame, and a mission that never calls `QZ.verdict`. It reads text, not
behaviour: a clean build means none of these was found, and a word it objects to inside text
the learner reads as code belongs in `<pre>` or `<code>`. Without Python, paste each shared
file under its marker by hand and close it with `/*! end quest-base.css */` (or `.js`), so a
later build can refresh it.

The script cannot play a mission. A built mission opens as an ordinary page in any browser, so
if you have any way to render a page, open each one at the two widths of section 5, in light
and dark, and play it to the end: once the way a learner who has the ability would, once the
way one who does not would, and once the laziest way there is. Check that each ends in a
verdict whose score you would defend. A mission is not finished until it has been seen working.

## 8. Pitfalls

- **A mission that opens to a wall of instructions** has put the work in the wrong place. The
  desk should show what kind of task this is; the header says the rest in a few sentences.
- **Something that plays must rest on its result.** An animation ends in the state that shows
  what happened, and jumps straight there when the reader has asked for reduced motion.
- **Indented text goes in `<pre>`.** HTML collapses whitespace anywhere else.
- **Text inside an SVG does not wrap** and shrinks with the drawing. Keep words the learner
  must read in HTML, or draw the SVG at its real width.
- **A timer is part of the mission only when time is part of the ability.** Otherwise the
  learner sets the pace.
- **Numbers the learner must read go in the body or mono type.** The handwriting face is for
  words; its digits and Latin letters are unevenly spaced on some systems.
- **Arrows, ticks and crosses can come out as colour emoji.** Look at them rendered, or draw
  them with CSS or SVG.
- **Phones run Obsidian in the system's web view, which can be a few years old.** Use
  JavaScript and CSS that have been everywhere for a while.
