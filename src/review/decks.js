"use strict";

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
    if (!(settings.enableSRScan ?? false) && !matchedDeck) continue;

    let deckName = matchedDeck || file.parent?.name || "flashcards";
    if (!deckMap[deckName]) deckMap[deckName] = { name: deckName, cards: [] };

    cards.forEach((card) => {
      card.notePath = file.path;
    });

    let noteName = file.name.replace(/\.md$/i, "");
    try {
      let hintPath = `engram-review/hints/${noteName}.json`;
      if (await app.vault.adapter.exists(hintPath)) {
        reviewHelpers.mergeReviewHints(cards, JSON.parse(await app.vault.adapter.read(hintPath)));
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
  scanReviewDecks
};
