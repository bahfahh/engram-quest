"use strict";

const questDifficultyPresets = {
  easy: { showHint: true, maxRetries: 99, labelKey: "DIFF_EASY", color: "#22c55e" },
  medium: { showHint: false, maxRetries: 99, labelKey: "DIFF_MEDIUM", color: "#3b82f6" },
  hard: { showHint: false, maxRetries: 3, labelKey: "DIFF_HARD", color: "#ef4444" }
};

function splitInlineList(text) {
  let match = text.match(/\[([^\]]*)\]/);
  return match ? match[1].split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function parseNumericField(text, prefix) {
  let value = parseFloat(text.slice(prefix.length).trim());
  return Number.isFinite(value) ? value : null;
}

function hasFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseQuestMap(markdown) {
  let fenced = String(markdown ?? "").match(/```quest-map\s*([\s\S]*?)```/i);
  if (fenced?.[1]) markdown = fenced[1];
  let quest = { version: 1, style: "ocean", difficulty: "medium", nodes: [] };
  let node = null;
  let point = null;
  let inNodes = false;
  let inPoints = false;
  let inChallenge = false;

  for (let line of markdown.split("\n")) {
    let trimmed = line.trim();
    if (!trimmed) continue;
    let indent = line.length - line.trimStart().length;

    if (!inNodes) {
      if (trimmed.startsWith("version:")) quest.version = parseInt(trimmed.split(":")[1]) || 1;
      else if (trimmed.startsWith("style:")) quest.style = trimmed.slice(6).trim();
      else if (trimmed.startsWith("difficulty:")) quest.difficulty = trimmed.slice(11).trim();
      else if (trimmed === "nodes:") inNodes = true;
      continue;
    }

    if (trimmed.startsWith("- id:") && indent <= 2) {
      if (point) {
        node.points.push(point);
        point = null;
      }
      if (node) quest.nodes.push(node);
      inPoints = false;
      inChallenge = false;
      node = { id: trimmed.slice(5).trim(), emoji: "📝", points: [], boss: false };
      continue;
    }

    if (!node) continue;

    if (trimmed === "points:") {
      inPoints = true;
      inChallenge = false;
      continue;
    }

    if (trimmed === "challenge:") {
      inChallenge = true;
      inPoints = false;
      node.challenge = {};
      continue;
    }

    if (inPoints) {
      if (trimmed.startsWith("- title:") && indent >= 4) {
        if (point) node.points.push(point);
        point = { title: trimmed.slice(8).trim(), body: "" };
        continue;
      }
      if (point && trimmed.startsWith("body:")) {
        point.body = trimmed.slice(5).trim();
        continue;
      }
      if (indent < 4 && !trimmed.startsWith("-") && !trimmed.startsWith("body:")) {
        inPoints = false;
      }
    }

    if (inChallenge && node.challenge) {
      let challenge = node.challenge;
      if (trimmed.startsWith("type:")) challenge.type = trimmed.slice(5).trim();
      else if (trimmed.startsWith("question:")) challenge.question = trimmed.slice(9).trim();
      else if (trimmed.startsWith("statement:")) challenge.statement = trimmed.slice(10).trim();
      else if (trimmed.startsWith("sentence:")) challenge.sentence = trimmed.slice(9).trim();
      else if (trimmed.startsWith("prompt:")) challenge.prompt = trimmed.slice(7).trim();
      else if (trimmed.startsWith("hint:")) challenge.hint = trimmed.slice(5).trim();
      else if (trimmed.startsWith("link:")) challenge.link = trimmed.slice(5).trim();
      else if (trimmed.startsWith("image:")) challenge.image = trimmed.slice(6).trim();
      else if (trimmed.startsWith("mode:")) challenge.mode = trimmed.slice(5).trim();
      else if (trimmed.startsWith("options:")) challenge.options = splitInlineList(trimmed);
      else if (trimmed.startsWith("items:")) challenge.items = splitInlineList(trimmed);
      else if (trimmed.startsWith("keywords:")) challenge.keywords = splitInlineList(trimmed);
      else if (trimmed.startsWith("answers:")) challenge.answers = splitInlineList(trimmed);
      else if (trimmed.startsWith("reveal_answer:")) challenge.reveal_answer = trimmed.slice(14).trim() === "true";
      else if (trimmed.startsWith("region_x:")) challenge.region_x = parseNumericField(trimmed, "region_x:");
      else if (trimmed.startsWith("region_y:")) challenge.region_y = parseNumericField(trimmed, "region_y:");
      else if (trimmed.startsWith("region_width:")) challenge.region_width = parseNumericField(trimmed, "region_width:");
      else if (trimmed.startsWith("region_height:")) challenge.region_height = parseNumericField(trimmed, "region_height:");
      else if (trimmed.startsWith("region_left_pct:")) challenge.region_left_pct = parseNumericField(trimmed, "region_left_pct:");
      else if (trimmed.startsWith("region_top_pct:")) challenge.region_top_pct = parseNumericField(trimmed, "region_top_pct:");
      else if (trimmed.startsWith("region_width_pct:")) challenge.region_width_pct = parseNumericField(trimmed, "region_width_pct:");
      else if (trimmed.startsWith("region_height_pct:")) challenge.region_height_pct = parseNumericField(trimmed, "region_height_pct:");
      else if (trimmed.startsWith("timer:")) challenge.timer = parseNumericField(trimmed, "timer:");
      else if (trimmed.startsWith("coins:")) challenge.coins = parseNumericField(trimmed, "coins:");
      else if (trimmed.startsWith("snapshot_time:")) challenge.snapshot_time = parseNumericField(trimmed, "snapshot_time:");
      else if (trimmed.startsWith("snapshot_items:")) challenge.snapshot_items = splitInlineList(trimmed);
      else if (trimmed.startsWith("snapshot_labels:")) challenge.snapshot_labels = splitInlineList(trimmed);
      else if (trimmed.startsWith("slots:")) challenge.slots = splitInlineList(trimmed);
      else if (trimmed.startsWith("events:")) challenge.events = splitInlineList(trimmed);
      else if (trimmed.startsWith("chain_items:")) challenge.chain_items = splitInlineList(trimmed);
      else if (trimmed.startsWith("palace_items:")) challenge.palace_items = splitInlineList(trimmed);
      else if (trimmed.startsWith("palace_descs:")) challenge.palace_descs = splitInlineList(trimmed);
      else if (trimmed.startsWith("palace_time:")) challenge.palace_time = parseNumericField(trimmed, "palace_time:");
      else if (trimmed.startsWith("questions_json:")) {
        let raw = trimmed.slice(15).trim();
        try { challenge.questions_json = JSON.parse(raw); } catch (_) { challenge.questions_json = []; }
      }
      else if (trimmed.startsWith("answer:")) {
        let answer = trimmed.slice(7).trim();
        if (answer === "true") challenge.answer = true;
        else if (answer === "false") challenge.answer = false;
        else if (answer.startsWith("[")) challenge.answer = splitInlineList(answer).map(Number);
        else if (/^-?\d+$/.test(answer)) challenge.answer = parseInt(answer, 10);
        else challenge.answer = answer;
      } else if (trimmed === "pairs:") {
        challenge.pairs = [];
      } else if (trimmed.startsWith("- [") && Array.isArray(challenge.pairs)) {
        let match = trimmed.match(/\[([^\]]+)\]/);
        if (match) challenge.pairs.push(match[1].split(",").map((item) => item.trim()));
      }

      let challengeKeys = ["type:", "question:", "statement:", "sentence:", "prompt:", "hint:", "link:", "image:", "mode:", "options:", "items:", "keywords:", "answers:", "answer:", "reveal_answer:", "region_x:", "region_y:", "region_width:", "region_height:", "region_left_pct:", "region_top_pct:", "region_width_pct:", "region_height_pct:", "pairs:", "- [", "timer:", "coins:", "snapshot_time:", "snapshot_items:", "snapshot_labels:", "slots:", "events:", "chain_items:", "palace_items:", "palace_descs:", "palace_time:", "questions_json:"];
      if (indent <= 4 && !challengeKeys.some((prefix) => trimmed.startsWith(prefix))) {
        inChallenge = false;
      }
    }

    if (!inPoints && !inChallenge) {
      if (trimmed.startsWith("title:")) node.title = trimmed.slice(6).trim();
      else if (trimmed.startsWith("emoji:")) node.emoji = trimmed.slice(6).trim();
      else if (trimmed.startsWith("icon:")) node.icon = trimmed.slice(5).trim();
      else if (trimmed.startsWith("summary:")) node.summary = trimmed.slice(8).trim();
      else if (trimmed.startsWith("insight:")) node.insight = trimmed.slice(8).trim();
      else if (trimmed.startsWith("boss:")) node.boss = trimmed.includes("true");
      else if (trimmed.startsWith("completed:")) node.completed = trimmed.includes("true");
    }
  }

  if (point && node) node.points.push(point);
  if (node) quest.nodes.push(node);
  return quest;
}

