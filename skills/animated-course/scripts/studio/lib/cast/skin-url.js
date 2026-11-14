// Where a skin module is served. Official skins live in this skill (/lib/cast/skins/<id>.js); a custom skin
// (custom:<id>) stays in the user's custom area, which render.cjs serves read-only at /engram-quest/… —
// so a custom skin is never copied into the skill, where an update would overwrite it.
export const skinUrl = (id) => (String(id).startsWith('custom:')
  ? `/engram-quest/custom/cast/skins/${String(id).slice(7)}/skin.js`
  : `/lib/cast/skins/${id}.js`);
