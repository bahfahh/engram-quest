"use strict";

function getLocalDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const advancedSrPattern = /<!--SR:!(\d{4}-\d{2}-\d{2}),(\d+),([\d.]+),([\d.]+),(\d)-->/;
const legacySrPattern = /<!--SR:!(\d{4}-\d{2}-\d{2}),(\d+),(\d+)-->/;
const anySrPattern = /<!--SR:![\d\-.,]+-->/;

function parseSrComment(comment) {
  let advancedMatch = comment.match(advancedSrPattern);
  if (advancedMatch) {
    return {
      due: advancedMatch[1],
      interval: parseInt(advancedMatch[2]),
      stability: parseFloat(advancedMatch[3]),
      difficulty: parseFloat(advancedMatch[4]),
      state: parseInt(advancedMatch[5]),
      repetitions: parseInt(advancedMatch[2]) <= 1 ? 1 : 2
    };
  }

  let legacyMatch = comment.match(legacySrPattern);
  if (!legacyMatch) return null;

  let interval = parseInt(legacyMatch[2]);
  let ease = parseInt(legacyMatch[3]);
  let stability = Math.max(0.5, Math.round(interval * 0.9 * 1e3) / 1e3);
  let difficulty = Math.round(Math.min(10, Math.max(1, 13 - ease / 30)) * 1e3) / 1e3;
  let state = interval >= 6 ? 2 : 1;

  return {
    due: legacyMatch[1],
    interval,
    stability,
    difficulty,
    state,
    repetitions: interval <= 1 ? 1 : interval <= 6 ? 2 : 3,
    _migratedFromSM2: true
  };
}

function getReviewStatus(srMeta) {
  if (!srMeta || srMeta.state === 0) return "unseen";
  let today = getLocalDateStr();
  if (srMeta.due <= today) return "due";
  if (srMeta.state === 1 || srMeta.state === 3) return "learning";
  return (srMeta.stability ?? srMeta.interval) >= 21 ? "mastered" : "learning";
}

function makeReviewCard(front, back) {
  return { front, back, emoji: "", hint_l1: "", hint_l2: "", hint_l3: "", srMeta: null, srComment: "", notePath: null };
}

// Parse Q:/A: cards from a fenced block — blank lines never terminate a card.
// Only the next Q: line or end-of-block ends the current card.
function parseFencedQA(text) {
  const lines = text.split("\n");
  const cards = [];
  let i = 0;
  while (i < lines.length) {
    const qaMatch = lines[i].match(/^\s*Q:\s*(.+)/i);
    if (!qaMatch) { i++; continue; }

    // Collect question lines until A:
    const frontLines = [qaMatch[1]];
    i++;
    while (i < lines.length && !/^\s*A:\s*/i.test(lines[i])) {
      frontLines.push(lines[i]);
      i++;
    }
    while (frontLines.length > 0 && frontLines[frontLines.length - 1].trim() === "") frontLines.pop();

    const aMatch = i < lines.length ? lines[i].match(/^\s*A:\s*(.*)/i) : null;
    if (!aMatch) continue;

    // Collect answer lines until next Q: or end of block
    const backLines = [aMatch[1]];
    i++;
    while (i < lines.length && !/^\s*Q:\s*/i.test(lines[i])) {
      backLines.push(lines[i]);
      i++;
    }
    while (backLines.length > 0 && backLines[backLines.length - 1].trim() === "") backLines.pop();

    const front = frontLines.join("\n").trim();
    const back = backLines.join("\n").trim();
    if (front && back) {
      cards.push(makeReviewCard(front, back));
    }
  }
  return cards;
}

// Parse %%card%% blocks for long pasted answers. Inside the block, only the
// closing %%card%% marker ends the answer; markdown separators like --- are content.
function parseCommentCardBlock(text) {
  const lines = text.split("\n");
  let qIndex = -1;
  let aIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (qIndex === -1 && /^\s*Q:\s*/i.test(lines[i])) {
      qIndex = i;
      continue;
    }
    if (qIndex !== -1 && /^\s*A:\s*/i.test(lines[i])) {
      aIndex = i;
      break;
    }
  }

  if (qIndex === -1 || aIndex === -1 || aIndex <= qIndex) return null;

  const qMatch = lines[qIndex].match(/^\s*Q:\s*(.*)/i);
  const aMatch = lines[aIndex].match(/^\s*A:\s*(.*)/i);
  const frontLines = [qMatch ? qMatch[1] : "", ...lines.slice(qIndex + 1, aIndex)];
  const backLines = [aMatch ? aMatch[1] : "", ...lines.slice(aIndex + 1)];

  while (frontLines.length > 0 && frontLines[frontLines.length - 1].trim() === "") frontLines.pop();
  while (backLines.length > 0 && backLines[backLines.length - 1].trim() === "") backLines.pop();

  const front = frontLines.join("\n").trim();
  const back = backLines.join("\n").trim();
  if (!front || !back) return null;
  return makeReviewCard(front, back);
}

