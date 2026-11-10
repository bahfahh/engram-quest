"use strict";
// Turns a Deep Dive spec (engram-quest/explainer/{id}.spec.json) into the self-contained page the
// sandboxed viewer iframe receives. The AI writes content only; layout is computed by page/runtime.js,
// and facts about the owner's vault are read here, when the page opens, so they are always current.

const { loadSrData } = require("../review/helpers");
const { EXPLAINER_DIR } = require("./data");

// esbuild inlines page/page.css and page/runtime.js here (see esbuild.config.mjs).
const BUNDLED_PAGE = typeof __EXPLAINER_PAGE__ === "undefined" ? null : __EXPLAINER_PAGE__;

// Wrapping text survives a modest overrun, so a page is not refused over a few characters. Labels
// drawn inside a figure have no room to spare and are held to their limit.
const LENGTH_SLACK = 1.2;
const DAY_MS = 864e5;
const MIN_QUOTE_KEY = 4; // shorter than this, finding it in a note proves nothing

const specPath = (id) => `${EXPLAINER_DIR}/${id}.spec.json`;

// Two Latin letters or digits occupy about the width of one CJK character.
function textLength(value) {
  let total = 0;
  for (const ch of String(value)) total += ch.charCodeAt(0) < 0x2e80 ? 0.5 : 1;
  return total;
}

function makeChecker() {
  const issues = [];
  const fail = (message) => issues.push(message);
  const measured = (value, max, limit, where) => {
    if (typeof value !== "string" || !value.trim()) return fail(`${where}: missing`);
    if (textLength(value) > max) fail(`${where}: too long (${textLength(value)}, limit ${limit})`);
  };
  const text = (value, limit, where) => measured(value, limit * LENGTH_SLACK, limit, where);
  const label = (value, limit, where) => measured(value, limit, limit, where);
  const optionalText = (value, limit, where) => { if (value != null) text(value, limit, where); };
  // The page keys its drawing state by id, so an id must be usable as a key and an attribute value.
  const id = (value, where) => {
    if (typeof value !== "string" || !/^[^"\\\s]+$/.test(value) || value in {}) fail(`${where}: unusable id "${value}"`);
  };
  const note = (value, where) => { if (value != null) text(value, 200, `${where} note`); };
  // Returns [] when the list is unusable, so later checks can iterate without guarding.
  const list = (value, min, max, where) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      fail(`${where}: expected ${min} to ${max} items`);
      return [];
    }
    return value;
  };
  const oneOf = (value, allowed, where) => { if (!allowed.includes(value)) fail(`${where}: "${value}" is not one of ${allowed.join(", ")}`); };
  return { issues, fail, text, label, optionalText, id, note, list, oneOf };
}

function checkMachineParts(m, c, addPart) {
  if (m.layout === "tree") {
    const parts = c.list(m.parts, 1, 40, "machine.parts");
    parts.forEach((p) => addPart(p, 10));
    const roots = parts.filter((p) => !p.parent);
    if (roots.length !== 1) return c.fail("machine.parts: needs exactly one root");
    const byParent = new Map();
    for (const p of parts) {
      if (p.parent && !parts.some((x) => x.id === p.parent)) c.fail(`machine.parts: unknown parent of ${p.id}`);
      if (p.parent) byParent.set(p.parent, [...(byParent.get(p.parent) || []), p]);
    }
    // Parts in a parent cycle never connect to the root and could not be placed.
    let reached = 0, leaves = 0, levels = 0;
    (function walk(p, depth) {
      reached += 1;
      levels = Math.max(levels, depth);
      const kids = byParent.get(p.id) || [];
      if (!kids.length) leaves += 1;
      kids.forEach((k) => walk(k, depth + 1));
    })(roots[0], 1);
    if (reached !== parts.length) c.fail("machine.parts: some parts are not connected to the root");
    if (levels > 4) c.fail("machine.parts: more than 4 levels");
    if (leaves > 10) c.fail("machine.parts: more than 10 leaves");
  } else if (m.layout === "sequence") {
    const actors = c.list(m.actors, 2, 5, "machine.actors");
    actors.forEach((a) => addPart(a, 7));
    const known = (id) => actors.some((a) => a.id === id);
    c.list(m.messages, 3, 10, "machine.messages").forEach((x) => {
      addPart(x, 14);
      if (!known(x.from) || !known(x.to)) c.fail(`machine.messages: unknown actor in ${x.id}`);
    });
  } else if (m.layout === "pipeline") {
    const stations = c.list(m.stations, 3, 8, "machine.stations");
    stations.forEach((x) => { addPart(x, 10); if (x.sub != null) c.label(x.sub, 12, `machine.stations.${x.id}.sub`); });
    const exitFrom = new Set();
    (m.exits == null ? [] : c.list(m.exits, 0, 8, "machine.exits")).forEach((x) => {
      addPart(x, 14);
      if (!stations.some((s) => s.id === x.from)) c.fail(`machine.exits: unknown station in ${x.id}`);
      if (exitFrom.has(x.from)) c.fail(`machine.exits: two exits leave ${x.from}`);
      exitFrom.add(x.from);
    });
  } else if (m.layout === "states") {
    const states = c.list(m.states, 3, 6, "machine.states");
    states.forEach((x) => addPart(x, 10));
    const known = (id) => states.some((s) => s.id === id);
    c.list(m.transitions, 1, 20, "machine.transitions").forEach((x) => {
      addPart(x, 10);
      if (!known(x.from) || !known(x.to)) c.fail(`machine.transitions: unknown state in ${x.id}`);
      if (x.from === x.to) c.fail(`machine.transitions: ${x.id} leaves and returns to the same state`);
    });
  } else {
    c.oneOf(m.layout, ["tree", "sequence", "pipeline", "states"], "machine.layout");
  }
}

