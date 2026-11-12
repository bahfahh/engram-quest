// What may leave the private vault when the video skills are published.
import { describe, it, expect } from "vitest";
import { danglingMentions, imageHash, isRemoved, lineHash, linesToReview, needsReview, ownerPhrases, publicFilter, shapeForPublic } from "../scripts/video-public.mjs";

const { publicText, findPrivate } = publicFilter({
  aliases: [["Acme", "DemoCo"], ["Globex", "SampleApp"]],
  names: ["Zenith"],
  paths: ["7.筆記/私人"],
});

describe("public text", () => {
  it("drops the owner's words and keeps the lesson around them", () => {
    expect(publicText("字太多（使用者：「看不完」）要改")).toBe("字太多要改");
    expect(publicText("倒著講不好懂：使用者：「正向比較好」")).toBe("倒著講不好懂：");
  });

  it.each([
    ["Keep it short. User, 2026-11-02: 「太長了」", "Keep it short."],
    ["Keep it short (user, 2026-11-06: 「太長了」) always", "Keep it short always"],
    ["A works (experiment 17; user 11-04: 「可以」)", "A works (experiment 17)"],
    ["好懂。The user: 「畫面（這裡）不可以太滿」", "好懂。"],
    ["留白 (user: \"good\", \"a good way\")。", "留白。"],
    ["字要大，使用者（三次）：「看不清楚」「還是太小」。接著", "字要大接著"],
    ["Alden, chosen by the user from 8 candidates: 「聲音好」; not local", "Alden; not local"],
    ["(the old one, which the user called ugly: 「好醜」)", "(the old one)"],
    ["**Status**: the user, after experiment 17: 「普通」. Next", "**Status**: Next"],
  ])("removes a credited quote: %s", (input, output) => {
    expect(publicText(input)).toBe(output);
    expect(findPrivate(publicText(input))).toEqual([]);
  });

  it("removes a whole credited quote block line", () => {
    expect(publicText("# 標題\n\n> 使用者（2026-11-01）：「要能換」\n\n內文")).toBe("# 標題\n\n\n內文");
  });

  it("keeps what a quoted block line goes on to explain", () => {
    expect(publicText("> User, 2026-10-30: 「太長」; 2026-11-04: 「無聊」. Experiment 16 measured why.\n")).toBe("> Experiment 16 measured why.\n");
  });

  it("leaves a user's possessive alone", () => {
    const line = "- **Taking a user's metaphor literally**: \"thinking castle\" meant something else.";
    expect(publicText(line)).toBe(line);
  });

  it("does not stop a credited quote at a quote nested inside it", () => {
    expect(publicText("甲，使用者：「要選『完整長度』，因為「很久」才算完」。乙")).toBe("甲乙");
  });

  it("keeps wording that describes the end user rather than quoting the owner", () => {
    const trigger = "使用者說「做這個月的情境回顧」時使用";
    expect(publicText(trigger)).toBe(trigger);
  });

  it("keeps instructions to ask the person something", () => {
    for (const line of ["先問使用者：「要短版還是長版？」", "Ask the user: \"Which length?\""]) {
      expect(publicText(line)).toBe(line);
      expect(findPrivate(line)).toEqual([]);
    }
  });

  it("leaves code alone even when it looks like a credit", () => {
    const code = "const who = { user: \"name\" };";
    expect(publicText(code, "lib/a.js")).toBe(code);
  });

  it("replaces project names in any case, including inside a path", () => {
    expect(publicText("Acme course and GLOBEX")).toBe("DemoCo course and SampleApp");
    expect(publicText("`acme-ads-v2/l01.mp4`")).toBe("`DemoCo-ads-v2/l01.mp4`");
  });

  it("replaces private links in each form they take", () => {
    expect(publicText("see https://claude.ai/artifact/AbC-123")).toBe("see (not public)");
    expect(publicText("see https://claude.ai/public/artifacts/AbC-123")).toBe("see (not public)");
  });

  it("replaces a private path without an apostrophe that would break a quoted string", () => {
    expect(publicText("in `7.筆記/私人/動畫/研究/` there")).toBe("in (not public) there");
    expect(publicText("const a = '7.筆記/私人/x';")).toBe("const a = '(not public)';");
  });

  it("leaves nothing the check would flag once the rules have run", () => {
    const text = publicText("Acme（使用者：「好」）Globex https://claude.ai/artifact/x 7.筆記/私人/a");
    expect(findPrivate(text)).toEqual([]);
  });
});

describe("private details check", () => {
  it("reports the line of anything left behind", () => {
    expect(findPrivate("ok\nZenith here")).toEqual([{ line: 2, match: "Zenith" }]);
  });

  it("finds names in any case", () => {
    expect(findPrivate("zenith-notes").map((hit) => hit.match)).toEqual(["zenith"]);
  });

  it("flags a credited quote in a form no rule removed", () => {
    expect(findPrivate("使用者又說（週五）：「不要」")).toHaveLength(1);
  });
});

