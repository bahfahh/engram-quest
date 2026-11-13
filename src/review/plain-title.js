"use strict";
// A card's front as the one readable line a Synapse map node shows. A front is the user's Markdown:
// an image embed (`![[../assets/pic.png]]`), a link, a fenced block or an HTML tag would show up
// as raw syntax in a node, so they are turned into what a reader sees. A front that is only a
// picture comes out empty, and the caller names it ("Image card"). Pure; nothing here decides what
// may be shown before the answer: that is answer-leak.js, which still reads the original text.

const EMBED = /!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g;
const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const FENCE_LINE = /^[ \t]*(?:`{3,}|~{3,}).*$/gm;

function plainTitle(text) {
  return String(text || "")
    .replace(EMBED, " ")
    .replace(HTML_TAG, " ")
    .replace(FENCE_LINE, " ")
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, target, alias) => alias || target.split("/").pop())
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { plainTitle };
