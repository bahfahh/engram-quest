// Installing the video skills from their packs, end to end, against a local server laid out like the
// GitHub releases (<tag>/<file>). The packs come from `npm run sync:video-skills` and are not in git,
// so this runs where they have been synced and is skipped elsewhere.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getInstallPreview, doInstall } from "../src/hub/skills.js";
import { RELEASE_BASE, packTag, loadPack } from "../src/skills/video-pack.js";
import bundledSkills from "../scripts/sync-bundled-skills.js";
import VIDEO_MODULES from "../src/skills/video-modules.json";
import SAMPLE_PACK from "../src/videos/teacher-samples.json";

const repo = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const packs = [...Object.values(VIDEO_MODULES).map((m) => m.pack), SAMPLE_PACK];
const synced = packs.every((pack) => existsSync(repo(`video-packs/${pack.file}`)));
const text = (data) => (typeof data === "string" ? data : new TextDecoder().decode(data));

function vault() {
  const files = {};
  const adapter = {
    files,
    exists: async (p) => p in files || Object.keys(files).some((f) => f.startsWith(p + "/")),
    read: async (p) => text(files[p]),
    write: async (p, content) => { files[p] = content; },
    writeBinary: async (p, data) => { files[p] = data; },
    readBinary: async (p) => files[p],
  };
  return {
    settings: {},
    saveData: async () => {},
    app: { vault: { adapter, configDir: ".obsidian", getAbstractFileByPath: () => ({}), createFolder: async () => {} } },
  };
}

describe.skipIf(!synced)("video skills installed from their packs", () => {
  const obsidian = createRequire(import.meta.url)("obsidian");
  const had = obsidian.requestUrl;
  const asked = [];
  let server;
  let base;

  beforeAll(async () => {
    // Only <tag>/<file> with the tag equal to the file name without ".pack" is served, as a release would.
    server = createServer((req, res) => {
      const [, tag, file] = req.url.split("/");
      const pack = packs.find((p) => p.file === file && packTag(p) === tag);
      if (!pack) { res.statusCode = 404; res.end(); return; }
      res.end(readFileSync(repo(`video-packs/${file}`)));
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    base = `http://127.0.0.1:${server.address().port}`;
    obsidian.requestUrl = async ({ url }) => {
      asked.push(url);
      if (!url.startsWith(RELEASE_BASE + "/")) throw new Error(`unexpected host: ${url}`);
      const res = await fetch(base + url.slice(RELEASE_BASE.length));
      if (!res.ok) throw new Error(`Request failed, status ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return { arrayBuffer };
    };
  });
  afterAll(() => { obsidian.requestUrl = had; server && server.close(); });

  const root = (id) => `.claude/skills/engram-quest-${id}`;
  const install = async (plugin) => {
    const preview = await getInstallPreview(plugin, "claude");
    await doInstall(plugin, preview);
    return preview;
  };

  it("a free install downloads the free skill, writes every file but the Pro ones, and ends installed", async () => {
    const plugin = vault();
    asked.length = 0;
    await install(plugin);
    const { files } = plugin.app.vault.adapter;
    const course = VIDEO_MODULES["animated-course"];

    expect(asked).toEqual([`${RELEASE_BASE}/${packTag(course.pack)}/${course.pack.file}`]);
    for (const file of course.files) {
      if (course.pro.includes(file)) expect(files[`${root("animated-course")}/${file}`], file).toBeUndefined();
      else expect(files[`${root("animated-course")}/${file}`], file).toBeDefined();
    }
    expect(files[`${root("animated-course")}/.engram-pack`]).toBe(course.pack.sha256);
    expect(Object.keys(files).some((p) => p.startsWith(root("episodic-review")))).toBe(false);
    expect((await getInstallPreview(plugin, "claude")).status).toBe("installed");
  });

  it("each pack carries exactly the repo's reviewed text, as the installed copy reads it", async () => {
    const plugin = vault();
    plugin.settings = { licenseValid: true };
    await install(plugin);
    const { files } = plugin.app.vault.adapter;
    for (const [id, video] of Object.entries(VIDEO_MODULES)) {
      for (const file of video.files) {
        let expected = readFileSync(repo(`skills/${id}/${file === "SKILL.md" ? "skills.md" : file}`), "utf8");
        if (file === "SKILL.md") {
          expected = bundledSkills.withCustomPointer(expected, file).replace(/\b(bash|node|python3) scripts\//g, `$1 ${root(id)}/scripts/`);
        }
        expect(text(files[`${root(id)}/${file}`]), `${id}/${file}`).toBe(expected);
      }
      expect(text(files[`${root(id)}/custom-area.md`])).toBe(readFileSync(repo("skills/shared/custom-area.md"), "utf8"));
    }
  });

  it("a licence added later brings the Pro files with the next install", async () => {
    const plugin = vault();
    await install(plugin);
    plugin.settings = { licenseValid: true };
    const preview = await install(plugin);
    expect(preview.items.find((i) => i.path === `${root("animated-course")}/.engram-pack`).action).toBe("replace");
    for (const file of VIDEO_MODULES["animated-course"].pro) expect(plugin.app.vault.adapter.files[`${root("animated-course")}/${file}`]).toBeDefined();
    expect((await getInstallPreview(plugin, "claude")).status).toBe("installed");
  });

  it("the Pro teachers' voice samples download from their own release", async () => {
    const files = await loadPack({
      adapter: vault().app.vault.adapter, configDir: ".obsidian", pack: SAMPLE_PACK,
      fetchUrl: async (url) => (await obsidian.requestUrl({ url })).arrayBuffer,
    });
    expect(files.map((f) => f.path)).toEqual(SAMPLE_PACK.ids.map((id) => `${id}.mp3`));
  });
});