function checkMachine(m, c) {
  const ids = new Set();
  const addPart = (x, limit) => {
    c.id(x.id, "machine part");
    if (ids.has(x.id)) c.fail(`machine: duplicate id ${x.id}`);
    ids.add(x.id);
    c.label(x.label, limit, `machine.${x.id}.label`);
  };
  checkMachineParts(m, c, addPart);
  c.optionalText(m.assumption, 60, "machine.assumption");
  if (m.counter != null) {
    c.text(m.counter.label, 10, "machine.counter.label");
    c.text(m.counter.unit, 10, "machine.counter.unit");
  }
  c.list(m.scenarios, 2, 4, "machine.scenarios").forEach((sc) => {
    c.text(sc.label, 10, `scenario ${sc.id} label`);
    c.text(sc.prompt, 44, `scenario ${sc.id} prompt`);
    c.list(sc.steps, 2, 6, `scenario ${sc.id} steps`).forEach((st, i) => {
      c.text(st.say, 44, `scenario ${sc.id} step ${i + 1} say`);
      c.note(st.note, `scenario ${sc.id} step ${i + 1}`);
      for (const key of ["lit", "bad", "dim"]) {
        if (st[key] == null) continue;
        if (!Array.isArray(st[key])) { c.fail(`scenario ${sc.id} step ${i + 1}: ${key} must be a list`); continue; }
        st[key].forEach((k) => { if (!ids.has(k)) c.fail(`scenario ${sc.id} step ${i + 1}: unknown part ${k}`); });
      }
    });
  });
}

function checkContrast(x, c) {
  const options = c.list(x.options, 2, 3, "contrast.options");
  options.forEach((o) => { c.id(o.id, "contrast option"); c.text(o.label, 12, `option ${o.id} label`); c.text(o.sub, 14, `option ${o.id} sub`); });
  c.list(x.situations, 2, 4, "contrast.situations").forEach((s) => {
    c.text(s.label, 20, `situation ${s.id} label`);
    c.text(s.why, 60, `situation ${s.id} why`);
    c.note(s.note, `situation ${s.id}`);
    options.forEach((o) => {
      const out = s.outcomes && s.outcomes[o.id];
      if (!out) return c.fail(`situation ${s.id}: no outcome for ${o.id}`);
      c.text(out.text, 26, `outcome ${s.id}/${o.id}`);
      c.oneOf(out.tone, ["good", "bad", "plain"], `outcome ${s.id}/${o.id} tone`);
    });
  });
  c.text(x.verdict, 24, "contrast.verdict");
}

