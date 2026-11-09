// What may leave the private vault when the video skills are published.
import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { blankShellContent, filmPhrases, imageHash, isRemoved, lineHash, linesToReview, needsReview, ownerPhrases, publicFilter, shapeForPublic } from "../scripts/video-public.mjs";

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
  ])("asks about %s, whichever rule missed it", (line) => {
    expect(linesToReview("reference/a.md", line)).toEqual([line]);
  });

  it("asks about any Chinese left in shell code", () => {
    expect(linesToReview("assets/shells/rooms/draw.js", "const a = '料號';")).toHaveLength(1);
    expect(linesToReview("assets/shells/rooms/old/words.js", "text: '真實句子'")).toHaveLength(1);
  });

  it("does not ask about markers, short categories, or plain notes", () => {
    expect(linesToReview("assets/shells/rooms/content.js", "{ id: 'a', where: '白板', use: '小標', text: '{{FILL:a}}' },")).toEqual([]);
    expect(linesToReview("assets/shells/rewind/content.js", "S('a', 0, 1, '{{FILL:a}}', '小標', '螢幕');")).toEqual([]);
    expect(linesToReview("reference/a.md", "普通的一行中文")).toEqual([]);
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
  it("leaves out records of real films but not the shell's code", () => {
    expect(isRemoved("assets/shells/rooms/STORYBOARD.md")).toBe(true);
    expect(isRemoved("assets/shells/rooms/old/storyboard.MD")).toBe(true);
    expect(isRemoved("assets/shells/board/onscreen.txt")).toBe(true);
    expect(isRemoved("assets/shells/rooms/README.md")).toBe(false);
    expect(isRemoved("templates/STORYBOARD.md")).toBe(false);
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

describe("shell code", () => {
  const list = "const all = TEXT.join('') + '乙甲乙審核單在這裡ABC要多備貨0123456789丙';";

  it("keeps every glyph of the preload list but none of its sentences", () => {
    const out = shapeForPublic("assets/shells/rooms/film.js", list);
    const glyphs = out.match(/\+ '(.*)';/)[1];
    expect(new Set(glyphs)).toEqual(new Set("乙甲乙審核單在這裡ABC要多備貨0123456789丙"));
    expect(glyphs).not.toContain("審核單");
  });

  it("removes film titles from a page title and comments", () => {
    expect(shapeForPublic("assets/shells/rooms/scene.html", "<title>倒帶回十月</title>")).toBe("<title>Film</title>");
    expect(shapeForPublic("assets/shells/rooms/world.js", "// 〈倒帶〉 world: built once\nconst a = '〈字〉';")).toBe("// world: built once\nconst a = '〈字〉';");
  });

  it("asks for an update on a content file it does not know", () => {
    for (const rel of ["assets/shells/rooms/content.en.js", "assets/shells/rooms/old/content.js", "assets/shells/rooms/content.ts"]) {
      expect(() => shapeForPublic(rel, "export const TEXT = [];")).toThrow(/film content/);
    }
  });

  it("turns words a scene draws directly into markers", () => {
    const out = shapeForPublic("assets/shells/rooms/demos.js", "  E2: { text: PC[0], short: '料號', sub: '採購', band: 1 },");
    expect(out).toBe("  E2: { text: PC[0], short: '{{FILL:demo.E2.short}}', sub: '{{FILL:demo.E2.sub}}', band: 1 },");
  });
});

describe("shell content", () => {
  const ui = "const UI_SETS = { 'zh-tw': { notice: '畫面是比喻' }, en: { notice: 'Pictures' } };\nexport const UI = UI_SETS['en'];\n";

  it("replaces a film's words with markers and keeps its structure", () => {
    const out = blankShellContent("rooms", `${ui}export const TL = { open: [0, 8] };
export const TEXT = [
  { id: 'r1.q', t0: 52.5, t1: 186, kind: 'world', where: '白板標題', use: '問題', text: '業務規則該寫在哪裡？', sub: '說明', card: true },
  { id: 'r1.a', t0: 1, t1: 2, kind: 'dom', use: '揭曉', text: UI.notice, src: 'note name' },
];
`);
    expect(out).toContain("text: '{{FILL:r1.q}}', sub: '{{FILL:r1.q.sub}}'");
    expect(out).toContain("use: '問題'");
    expect(out).toContain("where: '白板'");
    expect(out).toContain("t0: 52.5");
    expect(out).toContain("text: UI.notice, src: '{{FILL:r1.a.src}}'");
    expect(out).toContain("notice: '畫面是比喻'");
    expect(out).toContain("export const TL = { open: [0, 8] }");
    expect(out).not.toContain("業務規則");
  });

  it("leaves the separators the shell code splits on", () => {
    const out = blankShellContent("rooms", `export const TEXT = [
  { id: 'a', text: '甲・乙／丙' },
  { id: 'r3.sig1', text: '監督式：有答案' },
];
`);
    expect(out).toContain("'{{FILL:a.1}}・{{FILL:a.2}}／{{FILL:a.3}}'");
    expect(out).toContain("'{{FILL:r3.sig1.1}}：{{FILL:r3.sig1.2}}'");
  });

  it("keeps prose whole even when it holds a separator", () => {
    const out = blankShellContent("rooms", "export const TEXT = [{ id: 'r3.recall.a', text: '會／不會' }];\n");
    expect(out).toContain("'{{FILL:r3.recall.a}}'");
  });

  it("drops topic words from the place notes and keeps the place", () => {
    const out = blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x', where: '採購單旁的黑便條' }, { id: 'b', text: 'y', where: '螢幕（LLM 候選字清單）' }, { id: 'c', text: 'z', where: '某個專案的桌上' }, { id: 'd', text: 'w', where: '白板上寫著真實訂單' }];\n");
    expect(out).toContain("where: '便條'");
    expect(out).toContain("where: '螢幕'");
    expect(out).toContain("where: ''");
    expect(out).toContain("where: '白板'");
    expect(out).not.toContain("真實訂單");
  });

  it("stops on wording in a form the rules do not handle", () => {
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: x ? '真實甲' : '真實乙' }];\n")).toThrow(/真實甲/);
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: L('真實甲') }];\n")).toThrow(/真實甲/);
    expect(() => blankShellContent("rewind", "const S = () => 0;\nS('a', 0, 1, x ? '真實甲' : 'y', '片頭', '畫面');\n")).toThrow(/真實甲/);
  });

  it("blanks a template string in a text call", () => {
    const out = blankShellContent("rewind", "const S = () => 0;\nS('a', 0, 1, `真實`, '片頭', '畫面');\n");
    expect(out).toContain("S('a', 0, 1, '{{FILL:a}}', '片頭', '畫面');");
  });

  it("removes a leading comment without touching the code after it", () => {
    const out = blankShellContent("rooms", "export const TEXT = [\n  /* 真實專案 */ { id: 'a', text: 'x' },\n];\n");
    expect(out).toContain("  { id: 'a', text: '{{FILL:a}}' },");
    expect(out).not.toContain("真實專案");
  });

  it("refuses a shell it does not know", () => {
    expect(() => shapeForPublic("assets/shells/castle/content.js", "export const TEXT = [];\n")).toThrow(/Unknown shell/);
  });

  it("blanks the arguments of a text call but not its structure", () => {
    const out = blankShellContent("rewind", "const S = () => 0;\nS('s1_q', 1 + 2, 3, '影片好不好看，\\n要在哪？', '問題', '便條（窗上）');\n");
    expect(out).toContain("S('s1_q', 1 + 2, 3, '{{FILL:s1_q}}', '問題', '便條');");
  });

  it("names nested board cards and treats every screen string as wording", () => {
    const out = blankShellContent("board", `export const CARDS = [
  { id: 'c1.grid', kind: 'grid', at: 'b', rows: [['一', '']], colA: { head: '欄', cells: ['格'] }, icons: ['person'] },
  { id: 'c2.inc', kind: 'file', lines: ['14:20　開始出錯'] },
  { id: 'p', kind: 'photo', src: 'assets/fig', caption: UI.noteFigure },
  { id: 'K', kind: 'q', src: '〈筆記〉' },
];
export const SCREEN_TXT = { 'c3-valid': { from: '外面的請求', name: '說明' } };
export const BEATS = [{ id: 'quiz2', kind: 'quiz', hint: 'pool', hintCap: '提示', note: '鏡頭', cards: ['c1.grid'] }];
`);
    expect(out).toContain("rows: [['{{FILL:c1.grid.rows.1.1}}', '']]");
    expect(out).toContain("colA: { head: '{{FILL:c1.grid.colA.head}}', cells: ['{{FILL:c1.grid.colA.cells.1}}'] }");
    expect(out).toContain("icons: ['person']");
    expect(out).toContain("lines: ['{{FILL:c2.inc.lines.1.time}}　{{FILL:c2.inc.lines.1}}']");
    expect(out).toContain("src: 'assets/fig'");
    expect(out).toContain("src: '{{FILL:K.src}}'");
    expect(out).toContain("from: '{{FILL:scr.c3-valid.from}}', name: '{{FILL:scr.c3-valid.name}}'");
    expect(out).toContain("hint: 'pool', hintCap: '{{FILL:quiz2.hintCap}}', note: ''");
  });

  it("takes film titles and film words out of comments", () => {
    const out = blankShellContent("rewind", `// 〈倒帶回十月〉: every piece of text.
// use: 片頭 / 全貌
// ---------- room 1: 輕量 DDD
/* ---------- 第 1 站　外觀 ---------- */
const a = 1; // 禍 → 那一關
const S = () => 0;
S('x', 0, 1, '字', '片頭', '畫面');
`);
    expect(out).toContain("// every piece of text.");
    expect(out).toContain("// use: 片頭 / 全貌");
    expect(out).toContain("// ---------- room 1\n");
    expect(out).toContain("/* ---------- */");
    expect(out).toContain("const a = 1;\n");
    expect(out).not.toMatch(/倒帶回|輕量|外觀|禍/);
  });

  it("stops rather than ship film text outside the known places", () => {
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x' }];\nconst stray = '真實內容';\n")).toThrow(/真實內容/);
  });

  it("asks for an update when the film data is not where it expects", () => {
    expect(() => blankShellContent("rooms", "export const OTHER = [];\n")).toThrow(/No film wording/);
    expect(() => blankShellContent("rooms", "export const TEXT = mk([{ id: 'a', text: 'x' }]);\n")).toThrow(/not plain data/);
  });

  it("stops on a new field rather than guessing what it is", () => {
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x', align: 'left' }];\n")).toThrow(/New field "align"/);
  });

  it("stops on English wording outside the film data, not only on Chinese", () => {
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x' }];\nconst extra = [{ text: 'A real sentence' }];\n")).toThrow(/A real sentence/);
  });

  it("stops on a long sentence hiding in a field that may keep a short word", () => {
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x', use: '這是一句很長的真實內容' }];\n")).toThrow(/真實內容/);
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x', use: 'A very long real sentence' }];\n")).toThrow(/long real/);
  });

  it("stops on English sentences wherever they sit in the content file", () => {
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x' }];\nconst extra = ['A real sentence from the film'];\n")).toThrow(/real sentence/);
    expect(() => blankShellContent("rewind", "const S = () => 0;\nS('a', 0, 1, x ? 'A real sentence' : 'b', '片頭', '畫面');\n")).toThrow(/real sentence/);
    expect(() => blankShellContent("rooms", "export const TEXT = [{ id: 'a', text: 'x', extra: y ? 'A real sentence' : 'b' }];\n")).toThrow(/New field "extra"/);
  });

  it("lists the film's phrases for the check across other files", () => {
    const phrases = filmPhrases("assets/shells/rooms/content.js", "export const TEXT = [{ id: 'a', text: '業務規則該寫在哪裡', sub: '短' }];\n");
    expect(phrases).toEqual(["業務規則該寫在哪裡"]);
    expect(filmPhrases("assets/shells/rooms/film.js", "const a = 1;")).toEqual([]);
  });

  it("only touches the shells' content files, and notes the missing stills", () => {
    expect(shapeForPublic("assets/shells/rooms/demos.js", "const a = '字';")).toBe("const a = '字';");
    const readme = shapeForPublic("assets/demos/README.md", "# 目錄\n\n內文");
    expect(readme.split("\n")[2]).toContain("沒有定格");
  });

  const published = path.join(__dirname, "..", "skills", "episodic-review", "assets", "shells");
  describe.runIf(fs.existsSync(published))("published shells", () => {
    it.each(["rooms", "rewind", "board"])("%s carries only markers in its film data", (shell) => {
      const text = fs.readFileSync(path.join(published, shell, "content.js"), "utf8");
      expect(findPrivate(text)).toEqual([]);
      expect((text.match(/\{\{FILL:/g) || []).length).toBeGreaterThan(100);
      const rest = text
        .replace(/const UI_SETS = \{[\s\S]*?\n\};/, "")
        .replace(/\/\/ (use|countdowns):.*/g, "")
        .replace(/use: '[^']*'|where: '[^']*'|name: '案件.'/g, "")
        .replace(/, '[^',]*', '[^',]*'\);$/gm, "")
        .replace(/^.*(WORD =|\/\^ja|\[㐀-鿿\]).*$/gm, "")
        .replace(/\{\{FILL:[^}]+\}\}/g, "");
      expect(rest).not.toMatch(/[㐀-鿿]/);
    });
  });
});
