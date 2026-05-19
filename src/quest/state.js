"use strict";

function questStateFileName(questPath) {
  return String(questPath || "quest")
    .replace(/\//g, "__")
    .replace(/\.md$/i, "") + ".json";
}

function questStatePath(questPath) {
  return `engram-quest/state/${questStateFileName(questPath)}`;
}

function emptyQuestState(questPath) {
  return {
    questPath: questPath || "",
    nodes: {},
    bestRun: null,
    lastPlayed: null,
  };
}

function normalizeState(questPath, state) {
  let normalized = state && typeof state === "object" ? state : {};
  return {
    questPath: normalized.questPath || questPath || "",
    nodes: normalized.nodes && typeof normalized.nodes === "object" ? normalized.nodes : {},
    bestRun: normalized.bestRun || null,
    lastPlayed: normalized.lastPlayed || null,
  };
}

async function loadQuestState(adapter, questPath) {
  const path = questStatePath(questPath);
  if (!adapter || !(await adapter.exists(path))) return emptyQuestState(questPath);
  try {
    return normalizeState(questPath, JSON.parse(await adapter.read(path)));
  } catch {
    return emptyQuestState(questPath);
  }
}

async function saveQuestState(adapter, questPath, state) {
  const path = questStatePath(questPath);
  await adapter.mkdir("engram-quest/state").catch(() => {});
  await adapter.write(path, JSON.stringify(normalizeState(questPath, state), null, 2));
}

function migrateQuestCompletion(state, nodes) {
  const next = normalizeState(state?.questPath, state);
  for (const node of nodes || []) {
    if (!node?.id || !node.completed || next.nodes[node.id]) continue;
    next.nodes[node.id] = {
      completed: true,
      scorePct: 100,
      attempts: 0,
      lastPlayed: null,
      migratedFromYaml: true,
    };
  }
  return next;
}

function clampScorePct(scorePct) {
  const score = Number(scorePct);
  if (!Number.isFinite(score)) return 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function markQuestNodeComplete(state, nodeId, options = {}) {
  const next = normalizeState(state?.questPath, state);
  if (!nodeId) return next;
  const now = options.now || new Date().toISOString();
  const prev = next.nodes[nodeId] || {};
  const scorePct = clampScorePct(options.scorePct);
  next.nodes[nodeId] = {
    ...prev,
    completed: true,
    scorePct,
    attempts: (prev.attempts || 0) + 1,
    lastPlayed: now,
  };
  next.lastPlayed = now;
  return next;
}

function updateQuestBestRun(state, nodes, options = {}) {
  const next = normalizeState(state?.questPath, state);
  if (!nodes?.length) return next;
  const scores = [];
  for (const node of nodes) {
    const nodeState = node?.id ? next.nodes[node.id] : null;
    if (!nodeState?.completed) return next;
    scores.push(clampScorePct(nodeState.scorePct));
  }
  const scorePct = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const now = options.now || next.lastPlayed || new Date().toISOString();
  if (!next.bestRun || scorePct > (next.bestRun.scorePct || 0)) {
    next.bestRun = { scorePct, completedAt: now };
  }
  return next;
}

function buildQuestRenderState(nodes, state) {
  const normalized = normalizeState(state?.questPath, state);
  const visitedSet = new Set();
  let completedCount = 0;
  (nodes || []).forEach((node, index) => {
    if (node?.id && normalized.nodes[node.id]?.completed) {
      visitedSet.add(index);
      completedCount++;
    }
  });
  const firstOpen = (nodes || []).findIndex((node) => !node?.id || !normalized.nodes[node.id]?.completed);
  const activeIndex = firstOpen === -1 ? Math.max(0, (nodes || []).length - 1) : firstOpen;
  const progressPct = nodes?.length ? Math.round((completedCount / nodes.length) * 100) : 0;
  return {
    visitedSet,
    activeIndex,
    completedCount,
    progressPct,
    bestScorePct: normalized.bestRun?.scorePct ?? null,
    state: normalized,
  };
}

module.exports = {
  buildQuestRenderState,
  loadQuestState,
  markQuestNodeComplete,
  migrateQuestCompletion,
  questStateFileName,
  questStatePath,
  saveQuestState,
  updateQuestBestRun,
};
