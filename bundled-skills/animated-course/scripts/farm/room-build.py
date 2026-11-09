#!/usr/bin/env python3
"""Build a screening room (an Artifact page: player + lesson list + chapter buttons) for delivered films.

Usage: python3 room-build.py <room-dir> <room.json>
<room.json>:
  {"title": "...", "eyebrow": "...", "lede": "... (HTML allowed)", "footer": "... (HTML allowed)",
   "labels": {"core": "The one-liner", "why": "Why this one", "avoid": "Flaws — do not copy", "chapters": "Chapters", "opening": "Opening"},
   "intro_hold": 3.0,                       # chapter times are narration times; the delivered film starts with a 3 s hold
   "films": [{"id": "en-l08-hook", "series": "<vault>/engram-quest/videos/<series>", "no": "Lesson 8", "title": "...",
              "core": "...", "why": "(optional)", "avoid": "(optional)", "lang": "en", "sublabel": "English",
              "chapters": [[0, "Classroom"], [43.1, "One-liner"], ...]}]}
Before running, put a web copy of each film in <room-dir>/videos/<id>.mp4 (+ <id>.jpg) — e.g. bgm2.py --height 720,
or ffmpeg -vf scale=-2:720 — and its subtitles as <room-dir>/subs/<id>.txt (the .vtt renamed: artifact hosting serves .txt).
Writes <room-dir>/index.html; publish it with the Artifact tool, passing videos/ and subs/ as files."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
R, spec = sys.argv[1], json.load(open(sys.argv[2], encoding="utf-8"))
O = float(spec.get("intro_hold", 3.0))
films = []
for f in spec["films"]:
    meta = json.load(open(os.path.join(f["series"], "meta.json"), encoding="utf-8"))
    dur = {v["id"]: v["duration"] for v in meta["videos"]}
    pid = f["id"]
    if pid not in dur or not os.path.exists(os.path.join(R, "videos", pid + ".mp4")):
        print("skip (not delivered or no web copy):", pid); continue
    films.append({"id": pid, "no": f.get("no", ""), "title": f["title"], "len": dur[pid], "core": f.get("core", ""),
                  "why": f.get("why", ""), "avoid": f.get("avoid", ""), "lang": f.get("lang", "zh"), "sublabel": f.get("sublabel", "中文"),
                  "chapters": [{"t": round(t + O, 1), "label": l} for t, l in f["chapters"]],
                  "src": f"videos/{pid}.mp4", "vtt": f"subs/{pid}.txt", "poster": f"videos/{pid}.jpg"})
labels = {"core": "The one-liner", "why": "Why this one", "avoid": "Flaws — do not copy", "chapters": "Chapters", "opening": "Opening"}
labels.update(spec.get("labels", {}))
t = open(os.path.join(HERE, "room-template.html"), encoding="utf-8").read()
for k, v in {"__FILMS__": json.dumps(films, ensure_ascii=False), "__LABELS__": json.dumps(labels, ensure_ascii=False),
             "__TITLE__": spec["title"], "__EYEBROW__": spec.get("eyebrow", "engram-quest · video library"),
             "__LEDE__": spec.get("lede", ""), "__FOOTER__": spec.get("footer", "")}.items():
    t = t.replace(k, v)
open(os.path.join(R, "index.html"), "w", encoding="utf-8").write(t)
print("films:", [f["id"] for f in films])
