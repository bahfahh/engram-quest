#!/usr/bin/env node
// Resolve which teacher teaches, and print everything a production needs (JSON on stdout).
//
//   node scripts/studio/lib/cast/resolve.cjs [--vault <vault root>] [--series <slug>] [--teacher <id>] [--variant <colour set id>] [--lang zh-tw|en] [--engine edge|gemini|azure|custom] [--off cards] [--on cards]
//
// Order: --teacher (the user named one in the request) > the series' meta.json → cast.teacher (--series)
//        > engram-quest/videos/settings.json → cast.teacher > the registry's default teacher.
//        Registry: this skill's lib/cast/teachers.json. A custom teacher is custom:<id> →
//        engram-quest/cast/custom/<id>.json (or engram-quest/video/teachers/<id>.json).
//        A pro teacher needs "pro": true in settings.json, however it was chosen; a teacher whose skin file
//        is not installed cannot be used either. Both fall back to the default teacher, reason in notes.
//        Language: --lang > settings.json → narrationLang > zh-tw ("follow": pass --lang with the notes' language).
// Output: teacher (full registry entry), skin {id, kind, file, status, variants?, variant}, voices {teacher, student} ready for
//         script.json "voices", beats with their definitions, modules (which default-on course parts are on,
//         reference/12-modules.md), and notes[] explaining every fallback.
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
// vault: --vault, else $VAULT, else the first folder above the cwd or above this file (a studio copy outside the vault,
// e.g. in a scratchpad, finds nothing above itself — then $VAULT or --vault is needed) that has engram-quest/ or .obsidian/
const isVault = d => fs.existsSync(path.join(d, 'engram-quest')) || fs.existsSync(path.join(d, '.obsidian'));
const vault = path.resolve(opt('vault') || process.env.VAULT || [findVault(process.cwd()), findVault(__dirname)].find(isVault) || process.cwd());
const notes = [];
if (!fs.existsSync(path.join(vault, 'engram-quest'))) {  // debug/issue-2026-11-03-animated-course-resolve-vault-from-studio.md
  const w = `vault not found from ${process.cwd()} (no engram-quest/ folder); settings.json is ignored — pass --vault <vault root>`;
  notes.push(w); console.error('resolve.cjs: ' + w);
}

function findVault(dir) {
  let d = dir; for (let i = 0; i < 12; i++) { if (fs.existsSync(path.join(d, 'engram-quest')) || fs.existsSync(path.join(d, '.obsidian'))) return d; const p = path.dirname(d); if (p === d) break; d = p; }
  return dir;
}
const readJSON = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const reg = readJSON(path.join(__dirname, 'teachers.json'));
const settings = readJSON(path.join(vault, 'engram-quest/videos/settings.json')) || {};
const pro = settings.pro === true;
const def = reg.teachers.find(t => t.default) || reg.teachers[0];
const narration = settings.narrationLang;
const lang = (opt('lang') || (narration === 'zh-tw' || narration === 'en' ? narration : 'zh-tw')).toLowerCase();
if (!opt('lang') && (narration === undefined || narration === 'follow')) notes.push('narrationLang is "follow" or unset: if the source notes are not zh-tw, re-run with --lang <their language>');

const seriesMeta = opt('series') ? readJSON(path.join(vault, `engram-quest/videos/${opt('series')}/meta.json`)) : null;
const seriesTeacher = seriesMeta && seriesMeta.cast && seriesMeta.cast.teacher;
let want = opt('teacher') || seriesTeacher || (settings.cast && settings.cast.teacher) || null;
if (opt('teacher')) notes.push(`teacher named in the request: ${want}`);
else if (seriesTeacher) notes.push(`teacher from the series: ${want}`);
else if (want) notes.push(`teacher from settings.json: ${want}`);
else notes.push(`no teacher chosen → default ${def.id}`);

