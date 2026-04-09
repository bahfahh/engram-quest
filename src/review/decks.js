"use strict";

async function scanReviewDecks(app, settings, reviewHelpers) {
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
      let hintPath = `.review-deck/hints/${noteName}.json`;
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
  scanReviewDecks
};