function checkMap(m, c) {
  c.label(m.center && m.center.label, 12, "map.center.label");
  if (m.center && m.center.sub != null) c.label(m.center.sub, 10, "map.center.sub");
  const nodes = c.list(m.nodes, 4, 8, "map.nodes");
  const ids = new Set();
  nodes.forEach((n) => {
    c.id(n.id, "map node");
    if (ids.has(n.id)) c.fail(`map: duplicate id ${n.id}`);
    ids.add(n.id);
    c.oneOf(n.band, ["foundation", "neighbor", "consequence"], `node ${n.id} band`);
    c.text(n.note, 200, `node ${n.id} note`);
    c.label(n.short, 8, `node ${n.id} short`);
    c.text(n.kind, 16, `node ${n.id} kind`);
    c.label(n.relation, 6, `node ${n.id} relation`);
    c.text(n.why, 80, `node ${n.id} why`);
  });
  const inBand = (band) => nodes.filter((n) => n.band === band).length;
  if (inBand("foundation") > 3 || inBand("neighbor") > 2 || inBand("consequence") > 3) c.fail("map.nodes: too many nodes in one band");
}

function checkEdges(e, c) {
  for (const side of ["holds", "breaks"]) {
    c.list(e[side], 1, 3, `edges.${side}`).forEach((t, i) => c.text(t, 30, `edges.${side}[${i}]`));
  }
}

function checkShapes(f, c) {
  c.text(f.title, 18, "shapes.title");
  c.text(typeof f.text === "string" ? f.text.replace(/\{\d\|([^}]+)\}/g, "$1") : f.text, 90, "shapes.text");
  c.optionalText(f.hand, 22, "shapes.hand");
  const panels = c.list(f.panels, 2, 3, "shapes.panels");
  const steps = c.list(f.steps, panels.length - 1, panels.length - 1, "shapes.steps");
  steps.forEach((t, i) => c.label(t, 8, `shapes.steps[${i}]`));
  panels.forEach((p, i) => {
    c.label(p.caption, 12, `shapes.panels[${i}].caption`);
    const plates = c.list(p.plates, 1, 4, `shapes.panels[${i}].plates`);
    if (plates.filter((x) => x.hot).length > 1) c.fail(`shapes.panels[${i}]: more than one hot plate`);
    plates.forEach((x) => {
      c.oneOf(x.size, ["s", "m", "l"], `shapes.panels[${i}] size`);
      c.oneOf(x.marks || "none", ["none", "dots", "rows", "grid"], `shapes.panels[${i}] marks`);
      c.oneOf(x.column || "center", ["left", "center", "right"], `shapes.panels[${i}] column`);
      if (x.tag != null) c.label(x.tag, 4, `shapes.panels[${i}] tag`);
    });
  });
}

/** Everything the page runtime relies on. Returns a list of problems; empty means it can be drawn. */
function validateSpec(spec) {
  const c = makeChecker();
  try {
    c.text(spec.title, 26, "title");
    c.text(spec.hook, 30, "hook");
    c.text(spec.origin, 50, "origin");
    c.list(spec.points, 2, 4, "points").forEach((p, i) => {
      c.text(p.lead, 12, `points[${i}].lead`);
      c.text(p.body, 70, `points[${i}].body`);
      c.note(p.note, `points[${i}]`);
    });
    c.text(spec.anchor && spec.anchor.line, 20, "anchor.line");
    c.text(spec.anchor && spec.anchor.note, 60, "anchor.note");
    if (spec.card != null && (typeof spec.card.q !== "string" || typeof spec.card.a !== "string")) c.fail("card: needs q and a");
    (spec.relations == null ? [] : c.list(spec.relations, 0, 4, "relations")).forEach((r, i) => {
      c.text(r.note, 200, `relations[${i}].note`);
      c.text(r.relation, 16, `relations[${i}].relation`);
    });
    const sections = { machine: checkMachine, contrast: checkContrast, map: checkMap };
    if (spec.form !== "reading") {
      c.oneOf(spec.form, Object.keys(sections).concat("reading"), "form");
      if (sections[spec.form]) {
        if (spec[spec.form]) sections[spec.form](spec[spec.form], c);
        else c.fail(`${spec.form}: missing`);
      }
    }
    if (spec.edges != null) checkEdges(spec.edges, c);
    if (spec.shapes != null) checkShapes(spec.shapes, c);
  } catch (err) {
    // A wrong shape deep in the file, such as a string where an object belongs.
    c.fail(`malformed: ${err.message}`);
  }
  return c.issues;
}