let teacher = null;
if (want && want.startsWith('custom:')) {
  const id = want.slice(7);
  teacher = readJSON(path.join(vault, `engram-quest/cast/custom/${id}.json`)) || readJSON(path.join(vault, `engram-quest/video/teachers/${id}.json`));
  if (!teacher) notes.push(`custom teacher ${id} not found → default`);
  else {
    teacher.tier = 'pro'; teacher.custom = true;
    const bad = ['hook', 'explain', 'pause', 'recap'].filter(b => !teacher.beats || !reg.beats[b] || !(teacher.beats[b] in reg.beats[b]));
    if (bad.length) { notes.push(`custom teacher ${id}: beats not in the registry (${bad.join(', ')}) → default`); teacher = null; }
  }
} else if (want) {
  teacher = reg.teachers.find(t => t.id === want) || null;
  if (!teacher) notes.push(`teacher ${want} not in the registry → default`);
  // A hidden teacher is not offered in the plugin, which reads a saved one as the default; only a request can name it.
  if (teacher && teacher.hidden && !opt('teacher')) { notes.push(`${teacher.id} is hidden → default`); teacher = null; }
}
if (teacher && teacher.tier === 'pro' && !pro) { notes.push(`${teacher.id} needs Pro and settings.json has no "pro": true → default`); teacher = null; }
if (!teacher) teacher = def;

const skins = reg.skins || [];
const studio = path.resolve(__dirname, '..', '..');
const skinOf = t => skins.find(s => s.id === t.skin) || { id: t.skin, kind: '3d', file: `/lib/cast/skins/${t.skin}.js` };
const installed = s => !(s.file && s.file.startsWith('/lib/')) || fs.existsSync(path.join(studio, s.file));
if (teacher !== def && !teacher.custom && !installed(skinOf(teacher))) { notes.push(`${teacher.id}: skin file ${skinOf(teacher).file} is not installed → default`); teacher = def; }
let skin = skinOf(teacher);
if (teacher.custom && !skins.find(s => s.id === teacher.skin)) {
  const dir = path.join(vault, `engram-quest/cast/skins/${teacher.skin}`);
  if (fs.existsSync(dir)) { skin = { id: teacher.skin, kind: '3d', file: null, dir, custom: true }; notes.push(`custom skin in ${dir}: copy skin.js to scripts/studio/lib/cast/skins/${teacher.skin}.js before rendering`); }
}
if (!installed(skin)) notes.push(`WARNING: skin file ${skin.file} missing in the studio`);
if (skin.kind === '2d') notes.push(`skin ${skin.id} is 2D: it cannot go into the 3D classroom (makeCast); place it on a flat scene with /lib/cast/stage.js, and keep the classroom opening with the clay cast or open on the real-UI floor`);
if (skin.status && skin.status !== 'approved') notes.push(`skin ${skin.id} status: ${skin.status} (the look may still change; the pose interface will not)`);

// colour set (CAST.md "Colour sets"): --variant > settings.json cast.variants[<teacher id>] > cast.variant > the skin's first set.
// Pass skin.variant to makeCast(skin.id, { renderer, variant }) and to create(env, { variant }) on flat scenes.
const cs = settings.cast || {};
const wantVar = opt('variant') || (cs.variants && cs.variants[teacher.id]) || cs.variant || null;
const vlist = Array.isArray(skin.variants) ? skin.variants : [];
skin = Object.assign({}, skin);
if (wantVar && vlist.some(v => v.id === wantVar)) { skin.variant = wantVar; notes.push(`colour set: ${wantVar}`); }
else {
  skin.variant = vlist.length ? vlist[0].id : null;
  if (wantVar) notes.push(`colour set ${wantVar} is not offered by skin ${skin.id} → ${skin.variant || 'its only look'}`);
}

