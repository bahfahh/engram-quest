"use strict";
// Teachers the user's AI made, kept in the user's custom area. The plugin only reads them: nothing here
// writes to engram-quest/custom/ (doc/tickets: 自訂區). A custom teacher is saved as `custom:<id>` and,
// like the Pro teachers, needs a licence; the video skill checks its beats and falls back when they are wrong.

const { findTeacher } = require("./teachers");

const CUSTOM_DIR = "engram-quest/custom";
// The new folder first; the older ones the skills used before the custom area are still read.
const TEACHER_DIRS = [`${CUSTOM_DIR}/cast/teachers`, "engram-quest/cast/custom", "engram-quest/video/teachers"];
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

const isMap = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const textMap = (v) => (typeof v === "string" && v ? { en: v } : isMap(v) ? v : null);

/** A custom skin (`custom:<id>`) may carry a portrait.jpg; official skins have none of their own here. */
async function portraitOf(adapter, skin) {
  if (typeof skin !== "string" || !skin.startsWith("custom:") || !ID.test(skin.slice(7))) return null;
  const file = `${CUSTOM_DIR}/cast/skins/${skin.slice(7)}/portrait.jpg`;
  return (await adapter.exists(file)) && adapter.getResourcePath ? adapter.getResourcePath(file) : null;
}

/** Every custom teacher that can be read, as the picker shows teachers; a file that cannot be read is left out. */
async function loadCustomTeachers(adapter) {
  const found = new Map();
  for (const dir of TEACHER_DIRS) {
    let listing;
    try {
      if (!(await adapter.exists(dir))) continue;
      listing = await adapter.list(dir);
    } catch (e) {
      console.warn("EngramQuest: could not list custom teachers in", dir, e);
      continue;
    }
    for (const file of listing.files.slice().sort()) {
      const id = file.slice(dir.length + 1).replace(/\.json$/, "");
      if (!file.endsWith(".json") || !ID.test(id) || found.has(id)) continue;
      let raw;
      try { raw = JSON.parse(await adapter.read(file)); } catch (_) { continue; }
      const name = isMap(raw) && textMap(raw.name);
      if (!name) continue;
      found.set(id, {
        id: `custom:${id}`,
        tier: "pro",
        custom: true,
        name,
        title: textMap(raw.title),
        effect: textMap(raw.effect),
        fitsIf: textMap(raw.fitsIf),
        skin: typeof raw.skin === "string" ? raw.skin : null,
        portrait: await portraitOf(adapter, raw.skin),
      });
    }
  }
  return [...found.values()];
}

/** The teacher behind a saved id, the user's own included; an unknown id reads as the default teacher. */
function findTeacherIn(custom, id) {
  return custom.find((x) => x.id === id) || findTeacher(id);
}

module.exports = { CUSTOM_DIR, loadCustomTeachers, findTeacherIn };
