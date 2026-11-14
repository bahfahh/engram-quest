"use strict";
// Synapse relation graph: what the ⚡ panel shows around the card being reviewed.
// Pure functions, no Obsidian or adapter calls; src/review/synapse.js loads the inputs.
//
// A node is one thing the user has learned in EngramQuest: a card, a note, a Deep Dive page, a lesson,
// a video or a recall topic. An edge is either explicit (the plugin reads it from data that already
// exists) or inferred (the synapse skill wrote it, with a reason). Every node hangs off one parent,
// so the graph is a tree at most two steps deep.

const { MASTERED_STABILITY_THRESHOLD } = require("./synapse");
const { leaksAnswer } = require("./answer-leak");
const { lessonTitle } = require("../lessons/data");

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
      const ref = `${slug}/${lesson.id}`;
      index.lessons.set(ref, {
        ref, title: lessonTitle(lesson) || lesson.id, sub: meta.title || "",
        state: progressState(meta.completion && meta.completion[lesson.id]),
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
        state: progressState({ viewed: position > 0, completed: progress.completed }),
        path: `${VIDEOS_DIR}/${slug}/${video.file}`, position: progress.completed ? 0 : position,
      });
      if (typeof video.cards === "string" && video.cards) index.videoByCards.set(video.cards, ref);
    }
  }

  const readState = raw.explainerState || {};
  for (const page of raw.explainers || []) {
    if (!page || !page.id) continue;
    index.explainers.set(page.id, { ref: page.id, title: page.title || page.id, sub: "", state: progressState(readState[page.id]), page });
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

/**
 * How far the user got with a lesson, a video or a Deep Dive page, in the Hub's own terms:
 * "done" finished, "seen" opened or partly watched, "unseen" never opened.
 */
function progressState(progress) {
  if (progress && progress.completed) return "done";
  return progress && progress.viewed ? "seen" : "unseen";
}

/**
 * What the user has evidence of knowing: a card or recall topic known cold, a lesson, video or page
 * at least opened, and a note the card itself points at. A note only reached through another node
 * carries no such evidence.
 */
function isLearned(node) {
  if (node.type === "note") return node.depth !== 2;
  if (node.type === "card" || node.type === "topic") return node.state === "mastered";
  return node.state === "seen" || node.state === "done";
}

function resolve(index, noteExists, type, ref) {
  if (type === "note") return isNotePath(ref) && noteExists(ref) ? { ref, title: baseName(ref), sub: "", state: null } : null;
  const found = new Map([["lesson", index.lessons], ["video", index.videos], ["explainer", index.explainers], ["topic", index.topics]]).get(type);
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
 *   anchorBack     (anchor) => the answer a tap on that mastered card would show
 *   revealed       false while the answer is hidden (see below)
 *
 * Returns { branches, count, more }. A branch is a node next to the centre with its own `children`;
 * `more` is how many further nodes the revealed graph holds (0 once revealed).
 *
 * node = { id, type, ref, title, sub, state, depth, inferred, score, reason | rel, entry | anchor, back, locked, children }
 *   reason  the skill's sentence (inferred edges)       rel  which explicit link it is (the panel words it)
 *   back    card nodes only: the answer a tap shows
 *   locked  shown as a cue, but a tap must do nothing until the answer is shown
 *
 * Before the answer is shown the graph holds only what the user has learned. It leaves out every
 * Deep Dive page made from this card's file (such a page states the answer) and anything whose
 * title, subtitle or reason gives part of the answer away. It keeps three kinds of node on screen
 * but locked: a mastered card whose own answer would give this one away, and the video or lesson
 * the card was made from (the review screen offers "rewatch" only after the answer, too).
 * The revealed graph is that same set plus the rest, so nothing on screen disappears with the answer.
 */
function buildSynapseGraph({ card, sourcePaths = [], index, resolvedLinks = {}, noteExists = () => false, anchorBack = (anchor) => anchor.back || "", revealed = false, max = MAX_NODES }) {
  if (!card) return { branches: [], count: 0, more: 0 };
  const idx = index || buildContentIndex();
  // What the review screen already shows is not a secret: the question, and the names of the card's source notes.
  const onScreen = [card.front, ...sourcePaths.filter(isNotePath).map(baseName)].join("\n");
  const leaks = (text) => leaksAnswer(text, card.back, onScreen);
  const rejected = new Set(card.synapseRejected || []);
  const all = new Map();
  const add = (parent, type, ref, fields) => {
    const id = `${type}|${ref}`;
    if (all.has(id) || rejected.has(id)) return null;
    const node = { id, type, ref, depth: parent ? 2 : 1, parent: parent ? parent.id : null, inferred: false, score: 0, locked: false, order: all.size, ...fields };
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
    if (idx.lessonByPath.has(path)) addContent(null, "lesson", idx.lessonByPath.get(path), { rel: "from-lesson", locked: !revealed });
    else if (topic) addContent(null, "topic", topic[1], { rel: "from-topic" });
    else addContent(null, "note", path, { rel: "source-note" });
  }
  for (const id of idx.explainersByCard.get(cardKey(card.notePath, card.front)) || []) addContent(null, "explainer", id, { rel: "explainer" });
  if (card.notePath && idx.videoByCards.has(card.notePath)) addContent(null, "video", idx.videoByCards.get(card.notePath), { rel: "video-cards", locked: !revealed });

  // Inferred links the synapse skill wrote: mastered cards, then everything else.
  for (const anchor of card.synapseAnchors || []) {
    if (!anchor || !anchor.front) continue;
    if (anchor.front === card.front && (!anchor.notePath || anchor.notePath === card.notePath)) continue;
    const learning = typeof anchor.stability === "number" && anchor.stability < MASTERED_STABILITY_THRESHOLD;
    const back = String(anchorBack(anchor) || "");
    add(null, "card", `${anchor.notePath || ""}|${anchor.front}`, {
      title: anchor.front, sub: "", state: learning ? "learning" : "mastered",
      inferred: true, score: Number(anchor.score) || 0, reason: anchor.reason || "", anchor,
      back, locked: !revealed && leaks(back),
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
  const pick = (allowed, kept = new Set()) => {
    for (const node of ranked) {
      if (kept.size >= max - 1) break;
      if (kept.has(node.id) || !allowed(node) || (node.parent && !kept.has(node.parent))) continue;
      kept.add(node.id);
    }
    return kept;
  };
  // Matched by the card's file, not its wording: a page stays "written for this card" after the front is edited.
  const ownPage = (node) => node.type === "explainer" && !!card.notePath && (node.entry.page.sourceCard || {}).note === card.notePath;
  const safe = (node) => isLearned(node) && !ownPage(node) && ![node.title, node.sub, node.reason].some(leaks);
  const before = pick(safe);
  const full = pick(() => true, new Set(before));
  const shown = revealed ? full : before;

  const branches = [];
  const byId = new Map();
  for (const node of ranked.filter((n) => shown.has(n.id))) {
    const out = { ...node, children: [] };
    delete out.order;
    byId.set(out.id, out);
    if (out.parent) byId.get(out.parent).children.push(out);
    else branches.push(out);
  }
  return { branches, count: shown.size, more: full.size - shown.size };
}

module.exports = { MAX_NODES, buildContentIndex, buildSynapseGraph, progressState, isLearned, leaksAnswer };
