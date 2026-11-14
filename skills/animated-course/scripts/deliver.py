#!/usr/bin/env python3
"""Deliver a finished lesson into the engram-quest video library.

  STUDIO=<studio> python3 deliver.py <project-id> "<video title>" --series <vault>/engram-quest/videos/<series> \
      [--series-title "<course title>"] [--tags "tag1,tag2"] [--source engram-quest/lessons/<course>/meta.json] \
      [--until 9] [--solo 3] [--tail 5] [--style classroom+real-ui] [--after <previous-id>] [--dry] [--vault <vault root>] [--no-cards]
      [--music <file> --credit "<credit>"]

final.mp4 + narration.wav -> bgm2.py (encoded to the vault's commit spec: CRF 26, maxrate 1800k, AAC 128k; over --max-mb
(95) it is re-encoded two-pass, so the delivered file can be committed as is; "Morning" at the opening and ending only, ending -3 dB; first frame held 3 s,
last frame held 5 s; narration at -16 LUFS) -> <series>/<id>.mp4, <id>.vtt, <id>.jpg + an entry in <series>/meta.json
(with the music credit). The video is placed after --after, or appended; re-delivering an id replaces its entry in place.
--music / --credit: a track kept in engram-quest/custom/ instead of Morning, with its credit for the entry.
--solo / --tail: first / last frame holds in seconds (default 3 / 5). A social film whose conflict lands in the first
seconds can use --solo 0 (experiment 17).
--dry: use narration_dry.wav (voice only, no sound effects) and deliver as <id>-dry — the B version for A/B listening;
it gets no meta.json entry (it is for review, not for the library).
Review cards (module `cards`, on by default; reference/12-modules.md §3): if projects/<id>/cards.json exists and the
module is not turned off (settings.json course.off, or --no-cards), each card's front/back frames are cut from final.mp4
into <series>/cards/ and an EngramQuest ai-cards deck is written to <vault>/engram-review/ai-cards/video-<series>-<id>.md
(tag <flashcardTags prefix>/videos/<series>; frontmatter video = the delivered film, video_times = the second to rewatch
for each card, in card order; each answer ends with a line back into the film: `Video: <title> (m:ss)` when the narration
is English, `影片：<title>（m:ss）` otherwise); the meta.json entry gets "cards" pointing at it.
Re-delivering keeps the entry's other fields (e.g. cast); "cast" is taken from projects/<id>/cast.json when present.
When meta.json already exists (a series the plugin created), --tags and --source are added to its "tags" and "sources";
every other series field stays as its owner wrote it. Without STUDIO, the current folder is used when it is a studio.
settings.json quality "compact" delivers a 720p film (the render stays 1920x1080); "high" or unset keeps the full size."""
import json, os, shutil, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
def studio_dir():
    # STUDIO wins; otherwise the current folder when it is a studio (commands run there), then /tmp/studio (cloud).
    if os.environ.get("STUDIO"): return os.environ["STUDIO"]
    for d in (os.getcwd(), "/tmp/studio"):  # a studio has its projects/ next to render.cjs (08-tools.md section 1)
        if os.path.isdir(os.path.join(d, "projects")) and os.path.isfile(os.path.join(d, "render.cjs")): return d
    sys.exit("No studio found: run from the studio folder (projects/ next to render.cjs) or set STUDIO (reference/08-tools.md section 1).")
STUDIO = studio_dir()
MUSIC = os.path.join(os.path.dirname(HERE), "assets", "music", "Morning.mp3")
CREDIT = '"Morning" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/'
args = sys.argv[1:]; pid, title = args[0], args[1]
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d
series = opt('series') or sys.exit("--series <folder> is required")
# A track from the user's custom area (engram-quest/custom/assets/music/, listed in assets/index.json) plays instead
# of "Morning"; the delivered entry has to name what plays, so its credit comes with it.
if opt('music'):
    MUSIC = opt('music')
    CREDIT = opt('credit') or sys.exit('--music needs --credit "<title, author, licence>" (the source and licence from assets/index.json)')
    if not os.path.isfile(MUSIC): sys.exit(f"--music: no such file {MUSIC}")
until, style = opt('until', '9'), opt('style', 'classroom')
dry = '--dry' in args
src = os.path.join(STUDIO, "projects", pid); os.makedirs(series, exist_ok=True)
oid = pid + ("-dry" if dry else "")

def find_vault(d):
    d = os.path.abspath(d)
    for _ in range(12):
        if os.path.isdir(os.path.join(d, ".obsidian")): return d
        if os.path.dirname(d) == d: break
        d = os.path.dirname(d)
    return None

