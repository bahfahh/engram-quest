"use strict";

const { loadSrData, saveSrData, srFileName, parseCommentCardBlock, cardFencePattern, CARD_FENCE, isFencedQaOpener } = require("./helpers");

const isCardFence = (line) => cardFencePattern.test(line);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMdEdge(s) {
  return String(s || "").replace(/^[*_=]+|[*_=]+$/g, "").trim();
}

function cardFrontCandidates(card) {
  return [...new Set([
    card.rawFront,
    card.front,
    stripMdEdge(card.rawFront),
    stripMdEdge(card.front),
  ].filter(v => typeof v === "string" && v.trim()))];
}

function cardBackCandidates(card, fallbackBack) {
  return [...new Set([
    card.rawBack,
    fallbackBack,
    card.back,
    stripMdEdge(card.rawBack),
    stripMdEdge(fallbackBack),
    stripMdEdge(card.back),
  ].filter(v => typeof v === "string" && v.trim()))];
}

function buildCommentCardBlock(newData) {
  const backLines = String(newData.back || "").split("\n");
  return [
    CARD_FENCE,
    `Q: ${newData.front}`,
    `A: ${backLines[0] || ""}`,
    ...backLines.slice(1),
    CARD_FENCE,
  ].join("\n");
}

function replaceDoubleColonCard(content, card, newData, fallbackBack) {
  const fronts = cardFrontCandidates(card);
  const backs = cardBackCandidates(card, fallbackBack);
  const isMultilineBack = String(newData.back || "").includes("\n");

  // Multi-line back can't fit in single-line :: format; convert to %%card%% block,
  // which is the parser's native fenced format for long answers (see parseFlashcards).
  const buildReplacement = (indent, mid) => {
    if (isMultilineBack) return buildCommentCardBlock(newData);
    return `${indent}${newData.front}${mid}:: ${newData.back}`;
  };

  for (const front of fronts) {
    for (const back of backs) {
      const re = new RegExp(
        `^([ \t]*)${escapeRegExp(front)}([ \t]*)::[ \t]*${escapeRegExp(back)}[ \t]*$`,
        "m"
      );
      if (re.test(content)) {
        return {
          content: content.replace(re, (_match, indent, mid) => buildReplacement(indent, mid)),
          modified: true,
        };
      }
    }
  }

  for (const front of fronts) {
    const reFront = new RegExp(`^([ \t]*)${escapeRegExp(front)}([ \t]*)::(.*)$`, "m");
    if (reFront.test(content)) {
      return {
        content: content.replace(reFront, (_match, indent, mid) => buildReplacement(indent, mid)),
        modified: true,
      };
    }
  }

  return { content, modified: false };
}

function collectCommentCardBlocks(content) {
  const lines = content.split("\n");
  const cards = [];
  let i = 0;
  while (i < lines.length) {
    if (!isCardFence(lines[i])) { i++; continue; }
    const blockStart = i;
    let j = i + 1;
    while (j < lines.length && !isCardFence(lines[j])) j++;
    if (j >= lines.length) break;
    const parsed = parseCommentCardBlock(lines.slice(blockStart + 1, j).join("\n"));
    if (parsed) cards.push({ front: parsed.front, back: parsed.back, start: blockStart, end: j + 1 });
    i = j + 1;
  }
  return cards;
}

function findCommentCardRange(lines, card, fallbackBack) {
  const fronts = new Set(cardFrontCandidates(card));
  const backs = new Set(cardBackCandidates(card, fallbackBack));
  const collected = collectCommentCardBlocks(lines.join("\n"));
  for (const parsed of collected) {
    if (!fronts.has(parsed.front) && !fronts.has(stripMdEdge(parsed.front))) continue;
    if (!backs.has(parsed.back) && !backs.has(stripMdEdge(parsed.back))) continue;
    return { start: parsed.start, end: parsed.end };
  }
  return null;
}

function replaceCommentCard(content, card, newData, fallbackBack) {
  const hasFinalNewline = content.endsWith("\n");
  const lines = content.split("\n");
  if (hasFinalNewline) lines.pop();
  const range = findCommentCardRange(lines, card, fallbackBack);
  if (!range) return { content, modified: false };
  const newBlock = buildCommentCardBlock(newData).split("\n");
  lines.splice(range.start, range.end - range.start, ...newBlock);
  return { content: lines.join("\n") + (hasFinalNewline ? "\n" : ""), modified: true };
}

