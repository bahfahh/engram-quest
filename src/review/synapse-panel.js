"use strict";
// Draws the Synapse relation map inside the review card. On a wide panel it is a mind map: the card
// being reviewed in the middle, what the user already knows branching out to its left, where the
// card comes from and what is still ahead to its right, each reason written on its connector and a
// second step hanging under the branch it belongs to. On a phone, or a narrow window, the same
// elements stack into a tree in the same order. The graph comes from synapse-graph.js and its
// arrangement from synapse-layout.js; this file only builds DOM, draws the connectors and reports clicks.

const { t: c, interpolate: K } = require("../i18n");
const { icon, featureIcon, isPhone } = require("../hub/ui");
const { isLearned } = require("./synapse-graph");
const { arrangeSynapseMap } = require("./synapse-layout");

const MAP_MIN_WIDTH = 640; // narrower than this the side columns cannot hold a readable node
const SVG_NS = "http://www.w3.org/2000/svg";

// `feature` is the Hub's own icon for that kind of content, so a type looks here as it does in the
// sidebar. A note is the user's, not a Hub feature, and keeps a plain line icon. `cue` tells what a
// click does; a recall topic has no page of its own, so it has none and is drawn flat.
const TYPES = {
  card: { feature: "review", icon: "deck", label: "SYNAPSE_TYPE_CARD", cue: "chevron" },
  note: { icon: "doc", label: "SYNAPSE_TYPE_NOTE", cue: "external" },
  explainer: { feature: "explainer", icon: "doc", label: "TAB_EXPLAINER", cue: "arrow" },
  lesson: { feature: "lesson", icon: "book", label: "SYNAPSE_TYPE_LESSON", cue: "arrow" },
  video: { feature: "video", icon: "video", label: "SYNAPSE_TYPE_VIDEO", cue: "play" },
  topic: { feature: "episodic", icon: "recall", label: "SYNAPSE_TYPE_TOPIC", cue: null },
};
// Wording for the explicit links (synapse-graph.js `rel`); inferred links carry the skill's own sentence.
const RELS = {
  "source-note": "SYNAPSE_REL_SOURCE_NOTE",
  "from-lesson": "SYNAPSE_REL_FROM_LESSON",
  "from-topic": "SYNAPSE_REL_FROM_TOPIC",
  explainer: "SYNAPSE_REL_EXPLAINER",
  "video-cards": "SYNAPSE_REL_VIDEO",
  "note-link": "SYNAPSE_REL_NOTE_LINK",
  "topic-cites": "SYNAPSE_REL_TOPIC_CITES",
  "topic-note": "SYNAPSE_REL_TOPIC_NOTE",
};
const GROUPS = { recall: "SYNAPSE_GROUP_RECALL", source: "SYNAPSE_GROUP_SOURCE", next: "SYNAPSE_GROUP_NEXT" };

function stateLabel(node) {
  if (node.state === "mastered") return "SYNAPSE_STATE_MASTERED";
  if (node.state === "learning") return "SYNAPSE_STATE_LEARNING";
  if (node.state === "seen") return node.type === "video" ? "SYNAPSE_STATE_WATCHED" : "SYNAPSE_STATE_READ";
  if (node.state === "unseen") return node.type === "topic" ? "SYNAPSE_STATE_NEW" : "SYNAPSE_STATE_UNSEEN";
  return null; // notes carry no learning state
}

/**
 * opts = { t, plugin, card, loading, graph, revealed, expandedId, onSelect(node), renderBack(el, node) }
 *   loading     the content the links resolve against is still being read
 *   expandedId  the card node whose answer is open
 */
function renderSynapseMap(parent, opts) {
  const { t, card, graph, revealed } = opts;
  const panel = parent.createEl("div", { cls: "lh-syg" });
  const head = panel.createEl("div", { cls: "lh-syg-head" });
  icon(head, "bolt");
  head.createEl("span", { cls: "lh-syg-name", text: c(t, "SYNAPSE") });
  head.createEl("span", { cls: "lh-syg-hint", text: c(t, revealed ? "SYNAPSE_HINT_AFTER" : "SYNAPSE_HINT") });

  if (opts.loading) { panel.createEl("div", { cls: "lh-syg-note", text: c(t, "SYNAPSE_LOADING") }); return panel; }

  if (graph.branches.length) {
    const map = panel.createEl("div", { cls: "lh-syg-map" });
    map.appendChild(activeDocument.createElementNS(SVG_NS, "svg")).setAttribute("class", "lh-syg-wires");
    const root = map.createEl("div", { cls: "lh-syg-root" });
    root.createEl("span", { cls: "lh-syg-root-cap", text: c(t, "SYNAPSE_CENTER") });
    root.createEl("span", { cls: "lh-syg-root-tt", text: card.front || "" });
    const sides = arrangeSynapseMap(graph.branches);
    for (const side of ["left", "right"]) {
      if (!sides[side].length) continue;
      const list = map.createEl("ul", { cls: `lh-syg-tree lh-syg-side is-${side}` });
      for (const part of sides[side]) {
        if (part.labelled) list.createEl("li", { cls: "lh-syg-grp", text: c(t, GROUPS[part.group]), attr: { "data-group": part.group } });
        renderBranches(list, part.branches, opts);
      }
    }
    watchLayout(map);
  } else if (!graph.more) {
    panel.createEl("div", { cls: "lh-syg-note", text: c(t, "SYNAPSE_EMPTY") });
  }
  // Before the answer only learned things are drawn; say how much is waiting behind it.
  if (graph.more) {
    const text = (graph.branches.length ? "" : c(t, "SYNAPSE_NOTHING_YET") + " ") + K(c(t, "SYNAPSE_MORE_AFTER"), { n: graph.more });
    panel.createEl("div", { cls: "lh-syg-note", text });
  }
  return panel;
}

