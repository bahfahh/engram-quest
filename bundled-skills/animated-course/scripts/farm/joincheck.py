#!/usr/bin/env python3
"""Check the seams of a joined film: mean frame-to-frame difference around every part boundary.
Usage: STUDIO=<studio> python3 joincheck.py <pid> <parts.json>
A seam is fine when the value across it (3rd value) is in line with its neighbours; a spike on a 'part' seam
means a frame was dropped or doubled. 'PAGE' seams (classroom <-> scene) should also be smooth: the handover
frame must look identical on both pages."""
import json, os, subprocess, sys, numpy as np
S = os.environ.get("STUDIO", "/tmp/studio")
pid, parts_json = sys.argv[1], sys.argv[2]
mp4 = f"{S}/projects/{pid}/final.mp4"
parts = json.load(open(parts_json))
joins = [float(p['from']) for p in parts[1:]]
kinds = {round(float(p['from']), 3): ('PAGE' if p['gpu'] != parts[i]['gpu'] else 'part') for i, p in enumerate(parts[1:])}
def frames(t0, n=6):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t0:.4f}', '-i', mp4, '-frames:v', str(n), '-vf', 'scale=480:270', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 270, 480).astype(np.float32)
for j in joins:
    f = frames(j - 3 / 30)
    d = [np.abs(f[i + 1] - f[i]).mean() for i in range(len(f) - 1)]
    print(f"{kinds[round(j,3)]:4s} {j:8.3f}  diffs " + ' '.join(f'{x:5.1f}' for x in d) + "   (join is between 3rd and 4th frame -> 3rd value)")
