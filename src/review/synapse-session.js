"use strict";
// What the ⚡ panel does during one review session that needs no DOM: reading the content the graph
// resolves against (once, on the first ⚡ open), building a card's graph, and opening a node. The
// review session owns the screen and the viewers and hands them in as `openers`, so everything
// here can be tested with a plain adapter.
//
// It reads; it writes nothing. Opening a lesson or a Deep Dive page marks it viewed exactly as
// opening it from its own tab does: that is the viewer recording that the user read the page.

const { loadSynapseSources } = require("./synapse");
const { buildContentIndex, buildSynapseGraph, progressState } = require("./synapse-graph");
const { loadCourse, lessonCompletion } = require("../lessons/data");
const { META_DIR: EXPLAINER_META_DIR, readState, applyReadingState } = require("../explainer/data");

const NO_MAP = { branches: [], count: 0, more: 0 };

class SynapseMapSession {
  /**
   *   adapter        app.vault.adapter
   *   allowed        () => boolean: Pro licence and Synapse switched on by its status file
   *   sourcePaths    (card) => where the card came from
   *   anchorBack     (anchor) => the answer a tap on that mastered card shows
   *   resolvedLinks  () => app.metadataCache.resolvedLinks
   *   noteExists     (path) => boolean
   *   openers        { note(path), lesson({ slug, meta, lesson, onClose }), explainer(page, onChanged),
   *                    video({ path, at }), missing() }
   */
  constructor(options) {
    Object.assign(this, options);
    this.index = null;    // the content, once read
    this.failed = false;  // the last read failed: draw without the content, and try again on the next card
    this.loading = null;
    this.opening = false;
  }

  /** True when a map can be drawn now: the content is read, or reading it just failed. */
  get ready() { return !!this.index || this.failed; }

  /** Reads the content if that is still to do. Resolves to whether a map can be drawn. */
  load() {
    if (!this.allowed()) return Promise.resolve(false);
    if (this.ready) return Promise.resolve(true);
    if (!this.loading) {
      this.loading = loadSynapseSources(this.adapter).then(buildContentIndex).then(
        (index) => { this.index = index; },
        (err) => { console.warn("synapse: could not read the content to link to", err); this.failed = true; },
      ).then(() => { this.loading = null; return true; });
    }
    return this.loading;
  }

  /** A failed read is not kept: called when the session moves to another card, so its ⚡ reads again. */
  retry() { this.failed = false; }

  /** The card's graph, or an empty one if anything in building it goes wrong: the card itself must stay usable. */
  graph(card, revealed) {
    try {
      return buildSynapseGraph({
        card, revealed, index: this.index || undefined,
        sourcePaths: this.sourcePaths(card),
        resolvedLinks: this.resolvedLinks() || {},
        noteExists: this.noteExists,
        anchorBack: this.anchorBack,
      });
    } catch (err) {
      console.warn("synapse: could not build the map for this card", err);
      return NO_MAP;
    }
  }

  /**
   * Whether ⚡ has anything to show for this card. A card in a file can always have links (at least
   * where it came from), so until the content is read the answer is yes; after that it is exact,
   * counting the revealed graph so ⚡ stays on before the answer.
   */
  hasLinks(card) {
    if (!this.allowed() || !card || !card.notePath) return false;
    return !this.ready || this.graph(card, true).count > 0;
  }

  /**
   * Opens what a node stands for. `redraw` is called after a viewer that changed something closes.
   * A tap that lands while another is still opening is ignored. Resolves to whether something opened.
   */
  async open(node, redraw) {
    if (this.opening || !this.allowed()) return false;
    this.opening = true;
    try {
      const entry = node.entry;
      const closed = async () => {
        try { await this.refresh(node); } catch (err) { console.warn("synapse: could not refresh", node.id, err); }
        if (redraw) redraw();
      };
      if (node.type === "note") {
        this.openers.note(node.ref);
      } else if (node.type === "lesson") {
        const meta = await loadCourse(this.adapter, entry.slug);
        const lesson = meta && meta.lessons.find((l) => l.id === entry.lessonId);
        if (!lesson || !lesson.file) { this.openers.missing(); return false; }
        this.openers.lesson({ slug: entry.slug, meta, lesson, onClose: closed });
      } else if (node.type === "explainer") {
        // A copy carrying the saved reading state, as the Deep Dive tab prepares it for the viewer.
        this.openers.explainer(applyReadingState({ ...entry.page }, await readState(this.adapter)), closed);
      } else if (node.type === "video") {
        if (!(await this.adapter.exists(entry.path))) { this.openers.missing(); return false; }
        this.openers.video({ path: entry.path, at: entry.position });
      } else {
        return false;
      }
      return true;
    } catch (err) {
      console.warn("synapse: could not open", node && node.id, err);
      return false;
    } finally {
      this.opening = false;
    }
  }

  // After a viewer closes, only what it could have changed is read again: that lesson's course,
  // or that page's reading state (and whether the page is still there).
  async refresh(node) {
    if (!this.index) return;
    const entry = node.entry;
    if (node.type === "lesson") {
      const meta = await loadCourse(this.adapter, entry.slug);
      if (meta) entry.state = progressState(lessonCompletion(meta, entry.lessonId));
    } else if (node.type === "explainer") {
      if (await this.adapter.exists(`${EXPLAINER_META_DIR}/${entry.ref}.json`)) {
        entry.state = progressState((await readState(this.adapter))[entry.ref]);
      } else {
        this.index.explainers.delete(entry.ref);
        for (const [card, pages] of this.index.explainersByCard) this.index.explainersByCard.set(card, pages.filter((id) => id !== entry.ref));
      }
    }
  }
}

module.exports = { SynapseMapSession };
