"use strict";

const scanCache = require("./scan-cache");
const { anySrPattern, parseSrComment, updateSrData, mapLimit, loadHints, listHintFiles, srFileName, hintsPath } = require("./helpers");

// The vault's top-level engram-quest/ holds plugin data and the user's custom area (preferences, assets): never
// notes, so never cards, and never rewritten. A note folder of the same name deeper in the vault is the user's own.
const notesOnly = (files) => files.filter((file) => !file.path.startsWith("engram-quest/"));

// Checked once per plugin load: it ran on every Hub open, two disk calls each time.
let migrationChecked = false;
async function migrateReviewDeckFolder(adapter) {
  if (migrationChecked) return;
  if (await adapter.exists("engram-review/hints")) { migrationChecked = true; return; }
  if (!(await adapter.exists(".review-deck"))) { migrationChecked = true; return; }
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
  migrationChecked = true;
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

  const files = notesOnly(app.vault.getMarkdownFiles());
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
      await updateSrData(app.vault.adapter, file.path, () => srData);
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
  let files = notesOnly(app.vault.getMarkdownFiles());
  let deckMap = {};
  const srScan = settings.enableSRScan ?? false;
  // cachedRead serves from Obsidian's in-memory cache when available instead of hitting disk
  // (big win on mobile); fall back to read() for adapters/mocks that lack it.
  const readNote = (f) => (app.vault.cachedRead ? app.vault.cachedRead(f) : app.vault.read(f));
  // One listing of the hints folder instead of probing two names per deck note.
  const hintFiles = await listHintFiles(app.vault.adapter);
  const settingsKey = `${settings.flashcardTags || ""}|${srScan ? 1 : 0}`;
  const visited = new Set();

  // Per-file scan. Returns { deckName, cards } or null. Runs with bounded concurrency below
  // so the 3-5 FS round-trips per deck note overlap instead of serializing on mobile.
  const scanFile = async (file) => {
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

    // Perf: once metadataCache has parsed a note, cache.tags includes its inline (#tag)
    // and frontmatter tags, so the match above is authoritative. For indexed non-deck
    // notes we skip HERE — before reading the file — so a large vault doesn't pay a
    // full-content disk read per note on every hub load.
    //
    // Exception: a freshly written file (e.g. a just-created manual card, written via
    // adapter.write which bypasses the vault event that triggers indexing) may be in
    // getMarkdownFiles() before metadataCache has parsed it. Such a cache entry has no
    // structural info yet; in that case we still read content and use the inline-tag
    // fallback below, so new decks appear immediately instead of on the next reindex.
    const cacheUnindexed = !cache || (
      (!cache.tags || cache.tags.length === 0) &&
      !cache.frontmatter &&
      (!cache.sections || cache.sections.length === 0) &&
      (!cache.headings || cache.headings.length === 0)
    );
    if (!srScan && !matchedDeck && !cacheUnindexed) return null;
    visited.add(file.path);

    // The note's deck and cards come from its text: reused while the note is unchanged (scan-cache.js).
    // The deck tag from the index is part of the key, since it can change after the note was read.
    const noteStamp = scanCache.fileStamp(file);
    const noteKey = noteStamp && `${noteStamp}|${matchedDeck || ""}|${cacheUnindexed ? 1 : 0}|${settingsKey}`;
    let parsed = scanCache.get("notes", file.path, noteKey);
    if (parsed === undefined) {
      let content = await readNote(file);

      // Inline-tag fallback: SR-scan mode parses unmatched notes too, and not-yet-indexed
      // files need their tag recovered from content. Gives the deck a tag-derived name
      // instead of its parent folder.
      if (!matchedDeck) {
        const inlineTags = [...content.matchAll(/(^|\s)#([\w][\w/-]*)/gm)].map(m => m[2]);
        const contentTags = [...new Set(inlineTags.filter(Boolean))];
        matchedDeck = reviewHelpers.matchFlashcardTagPrefix(contentTags, settings.flashcardTags);
      }

      const found = reviewHelpers.parseFlashcards(content);
      let name = matchedDeck || file.parent?.path || "/";
      if (!name) name = "/";
      found.forEach((card) => { card.notePath = file.path; });
      parsed = found.length ? { deckName: name, cards: found } : null;
      // A note the index has not parsed yet is not remembered: its stamp may not be final.
      if (!cacheUnindexed) scanCache.put("notes", file.path, noteKey, parsed);
    }
    if (!parsed) return null;
    const { deckName, cards } = parsed;

    try {
      let srData = await reviewHelpers.loadSrData(app.vault.adapter, file.path);
      reviewHelpers.mergeSrIntoCards(cards, srData);
    } catch {}

    try {
      const loaded = await loadHints(app.vault.adapter, file.path, hintFiles);
      if (!loaded) return { deckName, cards };
      const hintsPayload = loaded.data;
      reviewHelpers.mergeReviewHints(cards, hintsPayload);
      if (file.path.startsWith("engram-review/ai-cards/")) {
          const fileNotes = hintsPayload.note
            ? (Array.isArray(hintsPayload.note) ? hintsPayload.note : [hintsPayload.note])
            : [];
          const hintCards = Array.isArray(hintsPayload.cards)
            ? hintsPayload.cards.reduce((acc, entry) => {
                if (entry && entry.front) acc[entry.front] = entry;
                return acc;
              }, {})
            : (hintsPayload.cards || {});
          cards.forEach(card => {
            const cardHint = hintCards[card.front];
            const cardSource = cardHint?.source;
            // source:null = AI-creative card, explicitly no source note
            let relatedNotePaths;
            if (cardHint && "source" in cardHint) {
              relatedNotePaths = cardSource === null ? [] : (Array.isArray(cardSource) ? cardSource : [cardSource]);
            } else {
              relatedNotePaths = fileNotes;
            }
            relatedNotePaths = [...new Set((relatedNotePaths || []).filter(Boolean))];
            card.sourceNotePaths = relatedNotePaths;
            card.relatedNotePaths = relatedNotePaths;
            card.primarySourceNotePath = relatedNotePaths[0] || null;
          });
      }
    } catch {}

    return { deckName, cards };
  };

  // Bounded parallelism (results merged in file order so deck/card ordering stays deterministic).
  const scanned = await mapLimit(files, 8, (file) =>
    scanFile(file).catch((e) => { console.warn("engram-review: scan failed for", file.path, e); return null; })
  );
  scanCache.prune("notes", visited);
  // Schedules and hints of notes that are gone are forgotten too, so the cache saved on the device
  // (main.js) does not grow with every deleted or renamed note.
  const sidecars = new Set();
  for (const notePath of visited) {
    sidecars.add(`engram-review/sr/${srFileName(notePath)}.json`);
    sidecars.add(hintsPath(notePath));
    sidecars.add(`engram-review/hints/${notePath.split("/").pop().replace(/\.md$/i, "")}.json`);
  }
  scanCache.prune("sr", sidecars);
  scanCache.prune("hints", sidecars);
  for (const entry of scanned) {
    if (!entry) continue;
    if (!deckMap[entry.deckName]) deckMap[entry.deckName] = { name: entry.deckName, cards: [] };
    deckMap[entry.deckName].cards.push(...entry.cards);
  }

  return Object.values(deckMap)
    .map((deck) => {
      let due = deck.cards.filter((card) => reviewHelpers.getReviewStatus(card.srMeta) === "due").length;
      let unseen = deck.cards.filter((card) => reviewHelpers.getReviewStatus(card.srMeta) === "unseen").length;
      let total = deck.cards.length;
      return { ...deck, due, unseen, total };
    })
    .sort((left, right) => {
      const leftReady = left.due + left.unseen;
      const rightReady = right.due + right.unseen;
      return rightReady - leftReady || right.total - left.total;
    });
}

module.exports = {
  migrateReviewDeckFolder,
  migrateSrCommentsToJson,
  scanReviewDecks
};
