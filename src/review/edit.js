"use strict";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Save edits for a tag/source-based card (card.notePath is set).
 * Updates the `front :: back` line in the markdown note and the hints JSON.
 * @param {object} app - Obsidian app
 * @param {object} card - original card object
 * @param {{front,back,hint_l1,hint_l2,hint_l3}} newData
 */
async function saveTagSourceCard(app, card, newData) {
  if (!card.notePath) return;

  // 1. Update markdown note
  const file = app.vault.getAbstractFileByPath(card.notePath);
  if (file) {
    let content = await app.vault.read(file);
    content = content.replace(
      new RegExp(`^([ \t]*)${escapeRegExp(card.front)}([ \t]*)::(.*)$`, "m"),
      `$1${newData.front}$2:: ${newData.back}`
    );
    await app.vault.modify(file, content);
  }

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

module.exports = { saveTagSourceCard, saveInlineCard, replaceCardInBlock };
