#!/usr/bin/env python3
"""Render a film made of several pages (e.g. the 3D classroom + the DOM scene) and join them.

  python3 compose.py projects/<id>                 -> final.mp4 (1920x1080 30fps, with narration) + poster.jpg
  python3 compose.py projects/<id> --preview       -> preview.mp4 (960x540 12fps)
  python3 compose.py projects/<id> --poster 12     -> poster time (default 8 s)
  python3 compose.py projects/<id> --from 20 --to 40 --preview   -> only that range (preview_part.mp4)

projects/<id>/segments.json lists the pages in time order; each segment runs until the next one starts:
  [{"scene": "classroom.html", "from": 0, "gpu": true},
   {"scene": "scene.html", "from": 24.5},
   {"scene": "classroom.html", "from": 318.2, "gpu": true}]
"gpu": true is for WebGL (three.js) pages; DOM pages render in software (no ghosting).
A segment starts on the first frame at or after its "from" (the page before it draws everything earlier). Every page must use the same timeline.json, so T.word() times line up.
"""
import json, math, os, subprocess, sys

STUDIO = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
proj = os.path.abspath(args[0])
def opt(k, d=None):
    return args[args.index('--' + k) + 1] if '--' + k in args else d
preview = '--preview' in args
fps = 12 if preview else 30
segs = json.load(open(os.path.join(proj, 'segments.json'), encoding='utf-8'))
dur = json.load(open(os.path.join(proj, 'timeline.json'), encoding='utf-8'))['duration']
lo, hi = float(opt('from', 0)), min(float(opt('to', dur)), dur)
snap = lambda t: round(t * fps) / fps
# a segment starts on the first frame at or after its 'from', so the earlier page draws every frame before it
starts = [math.ceil(float(s["from"]) * fps - 0.01) / fps for s in segs] + [dur]
jobs = []
for i, s in enumerate(segs):
    a, b = max(starts[i], snap(lo)), min(starts[i + 1], snap(hi) if hi < dur else dur)
    if b - a < 0.5 / fps:
        continue
    out = f"_seg{i}{'_p' if preview else ''}.mp4"
    cmd = ['node', 'render.cjs', proj, '--scene', s['scene'], '--from', f'{a:.4f}', '--to', f'{b:.4f}', '--noaudio', '--out', out]
    if preview:
        cmd.append('--preview')
    env = dict(os.environ, **({'RENDER_GPU': '1'} if s.get('gpu') else {}))
    log = open(os.path.join(proj, out + '.log'), 'w')
    print(f"segment {i}: {s['scene']} {a:.2f}-{b:.2f}s{' (gpu)' if s.get('gpu') else ''}")
    jobs.append((out, subprocess.Popen(cmd, cwd=STUDIO, env=env, stdout=log, stderr=subprocess.STDOUT)))
bad = [o for o, p in jobs if p.wait() != 0]
if bad:
    sys.exit('failed: ' + ', '.join(f'{o} (see {o}.log)' for o in bad))
lst = os.path.join(proj, '_segs.txt')
open(lst, 'w').write(''.join(f"file '{o}'\n" for o, _ in jobs))
partial = lo > 0 or hi < dur
name = ('preview' if preview else 'final') + ('_part' if partial else '') + '.mp4'
audio = os.path.join(proj, 'narration.wav')
ff = ['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst]
if os.path.exists(audio):
    ff += ['-ss', str(snap(lo)), '-t', str(snap(hi) - snap(lo)), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '96k', '-shortest']
ff += ['-c:v', 'copy', '-movflags', '+faststart', os.path.join(proj, name)]
subprocess.run(ff, check=True)
for o, _ in jobs:
    os.remove(os.path.join(proj, o))
if not preview and not partial:
    pt = float(opt('poster', min(8, dur / 3)))
    seg = max(i for i in range(len(segs)) if starts[i] <= pt + 1e-6)
    env = dict(os.environ, **({'RENDER_GPU': '1'} if segs[seg].get('gpu') else {}))
    subprocess.run(['node', 'render.cjs', proj, '--scene', segs[seg]['scene'], '--stills', f'{pt:g}'], cwd=STUDIO, env=env, check=True, stdout=subprocess.DEVNULL)
    os.replace(os.path.join(proj, 'stills', f't-{pt:g}.jpg'), os.path.join(proj, 'poster.jpg'))
got = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(proj, name)], capture_output=True, text=True).stdout.strip()
print(f'ok: {os.path.join(proj, name)} ({got}s)')
