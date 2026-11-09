#!/usr/bin/env python3
"""Final sound mix for a film: generated score + a few clean pitched sound effects -> narration.wav.

  python3 mix.py --score <score.wav> --duration 540 --out <project>/narration.wav \
      [--sfx sfx.json] [--ending-from 520] [--lufs -16.5]
sfx.json: [{"t": 61.2, "file": "sfx/chime.wav", "gain_db": -6}, ...]  (paths relative to sfx.json)
  Use only pitched, clean sounds (a bell, one plucked note, wood knock). No noise beds, hiss or noise whooshes.
  A clean one-shot can be made with scripts/music/music_gen.py --mood chime.
--ending-from: the ending (closing music) is lowered 3 dB from this second on.
Loudness: two-pass ffmpeg loudnorm to --lufs (default -16.5) with true peak <= -1 dBTP; 48 kHz stereo; exact length.
"""
import argparse, json, os, subprocess, tempfile
import numpy as np

SR = 48000

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

ap = argparse.ArgumentParser()
ap.add_argument('--score', required=True)
ap.add_argument('--duration', type=float, required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--sfx')
ap.add_argument('--ending-from', type=float)
ap.add_argument('--lufs', type=float, default=-16.5)
a = ap.parse_args()

N = int(round(a.duration * SR))
mix = load(a.score)
mix = np.pad(mix, ((0, max(0, N - len(mix))), (0, 0)))[:N]
if a.ending_from is not None:
    i = int(a.ending_from * SR)
    ramp = np.linspace(1.0, 10 ** (-3 / 20), min(SR, N - i))
    mix[i:i + len(ramp)] *= ramp[:, None]
    mix[i + len(ramp):] *= 10 ** (-3 / 20)
if a.sfx:
    base = os.path.dirname(os.path.abspath(a.sfx))
    for e in json.load(open(a.sfx, encoding='utf-8')):
        x = load(os.path.join(base, e['file'])) * 10 ** (e.get('gain_db', 0) / 20)
        i = int(e['t'] * SR)
        if i >= N:
            continue
        x = x[:N - i]
        mix[i:i + len(x)] += x
fade = int(0.05 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

with tempfile.TemporaryDirectory() as td:
    raw = os.path.join(td, 'raw.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', raw],
                   input=mix.astype(np.float32).tobytes(), check=True)
    flt = f'loudnorm=I={a.lufs}:TP=-1.0:LRA=20'
    m = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', flt + ':print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    flt2 = (f'{flt}:measured_I={j["input_i"]}:measured_TP={j["input_tp"]}:measured_LRA={j["input_lra"]}'
            f':measured_thresh={j["input_thresh"]}:offset={j["target_offset"]}:linear=true')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', flt2, '-ar', str(SR), '-ac', '2',
                    '-t', f'{a.duration:.3f}', '-c:a', 'pcm_s24le', a.out], check=True)
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', a.out, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                   capture_output=True, text=True).stderr
summary = r[r.rindex('Summary:'):] if 'Summary:' in r else ''
I = [l.strip() for l in summary.splitlines() if l.strip().startswith(('I:', 'Peak:'))]
print(a.out, ' '.join(I))