vault = opt('vault') or find_vault(series)
settings = {}
if vault and os.path.exists(os.path.join(vault, "engram-quest", "videos", "settings.json")):
    try: settings = json.load(open(os.path.join(vault, "engram-quest", "videos", "settings.json"), encoding="utf-8"))
    except ValueError: pass
height = ["--height", "720"] if settings.get("quality") == "compact" else []

out = os.path.join(series, f"{oid}.mp4"); voiced = os.path.join(src, "_voiced.mkv")
subprocess.run(["nice", "-n", "10", "ffmpeg", "-v", "error", "-y", "-i", os.path.join(src, "final.mp4"), "-i", os.path.join(src, "narration_dry.wav" if dry else "narration.wav"),
                "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "pcm_s16le", "-shortest", voiced], check=True)
holds = [x for k in ("solo", "tail") if opt(k) is not None for x in ("--" + k, opt(k))]  # first / last frame holds
subprocess.run(["nice", "-n", "10", "python3", os.path.join(HERE, "studio", "bgm2.py"), voiced, MUSIC, out, "--until", until, *height, *holds,
                "--vtt", os.path.join(src, "subtitles.vtt"), os.path.join(series, f"{oid}.vtt")], check=True)
os.remove(voiced)
# Vault commit spec (AGENTS.md): bgm2 already encodes at CRF 26 / maxrate 1800k / AAC 128k; a file still over 95 MB
# (GitHub refuses 100 MB) is re-encoded two-pass at a bitrate that fits.
MAX_MB = float(opt('max-mb', '95'))
if os.path.getsize(out) > MAX_MB * 1e6:
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out],
                             capture_output=True, text=True, check=True).stdout)
    kbps = int(MAX_MB * 0.92 * 8e3 / d) - 128
    print(f"{os.path.getsize(out)/1e6:.1f} MB > {MAX_MB} MB: two-pass at {kbps} kbps")
    with tempfile.TemporaryDirectory() as td:
        src2, log = os.path.join(td, 'in.mp4'), os.path.join(td, 'x264')
        shutil.move(out, src2)
        base = ['nice', '-n', '10', 'ffmpeg', '-v', 'error', '-y', '-i', src2, '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{kbps}k',
                '-maxrate', '1800k', '-bufsize', '3600k', '-pix_fmt', 'yuv420p', '-passlogfile', log]
        subprocess.run(base + ['-pass', '1', '-an', '-f', 'null', os.devnull], check=True)
        subprocess.run(base + ['-pass', '2', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], check=True)
poster = os.path.join(src, "poster.jpg")
if not os.path.exists(poster) and os.path.exists(os.path.join(src, "READY")):
    # no poster from the render (e.g. a local render): take it from final.mp4 at the READY second
    at = open(os.path.join(src, "READY")).read().split()[0]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", at, "-i", os.path.join(src, "final.mp4"), "-frames:v", "1", "-q:v", "2", poster], check=True)
    print(f"poster: taken from final.mp4 at {at} s (READY)")
shutil.copy(poster, os.path.join(series, f"{oid}.jpg"))
if dry:
    print(f"delivered B version (no sound effects) -> {out}"); sys.exit(0)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out],
                           capture_output=True, text=True, check=True).stdout)

def narration_lang():
    """Language of the narration ('en', 'zh', ...): script.json's `lang` or its teacher voice's prefix (the same rule
    voice.py uses to speak it), else the project's cast.json `lang` (resolve.cjs), else settings.json narrationLang;
    Chinese when none says."""
    for name in ("script.json", "cast.json"):
        try: j = json.load(open(os.path.join(src, name), encoding="utf-8"))
        except (OSError, ValueError): continue
        if not isinstance(j, dict): continue
        if j.get("lang"): return str(j["lang"]).split("-")[0].lower()
        voice = str(((j.get("voices") or {}).get("teacher") or {}).get("voice") or "")
        if "-" in voice: return voice.split("-")[0].lower()
    nl = settings.get("narrationLang")
    return str(nl).split("-")[0].lower() if nl and nl != "follow" else "zh"

