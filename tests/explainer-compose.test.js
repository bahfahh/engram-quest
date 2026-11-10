// Spec validation and page composition for Deep Dives. The runtime itself is exercised in a browser;
// these tests cover what decides whether a page is drawn and which vault facts it receives.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateSpec, collectNotes, composeSpecPage, specPath, textLength } from "../src/explainer/compose.js";
import { deleteExplainer, queueRegenerate, readQueue, EXPLAINER_DIR, META_DIR } from "../src/explainer/data.js";

const page = { css: "/*css*/", runtime: "/*runtime*/" };

const base = () => ({
  id: "p",
  title: "為什麼會這樣",
  hook: "一句話",
  origin: "這張卡少了前提",
  points: [{ lead: "第一", body: "原因一" }, { lead: "第二", body: "原因二" }],
  anchor: { line: "一個畫面", note: "日常的例子" },
  card: { q: "問題", a: "答案" },
});
const reading = () => ({ ...base(), form: "reading", edges: { holds: ["成立"], breaks: ["不成立"] } });
const contrast = () => ({
  ...base(),
  form: "contrast",
  contrast: {
    options: [{ id: "a", label: "甲", sub: "甲的說明" }, { id: "b", label: "乙", sub: "乙的說明" }],
    situations: ["s1", "s2"].map((id) => ({
      id, label: "情境", why: "原因", note: "Note A",
      outcomes: { a: { text: "結果", tone: "good" }, b: { text: "結果", tone: "bad" } },
    })),
    verdict: "怎麼選",
  },
});
const sequence = () => ({
  ...base(),
  form: "machine",
  machine: {
    layout: "sequence",
    actors: [{ id: "x", label: "甲方" }, { id: "y", label: "乙方" }],
    messages: ["m1", "m2", "m3"].map((id) => ({ id, from: "x", to: "y", label: "訊息" })),
    scenarios: ["ok", "bad"].map((id) => ({
      id, label: "情況", prompt: "開始前",
      steps: [{ lit: ["m1"], say: "第一步" }, { lit: ["m2"], bad: ["m3"], say: "第二步", note: "Note B" }],
    })),
  },
});
const map = () => ({
  ...base(),
  form: "map",
  map: {
    center: { label: "中心", sub: "說明" },
    nodes: ["foundation", "foundation", "neighbor", "consequence"].map((band, i) => ({
      id: `n${i}`, note: i === 0 ? "Real Note" : `Note ${i}`, band, short: "短名", kind: "關係", relation: "支撐", why: "理由",
    })),
  },
});

function makeApp(files = {}, notes = {}) {
  const trashed = [];
  return {
    trashed,
    metadataCache: { getFirstLinkpathDest: (name) => (notes[name] ? { path: notes[name] } : null) },
    vault: {
      adapter: {
        files,
        exists: async (p) => p in files,
        read: async (p) => { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; },
        write: async (p, v) => { files[p] = v; },
        mkdir: async () => {},
        remove: async (p) => { trashed.push(p); delete files[p]; },
      },
    },
  };
}
const withSpec = (spec, notes, extra = {}) => makeApp({ [specPath("p")]: JSON.stringify(spec), ...extra }, notes);
const embedded = (html, name) => JSON.parse(html.match(new RegExp(`window\\.${name}=(.*?);(?:window|</script>)`))[1]);

