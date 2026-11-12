"use strict";
// Synapse relation graph: what the ⚡ panel shows around the card being reviewed.
// Pure functions, no Obsidian or adapter calls; src/review/synapse.js loads the inputs.
//
// A node is one thing the user has learned in EngramQuest: a card, a note, a Deep Dive page, a lesson,
// a video or a recall topic. An edge is either explicit (the plugin reads it from data that already
// exists) or inferred (the synapse skill wrote it, with a reason). Every node hangs off one parent,
// so the graph is a tree at most two steps deep.

const { MASTERED_STABILITY_THRESHOLD } = require("./synapse");

const MAX_NODES = 12; // the centre card included
const LESSONS_DIR = "engram-quest/lessons";
const VIDEOS_DIR = "engram-quest/videos";
const TOPIC_PATH = /^engram-quest\/episodic-review\/topics\/([^/]+)\/topic\.json$/;
// Files under these folders are the plugin's and the skills' own data, never a note to show.
const isDataPath = (p) => p.startsWith("engram-review/") || p.startsWith("engram-quest/");
const isNotePath = (p) => typeof p === "string" && /\.md$/i.test(p) && !isDataPath(p);
const baseName = (p) => String(p).split("/").pop().replace(/\.md$/i, "");
const cardKey = (note, front) => `${note || ""}\n${front || ""}`;

/**
 * Turn the content the plugin already reads elsewhere into lookups by `ref` (the same refs the
 * synapse skill writes in `relations[]`). Entries the user could not open are left out: a planned
 * lesson without a file, a video that was never rendered.
 *
 * raw = { courses, series, explainers, explainerState, recallTopics, topicSr }
 *   courses        [{ slug, meta }]   lessons/data.js listCourses
 *   series         [{ slug, meta }]   videos/data.js listTopics + readEpisodic
 *   explainers     [page]             explainer/data.js scanExplainers().pages
 *   explainerState { [id]: state }    explainer/data.js readState
 *   recallTopics   [topic.json]       engram-quest/episodic-review/topics/<id>/topic.json
 *   topicSr        { [topicId]: [stability, ...] }  schedule of the cards made from each topic
 */
function buildContentIndex(raw = {}) {
  const index = {
    lessons: new Map(), lessonByPath: new Map(),
    videos: new Map(), videoByCards: new Map(),
    explainers: new Map(), explainersByCard: new Map(),
    topics: new Map(), topicsByNote: new Map(),
  };

  for (const { slug, meta } of raw.courses || []) {
    for (const lesson of (meta && meta.lessons) || []) {
      if (!lesson.file) continue;
      const done = (meta.completion && meta.completion[lesson.id]) || {};
      const ref = `${slug}/${lesson.id}`;
      index.lessons.set(ref, {
        ref, title: lesson.title || lesson.id, sub: meta.title || "",
        state: done.viewed || done.completed ? "seen" : "unseen",
        slug, lessonId: lesson.id,
      });
      index.lessonByPath.set(`${LESSONS_DIR}/${slug}/${lesson.file}`, ref);
    }
  }

  for (const { slug, meta } of raw.series || []) {
    for (const video of (meta && meta.videos) || []) {
      if (!video.file) continue;
      const progress = (meta.progress && meta.progress[video.id]) || {};
      const position = Number(progress.position) > 0 ? Number(progress.position) : 0;
      const ref = `${slug}/${video.id}`;
      index.videos.set(ref, {
        ref, title: video.title || video.id, sub: meta.title || "",
        state: progress.completed || position > 0 ? "seen" : "unseen",
        path: `${VIDEOS_DIR}/${slug}/${video.file}`, position: progress.completed ? 0 : position,
      });
      if (typeof video.cards === "string" && video.cards) index.videoByCards.set(video.cards, ref);
    }
  }

  const readState = raw.explainerState || {};
  for (const page of raw.explainers || []) {
    if (!page || !page.id) continue;
    const s = readState[page.id] || {};
    index.explainers.set(page.id, { ref: page.id, title: page.title || page.id, sub: "", state: s.viewed || s.completed ? "seen" : "unseen", page });
    const src = page.sourceCard;
    if (src && src.front) {
      const key = cardKey(src.note, src.front);
      index.explainersByCard.set(key, [...(index.explainersByCard.get(key) || []), page.id]);
    }
  }

  for (const topic of raw.recallTopics || []) {
    if (!topic || !topic.id) continue;
    const notes = (Array.isArray(topic.notes) ? topic.notes : []).filter(isNotePath);
    const stabilities = (raw.topicSr && raw.topicSr[topic.id]) || [];
    const cards = Array.isArray(topic.cards) && topic.cards.length ? topic.cards.length : stabilities.length;
    const mastered = stabilities.filter((s) => s >= MASTERED_STABILITY_THRESHOLD).length;
    index.topics.set(topic.id, {
      ref: topic.id, title: topic.title || topic.id, sub: "", notes,
      state: !stabilities.length ? "unseen" : mastered >= cards ? "mastered" : "learning",
    });
    for (const note of notes) index.topicsByNote.set(note, [...(index.topicsByNote.get(note) || []), topic.id]);
  }
  return index;
}

/** A card the user knows cold, a page read, a video watched, a lesson opened. Notes carry no state and always count. */
function isLearned(node) {
  if (node.type === "note") return true;
  if (node.type === "card" || node.type === "topic") return node.state === "mastered";
  return node.state === "seen";
}

