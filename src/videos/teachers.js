"use strict";
// The teachers the plugin can offer. teachers.json is generated from the video skill's registry
// (scripts/sync-video-skills.mjs), so a teacher added there appears here without a code change.

const { teachers, skins } = require("./teachers.json");

const TEACHERS = teachers.filter((x) => !x.hidden);
const DEFAULT = TEACHERS.find((x) => x.default) || TEACHERS[0];

/** A { "zh-tw": …, en: … } map in the given locale, falling back to whichever language exists. */
function localText(map, locale) {
  return (map && (map[locale] || map.en || map["zh-tw"])) || "";
}

/** The teacher behind a saved id; an unknown or hidden id reads as the default teacher. */
function findTeacher(id) {
  return TEACHERS.find((x) => x.id === id) || DEFAULT;
}

/**
 * The teacher named on a finished video, retired ones included; `custom` holds the user's own teachers
 * (custom-teachers.js), for films a custom:<id> teacher made. null when the id is unknown.
 */
function teacherOfVideo(id, custom = []) {
  return teachers.find((x) => x.id === id) || custom.find((x) => x.id === id) || null;
}

function canUse(teacher, licensed) {
  return teacher.tier !== "pro" || !!licensed;
}

function variantsOf(teacher) {
  const skin = skins.find((s) => s.id === teacher.skin);
  return (skin && skin.variants) || [];
}

/** The chosen colour set, or the teacher's first one; null for teachers with a single look. */
function variantOf(teacher, chosen) {
  const all = variantsOf(teacher);
  return all.find((v) => v.id === chosen) || all[0] || null;
}

/** Key into PORTRAITS: a variant carries its own portrait file, otherwise the teacher's id. */
function portraitKey(teacher, chosen) {
  const variant = variantOf(teacher, chosen);
  return variant && variant.portrait ? variant.portrait.split("/").pop().replace(/\.[^.]+$/, "") : teacher.id;
}

module.exports = { TEACHERS, DEFAULT, localText, findTeacher, teacherOfVideo, canUse, variantsOf, variantOf, portraitKey };