// voices: the teacher's from the registry; the student a different voice
const L = lang;
const tv = (teacher.voice && teacher.voice[L]) || null;
if (!tv) notes.push(`no ${L} voice for ${teacher.id} in the registry: pick one from edge-tts --list-voices (registry voicePolicy.other), test it with ASR, and set script.json voices by hand`);
const conv = v => v && { voice: v.name, rate: v.rate || '+0%', pitch: v.pitch || '+0Hz' };
const sv = (reg.studentVoices || {})[L];
let studentV = sv ? conv(sv) : (L === 'en' ? { voice: 'en-US-AvaMultilingualNeural', rate: '+6%', pitch: '+10Hz' } : { voice: 'zh-TW-HsiaoYuNeural', rate: '+8%', pitch: '+20Hz' });
if (!sv && L !== 'zh-tw' && L !== 'en') notes.push(`no student voice for ${L}: add studentVoices.${L} to the registry`);
if (tv && tv.name === studentV.voice) studentV = L === 'en' ? { voice: 'en-US-AndrewMultilingualNeural', rate: '+6%', pitch: '+0Hz' } : { voice: 'zh-TW-HsiaoChenNeural', rate: '+8%', pitch: '+10Hz' };

const beats = {};
for (const b of ['hook', 'explain', 'pause', 'recap']) { const k = teacher.beats && teacher.beats[b]; beats[b] = { style: k, how: reg.beats[b] && reg.beats[b][k] }; }

