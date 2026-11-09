#!/usr/bin/env python3
"""Remake only the middle of an already delivered lesson (experiment 17): render the new middle page and splice it
between the head and tail cut from the delivered film, so the 3D classroom opening and ending are not re-rendered.

  python3 remiddle.py projects/<id> --delivered <series>/<old-id>.mp4 --orig-tout <s> [--parts 3]

Requirements (check before voicing):
- script.json: the opening and ending lines are unchanged (text, order, pauses) — voice.py then reproduces their
  timing exactly; only lines between the last opening line and the first ending line change.
- handover.json: tHand is the original one; tOut = round((first ending line's start + (orig tOut − orig first ending
  line's start)) × 30) / 30, so the spliced tail stays in sync with the new narration.
- The middle's first frame is img/hand-in.jpg and its last frame img/hand-out.jpg (the original handover images).
- The film was delivered by deliver.py (first frame held 3 s, last frame held 5 s at 30 fps; --hold-in/--hold-out to override).
Writes projects/<id>/final.mp4 (video only) and checks the frame count; then deliver.py as usual (it muxes the new
narration.wav, music, holds and subtitles). Head/tail cuts are cached in projects/<id>/_splice/."""
import json, os, subprocess, sys
STUDIO = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
proj = os.path.abspath(args[0])
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d
DELIVERED = os.path.abspath(opt('delivered') or sys.exit('--delivered <old film.mp4> is required'))
ORIG_TOUT = float(opt('orig-tout') or sys.exit('--orig-tout <s> (the original handover.json tOut) is required'))
FPS = 30
HOLD_IN, HOLD_OUT = round(float(opt('hold-in', 3)) * FPS), round(float(opt('hold-out', 5)) * FPS)
run = lambda c, **k: subprocess.run(c, check=True, **k)
cnt = lambda p: int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
                                    'stream=nb_read_packets', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout)
CONTENT_N = cnt(DELIVERED) - HOLD_IN - HOLD_OUT
ho = json.load(open(os.path.join(proj, 'handover.json')))
segs = json.load(open(os.path.join(proj, 'segments.json')))
mid = next(s for s in segs if 'classroom' not in s['scene'])
HEAD_N, TAIL0 = round(ho['tHand'] * FPS), round(ORIG_TOUT * FPS)
a, b = HEAD_N, round(ho['tOut'] * FPS); n_mid = b - a
tmp = os.path.join(proj, '_splice'); os.makedirs(tmp, exist_ok=True)
enc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(FPS)]

def cut(first, last_excl, out):  # content frame indices of the delivered film
    run(['ffmpeg', '-v', 'error', '-y', '-i', DELIVERED, '-vf',
         f"select='between(n\\,{first + HOLD_IN}\\,{last_excl + HOLD_IN - 1})',setpts=N/{FPS}/TB", '-an', *enc, out])

head, tail = os.path.join(tmp, 'head.mp4'), os.path.join(tmp, 'tail.mp4')
if not os.path.exists(head): cut(0, HEAD_N, head)
if not os.path.exists(tail): cut(TAIL0, CONTENT_N, tail)
k = int(opt('parts', 3)); bounds = [a + (n_mid * i) // k for i in range(k + 1)]
env = dict(os.environ, RENDER_SLOTS=os.environ.get('RENDER_SLOTS', str(k)), **({'RENDER_GPU': '1'} if mid.get('gpu') else {}))
parts, jobs = [], []
for i in range(k):
    out = f'_mid{i}.mp4'; parts.append(os.path.join(proj, out))
    cmd = ['node', 'render.cjs', proj, '--scene', mid['scene'], '--from', f'{bounds[i] / FPS:.5f}', '--to', f'{bounds[i + 1] / FPS:.5f}', '--noaudio', '--out', out]
    jobs.append(subprocess.Popen(cmd, cwd=STUDIO, env=env, stdout=open(os.path.join(tmp, f'mid{i}.log'), 'w'), stderr=subprocess.STDOUT))
if any(j.wait() for j in jobs): sys.exit('middle render failed, see _splice/mid*.log')
lst = os.path.join(tmp, 'list.txt')
open(lst, 'w').write(''.join(f"file '{p}'\n" for p in [head, *parts, tail]))
final = os.path.join(proj, 'final.mp4')
run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-an', *enc, '-movflags', '+faststart', final])
got, want = cnt(final), HEAD_N + n_mid + (CONTENT_N - TAIL0)
print(f'final.mp4: {got} frames (want {want}: head {HEAD_N} + middle {n_mid} + tail {CONTENT_N - TAIL0}) = {got / FPS:.2f} s')
if got != want: sys.exit('FRAME COUNT MISMATCH')
