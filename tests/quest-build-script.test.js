import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

// The quest skill's build script is the safety net for missions an AI writes: it inlines the shared
// files and flags what would fail silently in the plugin's sandboxed frame. It is Python, so these
// tests run only where a Python 3 is on the path.
const script = path.resolve(__dirname, "../skills/quest-map/scripts/build_quest.py");
const python = ["python", "python3"].find((cmd) => {
  const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return r.status === 0 && /Python 3/.test(r.stdout + r.stderr);
});

const mission = ({ head = "", style = "", body = "", code = 'QZ.verdict({ title: "t", parts: [] });', bodyClass = "qz", lang = "en", scriptInHead = false } = {}) => {
  const block = `<script>\n/*! quest-base.js */\n${code}\n</script>`;
  return `<!DOCTYPE html>
<html${lang ? ` lang="${lang}"` : ""}><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mission</title>
<style>
/*! quest-base.css */
${style}
</style>${head}${scriptInHead ? block : ""}</head>
<body class="${bodyClass}">
<main class="wrap">${body}</main>
${scriptInHead ? "" : block}
</body></html>
`;
};

describe.skipIf(!python)("quest build script", () => {
  let dir;
  beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "quest-build-")); });
  afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  let n = 0;
  const build = (html) => {
    const file = path.join(dir, `m${++n}.html`);
    fs.writeFileSync(file, html);
    const r = spawnSync(python, [script, file], { encoding: "utf8" });
    return { file, code: r.status, out: r.stdout + r.stderr, html: fs.readFileSync(file, "utf8") };
  };

  it("inlines both shared files, and building again changes nothing", () => {
    const first = build(mission());
    expect(first.out).toMatch(/ok/);
    expect(first.code).toBe(0);
    expect(first.html).toContain("/*! end quest-base.css */");
    expect(first.html).toContain("var QZ = ");
    const again = spawnSync(python, [script, first.file], { encoding: "utf8" });
    expect(again.status).toBe(0);
    expect(fs.readFileSync(first.file, "utf8")).toBe(first.html);
  });

  it("keeps a mission's CRLF line endings", () => {
    const r = build(mission().replace(/\n/g, "\r\n"));
    expect(r.code).toBe(0);
    expect(r.html.includes("\n") && !/[^\r]\n/.test(r.html)).toBe(true);
  });

  it("passes ordinary mission content that only looks like a forbidden call", () => {
    const r = build(mission({
      style: ".cup{background:url(\"data:image/png;base64,AAAA\")} .gauge{fill:url(#grad)}",
      body: `<p>Triage each alert (P1 to P4), confirm (or reject) the fix, then git fetch (download only). Write a prompt (a short instruction).</p>
<pre>localStorage.setItem("k", 1); alert("shown as a code sample"); const r = await fetch(url);</pre>
<img data-src="later.png" alt="" src="data:image/png;base64,AAAA"><svg><use href="#icon"></use></svg><a href="#top">top</a>`,
      code: `function confirmPick() { return 1; }
function open(panel) { panel.hidden = false; }
var dialog = { confirm: function () {} }; dialog.confirm();
function buildUrl(n) { return "#" + n; }
QZ.verdict({ title: "Done", parts: [{ label: "a", got: confirmPick(), max: 1 }] });`,
    }));
    expect(r.out).toMatch(/ok/);
    expect(r.code).toBe(0);
  });

  const broken = {
    "a script loaded from elsewhere": [{ head: '<script src="lib.js"></script>' }, /script src/],
    "an image by file path": [{ body: '<img src="pic.png" alt="">' }, /src that is not a data: URI/],
    "a stylesheet url that is not a data URI": [{ style: ".x{background:url(img/a.png)}" }, /url\(\)/],
    "a network request": [{ code: 'fetch("/x"); QZ.verdict({ title: "t", parts: [] });' }, /network request/],
    "browser storage": [{ code: 'var seen = localStorage.getItem("seen"); QZ.verdict({ title: "t", parts: [] });' }, /storage/],
    "a dialog": [{ code: 'if (window.confirm("sure?")) alert("ok"); QZ.verdict({ title: "t", parts: [] });' }, /dialogs/],
    "a dialog in an inline handler": [{ body: '<button onclick="alert(1)">x</button>' }, /dialogs/],
    "a link out of the mission": [{ body: '<a href="https://example.com" target="_blank">source</a>' }, /leaves the mission/],
    "a height taken from the frame": [{ style: ".wrap{min-height:100vh}" }, /viewport units/],
    "no way to finish": [{ code: "var done = true;" }, /no way to finish/],
    "a finish call that is only a code sample": [{ code: "var done = true;", body: "<pre>QZ.verdict({})</pre>" }, /no way to finish/],
    "a body without the house style class": [{ bodyClass: "c-green" }, /missing class "qz"/],
    "a page without a language": [{ lang: "" }, /no lang/],
    "the script block in the head": [{ scriptInHead: true }, /script block is in <head>/],
  };
  for (const [name, [options, message]] of Object.entries(broken)) {
    it(`flags ${name}`, () => {
      const r = build(mission(options));
      expect(r.out).toMatch(message);
      expect(r.code).toBe(1);
    });
  }

  it("does not write a file whose markers are missing", () => {
    const html = mission().replace("/*! quest-base.js */", "");
    const r = build(html);
    expect(r.out).toMatch(/marker .* not found/);
    expect(r.code).toBe(1);
    expect(r.html).toBe(html);
  });
});