function renderBranches(list, nodes, opts) {
  const { t } = opts;
  for (const node of nodes) {
    const type = TYPES[node.type];
    const item = list.createEl("li", { cls: "lh-syg-br" + (isLearned(node) ? "" : " is-next") });
    const row = item.createEl("div", { cls: "lh-syg-row" });
    row.createEl("span", { cls: "lh-syg-edge" + (node.inferred ? "" : " is-explicit"), text: node.reason || c(t, RELS[node.rel] || "SYNAPSE_REL_RELATED") });

    const el = row.createEl("div", { cls: "lh-syg-node" + (type.cue ? " is-link" : ""), attr: { "data-type": node.type } });
    if (type.feature) featureIcon(el, opts.plugin, type.feature, { size: 32, fallback: type.icon });
    else icon(el.createEl("span", { cls: "lh-syg-ic" }), type.icon);
    const text = el.createEl("span", { cls: "lh-syg-tx" });
    text.createEl("span", { cls: "lh-syg-tt", text: node.title });
    const meta = text.createEl("span", { cls: "lh-syg-meta" });
    const state = stateLabel(node);
    if (state) meta.createEl("span", { cls: "lh-syg-st", text: c(t, state), attr: { "data-state": node.state } });
    meta.createEl("span", { cls: "lh-syg-sub", text: [c(t, type.label), node.sub].filter(Boolean).join(" · ") });

    if (type.cue) {
      const expanded = node.type === "card" && opts.expandedId === node.id;
      icon(el.createEl("span", { cls: "lh-syg-cue" + (expanded ? " is-open" : "") }), type.cue);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      if (node.type === "card") el.setAttribute("aria-expanded", String(expanded));
      const select = (ev) => { ev.stopPropagation(); opts.onSelect(node); };
      el.addEventListener("click", select);
      el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(ev); } });
      if (expanded) opts.renderBack(item.createEl("div", { cls: "lh-syg-back" }), node);
    }
    if (node.children.length) renderBranches(item.createEl("ul", { cls: "lh-syg-tree" }), node.children, opts);
  }
}

// Picks map or tree from the room there is, and redraws the connectors whenever they move: the
// panel changes size (a window resize, an answer expanding under a card), or the review scrolls
// and the card in the middle, which stays in view, slides along the map.
function watchLayout(map) {
  const update = () => {
    map.toggleClass("is-map", !isPhone() && map.clientWidth >= MAP_MIN_WIDTH);
    drawWires(map);
  };
  update();
  const scrolling = new AbortController();
  const observer = new ResizeObserver(() => {
    if (map.isConnected) update();
    else { observer.disconnect(); scrolling.abort(); }
  });
  observer.observe(map);
  activeDocument.addEventListener("scroll", () => { if (map.isConnected) drawWires(map); }, { capture: true, passive: true, signal: scrolling.signal });
}

// One curve from the card to each branch next to it, ending where the line under the branch's
// reason begins, so the reason reads as written on the connector.
function drawWires(map) {
  const svg = map.querySelector(".lh-syg-wires");
  svg.replaceChildren();
  if (!map.hasClass("is-map")) return;
  const box = map.getBoundingClientRect();
  const root = map.querySelector(".lh-syg-root").getBoundingClientRect();
  const y1 = root.top + root.height / 2 - box.top;
  for (const side of map.querySelectorAll(".lh-syg-side")) {
    const left = side.hasClass("is-left");
    const x1 = (left ? root.left : root.right) - box.left;
    for (const branch of side.querySelectorAll(":scope > .lh-syg-br")) {
      const edge = branch.querySelector(".lh-syg-edge").getBoundingClientRect();
      const x2 = (left ? edge.right : edge.left) - box.left;
      const y2 = edge.bottom - box.top - 0.75;
      const mid = (x1 + x2) / 2;
      const path = svg.appendChild(activeDocument.createElementNS(SVG_NS, "path"));
      path.setAttribute("d", `M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`);
      if (branch.hasClass("is-next")) path.setAttribute("class", "is-next");
    }
  }
}

module.exports = { renderSynapseMap };
