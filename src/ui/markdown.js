"use strict";
// markdown.js
// Normalizes card markdown right before it is handed to Obsidian's
// MarkdownRenderer, so pasted AI answers render the way the user expects.
//
// Root cause it solves: in CommonMark + GFM a table is a block-level structure and
// can only start at a block boundary. A header row written directly under a text
// line (`**(a) …**` \n `| 問題 | 限制 |` \n `|---|---|`) is swallowed as a lazy
// continuation of that paragraph, so the whole thing renders as one <p> and the
// delimiter row shows up as literal text. Source notes stay read-only, so the blank
// line is inserted at render time instead of being written back to the vault.

// A GFM delimiter row: only `|`, `-`, `:` and spaces, and it must carry at least
// one of each of `|` and `-` (so a bare `---` horizontal rule is not a match).
function isDelimiterRow(line) {
  return /^[\s|:-]+$/.test(line) && line.includes("|") && line.includes("-");
}

// normalizeMarkdown(text): returns `text` with a blank line inserted before any
// table header row that directly follows a paragraph line. Content inside fenced
// code blocks is left untouched.
function normalizeMarkdown(text) {
  const src = String(text ?? "");
  if (!src.includes("|")) return src;

  const lines = src.split("\n");
  const out = [];
  let fence = ""; // open code-fence marker, "" when outside a fence

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fenceMatch = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = "";
      out.push(line);
      continue;
    }
    if (fence) { out.push(line); continue; }

    // `line` is the delimiter row → lines[i-1] is the header row, lines[i-2] is
    // whatever precedes the table. Only a plain paragraph line needs the break:
    // a blank line already works, a `|` line means the table started earlier, and
    // a `>` line would be a blockquote we must not split.
    const header = i >= 1 ? lines[i - 1] : null;
    const before = i >= 2 ? lines[i - 2] : null;
    if (
      isDelimiterRow(line) &&
      header && header.includes("|") &&
      before !== null && before.trim() !== "" &&
      !before.includes("|") && !before.trimStart().startsWith(">")
    ) {
      out.splice(out.length - 1, 0, ""); // blank line before the header row
    }
    out.push(line);
  }

  return out.join("\n");
}

module.exports = { normalizeMarkdown };
