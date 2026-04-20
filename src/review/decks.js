"use strict";

const { anySrPattern, parseSrComment, saveSrData } = require("./helpers");

async function migrateReviewDeckFolder(adapter) {
  if (await adapter.exists("engram-review/hints")) return;
  if (!(await adapter.exists(".review-deck"))) return;
  await adapter.mkdir("engram-review");
  await adapter.mkdir("engram-review/hints");
  if (await adapter.exists(".review-deck/hints")) {
    let listed = await adapter.list(".review-deck/hints");
    for (let filePath of listed.files) {
      let content = await adapter.read(filePath);
      await adapter.write("engram-review/hints/" + filePath.split("/").pop(), content);
    }
  }
  for (let name of ["config.json", "scan-record.json"]) {
    let src = `.review-deck/${name}`;
    if (await adapter.exists(src)) {
      await adapter.write(`engram-review/${name}`, await adapter.read(src));
    }
  }
  console.debug("engram-review: migration from .review-deck/ complete; old folder left for manual cleanup");
}

async function migrateSrCommentsToJson(app) {
  const configPath = "engram-review/config.json";
  try {
    if (await app.vault.adapter.exists(configPath)) {
      const config = JSON.parse(await app.vault.adapter.read(configPath));
      if (config.srMigrated) return;
    }
  } catch {}

  const files = app.vault.getMarkdownFiles();
  for (const file of files) {
    let content = await app.vault.read(file);
    const lines = content.split("\n");
    const srData = {};
    const newLines = [];
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const sep = line.indexOf("::");
      if (sep > 0) {
        const front = line.slice(0, sep).trim();
        const back = line.slice(sep + 2).trim();
        if (front && back && i + 1 < lines.length && anySrPattern.test(lines[i + 1])) {
          const srMeta = parseSrComment(lines[i + 1].trim());
          if (srMeta) srData[front] = { ...srMeta, repetitions: srMeta.repetitions ?? 1 };
          newLines.push(line);
          i++; // skip SR comment line
          modified = true;
          continue;
        }
      }
      newLines.push(line);
    }

    if (modified) {
      await app.vault.modify(file, newLines.join("\n"));
      await saveSrData(app.vault.adapter, file.path, srData);
    }
  }

  // Mark migration complete
  try {
    await app.vault.adapter.mkdir("engram-review").catch(() => {});
    let config = {};
    if (await app.vault.adapter.exists(configPath)) {
      config = JSON.parse(await app.vault.adapter.read(configPath));
    }
    config.srMigrated = true;
    await app.vault.adapter.write(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.warn("engram-review: could not write srMigrated flag", e);
  }
  console.debug("engram-review: SR comment migration complete");
}

async function scanReviewDecks(app, settings, reviewHelpers) {
  try {
    await migrateReviewDeckFolder(app.vault.adapter);
  } catch (e) {
    console.warn("engram-review: migration failed, continuing without it", e);
  }
  let files = app.vault.getMarkdownFiles();
  let deckMap = {};

  for (let file of files) {
    let content = await app.vault.read(file);
    let cards = reviewHelpers.parseFlashcards(content);
    if (cards.length === 0) continue;

    let cache = app.metadataCache.getFileCache(file);
    let tags = [];
    if (cache != null && cache.tags) {
      tags.push(...cache.tags.map((tag) => String(tag.tag).replace(/^#/, "")));
    }
    if (cache != null && cache.frontmatter && cache.frontmatter.tags) {
      let frontmatterTags = cache.frontmatter.tags;
      if (typeof frontmatterTags === "string") {
        tags.push(...frontmatterTags.split(",").map((tag) => tag.trim()));
      } else if (Array.isArray(frontmatterTags)) {
        tags.push(...frontmatterTags.map(String));
      } else {
        tags.push(String(frontmatterTags));
      }
    }

    tags = [...new Set(tags.filter(Boolean))];
    let matchedDeck = reviewHelpers.matchFlashcardTagPrefix(tags, settings.flashcardTags);
    // If cache didn't yield a match, extract inline tags directly from content as fallback
    if (!matchedDeck) {
      const inlineTags = [...content.matchAll(/(^|\s)#([\w][\w/-]*)/gm)].map(m => m[2]);
      const contentTags = [...new Set(inlineTags.filter(Boolean))];
      matchedDeck = reviewHelpers.matchFlashcardTagPrefix(contentTags, settings.flashcardTags);
    }
    if (!(settings.enableSRScan ?? false) && !matchedDeck) continue;

    let deckName = matchedDeck || file.parent?.path || "/";
    if (!deckMap[deckName]) deckMap[deckName] = { name: deckName, cards: [] };

    cards.forEach((card) => {
      card.notePath = file.path;
    });

    let noteName = file.name.replace(/\.md$/i, "");
    try {
      let srData = await reviewHelpers.loadSrData(app.vault.adapter, file.path);
      reviewHelpers.mergeSrIntoCards(cards, srData);
    } catch {}

    try {
      let hintPath = `engram-review/hints/${noteName}.json`;
      if (await app.vault.adapter.exists(hintPath)) {
        const hintsPayload = JSON.parse(await app.vault.adapter.read(hintPath));
        reviewHelpers.mergeReviewHints(cards, hintsPayload);
        if (file.path.startsWith("engram-review/ai-cards/")) {
          const fileNotes = hintsPayload.note
            ? (Array.isArray(hintsPayload.note) ? hintsPayload.note : [hintsPayload.note])
            : [];
          cards.forEach(card => {
            const cardHint = hintsPayload.cards?.[card.front];
            const cardSource = cardHint?.source;
            // source:null = AI-creative card, explicitly no source note
            if (cardHint && "source" in cardHint) {
              card.sourceNotePaths = cardSource === null ? [] : (Array.isArray(cardSource) ? cardSource : [cardSource]);
            } else {
              card.sourceNotePaths = fileNotes;
            }
          });
        }
      }
    } catch {}

    deckMap[deckName].cards.push(...cards);
  }

  return Object.values(deckMap)
    .map((deck) => {
      let due = deck.cards.filter((card) => reviewHelpers.getReviewStatus(card.srMeta) === "due").length;
      let unseen = deck.cards.filter((card) => reviewHelpers.getReviewStatus(card.srMeta) === "unseen").length;
      let total = deck.cards.length;
      return { ...deck, due, unseen, total };
    })
    .sort((left, right) => right.due - left.due || right.total - left.total);
}

module.exports = {
  migrateReviewDeckFolder,
  migrateSrCommentsToJson,
  scanReviewDecks
};
