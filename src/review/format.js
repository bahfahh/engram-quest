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

// Where `marker` stands as markup in `source`. Inside inline code `==` or `**` is plain text (`a == b`),
// so it neither opens nor closes a pair.
function markerPositions(source, marker) {
  const at = [];
  let code = false;
  for (let i = 0; i < source.length;) {
    if (marker !== "`" && source[i] === "`") { code = !code; i++; continue; }
    // With space on both sides it can neither open nor close a pair, as in `x == y` written in prose.
    const loose = /\s/.test(source[i - 1] || " ") && /\s/.test(source[i + marker.length] || " ");
    if (!code && source.startsWith(marker, i) && !loose) { at.push(i); i += marker.length; } else i++;
  }
  return at;
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
    const at = markerPositions(source, marker);
    const before = (i) => at.filter((p) => p + marker.length <= i);
    const openAtStart = before(start).length % 2 === 1;
    const openAtEnd = before(end).length % 2 === 1;
    // Wholly inside one pair: wrapping inside it is valid markdown, so leave the span alone.
    if (openAtStart && openAtEnd && before(end).length === before(start).length) continue;
    // Starts inside a pair: begin at its opening marker.
    if (openAtStart) start = before(start).pop();
    // Ends inside a pair: end after its closing marker.
    if (openAtEnd) {
      const close = at.find((p) => p >= end);
      if (close !== undefined) end = close + marker.length;
    }
  }
  return { start, end };
}

/**
 * `source` with the selection wrapped in `wrap` (e.g. "=="), or null when it cannot be found. A pair never
 * goes inside another of its kind: Obsidian does not read `====text====` as a highlight and shows the
 * marks as text. So a selection wholly inside a pair takes that pair off (Highlight on highlighted text
 * removes the highlight, as Obsidian's own toggle does), and a pair the selection takes in or runs into
 * becomes part of the one new pair.
 */
function wrapSelection(source, selection, wrap) {
  const span = locateSelection(source, selection);
  if (!span) return null;
  const { start, end } = span;
  const at = markerPositions(source, wrap);
  const opened = at.filter((p) => p + wrap.length <= start);
  const inside = at.filter((p) => p >= start && p + wrap.length <= end);
  const close = at.find((p) => p >= end);
  if (opened.length % 2 === 1 && inside.length === 0 && close !== undefined) {
    const open = opened.pop();
    return source.slice(0, open) + source.slice(open + wrap.length, close) + source.slice(close + wrap.length);
  }
  let body = "", from = start;
  for (const p of inside) { body += source.slice(from, p); from = p + wrap.length; }
  return source.slice(0, start) + wrap + body + source.slice(from, end) + wrap + source.slice(end);
}

/** First and last line index of `source` the selection covers, or null when it cannot be found. */
function selectionLines(source, selection) {
  const span = locateSelection(source, selection);
  if (!span) return null;
  const lineAt = (i) => source.slice(0, i).split("\n").length - 1;
  return { first: lineAt(span.start), last: lineAt(Math.max(span.start, span.end - 1)) };
}

module.exports = { locateSelection, wrapSelection, selectionLines };