describe("validateSpec", () => {
  it("accepts a well-formed spec of each form", () => {
    for (const spec of [reading(), contrast(), sequence(), map()]) expect(validateSpec(spec)).toEqual([]);
  });

  it("accepts a page with no source card or relations", () => {
    const spec = reading();
    delete spec.card;
    expect(validateSpec(spec)).toEqual([]);
  });

  it("counts two Latin characters as one", () => {
    expect(textLength("ab中")).toBe(2);
  });

  it("lets wrapping text run slightly over but holds figure labels to the limit", () => {
    const spec = reading();
    spec.title = "字".repeat(30);
    expect(validateSpec(spec)).toEqual([]);
    spec.title = "字".repeat(32);
    expect(validateSpec(spec).join()).toContain("title");

    const m = map();
    m.map.nodes[0].short = "字".repeat(9);
    expect(validateSpec(m).join()).toContain("short");
  });

  it("reports references that would break the drawing", () => {
    const seq = sequence();
    seq.machine.scenarios[0].steps[0].lit = ["ghost"];
    expect(validateSpec(seq).join()).toContain("unknown part ghost");

    const con = contrast();
    delete con.contrast.situations[0].outcomes.b;
    expect(validateSpec(con).join()).toContain("no outcome for b");
  });

  it("refuses a map band the layout cannot place", () => {
    const m = map();
    m.map.nodes[0].band = "elsewhere";
    expect(validateSpec(m).join()).toContain("band");
    const crowded = map();
    crowded.map.nodes = ["a", "b", "c", "d"].map((id) => ({ ...crowded.map.nodes[0], id }));
    expect(validateSpec(crowded).join()).toContain("too many nodes");
  });

  it("refuses a tree part cut off from the root", () => {
    const spec = { ...base(), form: "machine", machine: {
      layout: "tree",
      parts: [{ id: "r", label: "根" }, { id: "a", label: "甲", parent: "b" }, { id: "b", label: "乙", parent: "a" }],
      scenarios: sequence().machine.scenarios.map((sc) => ({ ...sc, steps: [{ say: "一" }, { say: "二" }] })),
    } };
    expect(validateSpec(spec).join()).toContain("not connected");
  });

  it("reports the wrong shape instead of throwing", () => {
    expect(validateSpec(null).length).toBeGreaterThan(0);
    expect(validateSpec({ ...reading(), points: [null, null] }).join()).toContain("malformed");
    expect(validateSpec({ ...base(), form: "contrast" }).join()).toContain("contrast: missing");
    expect(validateSpec({ ...base(), form: "poster" }).join()).toContain("form");
  });
});

describe("the skill's example specs", () => {
  it.each(["machine", "contrast", "map", "reading"])("%s passes the validator it teaches", (form) => {
    const spec = JSON.parse(readFileSync(`skills/explainer/assets/examples/${form}.spec.json`, "utf8"));
    expect(spec.form).toBe(form);
    expect(validateSpec(spec)).toEqual([]);
  });
});

describe("rejected shapes", () => {
  it("refuses ids the page cannot use as keys", () => {
    const seq = sequence();
    seq.machine.actors[0].id = "constructor";
    expect(validateSpec(seq).join()).toContain("unusable id");
  });

  it("refuses a transition back to the same state", () => {
    const spec = { ...base(), form: "machine", machine: {
      layout: "states",
      states: ["a", "b", "c"].map((id) => ({ id, label: id })),
      transitions: [{ id: "t", from: "a", to: "a", label: "再試" }],
      scenarios: sequence().machine.scenarios.map((sc) => ({ ...sc, steps: [{ say: "一" }, { say: "二" }] })),
    } };
    expect(validateSpec(spec).join()).toContain("same state");
  });

  it("refuses a note that is not a name", () => {
    const spec = reading();
    spec.points[0].note = 123;
    expect(validateSpec(spec).join()).toContain("note");
  });
});

describe("collectNotes", () => {
  it("gathers links from every place a page can show one", () => {
    const spec = { ...sequence(), relations: [{ note: "Note R", relation: "相關" }] };
    spec.points[0].note = "Note P";
    expect(collectNotes(spec).sort()).toEqual(["Note B", "Note P", "Note R"]);
  });
});

