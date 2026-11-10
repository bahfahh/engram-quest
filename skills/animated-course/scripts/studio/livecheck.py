#!/usr/bin/env python3
"""Find where the narration talks over a frozen picture (experiment 20, approved 2026-11-09).

Usage: python3 livecheck.py projects/<id> [video] [--offset S] [--from A --to B] [--max 3.0]
  video     default projects/<id>/preview.mp4 (render.cjs --preview) — any render of the film works
  --offset  seconds to ADD to a video time to get the narration time: 0 for a render from 0,
            the --from value for a range render, -3 for a delivered film (deliver.py holds the first frame 3 s)
  --from/--to   only report this narration range
  --max     longest acceptable stretch of speech over a frozen picture (default 3.0 s)
  --skip    comma-separated line-id prefixes that are allowed to sit on a still picture (default "R": the recall
            question between segments is asked over the held wide shot; it brings no new information)

Rule it checks (01-principles.md §2, 04-skeleton.md §2): every sentence that brings new information gets a picture
event on the word that names it. Planned holds (recap silence, think beats, the silent aha) are silence beats in
timeline.json and are not speech, so they are never flagged.

How: ffmpeg freezedetect (480p, 10 fps, noise 0.002, >= 1 s) gives the frozen stretches; each is intersected with the
spoken lines of timeline.json. Limits: a thin outline or a small label changes too few pixels to break a freeze, and a
blinking or talking character can break one without any content event — so a flagged stretch is a place to look at,
and a pass is not proof. Advisory: always exits 0. Compare A and B with the longest stretch, not the total.
"""
import json, os, re, subprocess, sys


def opt(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        return sys.argv[i + 1]
    return default


args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and not (i > 1 and sys.argv[i - 1].startswith("--"))]
project = os.path.abspath(args[0])
video = args[1] if len(args) > 1 else os.path.join(project, "preview.mp4")
offset = float(opt("--offset", 0))
lo, hi = float(opt("--from", -1e9)), float(opt("--to", 1e9))
limit = float(opt("--max", 3.0))
skip = tuple(p for p in opt("--skip", "R").split(",") if p)

timeline = json.load(open(os.path.join(project, "timeline.json"), encoding="utf-8"))
speech = [(l["start"], l["end"], l["id"], l.get("text", "")) for l in timeline["lines"]
          if l.get("speaker") and not (skip and l["id"].startswith(skip))]

err = subprocess.run(["ffmpeg", "-v", "info", "-i", video, "-vf", "scale=480:-2,fps=10,freezedetect=n=0.002:d=1.0",
                      "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"freeze_start: ([0-9.]+)", err)]
ends = [float(x) for x in re.findall(r"freeze_end: ([0-9.]+)", err)]
if len(ends) < len(starts):  # frozen to the end of the file
    dur = re.search(r"Duration: (\d+):(\d+):([0-9.]+)", err)
    ends.append(int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3)) if dur else starts[-1])
frozen = [(a + offset, b + offset) for a, b in zip(starts, ends)]

rows, longest = [], 0.0
for a, b in frozen:
    if b < lo or a > hi:
        continue
    talk = [(max(a, s), min(b, e), i, t) for s, e, i, t in speech if min(b, e) > max(a, s)]
    sec = sum(y - x for x, y, _, _ in talk)
    if sec <= 0.5:
        continue
    longest = max(longest, sec)
    rows.append((a, b, sec, [i for _, _, i, _ in talk], talk[0][3] if talk else ""))

print(f"livecheck: {os.path.basename(video)}  (narration time, offset {offset:+g} s)")
for a, b, sec, ids, text in rows:
    flag = "  <-- over limit" if sec > limit else ""
    print(f"  {a:7.1f}–{b:7.1f}  speech over a frozen picture {sec:4.1f} s  {','.join(ids)}  「{text[:24]}」{flag}")
print(f"longest: {longest:.1f} s (limit {limit:.1f} s){'  — look at these stretches: does each new sentence get a picture event on its word?' if longest > limit else ''}")