def make_cards():
    """Module `cards`: recap pictures -> an EngramQuest image-card deck. Returns the vault path of the deck or None."""
    cp = os.path.join(src, "cards.json")
    if '--no-cards' in args or "cards" in ((settings.get("course") or {}).get("off") or []):
        print("cards: module turned off -> no review cards"); return None
    if not os.path.exists(cp):
        print("cards: no cards.json in the project -> no review cards (module `cards` is on by default; reference/12-modules.md §3)"); return None
    if not vault:
        print("cards: vault not found (pass --vault) -> no review cards"); return None
    cards = json.load(open(cp, encoding="utf-8"))
    sname = os.path.basename(os.path.normpath(series))
    prefix = "flashcards"
    try:
        dj = json.load(open(os.path.join(vault, ".obsidian", "plugins", "engram-quest", "data.json"), encoding="utf-8"))
        prefix = (dj.get("flashcardTags") or "flashcards").split()[0].strip("#/") or "flashcards"
    except (OSError, ValueError): pass
    cdir = os.path.join(series, "cards"); os.makedirs(cdir, exist_ok=True)
    rel = lambda p: os.path.relpath(p, vault).replace(os.sep, "/")
    final = os.path.join(src, "final.mp4")
    def grab(t, name):
        out_ = os.path.join(cdir, name)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{float(t):.3f}", "-i", final, "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "3", out_], check=True)
        return rel(out_)
    en = narration_lang() == "en"
    # the line under each answer that points back into the film; the plugin reads both forms
    stamp = lambda tt: (f"Video: {title} ({int(tt // 60)}:{int(tt % 60):02d})" if en else f"影片：{title}（{int(tt // 60)}:{int(tt % 60):02d}）")
    hold = float(opt('solo', '3'))  # bgm2.py holds the first frame for --solo s (default 3): delivered time = final.mp4 time + hold
    times = [round(float(c.get("back", c["front"])) + hold, 1) for c in cards]
    body = [f"---\ntags: [{prefix}/videos/{sname}]\nvideo: {rel(out)}\nvideo_times: [{', '.join(str(x) for x in times)}]\n---\nTARGET DECK: videos/{sname}\n"]
    for i, c in enumerate(cards, 1):
        q_img = grab(c["front"], f"{pid}-{i}-q.jpg")
        a_img = grab(c.get("back", c["front"]), f"{pid}-{i}-a.jpg")
        tt = float(c.get("back", c["front"])) + hold
        body.append(f"%%card%%\nQ: ![[{q_img}]] {c['q'].strip()}\nA:\n{c['a'].strip()}\n\n![[{a_img}]]\n\n{stamp(tt)}\n%%card%%\n")
    ddir = os.path.join(vault, "engram-review", "ai-cards"); os.makedirs(ddir, exist_ok=True)
    deck = os.path.join(ddir, f"video-{sname}-{pid}.md")
    open(deck, "w", encoding="utf-8").write("\n".join(body))
    print(f"cards: {len(cards)} review cards -> {rel(deck)}")
    return rel(deck)

# Cards take a while; meta.json is read afterwards so progress saved by the plugin meanwhile is kept.
cards_file = make_cards()
mp = os.path.join(series, "meta.json")
# --tags and --source, trimmed and without repeats, the same for a new series and an existing one.
given = {"tags": list(dict.fromkeys(x.strip() for x in (opt('tags') or '').split(',') if x.strip())),
         "sources": [s.strip() for s in [opt('source') or ''] if s.strip()]}
if os.path.exists(mp):
    meta = json.load(open(mp, encoding="utf-8"))
    # A series the plugin created already has meta.json; the skill still owns tags and sources, so add to them
    # (union, existing order kept) and leave every other field to its owner.
    for key, extra in given.items():
        have = meta.get(key, [])
        if not extra or not isinstance(have, list): continue  # nothing to add, or not ours to reshape
        merged = have + [x for x in extra if x not in have]
        if merged != have: meta[key] = merged
else:
    meta = {"title": opt('series-title', os.path.basename(series)), "status": "ready",
            "tags": given["tags"], "sources": given["sources"],
            "videos": [], "starred": False,
            "createdAt": subprocess.run(["date", "-u", "+%Y-%m-%dT%H:%M:%S.000Z"], capture_output=True, text=True).stdout.strip()}
entry = {"id": pid, "title": title, "file": f"{pid}.mp4", "subtitles": f"{pid}.vtt", "duration": round(dur),
         "style": style, "mode": "basic", "source": "skill", "poster": f"{pid}.jpg", "credits": CREDIT}
castp = os.path.join(src, "cast.json")
if os.path.exists(castp):
    try: entry["cast"] = json.load(open(castp, encoding="utf-8"))["meta"]["cast"]
    except (KeyError, ValueError): pass
if cards_file: entry["cards"] = cards_file
ids = [v["id"] for v in meta["videos"]]
if pid in ids:
    meta["videos"][ids.index(pid)] = {**meta["videos"][ids.index(pid)], **entry}
elif opt('after') in ids:
    meta["videos"].insert(ids.index(opt('after')) + 1, entry)
else:
    meta["videos"].append(entry)
# Replace in one step: the plugin may read this file at any moment.
with open(mp + ".tmp", "w", encoding="utf-8") as f: json.dump(meta, f, ensure_ascii=False, indent=2)
os.replace(mp + ".tmp", mp)
print(f"delivered {pid}: {dur:.1f}s, {os.path.getsize(out)/1e6:.1f} MB -> {out}")