describe("lines a person has to read", () => {
  it.each([
    "**使用者**：「太長了」",
    "使用者：『太長了』",
    "User: 'too long'",
    "用戶：「太長了」",
    "Owner: \"too long\"",
    "使用者 2026-11-03：可以超越",
    "> 使用者：",
    "the user, on Iris's sample: 「太長」",
    "(user 2026-11-10; reference/07.md)",
    "（使用者 2026-11-10 決定）",
    "decided 2026-11-10 by the owner",
    "auto means edge-tts (user, 2026-11-10; reference/07.md §1c)",
  ])("asks about %s, whichever rule missed it", (line) => {
    expect(linesToReview(line)).toEqual([line]);
  });

  it("does not ask about plain lines", () => {
    expect(linesToReview("普通的一行中文\nA user can press space.")).toEqual([]);
  });

  it("recognises a line by its content, ignoring indentation", () => {
    expect(lineHash("  a")).toBe(lineHash("a"));
    expect(lineHash("a")).not.toBe(lineHash("b"));
  });

  it("collects credited phrases so a repeat without the credit is caught", () => {
    expect(ownerPhrases("User: 「範例的第一句話」")).toEqual(["範例的第一句話"]);
    expect(ownerPhrases("普通的一行")).toEqual([]);
  });

  it("applies case-specific edits kept with the private terms", () => {
    const { publicText: edited } = publicFilter({ aliases: [], names: ["Zenith"], paths: ["x/y"], edits: [["^secret note:.*$", "note"]] });
    expect(edited("a\nsecret note: b")).toBe("a\nnote");
  });

  it("leaves a block line alone when it has no quotation", () => {
    const line = "> User can press space.\n";
    expect(publicText(line)).toBe(line);
  });
});

describe("which files ship", () => {
  it("leaves out the teaching skill's kits and maps built for one series, not the generic ones", () => {
    for (const rel of ["scripts/studio/lib/azure/kit.js", "scripts/studio/lib/classroom/coursemap-stock.js", "scripts/studio/lib/classroom/COURSEMAP-PSTACK.md", "scripts/studio/lib/house/coursemap-azure.js", "scripts/studio/lib/house/coursemap-ops.js"]) {
      expect(isRemoved("animated-course", rel)).toBe(true);
    }
    for (const rel of ["scripts/studio/lib/classroom/coursemap-aieng.js", "scripts/studio/lib/classroom/coursemap4.js", "scripts/studio/lib/house/coursemap.js", "scripts/studio/lib/house/coursemap-aieng.js"]) {
      expect(isRemoved("animated-course", rel)).toBe(false);
    }
    expect(isRemoved("animated-course", "assets/looks/a.jpg")).toBe(false);
    expect(isRemoved("episodic-review", "scripts/studio/lib/azure/kit.js")).toBe(false);
  });

  it("asks for review of every image, wherever it is", () => {
    expect(needsReview("assets/looks/a.jpg")).toBe(true);
    expect(needsReview("assets/shells/rooms/new.GIF")).toBe(true);
    expect(needsReview("assets/portraits/nico.jpg")).toBe(true);
    expect(needsReview("assets/music/a.mp3")).toBe(false);
  });

  it("ties an approval to the image's content", () => {
    expect(imageHash(Buffer.from("a"))).not.toBe(imageHash(Buffer.from("b")));
    expect(imageHash(Buffer.from("a"))).toBe(imageHash(Buffer.from("a")));
  });
});

describe("per-file rules", () => {
  const shape = (rel, text) => shapeForPublic("animated-course", rel, text);

  it("drops the pointers to left-out course maps and demo films", () => {
    expect(shape("SKILL.md", "methods; the demo films (minimum bar)\nnext")).toBe("methods\nnext");
    expect(shape("reference/08-tools.md", "| a |\n| `classroom/coursemap-stock.js` | b |\n| c |\n")).toBe("| a |\n| c |\n");
    expect(shape("scripts/studio/lib/house/HOUSE.md", "| `coursemap.js` | x |\n| `coursemap-ops.js` | y |\n")).toBe("| `coursemap.js` | x |\n");
  });

  it("cuts the demo-film section up to the next section, not to the end of the file", () => {
    const doc = "a, `coursemap-stock.js` (also §5b), `coursemap-pstack.js` (§5 only)\n`coursemap4.js`, `coursemap-stock.js` and `coursemap-pstack.js` silently ignore them\n## 4. The demo films\nfilms\n## 5. Next\nkept";
    expect(shape("reference/05-presentation-methods.md", doc)).toBe("a\n`coursemap4.js` silently ignores them\n## 5. Next\nkept");
  });

  it("drops the rows of stills that are not published", () => {
    expect(shape("assets/looks/README.md", "| `1a-l01-x.jpg` | ok |\n| `1b-l01-y.jpg` | no |\n")).toBe("| `1a-l01-x.jpg` | ok |\n");
  });

  it("stops when a rule no longer finds its text in the master", () => {
    expect(() => shape("SKILL.md", "rewritten without that clause")).toThrow(/no longer finds/);
  });

  it("leaves other files and other skills alone", () => {
    expect(shapeForPublic("episodic-review", "reference/08-tools.md", "coursemap-stock.js")).toBe("coursemap-stock.js");
    expect(shape("reference/02-content.md", "字")).toBe("字");
  });
});

describe("pointers to left-out files", () => {
  const texts = [{ rel: "SKILL.md", text: "see legacy-shells.md, film.js, README.md and figs/sample.png" }];

  it("finds a shipped text naming a removed file or an unapproved image", () => {
    expect(danglingMentions(texts, ["SKILL.md"], ["reference/legacy-shells.md", "figs/sample.png"])).toEqual([
      { rel: "SKILL.md", name: "legacy-shells.md" },
      { rel: "SKILL.md", name: "sample.png" },
    ]);
  });

  it("ignores names a shipped file shares, and film.js", () => {
    expect(danglingMentions(texts, ["SKILL.md", "templates/README.md"], ["legacy/README.md", "assets/shells/board/film.js"])).toEqual([]);
  });
});