/** Every note the page can link to. */
function collectNotes(spec) {
  const notes = new Set();
  const add = (x) => { if (x && x.note) notes.add(x.note); };
  (spec.points || []).forEach(add);
  (spec.relations || []).forEach(add);
  if (spec.contrast) spec.contrast.situations.forEach(add);
  if (spec.map) spec.map.nodes.forEach(add);
  if (spec.machine) spec.machine.scenarios.forEach((sc) => sc.steps.forEach(add));
  return [...notes];
}

const resolveNote = (app, name) => app.metadataCache.getFirstLinkpathDest(String(name).replace(/\.md$/i, ""), "");

async function noteFacts(app, name, now) {
  const file = resolveNote(app, name);
  if (!file) return { exists: false };
  const info = { exists: true, path: file.path, cards: 0 };
  const sr = await loadSrData(app.vault.adapter, file.path);
  const cards = Object.values(sr).filter((card) => card && typeof card.stability === "number");
  if (cards.length) {
    info.cards = cards.length;
    info.minStability = Math.min(...cards.map((card) => card.stability));
    info.again30 = cards.reduce((sum, card) => sum + (card.log || [])
      .filter((entry) => entry.r === 1 && now - new Date(entry.d).getTime() <= 30 * DAY_MS).length, 0);
  }
  return info;
}

// Punctuation and whitespace differ harmlessly between a note and a quotation of it.
const quoteKey = (t) => String(t).replace(/[\s*_`>#~\-「」『』"'.,，。:：;；!！?？、（）()[\]]/g, "");

/** A quote is shown as the owner's own words, so one that isn't in the note is dropped. */
async function dropUnverifiedQuotes(app, spec, notes) {
  if (!spec.map) return;
  await Promise.all(spec.map.nodes.filter((n) => n.quote).map(async (n) => {
    const info = notes[n.note];
    let body = "";
    if (info && info.exists) body = await app.vault.adapter.read(info.path).catch(() => "");
    const key = quoteKey(n.quote);
    if (key.length < MIN_QUOTE_KEY || !quoteKey(body).includes(key)) delete n.quote;
  }));
}

const inlineJson = (value) => JSON.stringify(value).split("<").join("\\u003c");

function buildHtml(spec, live, page, dark) {
  return "<!DOCTYPE html>\n"
    + `<html lang="${live.lang === "en" ? "en" : "zh-TW"}"><head><meta charset="UTF-8">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${page.css}</style></head>`
    + `<body><div class="eq${dark ? " dark" : ""}"></div>`
    + `<script>window.__SPEC__=${inlineJson(spec)};window.__LIVE__=${inlineJson(live)};</script>`
    + `<script>${page.runtime}</script></body></html>`;
}

/**
 * Compose the page for one spec file. Resolves to { html, notes, card } when it can be drawn, or
 * { issues, card } when it cannot (card is whatever could be read, for re-queueing the page).
 */
async function composeSpecPage(app, id, { dark = false, page = BUNDLED_PAGE, now = Date.now() } = {}) {
  let spec;
  try {
    spec = JSON.parse(await app.vault.adapter.read(specPath(id)));
  } catch (err) {
    return { issues: [`not readable as JSON: ${err.message}`], card: null };
  }
  const issues = validateSpec(spec);
  if (issues.length) return { issues, card: spec && spec.card ? spec.card : null };

  // Only the section the form draws counts; a leftover one must not contribute links.
  for (const section of ["machine", "contrast", "map"]) if (section !== spec.form) delete spec[section];
  if (spec.card) {
    const strip = (t) => t.replace(/!\[\[[^\]]*\]\]/g, "").trim();
    spec.card = { q: strip(spec.card.q), a: strip(spec.card.a) };
  }
  const names = collectNotes(spec);
  const notes = {};
  await Promise.all(names.map(async (name) => { notes[name] = await noteFacts(app, name, now); }));
  await dropUnverifiedQuotes(app, spec, notes);
  // Page labels follow the language the content was written in, not the app's interface language.
  const live = { notes, lang: /[㐀-鿿]/.test(spec.title + spec.hook) ? "zh" : "en" };
  return { html: buildHtml(spec, live, page, dark), notes: names, card: spec.card || null };
}

module.exports = { specPath, validateSpec, collectNotes, composeSpecPage, textLength };