function trimTrailingBlankLines(lines) {
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
}

function collectQaCards(lines) {
  const cards = [];
  // Mirror parseFencedQA: inside ---...--- fences, blank lines do NOT terminate
  // the back. Otherwise the editor parses a shorter back than the loader and
  // findQaCardRange's equality match fails on multi-paragraph fenced cards.
  let inFencedBlock = false;
  let qStart = 0;
  while (qStart < lines.length) {
    if (/^---\s*$/.test(lines[qStart])) {
      if (inFencedBlock) inFencedBlock = false;
      else if (isFencedQaOpener(lines, qStart)) inFencedBlock = true;
      qStart++;
      continue;
    }

    const qMatch = lines[qStart].match(/^\s*Q:\s*(.+)/i);
    if (!qMatch) { qStart++; continue; }

    const frontLines = [qMatch[1]];
    let aIndex = qStart + 1;
    let qBlankRun = 0;
    while (aIndex < lines.length) {
      if (/^\s*A:\s*/i.test(lines[aIndex])) break;
      if (lines[aIndex].trim() === "") {
        qBlankRun++;
        if (!inFencedBlock && qBlankRun >= 2) break;
        aIndex++;
      } else {
        qBlankRun = 0;
        frontLines.push(lines[aIndex]);
        aIndex++;
      }
    }

    if (aIndex >= lines.length || !/^\s*A:\s*/i.test(lines[aIndex])) { qStart++; continue; }
    const aMatch = lines[aIndex].match(/^\s*A:\s*(.*)/i);
    const backLines = [aMatch ? aMatch[1] : ""];
    let end = aIndex + 1;
    let blankRun = 0;
    let inCodeBlock = false;
    let codeBlockFenceChar = "";
    let codeBlockFenceLen = 0;

    while (end < lines.length) {
      const codeFenceMatch = lines[end].match(/^[ \t]*(`{3,}|~{3,})/);
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
        backLines.push(lines[end]);
        blankRun = 0;
        end++;
        continue;
      }

      if (inCodeBlock) {
        backLines.push(lines[end]);
        end++;
        continue;
      }

      if (/^\s*Q:\s*/i.test(lines[end])) break;
      // --- always terminates: outside a fence it's a new boundary, inside a fence it's the closing marker.
      if (/^---\s*$/.test(lines[end])) break;
      if (/\{\{c\d+::/.test(lines[end])) break;
      if (lines[end].trim() === "") {
        blankRun++;
        if (!inFencedBlock && blankRun >= 2) break;
        backLines.push(lines[end]);
        end++;
      } else {
        blankRun = 0;
        backLines.push(lines[end]);
        end++;
      }
    }

    const front = trimTrailingBlankLines([...frontLines]).join("\n").trim();
    const back = trimTrailingBlankLines([...backLines]).join("\n").trim();
    while (end > qStart && lines[end - 1].trim() === "") end--;
    cards.push({ front, back, start: qStart, end });
    qStart = end;
  }
  return cards;
}

function findQaCardRange(lines, card, fallbackBack) {
  const fronts = new Set(cardFrontCandidates(card));
  const backs = new Set(cardBackCandidates(card, fallbackBack));

  for (const parsed of collectQaCards(lines)) {
    if (!fronts.has(parsed.front) && !fronts.has(stripMdEdge(parsed.front))) continue;
    if (!backs.has(parsed.back) && !backs.has(stripMdEdge(parsed.back))) continue;
    return { start: parsed.start, end: parsed.end };
  }

  return null;
}

function replaceQaCard(content, card, newData, fallbackBack) {
  const hasFinalNewline = content.endsWith("\n");
  const lines = content.split("\n");
  if (hasFinalNewline) lines.pop();
  const range = findQaCardRange(lines, card, fallbackBack);
  if (!range) return { content, modified: false };

  const newLines = [`Q: ${newData.front}`];
  const backLines = String(newData.back || "").split("\n");
  newLines.push(`A: ${backLines[0] || ""}`);
  newLines.push(...backLines.slice(1));
  lines.splice(range.start, range.end - range.start, ...newLines);
  return { content: lines.join("\n") + (hasFinalNewline ? "\n" : ""), modified: true };
}

function replaceSourceCard(content, card, newData, fallbackBack) {
  // Try fenced comment card block first — most specific, multi-line safe
  const cc = replaceCommentCard(content, card, newData, fallbackBack);
  if (cc.modified) return cc;
  const dc = replaceDoubleColonCard(content, card, newData, fallbackBack);
  if (dc.modified) return dc;
  return replaceQaCard(content, card, newData, fallbackBack);
}

function collectDoubleColonCards(content) {
  const cards = [];
  const re = /^([ \t]*)(.+?)([ \t]*)::[ \t]*(.*?)[ \t]*$/gm;
  let match;
  while ((match = re.exec(content)) !== null) {
    cards.push({ front: match[2].trim(), back: match[4].trim() });
  }
  return cards;
}

function findCurrentSourceCard(content, card) {
  const fronts = new Set(cardFrontCandidates(card));
  const backs = new Set(cardBackCandidates(card, card.back));
  const matchesFront = parsed => fronts.has(parsed.front) || fronts.has(stripMdEdge(parsed.front));
  const matchesBack = parsed => backs.has(parsed.back) || backs.has(stripMdEdge(parsed.back));

  const commentCards = collectCommentCardBlocks(content);
  const exactComment = commentCards.find(parsed => matchesFront(parsed) && matchesBack(parsed));
  if (exactComment) return { front: exactComment.front, back: exactComment.back };

  const doubleColonCards = collectDoubleColonCards(content);
  const exactDc = doubleColonCards.find(parsed => matchesFront(parsed) && matchesBack(parsed));
  if (exactDc) return { front: exactDc.front, back: exactDc.back, rawFront: exactDc.front, rawBack: exactDc.back };

  const qaCards = collectQaCards(content.split("\n"));
  const exactQa = qaCards.find(parsed => matchesFront(parsed) && matchesBack(parsed));
  if (exactQa) return { front: exactQa.front, back: exactQa.back };

  const frontMatches = [...commentCards, ...doubleColonCards, ...qaCards].filter(matchesFront);
  if (frontMatches.length === 1) {
    const parsed = frontMatches[0];
    return { front: parsed.front, back: parsed.back, rawFront: parsed.front, rawBack: parsed.back };
  }

  return null;
}

async function refreshTagSourceCard(app, card) {
  if (!card.notePath) return true;
  const file = app.vault.getAbstractFileByPath(card.notePath);
  if (!file) return false;

  const content = await app.vault.read(file);
  const current = findCurrentSourceCard(content, card);
  if (!current) return false;

  card.front = current.front;
  card.back = current.back;
  if (card.rawFront !== undefined || current.rawFront !== undefined) card.rawFront = current.rawFront || current.front;
  if (card.rawBack !== undefined || current.rawBack !== undefined) card.rawBack = current.rawBack || current.back;
  return true;
}

function syncRawCardFields(card, newData) {
  if (card.rawFront !== undefined) card.rawFront = newData.front;
  if (card.rawBack !== undefined) card.rawBack = newData.back;
}

/**
 * Save edits for a tag/source-based card (card.notePath is set).
 * Updates the `front :: back` line in the markdown note and the hints JSON.
 * @param {object} app - Obsidian app
 * @param {object} card - original card object
 * @param {{front,back,hint_l1,hint_l2,hint_l3}} newData
 */
async function saveTagSourceCard(app, card, newData) {
  if (!card.notePath) return false;

  // 1. Update markdown note
  const file = app.vault.getAbstractFileByPath(card.notePath);
  if (!file) return false;

  const content = await app.vault.read(file);
  const result = replaceSourceCard(content, card, newData, card.back);
  if (!result.modified) return false;

  await app.vault.modify(file, result.content);

  // 2. Update hints JSON
  const noteName = card.notePath.split("/").pop().replace(/\.md$/i, "");
  const hintPath = `engram-review/hints/${noteName}.json`;
  try {
    let hints = { note: card.notePath, generated: new Date().toISOString().split("T")[0], cards: {} };
    if (await app.vault.adapter.exists(hintPath)) {
      hints = JSON.parse(await app.vault.adapter.read(hintPath));
    }
    const oldHint = hints.cards[card.front] || {};
    delete hints.cards[card.front];
    hints.cards[newData.front] = {
      l1: newData.hint_l1 !== undefined ? newData.hint_l1 : (oldHint.l1 || ""),
      l2: newData.hint_l2 !== undefined ? newData.hint_l2 : (oldHint.l2 || ""),
      l3: newData.hint_l3 !== undefined ? newData.hint_l3 : (oldHint.l3 || ""),
    };
    await app.vault.adapter.write(hintPath, JSON.stringify(hints, null, 2));
  } catch (e) {
    console.warn("review-edit: hints update failed", e);
  }

  // 3. Update sr JSON key if front text changed
  if (card.front !== newData.front) {
    try {
      const srData = await loadSrData(app.vault.adapter, card.notePath);
      if (srData[card.front]) {
        srData[newData.front] = srData[card.front];
        delete srData[card.front];
        await saveSrData(app.vault.adapter, card.notePath, srData);
      }
    } catch (e) {
      console.warn("review-edit: sr update failed", e);
    }
  }

  syncRawCardFields(card, newData);
  return true;
}

/**
 * Replace a card entry within a review-deck code block string.
 * Returns the updated block content, or original if card not found.
 * @param {string} blockContent - content between the ``` fences
 * @param {object} card - original card
 * @param {{front,back,hint_l1,hint_l2,hint_l3}} newData
 */
function replaceCardInBlock(blockContent, card, newData) {
  const lines = blockContent.split("\n");
  let cardStart = -1;
  let cardEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === `- front: ${card.front}`) {
      cardStart = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trimStart().startsWith("- front:")) { cardEnd = j; break; }
      }
      break;
    }
  }
  if (cardStart === -1) return blockContent;

  // Detect indentation from original card line
  const baseIndent = lines[cardStart].match(/^([ \t]*)/)[1];
  const fieldIndent = baseIndent + "  ";

  // Preserve emoji if present
  const emojiLine = lines.slice(cardStart, cardEnd).find(l => l.trim().startsWith("emoji:"));
  const emoji = emojiLine ? emojiLine.trim().slice(6).trim() : "";

  const newLines = [`${baseIndent}- front: ${newData.front}`, `${fieldIndent}back: ${newData.back}`];
  if (emoji) newLines.push(`${fieldIndent}emoji: ${emoji}`);
  if (newData.hint_l1) newLines.push(`${fieldIndent}hint_l1: ${newData.hint_l1}`);
  if (newData.hint_l2) newLines.push(`${fieldIndent}hint_l2: ${newData.hint_l2}`);
  if (newData.hint_l3) newLines.push(`${fieldIndent}hint_l3: ${newData.hint_l3}`);

  return [...lines.slice(0, cardStart), ...newLines, ...lines.slice(cardEnd)].join("\n");
}

/**
 * Save edits for an inline card (card.notePath is null, card lives in a code block).
 * @param {object} app - Obsidian app
 * @param {string} sourcePath - path of the note containing the review-deck block
 * @param {object} card - original card object
 * @param {{front,back,hint_l1,hint_l2,hint_l3}} newData
 */
async function saveInlineCard(app, sourcePath, card, newData) {
  const file = app.vault.getAbstractFileByPath(sourcePath);
  if (!file) return;
  let content = await app.vault.read(file);
  content = content.replace(/```review-deck\n([\s\S]*?)```/g, (match, blockContent) => {
    if (!blockContent.split("\n").some(l => l.trim() === `- front: ${card.front}`)) return match;
    return "```review-deck\n" + replaceCardInBlock(blockContent, card, newData) + "```";
  });
  await app.vault.modify(file, content);
}

module.exports = { saveTagSourceCard, saveInlineCard, replaceCardInBlock, deleteTagSourceCard, deleteDeckCards, applyFormatToCardBack, refreshTagSourceCard, findCurrentSourceCard };

/**
 * Apply a format wrap (== or **) to card.back in the source note.
 * oldBack is the pre-wrap back value; newBack is the post-wrap back value.
 * Updates card.rawBack after a successful write.
 * @param {object} app - Obsidian app
 * @param {object} card - card object (must have notePath)
 * @param {string} oldBack - previous back text
 * @param {string} newBack - new back text with wrapping applied
 */
async function applyFormatToCardBack(app, card, oldBack, newBack) {
  if (!card.notePath) return false;
  const file = app.vault.getAbstractFileByPath(card.notePath);
  if (!file) return false;

  const content = await app.vault.read(file);
  const result = replaceSourceCard(content, card, { front: card.front, back: newBack }, oldBack);
  if (!result.modified) return false;

  await app.vault.modify(file, result.content);
  if (card.rawBack !== undefined) card.rawBack = newBack;
  return true;
}

/**
 * Delete all cards belonging to a deck.
 * - AI cards (engram-review/ai-cards/): trash the whole file
 * - Hand-written cards (user source notes): remove only the matching `front :: back` lines
 * - Always cleans up SR and hints for every notePath in the deck
 * @param {object} app
 * @param {object} deck - deck object with cards[]
 */
async function deleteDeckCards(app, deck) {
  const paths = [...new Set(deck.cards.map(c => c.notePath).filter(Boolean))];

  for (const p of paths) {
    const isAiCard = p.startsWith('engram-review/ai-cards/');

    if (isAiCard) {
      // Trash the whole AI card file
      const f = app.vault.getAbstractFileByPath(p);
      if (f) await app.fileManager.trashFile(f);
    } else {
      // Remove only the matching :: lines from user source note
      const file = app.vault.getAbstractFileByPath(p);
      if (file) {
        const cardsInFile = deck.cards.filter(c => c.notePath === p);
        let content = await app.vault.read(file);
        for (const card of cardsInFile) {
          const re = new RegExp(
            `^[ \t]*${escapeRegExp(card.front)}[ \t]*::[ \t]*${escapeRegExp(card.back)}[ \t]*\n?`,
            'm'
          );
          if (re.test(content)) {
            content = content.replace(re, '');
          } else {
            const reFront = new RegExp(`^[ \t]*${escapeRegExp(card.front)}[ \t]*::.*\n?`, 'm');
            content = content.replace(reFront, '');
          }
        }
        await app.vault.modify(file, content);
      }
    }

    // Clean SR
    try {
      const srFile = app.vault.getAbstractFileByPath(`engram-review/sr/${srFileName(p)}.json`);
      if (srFile) await app.fileManager.trashFile(srFile);
    } catch (e) { console.warn('deleteDeckCards: sr cleanup failed', e); }

    // Clean hints
    try {
      const nn = p.split('/').pop().replace(/\.md$/i, '');
      const hintFile = app.vault.getAbstractFileByPath(`engram-review/hints/${nn}.json`);
      if (hintFile) await app.fileManager.trashFile(hintFile);
    } catch (e) { console.warn('deleteDeckCards: hints cleanup failed', e); }
  }
}

/**
 * Delete a single AI-generated card from its source file, SR, and hints.
 * Only operates on files under engram-review/ai-cards/ — never touches user notes.
 * @param {object} app - Obsidian app
 * @param {object} card - card to delete (must have notePath, front, back)
 */
async function deleteTagSourceCard(app, card) {
  if (!card.notePath) return;

  // 1. Remove the `front :: back` line from the ai-cards file
  const file = app.vault.getAbstractFileByPath(card.notePath);
  if (file) {
    let content = await app.vault.read(file);
    const re = new RegExp(
      `^[ \t]*${escapeRegExp(card.front)}[ \t]*::[ \t]*${escapeRegExp(card.back)}[ \t]*\n?`,
      "m"
    );
    if (re.test(content)) {
      content = content.replace(re, "");
    } else {
      // Fallback: match by front only
      const reFront = new RegExp(`^[ \t]*${escapeRegExp(card.front)}[ \t]*::.*\n?`, "m");
      content = content.replace(reFront, "");
    }
    await app.vault.modify(file, content);
  }

  // 2. Remove SR key
  try {
    const srData = await loadSrData(app.vault.adapter, card.notePath);
    if (srData[card.front]) {
      delete srData[card.front];
      await saveSrData(app.vault.adapter, card.notePath, srData);
    }
  } catch (e) {
    console.warn("review-edit: sr delete failed", e);
  }

  // 3. Remove hints key
  const noteName = card.notePath.split("/").pop().replace(/\.md$/i, "");
  const hintPath = `engram-review/hints/${noteName}.json`;
  try {
    if (await app.vault.adapter.exists(hintPath)) {
      const hints = JSON.parse(await app.vault.adapter.read(hintPath));
      if (hints.cards && hints.cards[card.front]) {
        delete hints.cards[card.front];
        await app.vault.adapter.write(hintPath, JSON.stringify(hints, null, 2));
      }
    }
  } catch (e) {
    console.warn("review-edit: hints delete failed", e);
  }
}
