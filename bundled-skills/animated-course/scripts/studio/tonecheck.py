#!/usr/bin/env python3
"""Check by signal, not by ear, which reading the TTS used for a polyphonic character (破音字) in one sentence.

  python3 tonecheck.py "改完在同一個地方{X}跑，兩個請求進去，只扣了一筆。" 重 --ref chong=崇 --ref zhong=眾

The sentence has one {X} slot. The tool synthesizes the sentence with X = <char> (the reading under test) and once
per --ref with an unambiguous character that has the reading you want to compare against (崇 is only chóng, 眾 is
only zhòng). It cuts the word at the slot out of each clip (TTS word boundaries), turns it into log-mel frames and
prints the DTW distance between the test word and every reference. The closest reference is the reading the TTS
used. The surrounding sentence is identical in all clips, so only the slot differs.

Measured with zh-TW-YunJheNeural: 重 was read zhòng in 8 of 14 sentences (重跑 mostly), chóng in the
rest; writing 蟲 in the spoken text fixed all 14 (distance to 崇 smaller than to 眾). The margin is the point: a
verdict with distances that differ by less than ~0.5 is not a verdict, put the line on the human-ear list.

Options: --voice zh-TW-YunJheNeural  --rate +8%  --pitch +0Hz  (use the line's real voice, rate and pitch)
Needs: ffmpeg, numpy, edge-tts (through voice.py, so clips come from the shared .tts-cache)."""
import asyncio, os, subprocess, sys, tempfile, wave
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice  # noqa: E402

SR = 16000
FQ = np.fft.rfftfreq(512, 1 / SR)


def _mel(f):
    return 2595 * np.log10(1 + f / 700)


_edges = np.linspace(_mel(60), _mel(7600), 42)
_cent = 700 * (10 ** (_edges / 2595) - 1)
FB = np.zeros((40, len(FQ)))
for _m in range(40):
    lo, mid, hi = _cent[_m], _cent[_m + 1], _cent[_m + 2]
    FB[_m] = np.clip(np.minimum((FQ - lo) / (mid - lo), (hi - FQ) / (hi - mid)), 0, None)


def load(path):
    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, "x.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ar", str(SR), "-ac", "1", out], check=True)
        w = wave.open(out)
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768


def feats(a, t0, t1):
    x = a[max(0, int(t0 * SR)):int(t1 * SR)]
    fr, hop = int(0.025 * SR), int(0.01 * SR)
    return np.array([np.log(FB @ (np.abs(np.fft.rfft(x[i:i + fr] * np.hanning(fr), 512)) ** 2) + 1e-8)
                     for i in range(0, len(x) - fr, hop)])


def dtw(A, B, band=12):
    n, m = len(A), len(B)
    D = np.full((n + 1, m + 1), 1e9)
    D[0, 0] = 0
    for i in range(1, n + 1):
        for j in range(max(1, i - band), min(m, i + band) + 1):
            D[i, j] = np.linalg.norm(A[i - 1] - B[j - 1]) + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])
    return D[n, m] / (n + m)


def slot_start(words, ch):
    for w in words:
        if ch in w["text"]:
            return w["start"]
    raise SystemExit(f"{ch!r} is not in any TTS word boundary (the engine merged it into another word)")


async def clip(sentence, ch, v, rate, pitch):
    mp3, words = await voice.synth(sentence.format(X=ch), v, rate, pitch)
    return load(mp3), slot_start(words, ch)


async def main(argv):
    os.makedirs(voice.CACHE, exist_ok=True)
    opt = lambda k, d=None: argv[argv.index("--" + k) + 1] if "--" + k in argv else d
    refs = [a.split("=", 1) for i, a in enumerate(argv) if i and argv[i - 1] == "--ref"]
    pos = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or not argv[i - 1].startswith("--"))]
    if len(pos) < 2 or len(refs) < 2:
        raise SystemExit(__doc__)
    sentence, test = pos[0], pos[1]
    v, rate, pitch = opt("voice", "zh-TW-YunJheNeural"), opt("rate", "+8%"), opt("pitch", "+0Hz")
    a, t = await clip(sentence, test, v, rate, pitch)
    F = feats(a, t - 0.03, t + 0.30)
    res = {}
    for name, ch in refs:
        ra, rt = await clip(sentence, ch, v, rate, pitch)
        res[name] = dtw(F, feats(ra, rt - 0.03, rt + 0.30))
    best = min(res, key=res.get)
    print(f"{test}: " + "  ".join(f"d({k})={x:.2f}" for k, x in res.items()) + f"  -> {best}")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