// Match `%%card%%`, `%% card %%`, `%%CARD%%`, `%% Card %%` etc.
// Spaces around `card` are tolerated because Obsidian's Ctrl+/ comment toggle
// inserts `%% %%` and users often type `card` with the surrounding spaces left in.
const cardFencePattern = /^\s*%%\s*card\s*%%\s*$/i;
// Writers always emit this canonical no-space form so files normalize on the next save.
const CARD_FENCE = "%%card%%";

function parseFlashcards(markdown) {
  markdown = markdown.replace(/\r\n/g, "\n");
  let lines = markdown.split("\n");
  let cards = [];
  let inHtmlComment = false;

  for (let index = 0; index < lines.length; index++) {
    let line = lines[index];

    if (cardFencePattern.test(line)) {
      const blockLines = [];
      let j = index + 1;
      while (j < lines.length && !cardFencePattern.test(lines[j])) {
        blockLines.push(lines[j]);
        j++;
      }
      if (j >= lines.length) {
        break;
      }
      const card = parseCommentCardBlock(blockLines.join("\n"));
      if (card) cards.push(card);
      index = j;
      continue;
    }

    // --- fenced card block: --- \n Q: ... \n A: ... \n ---
    // Only triggers when the --- is followed (possibly after blank lines) by a Q: line.
    // Plain horizontal rules (--- not followed by Q:) are ignored.
    if (/^---\s*$/.test(line)) {
      // Peek ahead past blank lines to see if a Q: follows
      let peek = index + 1;
      while (peek < lines.length && lines[peek].trim() === "") peek++;
      if (peek >= lines.length || !/^\s*Q:\s*/i.test(lines[peek])) {
        continue; // plain horizontal rule — skip
      }
      // Collect lines until closing ---
      const fencedLines = [];
      let j = index + 1;
      while (j < lines.length && !/^---\s*$/.test(lines[j])) {
        fencedLines.push(lines[j]);
        j++;
      }
      index = j; // skip past closing ---

      // Parse Q:/A: cards within the fenced block (no blank-line termination)
      const fencedText = fencedLines.join("\n");
      const fencedCards = parseFencedQA(fencedText);
      cards.push(...fencedCards);
      continue;
    }

    // Skip fenced code blocks (``` or ~~~) — match opening/closing pair
    const fenceMatch = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      index++;
      while (index < lines.length && !lines[index].trimStart().startsWith(fence)) index++;
      continue;
    }

    // Skip HTML comments (but not <!--SR: scheduling comments)
    if (inHtmlComment) {
      if (line.includes("-->")) inHtmlComment = false;
      continue;
    }
    if (line.trimStart().startsWith("<!--") && !line.trimStart().startsWith("<!--SR:")) {
      if (!line.includes("-->")) inHtmlComment = true;
      continue;
    }

    // Q/A style: Q: question \n A: answer (multi-line question & answer supported)
    const qaMatch = line.match(/^\s*Q:\s*(.+)/i);
    if (qaMatch) {
      // Collect multi-line question: Q: line + any lines before A: (allow single blank lines)
      let frontLines = [qaMatch[1]];
      let aLineIdx = index + 1;
      let qBlankRun = 0;
      while (aLineIdx < lines.length) {
        if (/^\s*A:\s*/i.test(lines[aLineIdx])) break;
        if (lines[aLineIdx].trim() === "") {
          qBlankRun++;
          if (qBlankRun >= 2) break; // two blank lines = card boundary
          aLineIdx++;
        } else {
          qBlankRun = 0;
          frontLines.push(lines[aLineIdx]);
          aLineIdx++;
        }
      }
      // Remove trailing blank captures
      while (frontLines.length > 0 && frontLines[frontLines.length - 1].trim() === "") frontLines.pop();
      const aMatch = aLineIdx < lines.length ? lines[aLineIdx].match(/^\s*A:\s*(.*)/i) : null;
      if (aMatch) {
        let backLines = [aMatch[1]];
        let j = aLineIdx + 1;
        let blankRun = 0;
        let inCodeBlock = false;
        let codeBlockFenceChar = "";
        let codeBlockFenceLen = 0;
        while (j < lines.length) {
          const codeFenceMatch = lines[j].match(/^[ \t]*(`{3,}|~{3,})/);
          if (codeFenceMatch) {
            const fenceChar = codeFenceMatch[1][0];
            const fenceLen = codeFenceMatch[1].length;
            if (!inCodeBlock) {
              inCodeBlock = true;
              codeBlockFenceChar = fenceChar;
              codeBlockFenceLen = fenceLen;
            } else if (fenceChar === codeBlockFenceChar && fenceLen >= codeBlockFenceLen) {
              inCodeBlock = false;
            }
            backLines.push(lines[j]);
            blankRun = 0;
            j++;
            continue;
          }
          if (inCodeBlock) {
            backLines.push(lines[j]);
            j++;
            continue;
          }
          if (/^\s*Q:\s*/i.test(lines[j])) break;
          if (/^---\s*$/.test(lines[j])) break; // fenced block boundary
          if (/\{\{c\d+::/.test(lines[j])) break; // cloze card on next line — stop here
          if (lines[j].trim() === "") {
            blankRun++;
            if (blankRun >= 2) break; // two blank lines = card boundary
            backLines.push(lines[j]);
            j++;
          } else {
            blankRun = 0;
            backLines.push(lines[j]);
            j++;
          }
        }
        while (backLines.length > 0 && backLines[backLines.length - 1].trim() === "") backLines.pop();
        const back = backLines.join("\n").trim();
        if (back) {
          cards.push(makeReviewCard(frontLines.join("\n").trim(), back));
          index = j - 1;
          continue;
        }
      }
    }

    // Cloze deletion: {{c1::text}} or {{c1::text::hint}}
    if (/\{\{c\d+::/.test(line)) {
      const clozeRe = /\{\{c(\d+)::([^}:]*?)(?:::([^}]*?))?\}\}/g;
      const clozeMatches = [...line.matchAll(clozeRe)];
      const groups = [...new Set(clozeMatches.map(m => m[1]))];
      for (const group of groups) {
        const front = line.replace(clozeRe, (_, g, text, hint) => g === group ? (hint ? `[${hint}]` : "[...]") : text);
        const back = line.replace(clozeRe, (_, _g, text) => text);
        if (front.trim() && back.trim()) {
          cards.push(makeReviewCard(front.trim(), back.trim()));
        }
      }
      continue;
    }

    let separatorIndex = line.indexOf("::");
    if (separatorIndex < 1) continue;

    // Skip lines where :: is inside inline code
    const beforeSep = line.slice(0, separatorIndex);
    const backticksBefore = (beforeSep.match(/`/g) || []).length;
    if (backticksBefore % 2 !== 0) continue;

    // Skip lines that look like cloze (already handled above, guard against partial match)
    if (/\{\{c\d+::/.test(beforeSep)) continue;

    const stripMd = s => s.replace(/^[*_=]+|[*_=]+$/g, "").trim();
    const rawFront = beforeSep.trim();
    const rawBack = line.slice(separatorIndex + 2).trim();
    let front = stripMd(rawFront);
    let back = stripMd(rawBack);
    if (!front || !back) continue;

    cards.push({
      ...makeReviewCard(front, back),
      rawFront,
      rawBack
    });
  }

  return cards;
}

function srFileName(notePath) {
  // Use full path as key to avoid collision between same-name notes in different folders
  return notePath.replace(/\//g, "__").replace(/\.md$/i, "");
}

async function loadSrData(adapter, notePath) {
  const newPath = `engram-review/sr/${srFileName(notePath)}.json`;
  if (await adapter.exists(newPath)) {
    try { return JSON.parse(await adapter.read(newPath)); } catch { return {}; }
  }
  // Legacy fallback: old files were named by noteName only (before path-based fix)
  const legacyPath = `engram-review/sr/${notePath.split("/").pop().replace(/\.md$/i, "")}.json`;
  if (await adapter.exists(legacyPath)) {
    try { return JSON.parse(await adapter.read(legacyPath)); } catch { return {}; }
  }
  return {};
}

async function saveSrData(adapter, notePath, srData) {
  const srPath = `engram-review/sr/${srFileName(notePath)}.json`;
  await adapter.mkdir("engram-review/sr").catch(() => {});
  await adapter.write(srPath, JSON.stringify(srData, null, 2));
}

function mergeSrIntoCards(cards, srData) {
  cards.forEach((card) => {
    const sr = srData[card.front];
    if (sr) card.srMeta = sr;
  });
}

function parseReviewDeckBlock(markdown) {
  let config = { tag: null, source: null, cards: null, style: "ocean", title: "", columns: 4 };
  let lines = markdown.split("\n");
  let inCards = false;
  let currentCard = null;

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("tag:")) {
      config.tag = trimmed.slice(4).trim();
      inCards = false;
      continue;
    }
    if (trimmed.startsWith("source:")) {
      config.source = trimmed.slice(7).trim();
      inCards = false;
      continue;
    }
    if (trimmed.startsWith("style:")) {
      config.style = trimmed.slice(6).trim();
      inCards = false;
      continue;
    }
    if (trimmed.startsWith("title:")) {
      config.title = trimmed.slice(6).trim();
      inCards = false;
      continue;
    }
    if (trimmed.startsWith("columns:")) {
      config.columns = parseInt(trimmed.slice(8)) || 4;
      inCards = false;
      continue;
    }
    if (trimmed === "cards:") {
      config.cards = [];
      inCards = true;
      currentCard = null;
      continue;
    }

    if (!inCards) continue;

    if (trimmed.startsWith("- front:")) {
      currentCard = {
        front: trimmed.slice(8).trim(),
        back: "",
        emoji: "",
        hint_l1: "",
        hint_l2: "",
        hint_l3: "",
        srMeta: null,
        srComment: "",
        notePath: null
      };
      config.cards.push(currentCard);
      continue;
    }

    if (!currentCard) continue;
    if (trimmed.startsWith("back:")) currentCard.back = trimmed.slice(5).trim();
    if (trimmed.startsWith("emoji:")) currentCard.emoji = trimmed.slice(6).trim();
    if (trimmed.startsWith("hint_l1:")) currentCard.hint_l1 = trimmed.slice(8).trim();
    if (trimmed.startsWith("hint_l2:")) currentCard.hint_l2 = trimmed.slice(8).trim();
    if (trimmed.startsWith("hint_l3:")) currentCard.hint_l3 = trimmed.slice(8).trim();
  }

  return config;
}

function mergeReviewHints(cards, hintPayload) {
  if (!(hintPayload != null && hintPayload.cards)) return;
  let hintsDict = hintPayload.cards;
  if (Array.isArray(hintPayload.cards)) {
    hintsDict = {};
    hintPayload.cards.forEach((c) => { if (c.front) hintsDict[c.front] = c; });
  }
  cards.forEach((card) => {
    let hint = hintsDict[card.front];
    if (!hint) return;
    card.hint_l1 = hint.l1 || "";
    card.hint_l2 = hint.l2 || "";
    card.hint_l3 = hint.l3 || "";
  });
}

function matchFlashcardTagPrefix(tags, flashcardTags) {
  let prefixes = (flashcardTags || "")
    .split(/[\s,\n]+/)
    .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean);
  if (prefixes.length === 0) return null;

  for (let tag of tags) {
    let normalizedTag = tag.replace(/^#/, "");
    let normalizedLower = normalizedTag.toLowerCase();
    for (let prefix of prefixes) {
      if (normalizedLower === prefix || normalizedLower.startsWith(prefix + "/")) {
        return normalizedTag;
      }
    }
  }

  return null;
}

module.exports = {
  advancedSrPattern,
  legacySrPattern,
  anySrPattern,
  parseSrComment,
  getReviewStatus,
  parseFlashcards,
  parseCommentCardBlock,
  cardFencePattern,
  CARD_FENCE,
  parseReviewDeckBlock,
  mergeReviewHints,
  matchFlashcardTagPrefix,
  srFileName,
  loadSrData,
  saveSrData,
  mergeSrIntoCards
};
