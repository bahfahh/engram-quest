"use strict";

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
  let today = new Date().toISOString().split("T")[0];
  if (srMeta.due <= today) return "due";
  if (srMeta.state === 1 || srMeta.state === 3) return "learning";
  return (srMeta.stability ?? srMeta.interval) >= 21 ? "mastered" : "learning";
}

function parseFlashcards(markdown) {
  let lines = markdown.split("\n");
  let cards = [];

  for (let index = 0; index < lines.length; index++) {
    let line = lines[index];
    let separatorIndex = line.indexOf("::");
    if (separatorIndex < 1) continue;

    let front = line.slice(0, separatorIndex).trim();
    let back = line.slice(separatorIndex + 2).trim();
    if (!front || !back) continue;

    let srMeta = null;
    let srComment = "";
    if (index + 1 < lines.length && anySrPattern.test(lines[index + 1])) {
      srComment = lines[index + 1].trim();
      srMeta = parseSrComment(srComment);
    }

    cards.push({
      front,
      back,
      emoji: "",
      hint_l1: "",
      hint_l2: "",
      hint_l3: "",
      srMeta,
      srComment,
      notePath: null
    });
  }

  return cards;
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
    .split(/[\s\n]+/)
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
  matchFlashcardTagPrefix
};
