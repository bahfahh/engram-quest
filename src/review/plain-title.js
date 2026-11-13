"use strict";
// A card's front as the one readable line a Synapse map node shows. A front is the user's Markdown:
// an image embed (`![[../assets/pic.png]]`), a link, a fenced block or an HTML tag would show up
// as raw syntax in a node, so they are turned into what a reader sees. A front that is only a
// picture comes out empty, and the caller names it ("Image card"). Pure; nothing here decides what
// may be shown before the answer: that is answer-leak.js, which still reads the original text.
//
// Angle brackets are also ordinary text in a programming vault (`Dictionary<string, int>`,
// `#include <iostream>`, `a<b and c>d`), so only real HTML tags (a known name, attributes written
// as name or name="value") are removed, and never inside an inline code span.

const EMBED = /!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g;
const HTML_TAG = /<\/?(?:img|br|hr|p|div|span|a|b|i|u|s|em|strong|mark|sub|sup|small|center|font|figure|figcaption|video|audio|source|iframe|svg|picture|details|summary|table|thead|tbody|tr|td|th|ul|ol|li|h[1-6]|blockquote|pre)(?:\s+[\w:-]+(?:=(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*\s*\/?>/gi;
const FENCE_LINE = /^[ \t]*(?:`{3,}|~{3,}).*$/gm;
const CODE_SPAN = /(`+)[^`]*?\1/g;

// Applies `strip` to the text outside inline code spans.
function outsideCode(text, strip) {
  let out = "", last = 0, m;
  CODE_SPAN.lastIndex = 0;
  while ((m = CODE_SPAN.exec(text))) {
    out += strip(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + strip(text.slice(last));
}

function plainTitle(text) {
  const raw = String(text || "");
  const clean = outsideCode(raw.replace(FENCE_LINE, " "), (part) => part.replace(EMBED, " ").replace(HTML_TAG, " "))
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, target, alias) => alias || target.split("/").pop())
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  // Nothing left of a front that was not a picture: show it as written rather than call it an image.
  if (!clean && !/!\[|<img\b|<video\b|<picture\b|<svg\b/i.test(raw)) return raw.replace(/\s+/g, " ").trim();
  return clean;
}

module.exports = { plainTitle };
