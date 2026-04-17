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

function parseFlashcards(markdown) {
  let lines = markdown.split("\n");
  let cards = [];
  let inFencedBlock = false;

  for (let index = 0; index < lines.length; index++) {
    let line = lines[index];

    // Track fenced code blocks (``` or ~~~)
    if (/^[ \t]*(`{3,}|~{3,})/.test(line)) {
      inFencedBlock = !inFencedBlock;
      continue;
    }
    if (inFencedBlock) continue;

    // Q/A style: Q: question \n A: answer (multi-line answer supported)
    const qaMatch = line.match(/^Q:\s*(.+)/i);
    if (qaMatch) {
      let aLineIdx = index + 1;
      while (aLineIdx < lines.length && lines[aLineIdx].trim() === "") aLineIdx++;
      const aMatch = aLineIdx < lines.length ? lines[aLineIdx].match(/^A:\s*(.*)/i) : null;
      if (aMatch) {
        let backLines = [aMatch[1]];
        let j = aLineIdx + 1;
        let blankRun = 0;
        while (j < lines.length) {
          if (/^Q:\s*/i.test(lines[j])) break;
          if (/^[ \t]*(`{3,}|~{3,})/.test(lines[j])) break;
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
          cards.push({ front: qaMatch[1].trim(), back, emoji: "", hint_l1: "", hint_l2: "", hint_l3: "", srMeta: null, srComment: "", notePath: null });
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
          cards.push({ front: front.trim(), back: back.trim(), emoji: "", hint_l1: "", hint_l2: "", hint_l3: "", srMeta: null, srComment: "", notePath: null });
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
    let front = stripMd(beforeSep.trim());
    let back = stripMd(line.slice(separatorIndex + 2).trim());
    if (!front || !back) continue;

    cards.push({
      front,
      back,
      emoji: "",
      hint_l1: "",
      hint_l2: "",
      hint_l3: "",
      srMeta: null,
      srComment: "",
      notePath: null
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
        let remainder = normalizedTag.slice(prefix.length).replace(/^\//, "");
        let segments = remainder ? remainder.split("/") : [];
        return segments.length > 0 ? segments[0] : prefix.split("/").pop();
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
  parseReviewDeckBlock,
  mergeReviewHints,
  matchFlashcardTagPrefix,
  srFileName,
  loadSrData,
  saveSrData,
  mergeSrIntoCards
};