// voice engine. Rule (a product decision): AI voice key(s) present and no fixed choice -> ask the user ONCE while planning;
// a fixed choice (--engine from the request or a standing rule, VOICE_ENGINE, settings.json voice.engine) -> use it, no question;
// no key -> edge-tts, no question. voice.py applies the choice via script.json "engine" and falls back to edge-tts on failure.
const envHas = { gemini: !!process.env.GEMINI_API_KEY, azure: !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION), custom: !!process.env.TTS_CUSTOM_CMD };
const LABEL = {
  edge: { zh: 'edge-tts（免費，預設）', en: 'edge-tts (free, default)', costPerLessonTWD: 0 },
  gemini: { zh: 'Gemini 3.8 Flash TTS（可指定語氣，約每課 NT$2）', en: 'Gemini 3.8 Flash TTS (style control, about US$0.06 per lesson)', costPerLessonTWD: 2 },
  azure: { zh: 'Azure 語音（同一批台灣聲音、較穩定，約每課 NT$0.6）', en: 'Azure Speech (same voices, steadier, about US$0.02 per lesson)', costPerLessonTWD: 0.6 },
  custom: { zh: '自訂聲音 AI（TTS_CUSTOM_CMD，費用依你的服務）', en: 'Custom voice AI (TTS_CUSTOM_CMD, cost depends on the service)', costPerLessonTWD: null },
};
const available = ['edge', ...['gemini', 'azure', 'custom'].filter(e => envHas[e])];
const fixedBy = opt('engine') ? 'request (--engine)' : process.env.VOICE_ENGINE ? 'VOICE_ENGINE' : (settings.voice && settings.voice.engine && settings.voice.engine !== 'auto') ? 'settings.json voice.engine' : null;
const wantEngine = (opt('engine') || process.env.VOICE_ENGINE || (settings.voice && settings.voice.engine) || 'auto').toLowerCase();
let engine;
if (fixedBy) {
  engine = available.includes(wantEngine) ? { id: wantEngine, reason: `fixed by ${fixedBy}` } : { id: 'edge', reason: `${wantEngine} fixed by ${fixedBy} but not configured -> edge-tts` };
  engine.askUser = false;
} else if (available.length > 1) {
  engine = { id: null, askUser: true, reason: 'AI voice key(s) found and no fixed choice: ask the user once while planning, then pass --engine <id> (or write "engine" into script.json)' };
} else {
  engine = { id: 'edge', askUser: false, reason: 'no AI voice configured -> edge-tts (default), no question' };
}
engine.available = available;
// an AI voice is the user's choice, never pushed -> the recommended option is always edge-tts (the default)
engine.options = available.map(id => ({ id, label: LABEL[id], recommended: id === 'edge' }));
// course modules (reference/12-modules.md): every module is ON (the full version) unless the learner turned it off
// in settings.json -> course.off; --off a,b (named in the request) also turns them off, --on a,b turns them back on
// for this run. Subtraction only: the skeleton is not a module.
const modReg = readJSON(path.join(__dirname, '..', 'course', 'modules.json')) || { modules: [] };
const list = v => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => String(x).trim()).filter(Boolean);
const offSet = new Set(list(settings.course && settings.course.off)), offReq = new Set(list(opt('off'))), onReq = new Set(list(opt('on')));
const knownMods = new Set(modReg.modules.map(m => m.id));
for (const id of [...offSet, ...offReq, ...onReq]) if (!knownMods.has(id)) notes.push(`unknown course module "${id}" (ignored)`);
const modules = modReg.modules.map(m => {
  const asked = offReq.has(m.id) || offSet.has(m.id), on = !asked || onReq.has(m.id);
  const why = !asked ? 'on: default (the full version)' : on ? 'on: --on in the request overrides course.off' : offReq.has(m.id) ? 'off: turned off in the request' : 'off: settings.json course.off';
  return { id: m.id, on, why, status: m.status, name: m.name, where: m.where };
});
for (const m of modules) if (!m.on) notes.push(`module ${m.id} off (${m.why})`);
// Engine presets are per language: {"zh-tw": {voice, style}, "en": {voice, style}}. They only fill in the voice settings;
// whether an AI engine is used at all is decided above (engine), never here. An older flat preset ({voice, style}, e.g. in
// a plugin-written cast.json or a custom teacher) was written for zh-tw: for another language keep only a Gemini voice
// name (multilingual) and drop the style, which names a Taiwan accent.
const pickLang = (p, eng, who) => {
  if (!p) return null;
  if (!(p.voice || p.style)) return p[L] || null;
  if (L === 'zh-tw') return p;
  notes.push(`${who} ${eng} preset is the old flat (zh-tw) format: ${eng === 'gemini' && p.voice ? 'voice kept, style dropped' : 'not used'} for ${L}`);
  return eng === 'gemini' && p.voice ? { voice: p.voice } : null;
};
const withEngines = (base, src, who) => {
  if (!base) return base;
  const o = Object.assign({}, base);
  for (const eng of ['gemini', 'azure', 'custom']) { const v = src && pickLang(src[eng], eng, who); if (v) o[eng] = v; }
  return o;
};
const out = {
  teacher: { id: teacher.id, name: teacher.name, say: teacher.say, title: teacher.title, tier: teacher.tier, core: teacher.core || null, register: teacher.register, principles: teacher.principles, uses: teacher.uses || [], limits: teacher.limits || null, dimensions: teacher.dimensions || null, fallback: teacher.fallback || null, custom: !!teacher.custom },
  skin, beats,
  pace: teacher.pace || { defaultPause: 0.3 },
  sampleScript: (teacher.sampleScript && teacher.sampleScript[L]) || null,
  engine,
  modules,
  voices: { teacher: conv(tv) || (L === 'en' ? { voice: 'en-US-AndrewMultilingualNeural', rate: '+0%', pitch: '+0Hz' } : L === 'zh-tw' ? { voice: 'zh-TW-YunJheNeural', rate: '+4%', pitch: '+0Hz' } : null), student: (L === 'zh-tw' || L === 'en' || sv) ? studentV : null },
  meta: { cast: { teacher: teacher.id, skin: skin.id, variant: skin.variant || undefined } },
  pro, lang: L, vault, notes,
};
out.voices.teacher = withEngines(out.voices.teacher, teacher.voice, 'teacher');
out.voices.student = withEngines(out.voices.student, (reg.studentVoices || {}), 'student');
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
