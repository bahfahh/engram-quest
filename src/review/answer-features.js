"use strict";
// The two feature entries in a review card's answer header: Synapse (the relation map around this
// card) and the Deep Dive queue. They lead into a feature, so they carry the accent surface and sit
// in their own group, apart from the formatting tools (highlight, quote) at the other end of the
// header. Each shows its state: the map is open, the card is already in the queue.

const { t: c } = require("../i18n");
const { icon, featureIcon } = require("../hub/ui");

/**
 * synapse = { open, toggle() -> open } | null   the card has links to show
 * queue   = { isQueued() -> Promise<boolean>, add() -> Promise<boolean> } | null   `add` resolves true once the card is in the queue and never rejects
 * Returns the group, or null when the card has neither.
 */
function renderAnswerFeatures(header, { t, plugin, synapse, queue }) {
  if (!synapse && !queue) return null;
  const group = header.createEl("div", { cls: "lh-answer-features" });

  if (synapse) {
    const btn = group.createEl("button", { cls: "lh-rc-edit-btn lh-ans-feature", attr: { title: c(t, "SYNAPSE_HINT"), "aria-pressed": String(!!synapse.open) } });
    featureIcon(btn, plugin, "synapse", { size: 20, fallback: "bolt" });
    btn.createEl("span", { text: c(t, "SYNAPSE") });
    btn.addEventListener("click", () => btn.setAttribute("aria-pressed", String(!!synapse.toggle())));
  }

  if (queue) {
    const btn = group.createEl("button", { cls: "lh-rc-edit-btn lh-ans-feature lh-queue-btn" });
    const mark = icon(btn.createEl("span", { cls: "lh-ans-feature-ic" }), "plus");
    const label = btn.createEl("span", { text: c(t, "EXPLAINER_MARK_BTN") });
    // In the queue is a finished state, drawn in the finished colour. Nothing more to press, but the
    // button stays focusable (aria-disabled), so a keyboard user is not thrown back to the page.
    let settled = false, adding = false;
    const markQueued = () => {
      settled = true;
      mark.empty();
      icon(mark, "check");
      label.textContent = c(t, "EXPLAINER_QUEUED_BTN");
      btn.classList.add("is-done");
      btn.setAttribute("aria-disabled", "true");
    };
    btn.addEventListener("click", async () => {
      if (settled || adding) return;
      adding = true;
      try { if (await queue.add()) markQueued(); } finally { adding = false; }
    });
    queue.isQueued().then((queued) => { if (queued) markQueued(); }).catch(() => {});
  }
  return group;
}

module.exports = { renderAnswerFeatures };
