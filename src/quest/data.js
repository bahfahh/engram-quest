"use strict";

const { buildQuestRenderState } = require("./state");

const QUESTS_DIR = "engram-quest/quests";

async function readJson(adapter, path) {
  try {
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function normalizeDifficulty(value) {
  return ["easy", "medium", "hard"].includes(value) ? value : "medium";
}

function normalizeQuestNode(slug, node, index) {
  if (!node || typeof node !== "object") return null;
  const id = String(node.id || `node-${index + 1}`).trim();
  if (!id) return null;
  const file = node.file ? String(node.file) : null;
  const html = node.html ? resolveQuestPackageHtmlPath(slug, node.html) : file ? `${QUESTS_DIR}/${slug}/${file}` : "";
  const type = String(node.type || (node.boss ? "boss" : html ? "mission" : "briefing")).trim();
  const normalized = {
    id,
    title: String(node.title || id),
    type,
    emoji: String(node.emoji || node.icon || (type === "boss" ? "B" : String(index + 1))),
    icon: node.icon ? String(node.icon) : "",
    summary: String(node.summary || ""),
    scenario: String(node.scenario || ""),
    mission_goal: String(node.mission_goal || node.missionGoal || ""),
    stakes: String(node.stakes || ""),
    insight: String(node.insight || ""),
    boss: type === "boss" || node.boss === true,
    html,
    file,
    height: isFiniteNumber(node.height) ? Math.max(220, Math.min(1200, Math.round(Number(node.height)))) : null,
    points: safeArray(node.points).filter(Boolean),
    challenge: node.challenge && typeof node.challenge === "object" ? node.challenge : null,
  };
  if (isFiniteNumber(node.x)) normalized.x = Math.max(0, Math.min(100, Number(node.x)));
  if (isFiniteNumber(node.y)) normalized.y = Math.max(0, Math.min(100, Number(node.y)));
  return normalized;
}

function resolveQuestPackageHtmlPath(slug, htmlPath) {
  const path = String(htmlPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!path) return "";
  if (path.startsWith(`${QUESTS_DIR}/`)) return path;
  if (path.startsWith("engram-quest/")) return path;
  return `${QUESTS_DIR}/${slug}/${path}`;
}

function normalizeQuestMeta(slug, meta) {
  if (!meta || typeof meta !== "object") return null;
  const nodes = safeArray(meta.nodes)
    .map((node, index) => normalizeQuestNode(slug, node, index))
    .filter(Boolean);
  return {
    version: Number(meta.version) || 2,
    title: String(meta.title || slug),
    description: String(meta.description || ""),
    topic: String(meta.topic || meta.title || slug),
    icon: String(meta.icon || "Q"),
    difficulty: normalizeDifficulty(String(meta.difficulty || "medium")),
    style: String(meta.style || "mission"),
    tags: safeArray(meta.tags).map(String),
    createdAt: meta.createdAt || null,
    updatedAt: meta.updatedAt || null,
    layout: meta.layout && typeof meta.layout === "object" ? meta.layout : {},
    nodes,
  };
}

async function listQuestPackages(adapter) {
  let listing = null;
  try {
    listing = await adapter.list(QUESTS_DIR);
  } catch {
    listing = null;
  }
  if (!listing || !Array.isArray(listing.folders)) return [];

  const loaded = await Promise.all(listing.folders.map(async (folderPath) => {
    const slug = String(folderPath).split("/").pop();
    if (!slug) return null;
    const stateKey = questPackageStateKey(slug);
    const meta = normalizeQuestMeta(slug, await readJson(adapter, stateKey));
    return meta ? { slug, path: `${QUESTS_DIR}/${slug}`, stateKey, meta } : null;
  }));
  const quests = loaded.filter(Boolean);
  quests.sort((a, b) => String(b.meta.createdAt || "").localeCompare(String(a.meta.createdAt || "")));
  return quests;
}

async function loadQuestPackage(adapter, slug) {
  return normalizeQuestMeta(slug, await readJson(adapter, questPackageStateKey(slug)));
}

function questPackageStateKey(slug) {
  return `${QUESTS_DIR}/${slug}/meta.json`;
}

function questPackageToHubItem(entry, state) {
  const meta = entry.meta;
  const nodes = meta.nodes;
  const renderState = buildQuestRenderState(nodes, state);
  const completed = Boolean(nodes.length && renderState.completedCount >= nodes.length);
  const bossIndex = nodes.findIndex((node) => node && node.boss);
  const bossNode = bossIndex >= 0 ? nodes[bossIndex] : nodes[nodes.length - 1] || null;
  const nextNode = nodes.length ? nodes[renderState.activeIndex] || null : null;
  const missionNodes = nodes.filter((node) => node && (node.html || node.challenge));
  const missionTypes = [...new Set(missionNodes.map((node) => node.type || node.challenge?.type || "mission").filter(Boolean))];
  return {
    sourceType: "package",
    slug: entry.slug,
    stateKey: entry.stateKey,
    sourcePath: entry.stateKey,
    title: meta.title,
    description: meta.description,
    difficulty: meta.difficulty,
    tags: meta.tags,
    style: meta.style,
    icon: meta.icon,
    layout: meta.layout,
    ctime: meta.createdAt ? Date.parse(meta.createdAt) || 0 : 0,
    completed,
    nodes,
    nodeCount: nodes.length,
    missionCount: missionNodes.length,
    completedCount: renderState.completedCount,
    progressPct: renderState.progressPct,
    bestScorePct: renderState.bestScorePct,
    bossReady: Boolean(bossIndex >= 0 && renderState.activeIndex >= bossIndex && !completed),
    bossTitle: bossNode && bossNode.title ? bossNode.title : "Boss Battle",
    activeTitle: nextNode && nextNode.title ? nextNode.title : "",
    scenario: firstText(nodes, ["scenario", "mission_goal", "stakes", "summary"]) || meta.description,
    missionGoal: firstText(nodes, ["mission_goal", "scenario", "summary"]),
    stakes: firstText(nodes, ["stakes"]),
    missionTypes,
  };
}

function firstText(nodes, keys) {
  for (const node of nodes || []) {
    for (const key of keys) {
      const value = node && node[key];
      if (value && String(value).trim()) return String(value).trim();
    }
  }
  return "";
}

module.exports = {
  QUESTS_DIR,
  listQuestPackages,
  loadQuestPackage,
  normalizeQuestMeta,
  normalizeQuestNode,
  questPackageStateKey,
  questPackageToHubItem,
  resolveQuestPackageHtmlPath,
};
