"use strict";
// Draws the Synapse relation map inside the review card: the card at the root, one branch per
// related thing, the reason written on each connecting line, and a second step nested under the
// branch it hangs from. One layout serves phone and desktop (the line text sits above the node on
// a narrow screen, beside it on a wide one). The graph itself comes from synapse-graph.js; this
// file only turns it into DOM and reports clicks.

const { t: c, interpolate: K } = require("../i18n");
const { icon } = require("../hub/ui");

const TYPES = {
  card: { icon: "deck", label: "SYNAPSE_TYPE_CARD" },
  note: { icon: "doc", label: "SYNAPSE_TYPE_NOTE" },
  explainer: { icon: "sparkle", label: "TAB_EXPLAINER" },
  lesson: { icon: "book", label: "SYNAPSE_TYPE_LESSON" },
  video: { icon: "video", label: "SYNAPSE_TYPE_VIDEO" },
  topic: { icon: "recall", label: "SYNAPSE_TYPE_TOPIC" },
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

function stateLabel(node) {
  if (node.state === "mastered") return "SYNAPSE_STATE_MASTERED";
  if (node.state === "learning") return "SYNAPSE_STATE_LEARNING";
  if (node.state === "seen") return node.type === "video" ? "SYNAPSE_STATE_WATCHED" : "SYNAPSE_STATE_READ";
  if (node.state === "unseen") return node.type === "topic" ? "SYNAPSE_STATE_NEW" : "SYNAPSE_STATE_UNSEEN";
  return null; // notes carry no learning state
}

/**
 * opts = { t, card, loading, graph, revealed, expandedId, onSelect(node), renderBack(el, node) }
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
    const root = map.createEl("div", { cls: "lh-syg-root", attr: { title: c(t, "SYNAPSE_CENTER") } });
    icon(root, "deck");
    root.createEl("span", { text: card.front || "" });
    renderBranches(map, graph.branches, opts);
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

function renderBranches(parent, nodes, opts) {
  const { t } = opts;
  const list = parent.createEl("ul", { cls: "lh-syg-tree" });
  for (const node of nodes) {
    const type = TYPES[node.type];
    const item = list.createEl("li", { cls: "lh-syg-br" });
    const row = item.createEl("div", { cls: "lh-syg-row" });
    row.createEl("span", { cls: "lh-syg-edge" + (node.inferred ? "" : " is-explicit"), text: node.reason || c(t, RELS[node.rel] || "SYNAPSE_REL_RELATED") });

    // A recall topic has no page of its own to open; every other node does something on click.
    const opens = node.type !== "topic";
    const el = row.createEl("div", { cls: "lh-syg-node" + (opens ? " is-link" : ""), attr: { "data-type": node.type, "data-state": node.state || "none" } });
    icon(el.createEl("span", { cls: "lh-syg-ic" }), type.icon);
    const text = el.createEl("span", { cls: "lh-syg-tx" });
    text.createEl("span", { cls: "lh-syg-tt", text: node.title });
    text.createEl("span", { cls: "lh-syg-sub", text: [c(t, type.label), node.sub].filter(Boolean).join(" · ") });
    const state = stateLabel(node);
    if (state) el.createEl("span", { cls: "lh-syg-st", text: c(t, state) });

    if (opens) {
      const expanded = node.type === "card" && opts.expandedId === node.id;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      if (node.type === "card") el.setAttribute("aria-expanded", String(expanded));
      const select = (ev) => { ev.stopPropagation(); opts.onSelect(node); };
      el.addEventListener("click", select);
      el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(ev); } });
      if (expanded) opts.renderBack(item.createEl("div", { cls: "lh-syg-back" }), node);
    }
    if (node.children.length) renderBranches(item, node.children, opts);
  }
}

module.exports = { renderSynapseMap };