const squash = (s) => String(s || "").toLowerCase().replace(/[\s*_`~=#>[\](){}（）「」『』，。、：；！？,.:;!?"'|\\/-]/g, "");

/** True when `text` spells out the card's answer, so it must not be shown before the answer is. */
function leaksAnswer(text, answer) {
  const a = squash(answer);
  return a.length >= 2 && squash(text).includes(a);
}

function resolve(index, noteExists, type, ref) {
  if (type === "note") return isNotePath(ref) && noteExists(ref) ? { ref, title: baseName(ref), sub: "", state: null } : null;
  const found = { lesson: index.lessons, video: index.videos, explainer: index.explainers, topic: index.topics }[type];
  return (found && found.get(ref)) || null;
}

/**
 * The graph around one card.
 *
 *   card           the session card: front, back, notePath, synapseAnchors, synapseRelations, synapseRejected
 *   sourcePaths    where the card came from (hints `note` / per-card `source`, else the note that holds it)
 *   index          buildContentIndex() result
 *   resolvedLinks  app.metadataCache.resolvedLinks ({ [notePath]: { [linkedPath]: count } })
 *   noteExists     (path) => boolean
 *   revealed       false while the answer is hidden: only learned nodes, and no text that contains the answer
 *
 * Returns { branches, count, more }. A branch is a node next to the centre with its own `children`;
 * `more` is how many further nodes the revealed graph holds (0 once revealed).
 *
 * node = { id, type, ref, title, sub, state, depth, inferred, score, reason | rel, entry | anchor, children }
 *   reason  the skill's sentence (inferred edges)       rel  which explicit link it is (the panel words it)
 */
function buildSynapseGraph({ card, sourcePaths = [], index, resolvedLinks = {}, noteExists = () => false, revealed = false, max = MAX_NODES }) {
  if (!card) return { branches: [], count: 0, more: 0 };
  const idx = index || buildContentIndex();
  const rejected = new Set(card.synapseRejected || []);
  const all = new Map();
  const add = (parent, type, ref, fields) => {
    const id = `${type}|${ref}`;
    if (all.has(id) || rejected.has(id)) return null;
    const node = { id, type, ref, depth: parent ? 2 : 1, parent: parent ? parent.id : null, inferred: false, score: 0, order: all.size, ...fields };
    all.set(id, node);
    return node;
  };
  const addContent = (parent, type, ref, edge) => {
    const entry = resolve(idx, noteExists, type, ref);
    return entry ? add(parent, type, ref, { title: entry.title, sub: entry.sub, state: entry.state, entry, ...edge }) : null;
  };

  // Explicit links from the card itself.
  for (const path of sourcePaths) {
    if (typeof path !== "string" || !path) continue;
    const topic = path.match(TOPIC_PATH);
    if (idx.lessonByPath.has(path)) addContent(null, "lesson", idx.lessonByPath.get(path), { rel: "from-lesson" });
    else if (topic) addContent(null, "topic", topic[1], { rel: "from-topic" });
    else addContent(null, "note", path, { rel: "source-note" });
  }
  for (const id of idx.explainersByCard.get(cardKey(card.notePath, card.front)) || []) addContent(null, "explainer", id, { rel: "explainer" });
  if (card.notePath && idx.videoByCards.has(card.notePath)) addContent(null, "video", idx.videoByCards.get(card.notePath), { rel: "video-cards" });

  // Inferred links the synapse skill wrote: mastered cards, then everything else.
  for (const anchor of card.synapseAnchors || []) {
    if (!anchor || !anchor.front) continue;
    if (anchor.front === card.front && (!anchor.notePath || anchor.notePath === card.notePath)) continue;
    const learning = typeof anchor.stability === "number" && anchor.stability < MASTERED_STABILITY_THRESHOLD;
    add(null, "card", `${anchor.notePath || ""}|${anchor.front}`, {
      title: anchor.front, sub: "", state: learning ? "learning" : "mastered",
      inferred: true, score: Number(anchor.score) || 0, reason: anchor.reason || "", anchor,
    });
  }
  for (const r of card.synapseRelations || []) {
    addContent(null, r.type, r.ref, { inferred: true, score: Number(r.score) || 0, reason: r.reason || "" });
  }

  // One more step out, along links that already exist: a note's own links and the recall topics that cite it.
  for (const node of [...all.values()]) {
    if (node.type === "note") {
      for (const linked of Object.keys(resolvedLinks[node.ref] || {})) addContent(node, "note", linked, { rel: "note-link" });
      for (const id of idx.topicsByNote.get(node.ref) || []) addContent(node, "topic", id, { rel: "topic-cites" });
    } else if (node.type === "topic") {
      for (const note of node.entry.notes) addContent(node, "note", note, { rel: "topic-note" });
    }
  }

  // Closest first; then explicit links, the skill's higher scores, and what the user already learned.
  const ranked = [...all.values()].sort((a, b) =>
    a.depth - b.depth || a.inferred - b.inferred || b.score - a.score || isLearned(b) - isLearned(a) || a.order - b.order);
  const pick = (allowed) => {
    const kept = new Map();
    for (const node of ranked) {
      if (kept.size >= max - 1) break;
      if (!allowed(node) || (node.parent && !kept.has(node.parent))) continue;
      kept.set(node.id, node);
    }
    return kept;
  };
  const full = pick(() => true);
  const safe = (node) => isLearned(node) && ![node.title, node.sub, node.reason].some((text) => leaksAnswer(text, card.back));
  const shown = revealed ? full : pick(safe);

  const branches = [];
  const byId = new Map();
  for (const node of shown.values()) {
    const out = { ...node, children: [] };
    delete out.order;
    byId.set(out.id, out);
    if (out.parent) byId.get(out.parent).children.push(out);
    else branches.push(out);
  }
  return { branches, count: shown.size, more: [...full.keys()].filter((id) => !shown.has(id)).length };
}

module.exports = { MAX_NODES, buildContentIndex, buildSynapseGraph, isLearned, leaksAnswer };