function resolveImageOcclusionRect(challenge, naturalWidth, naturalHeight) {
  if (!challenge) return null;
  if (!hasFiniteNumber(naturalWidth) || !hasFiniteNumber(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  let usePixelRect = ["region_x", "region_y", "region_width", "region_height"].every((key) => hasFiniteNumber(challenge[key]));
  let usePercentRect = ["region_left_pct", "region_top_pct", "region_width_pct", "region_height_pct"].every((key) => hasFiniteNumber(challenge[key]));
  let leftPx;
  let topPx;
  let widthPx;
  let heightPx;
  let source;

  if (usePixelRect) {
    leftPx = challenge.region_x;
    topPx = challenge.region_y;
    widthPx = challenge.region_width;
    heightPx = challenge.region_height;
    source = "pixel";
  } else if (usePercentRect) {
    leftPx = challenge.region_left_pct / 100 * naturalWidth;
    topPx = challenge.region_top_pct / 100 * naturalHeight;
    widthPx = challenge.region_width_pct / 100 * naturalWidth;
    heightPx = challenge.region_height_pct / 100 * naturalHeight;
    source = "percent";
  } else {
    return null;
  }

  if (!hasFiniteNumber(leftPx) || !hasFiniteNumber(topPx) || !hasFiniteNumber(widthPx) || !hasFiniteNumber(heightPx)) {
    return null;
  }

  let rightPx = leftPx + widthPx;
  let bottomPx = topPx + heightPx;
  let clampedLeft = clampNumber(leftPx, 0, naturalWidth);
  let clampedTop = clampNumber(topPx, 0, naturalHeight);
  let clampedRight = clampNumber(rightPx, 0, naturalWidth);
  let clampedBottom = clampNumber(bottomPx, 0, naturalHeight);
  let clampedWidth = clampedRight - clampedLeft;
  let clampedHeight = clampedBottom - clampedTop;

  if (!(clampedWidth > 0) || !(clampedHeight > 0)) {
    return null;
  }

  return {
    source,
    wasClamped: clampedLeft !== leftPx || clampedTop !== topPx || clampedRight !== rightPx || clampedBottom !== bottomPx,
    leftPx: clampedLeft,
    topPx: clampedTop,
    widthPx: clampedWidth,
    heightPx: clampedHeight,
    leftPct: clampedLeft / naturalWidth * 100,
    topPct: clampedTop / naturalHeight * 100,
    widthPct: clampedWidth / naturalWidth * 100,
    heightPct: clampedHeight / naturalHeight * 100,
  };
}

function retriggerShake(element) {
  element.classList.remove("qm-shake");
  element.offsetWidth;
  element.classList.add("qm-shake");
  element.addEventListener("animationend", () => element.classList.remove("qm-shake"), { once: true });
}

function normalizeAnswer(value) {
  return String(value != null ? value : "").trim().toLowerCase().replace(/\s+/g, " ");
}

function collectExpectedAnswers(challenge) {
  let answers = [];
  if (Array.isArray(challenge.answers)) answers.push(...challenge.answers);
  if (typeof challenge.answer === "string" && challenge.answer.trim()) answers.push(challenge.answer.trim());
  if (typeof challenge.sentence === "string") {
    (challenge.sentence.match(/\{\{c\d+::(.*?)\}\}/g) || []).forEach((cloze) => {
      let extracted = cloze.replace(/^\{\{c\d+::/, "").replace(/\}\}$/, "").trim();
      if (extracted) answers.push(extracted);
    });
  }
  return Array.from(new Set(answers.map((item) => String(item).trim()).filter(Boolean)));
}

function matchesExpectedAnswer(input, expectedAnswers) {
  let normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) return false;
  return expectedAnswers.some((expected) => {
    let normalizedExpected = normalizeAnswer(expected);
    return normalizedInput === normalizedExpected || normalizedInput.includes(normalizedExpected) || normalizedExpected.includes(normalizedInput);
  });
}

function resolveQuestPath(app, path, sourcePath) {
  let targetPath = String(path ?? "").trim();
  if (!targetPath) return null;

  let exactMatch = app.vault.getAbstractFileByPath(targetPath);
  if (exactMatch) return exactMatch;

  if (sourcePath && app.metadataCache && typeof app.metadataCache.getFirstLinkpathDest === "function") {
    return app.metadataCache.getFirstLinkpathDest(targetPath, sourcePath) || null;
  }

  return null;
}

function openQuestLink(app, path, sourcePath) {
  let resolved = resolveQuestPath(app, path, sourcePath);
  if (resolved?.path) {
    app.workspace.openLinkText(resolved.path, sourcePath || "", false);
    return;
  }
  if (!path) return;
  window.open("obsidian://open?file=" + encodeURIComponent(path));
}

function renderClozeSentence(sentence, revealAnswer) {
  if (!sentence) return "";
  return sentence.replace(/\{\{c\d+::(.*?)\}\}/g, (_, answer) => (
    revealAnswer
      ? `<span style="display:inline-block;padding:0 8px;border-radius:8px;background:#dcfce7;color:#166534;font-weight:700">${answer}</span>`
      : '<span style="display:inline-block;min-width:72px;padding:0 8px;border-bottom:2px solid var(--interactive-accent);color:var(--text-faint);font-weight:700;text-align:center">____</span>'
  ));
}

function getQuestImageResource(app, path, sourcePath) {
  let resolved = resolveQuestPath(app, path, sourcePath);
  return resolved?.path ? app.vault.adapter.getResourcePath(resolved.path) : null;
}

function getQuestTheme(themeName, nodeIndex, themes) {
  let theme = themes[themeName] || themes.ocean;
  return theme.colors[nodeIndex % theme.colors.length];
}

function getQuestNodePositions(nodeCount) {
  if (nodeCount === 0) return [];
  if (nodeCount === 1) return [{ cx: 550, cy: 300 }];
  // Wider spacing + more vertical variation for a natural winding path
  let pattern = [260, 400, 180, 380, 240, 420, 160, 360];
  let spacing = Math.max(260, Math.floor(1100 / Math.max(nodeCount - 1, 1)));
  return Array.from({ length: nodeCount }, (_, index) => ({
    cx: 160 + index * spacing,
    cy: pattern[index % pattern.length]
  }));
}

module.exports = {
  questDifficultyPresets,
  splitInlineList,
  parseQuestMap,
  resolveImageOcclusionRect,
  retriggerShake,
  normalizeAnswer,
  collectExpectedAnswers,
  matchesExpectedAnswer,
  resolveQuestPath,
  openQuestLink,
  renderClozeSentence,
  getQuestImageResource,
  getQuestTheme,
  getQuestNodePositions
};