describe("composeSpecPage", () => {
  it("reports issues without drawing", async () => {
    const bad = { ...reading(), title: "" };
    const out = await composeSpecPage(withSpec(bad), "p", { page });
    expect(out.html).toBeUndefined();
    expect(out.issues.join()).toContain("title");
    expect(out.card).toEqual(bad.card);
  });

  it("reports an unparseable file", async () => {
    const out = await composeSpecPage(makeApp({ [specPath("p")]: "{oops" }), "p", { page });
    expect(out.issues.join()).toContain("JSON");
    expect(out.card).toBeNull();
  });

  it("reads note facts through link resolution and the SR file of the resolved path", async () => {
    const spec = contrast();
    const now = new Date("2026-11-10").getTime();
    const sr = {
      q1: { stability: 3.5, log: [{ d: "2026-11-01", r: 1 }, { d: "2026-01-01", r: 1 }, { d: "2026-11-02", r: 3 }] },
      q2: { stability: 20 },
    };
    const app = withSpec(spec, { "Note A": "deep/folder/Note A.md" }, { "engram-review/sr/deep__folder__Note A.json": JSON.stringify(sr) });
    const out = await composeSpecPage(app, "p", { page, now });
    expect(out.notes).toEqual(["Note A"]);
    expect(embedded(out.html, "__LIVE__").notes["Note A"]).toEqual({
      exists: true, path: "deep/folder/Note A.md", cards: 2, minStability: 3.5, again30: 1,
    });
  });

  it("marks a note that doesn't exist and treats one with no cards as plain", async () => {
    const out = await composeSpecPage(withSpec(contrast(), {}), "p", { page });
    expect(embedded(out.html, "__LIVE__").notes["Note A"]).toEqual({ exists: false });
    const out2 = await composeSpecPage(withSpec(contrast(), { "Note A": "Note A.md" }), "p", { page });
    expect(embedded(out2.html, "__LIVE__").notes["Note A"]).toEqual({ exists: true, path: "Note A.md", cards: 0 });
  });

  it("keeps a quote found in the note, ignoring punctuation, and drops one that isn't", async () => {
    const spec = map();
    spec.map.nodes[0].quote = "這是，筆記裡的話";
    spec.map.nodes[1].quote = "這句筆記沒寫";
    const app = withSpec(spec, { "Real Note": "Real Note.md", "Note 1": "Note 1.md" }, {
      "Real Note.md": "開頭 這是筆記裡的話。結尾",
      "Note 1.md": "別的內容",
    });
    const out = await composeSpecPage(app, "p", { page });
    const nodes = embedded(out.html, "__SPEC__").map.nodes;
    expect(nodes[0].quote).toBe("這是，筆記裡的話");
    expect(nodes[1].quote).toBeUndefined();
  });

  it("ignores a leftover section the form does not draw", async () => {
    const out = await composeSpecPage(withSpec({ ...reading(), contrast: {}, map: { nodes: [{ note: "Stray" }] } }), "p", { page });
    expect(out.html).toBeDefined();
    expect(out.notes).toEqual([]);
  });

  it("drops a quote too short to prove anything", async () => {
    const spec = map();
    spec.map.nodes[0].quote = "...";
    const out = await composeSpecPage(withSpec(spec, { "Real Note": "Real Note.md" }, { "Real Note.md": "內容" }), "p", { page });
    expect(embedded(out.html, "__SPEC__").map.nodes[0].quote).toBeUndefined();
  });

  it("cannot be broken out of by content, and strips embeds from the card", async () => {
    const spec = reading();
    spec.title = "</script><b>x";
    spec.card = { q: "問 ![[pic.png]]", a: "答" };
    const out = await composeSpecPage(withSpec(spec), "p", { page });
    expect(out.html).not.toContain("</script><b>");
    expect(embedded(out.html, "__SPEC__").card.q).toBe("問");
  });

  it("labels the page in the language of its content and applies the theme up front", async () => {
    const en = { ...reading(), title: "Why it holds", hook: "One line" };
    const out = await composeSpecPage(withSpec(en), "p", { page, dark: true });
    expect(embedded(out.html, "__LIVE__").lang).toBe("en");
    expect(out.html).toContain('<html lang="en">');
    expect(out.html).toContain('class="eq dark"');
    const zh = await composeSpecPage(withSpec(reading()), "p", { page });
    expect(embedded(zh.html, "__LIVE__").lang).toBe("zh");
  });
});

describe("spec files in the data layer", () => {
  it("deletes the spec file along with the page", async () => {
    const app = makeApp({
      [`${META_DIR}/p.json`]: "{}",
      [`${EXPLAINER_DIR}/p.html`]: "<html>",
      [`${EXPLAINER_DIR}/p.spec.json`]: "{}",
    });
    await deleteExplainer(app.vault.adapter, "p");
    expect(Object.keys(app.vault.adapter.files).filter((f) => f.includes("/p."))).toEqual([]);
  });

  it("queues one rewrite that keeps the page id", async () => {
    const { adapter } = makeApp({}).vault;
    const pageMeta = { id: "p", deck: "net", sourceCard: { note: "a.md", front: "原問題" } };
    await queueRegenerate(adapter, pageMeta, { q: "問", a: "答" });
    await queueRegenerate(adapter, pageMeta, { q: "問", a: "答" });
    const { entries } = await readQueue(adapter);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ status: "pending", regenerate: true, explainerId: "p", source: "a.md", q: "問", a: "答", deck: "net" });
  });

  it("falls back to the page's own record when the spec had no readable card", async () => {
    const { adapter } = makeApp({}).vault;
    await queueRegenerate(adapter, { id: "p", sourceCard: { note: "a.md", front: "原問題" } }, null);
    expect((await readQueue(adapter)).entries[0].q).toBe("原問題");
  });
});
