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
      else if (trimmed.startsWith("region_left_pct:")) challenge.region_left_pct = parseFloat(trimmed.slice(16).trim());
      else if (trimmed.startsWith("region_top_pct:")) challenge.region_top_pct = parseFloat(trimmed.slice(15).trim());
      else if (trimmed.startsWith("region_width_pct:")) challenge.region_width_pct = parseFloat(trimmed.slice(17).trim());
      else if (trimmed.startsWith("region_height_pct:")) challenge.region_height_pct = parseFloat(trimmed.slice(18).trim());
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

      let challengeKeys = ["type:", "question:", "statement:", "sentence:", "prompt:", "hint:", "link:", "image:", "mode:", "options:", "items:", "keywords:", "answers:", "answer:", "reveal_answer:", "region_x:", "region_y:", "region_width:", "region_height:", "region_left_pct:", "region_top_pct:", "region_width_pct:", "region_height_pct:", "pairs:", "- ["];
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
    }
  }

  if (point && node) node.points.push(point);
  if (node) quest.nodes.push(node);
  return quest;
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

function openQuestLink(app, path) {
  if (!path) return;
  if (app.vault.getAbstractFileByPath(path)) {
    app.workspace.openLinkText(path, "", false);
    return;
  }
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

function getQuestImageResource(app, path) {
  return !path || !app.vault.getAbstractFileByPath(path) ? null : app.vault.adapter.getResourcePath(path);
}

function getQuestTheme(themeName, nodeIndex, themes) {
  let theme = themes[themeName] || themes.ocean;
  return theme.colors[nodeIndex % theme.colors.length];
}

function getQuestNodePositions(nodeCount) {
  if (nodeCount === 0) return [];
  if (nodeCount === 1) return [{ cx: 550, cy: 260 }];
  let pattern = [225, 325, 165, 315, 215, 335, 175, 305];
  let spacing = Math.min(220, Math.floor(950 / (nodeCount - 1)));
  return Array.from({ length: nodeCount }, (_, index) => ({
    cx: 120 + index * spacing,
    cy: pattern[index % pattern.length]
  }));
}

module.exports = {
  questDifficultyPresets,
  splitInlineList,
  parseQuestMap,
  retriggerShake,
  normalizeAnswer,
  collectExpectedAnswers,
  matchesExpectedAnswer,
  openQuestLink,
  renderClozeSentence,
  getQuestImageResource,
  getQuestTheme,
  getQuestNodePositions
};
