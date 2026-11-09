#!/usr/bin/env python3
"""Split a project into cloud render parts on the 30 fps grid, with an extra cut at DEFER seconds
(everything before DEFER waits for the final course map; everything after can render now).
Usage: STUDIO=<studio> plan.py <pid> <defer-seconds> [MAX_GPU=22] [MAX_DOM=140] > parts-<pid>.json
  defer-seconds = 0 when nothing waits (no shared component still being finished).
Prints JSON: [{"part": "p01", "from": "...", "to": "...", "gpu": bool, "deferred": bool}, ...]"""
import json, math, os, sys
STUDIO = os.path.join(os.environ.get("STUDIO", "/tmp/studio"), "projects") + "/"
pid = sys.argv[1]; D = float(sys.argv[2])
MAX_GPU = float(sys.argv[3]) if len(sys.argv) > 3 else 22; MAX_DOM = float(sys.argv[4]) if len(sys.argv) > 4 else 140
segs = json.load(open(STUDIO + pid + "/segments.json")); dur = json.load(open(STUDIO + pid + "/timeline.json"))["duration"]
fps = 30; F = lambda t: math.ceil(t * fps - 0.01)
end = round(dur * fps)
starts = [F(float(s["from"])) for s in segs] + [end]
dcut = F(D)
pieces = []
for i, s in enumerate(segs):
    a, b = starts[i], starts[i + 1]
    for (x, y) in ([(a, dcut), (dcut, b)] if a < dcut < b else [(a, b)]):
        if y > x: pieces.append((x, y, bool(s.get("gpu"))))
parts = []
for a, b, g in pieces:
    n = max(1, math.ceil((b - a) / fps / (MAX_GPU if g else MAX_DOM)))
    cuts = [a + round((b - a) * k / n) for k in range(n)] + [b]
    parts += [(cuts[k], cuts[k + 1], g) for k in range(n)]
out = [{"part": f"p{j + 1:02d}", "from": f"{a / fps:.4f}", "to": (f"{b / fps:.4f}" if b < end else f"{dur}"), "gpu": g, "deferred": a < dcut}
       for j, (a, b, g) in enumerate(parts)]
print(json.dumps(out))
