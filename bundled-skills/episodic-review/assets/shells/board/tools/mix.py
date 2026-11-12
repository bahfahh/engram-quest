#!/usr/bin/env python3
"""Mix audio/score/score.wav + a few clean pitched SFX (audio/events.json) into narration.wav.

python3 -I tools/mix.py            (run from the project folder)
- SFX are additive sine partials with exponential decay (bells, plucks, glockenspiel): pitched, no noise.
- They are tuned to the film key the score picked (audio/score/cues.json: film_key).
- Output: 48 kHz stereo 24-bit, length = film duration, about -16.5 LUFS integrated, true peak < -1 dBTP.
"""
import json, os, subprocess, sys, re
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(HERE, 'audio')
SR = 48000
TARGET = -16.5

def load(path):
    sr, x = wavfile.read(path)
    if x.dtype == np.int16: x = x / 32768.0
    elif x.dtype == np.int32: x = x / 2147483648.0
    x = x.astype(np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    if sr != SR: x = resample_poly(x, SR, sr, axis=0)
    return x

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def hz(midi): return 440.0 * 2 ** ((midi - 69) / 12)

def tone(f, dur, partials, att=0.008):
    """partials: [(ratio, amp, decay_s)]"""
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    for r, a, d in partials:
        if f * r < 15000: y += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d)
    env = 0.5 - 0.5 * np.cos(np.pi * np.minimum(1, t / att))   # raised-cosine attack (no HF burst)
    rel = np.minimum(1, (dur - t) / 0.05)          # no click at the end
    return y * env * rel

def space(y):
    """a little room: three soft early echoes, low-passed (no noise involved)"""
    y = np.pad(y, (0, int(0.4 * SR)))               # room for the echo tails (no cut-off clicks)
    out = y.copy()
    for ms, g in ((83, 0.28), (151, 0.18), (237, 0.11)):
        k = int(ms * SR / 1000); e = np.zeros_like(y); e[k:] = y[:-k] * g
        e = np.convolve(e, np.ones(6) / 6, mode='same')   # gentle low-pass
        out += e
    return out

def sfx(kind, root):
    if kind == 'pluck':      # harp-like pluck: tonic + fifth
        a = tone(hz(root + 12), 1.4, [(1, 1, .35), (2, .35, .18), (3, .12, .1)])
        b = tone(hz(root + 19), 1.2, [(1, .7, .3), (2, .25, .15)])
        y = a.copy(); k = int(.07 * SR); m = min(len(b), len(y) - k); y[k:k + m] += b[:m]; return y * .5
    if kind == 'bell':       # soft bell on the tonic, two octaves up
        return tone(hz(root + 24), 3.0, [(1, 1, 1.1), (2.0, .4, .7), (3.0, .2, .45), (4.16, .12, .3), (5.43, .06, .2)]) * .42
    if kind == 'low':        # muted low marimba note (SURVIVED)
        return tone(hz(root - 5), 1.2, [(1, 1, .32), (3.9, .25, .08), (9.8, .05, .03)]) * .55
    if kind == 'ding':       # small alarm bell on the fifth, struck twice
        y = tone(hz(root + 31), 1.8, [(1, 1, .6), (2.76, .3, .25), (5.4, .1, .12)]) * .32
        k = int(.22 * SR); y2 = np.pad(y, (0, k)); y2[k:] += y * .7; return y2   # second strike keeps its whole tail
    if kind.startswith('glock'):   # rising pentatonic as the dot passes each leg
        deg = [0, 2, 4, 7][int(kind[-1])]
        return tone(hz(root + 24 + deg), 1.6, [(1, 1, .55), (2.76, .25, .2), (5.4, .08, .08)]) * .3
    if kind == 'shimmer':    # the loop lights: tonic arpeggio, quick
        y = np.zeros(int(2.6 * SR))
        for i, d in enumerate([0, 4, 7, 12, 16, 19]):
            n = tone(hz(root + 24 + d), 2.0, [(1, 1, .7), (2.76, .2, .2)]) * .2 * (1 - i * .08)
            k = int(i * .075 * SR); m = min(len(n), len(y) - k); y[k:k + m] += n[:m]
        return y
    raise ValueError(kind)

def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); tp = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])
    return I, tp

def main():
    dur = json.load(open(os.path.join(A, 'cues_in.json')))['duration']
    N = int(round(dur * SR))
    meta = json.load(open(os.path.join(A, 'score', 'cues.json')))
    key = str(meta.get('film_key') or 'C')
    m = re.match(r'([A-G][#b]?)', key); root = 60 + NOTE[m.group(1)] if m else 60
    if root > 65: root -= 12
    x = load(os.path.join(A, 'score', 'score.wav'))
    x = x[:N] if len(x) >= N else np.pad(x, ((0, N - len(x)), (0, 0)))
    fx = np.zeros((N, 2))
    ev = json.load(open(os.path.join(A, 'events.json')))
    for i, e in enumerate(ev):
        y = space(sfx(e['kind'], root)); k = int(e['t'] * SR)
        if k >= N: continue
        y = y[:N - k]
        pan = [-.25, .2, -.1, .3, 0, -.3, -.2, .1, .25, .35, 0][i % 11]
        fx[k:k + len(y), 0] += y * (1 - pan) ; fx[k:k + len(y), 1] += y * (1 + pan)
    mix = x + fx * 0.5
    tmp = os.path.join(A, 'mix_raw.wav')
    wavfile.write(tmp, SR, (np.clip(mix, -1, 1) * 2147483647).astype(np.int32))
    I, tp = lufs(tmp)
    g = TARGET - I
    out = os.path.join(HERE, 'narration.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'volume={g:.2f}dB,alimiter=limit=0.79:attack=3:release=80:level=false,aresample=48000',
                    '-c:a', 'pcm_s24le', '-ar', '48000', '-ac', '2', out], check=True)
    I2, tp2 = lufs(out)
    sr, y = wavfile.read(out)
    print(json.dumps(dict(key=key, root_midi=root, score_lufs=I, gain_db=round(g, 2), out=out, lufs=I2, true_peak_dbfs=tp2, seconds=len(y) / sr, film=dur, sfx=len(ev)), ensure_ascii=False))
    os.remove(tmp)

if __name__ == '__main__':
    main()
