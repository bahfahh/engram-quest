"use strict";
// Finding a rendered selection in a card's markdown source. The learner selects what they see; the
// source also holds markup the renderer hides (**bold**, ==highlight==, `code`, [links](url)) and line
// breaks shown as spaces, so a plain substring search misses most real selections.

// Markup that may sit between two visible characters without being visible itself: runs of the
// emphasis / highlight / code / link-open characters, or a link's `](url)` tail. A character class
// keeps the repetition linear, so a long failed search cannot backtrack exponentially.
const HIDDEN = String.raw`(?:[*_=~\x60\[]|\]\([^)\s]*\))*`;
// Paired markers a span must not cut in half, or wrapping it breaks the markdown.
const PAIRS = ["**", "==", "~~", "`"];

const escape = (ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function count(text, marker) {
  let n = 0;
  for (let i = text.indexOf(marker); i !== -1; i = text.indexOf(marker, i + marker.length)) n++;
  return n;
}

/**
 * The [start, end) range of `source` that renders as `selection`, widened so no paired marker is
 * split; null when the selection is not in the source.
 */
function locateSelection(source, selection) {
  const sel = String(selection || "").replace(/\r\n/g, "\n").trim();
  if (!sel || !source) return null;
  let start = source.indexOf(sel);
  let end = start + sel.length;
  if (start === -1) {
    const pattern = [...sel.replace(/\s+/g, " ")].map((ch) => (ch === " " ? String.raw`\s+` : escape(ch))).join(HIDDEN);
    const m = new RegExp(pattern).exec(source);
    if (!m) return null;
    start = m.index;
    end = start + m[0].length;
  }
  for (const marker of PAIRS) {
    const openAtStart = count(source.slice(0, start), marker) % 2 === 1;
    const openAtEnd = count(source.slice(0, end), marker) % 2 === 1;
    // Wholly inside one pair: wrapping inside it is valid markdown, so leave the span alone.
    if (openAtStart && openAtEnd && count(source.slice(start, end), marker) === 0) continue;
    // Starts inside a pair: begin at its opening marker.
    if (openAtStart) start = source.lastIndexOf(marker, start - marker.length);
    // Ends inside a pair: end after its closing marker.
    if (openAtEnd) {
      const close = source.indexOf(marker, end);
      if (close !== -1) end = close + marker.length;
    }
  }
  return { start, end };
}

/** `source` with the selection wrapped in `wrap` (e.g. "=="), or null when it cannot be found. */
function wrapSelection(source, selection, wrap) {
  const span = locateSelection(source, selection);
  if (!span) return null;
  return source.slice(0, span.start) + wrap + source.slice(span.start, span.end) + wrap + source.slice(span.end);
}

/** First and last line index of `source` the selection covers, or null when it cannot be found. */
function selectionLines(source, selection) {
  const span = locateSelection(source, selection);
  if (!span) return null;
  const lineAt = (i) => source.slice(0, i).split("\n").length - 1;
  return { first: lineAt(span.start), last: lineAt(Math.max(span.start, span.end - 1)) };
}

module.exports = { locateSelection, wrapSelection, selectionLines };
