#!/usr/bin/env python3
"""Measure the actual pitch of every downloaded sample (octave + cents vs. the file's MIDI number)."""
import os, sys, glob, json, subprocess, numpy as np
SR = 48000
def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)
def measure(x, midi):
    on = int(np.argmax(np.abs(x) > np.abs(x).max() * 0.05))
    seg = x[on + int(0.08 * SR): on + int(0.08 * SR) + 32768]
    if len(seg) < 32768: seg = np.pad(seg, (0, 32768 - len(seg)))
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 4 * 32768))
    fr = np.fft.rfftfreq(4 * 32768, 1 / SR)
    f_exp = 440 * 2 ** ((midi - 69) / 12)
    best = None
    for octv in (-2, -1, 0, 1, 2):
        for c in range(-60, 61, 2):
            f = f_exp * 2 ** octv * 2 ** (c / 1200)
            if f < 25 or f * 1 > 20000: continue
            # energy at the fundamental itself, plus a little support from harmonics 2-3
            idx = [np.argmin(np.abs(fr - f * h)) for h in (1, 2, 3) if f * h < 20000]
            sc = np.log(spec[idx[0]] + 1e-9) * 2 + sum(np.log(spec[i] + 1e-9) for i in idx[1:]) * 0.5
            if best is None or sc > best[0]: best = (sc, octv, c, f)
    # refine: parabolic peak near the best fundamental
    i = np.argmin(np.abs(fr - best[3])); w = int(best[3] * 0.03 / (fr[1])) + 2
    j = i - w + np.argmax(spec[i - w:i + w]); a, b, c2 = np.log(spec[j - 1:j + 2] + 1e-12)
    p = 0.5 * (a - c2) / (a - 2 * b + c2); fpk = (j + p) * fr[1]
    cents = 1200 * np.log2(fpk / (f_exp * 2 ** best[1]))
    return best[1], round(float(cents), 1)
out = {}
for d in sys.argv[1:]:
    res = []
    for f in sorted(glob.glob(os.path.join(d, '*.ogg')) + glob.glob(os.path.join(d, '*.mp3')), key=lambda p: int(os.path.basename(p)[:-4])):
        m = int(os.path.basename(f)[:-4]); o, c = measure(load(f), m); res.append((m, o, c))
    out[os.path.basename(d.rstrip('/'))] = res
    print(os.path.basename(d.rstrip('/')).ljust(20), ' '.join(f'{m}:{o:+d}/{c:+.0f}' for m, o, c in res))
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pitch_check.json'), 'w'))
