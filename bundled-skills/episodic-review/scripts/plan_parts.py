#!/usr/bin/env python3
"""Split a film into parts on the frame grid, for parallel (cloud) rendering.

  python3 plan_parts.py <duration seconds> [--parts 8] [--fps 24] > parts-<id>.json
  python3 plan_parts.py <duration seconds> --sessions auto --out-prefix <dir>/parts-<id>
        # one list per cloud session: parts-<id>-a.json, -b.json, ... (4 parts each), plus parts-<id>.json with all of them
Each part: {"part": "p01", "from": "0.0000", "to": "48.0000"}; boundaries fall on whole frames.
One cloud session renders 4 parts at a time and only gets ONE round (the 2 h background limit), so a film is split
into sessions up front: sessions = ceil(duration / 225 s) (templates/length.json). See templates/雲端算圖session.md.
"""
import argparse, json, math
ap = argparse.ArgumentParser()
ap.add_argument('duration', type=float)
ap.add_argument('--parts', type=int, default=8)
ap.add_argument('--fps', type=int, default=24)
ap.add_argument('--sessions', help='N or "auto": split into per-session lists (4 parts each)')
ap.add_argument('--per-session', type=int, default=4)
ap.add_argument('--session-s', type=float, default=225, help='seconds of film one session can render in one round')
ap.add_argument('--out-prefix', help='with --sessions: write <prefix>.json and <prefix>-a.json, -b.json, ...')
a = ap.parse_args()
if a.sessions:
    n = math.ceil(a.duration / a.session_s) if a.sessions == 'auto' else int(a.sessions)
    a.parts = n * a.per_session
frames = math.ceil(a.duration * a.fps)
step = math.ceil(frames / a.parts)
out, f, i = [], 0, 1
while f < frames:
    g = min(frames, f + step)
    out.append({'part': f'p{i:02d}', 'from': f'{f / a.fps:.4f}', 'to': f'{g / a.fps:.4f}'})
    f, i = g, i + 1
if a.sessions and a.out_prefix:
    json.dump(out, open(a.out_prefix + '.json', 'w'), indent=1)
    for k in range(0, len(out), a.per_session):
        letter = chr(ord('a') + k // a.per_session)
        json.dump(out[k:k + a.per_session], open(f'{a.out_prefix}-{letter}.json', 'w'), indent=1)
        print(f'{a.out_prefix}-{letter}.json  {[p["part"] for p in out[k:k + a.per_session]]}')
else:
    print(json.dumps(out, indent=1))
