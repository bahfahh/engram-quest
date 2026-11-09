#!/usr/bin/env python3
"""Standard quiet foley for teaching films (numpy only). Status: TRIAL — the user has not reviewed sound effects yet.

  python3 sfx.py projects/<id>/sfx          -> writes the whole set as 48 kHz mono wavs into that folder
  python3 sfx.py projects/<id>/sfx heartbeat chalk   -> only those

Use them from script.json, anchored to the word the action happens on (voice.py mixes them into narration.wav):
  "sfx": [{"file": "sfx/card.wav", "line": "A12", "offset": 1.4, "gain": 0.25}]
Rules (reference/04-skeleton.md §6): only key visible actions get a sound; quiet (gain 0.15–0.35, about 10–12 dB
under the voice); never a constant bed; nothing in the near-silence before the one-liner or the aha moment, and the
first sound after that silence is the important one.

Some recipes (whoosh, thump, ding, pop, heartbeat) are adapted from Lemo-Opuscar's core/audio/sfx.py
(MIT License, (c) 2026 LemoLab, https://github.com/lemomo-ai/lemo-opuscar); filters rewritten without scipy.
"""
import os, sys, wave
import numpy as np

SR = 48000
_rng = np.random.default_rng(7)


def t_(d): return np.arange(int(round(d * SR))) / SR
def env_exp(d, tau): return np.exp(-t_(d) / tau)
def noise(d): return _rng.standard_normal(int(round(d * SR)))
def norm(x, p=1.0): m = np.abs(x).max(); return x * (p / m) if m > 0 else x


def band(x, lo=None, hi=None):
    """FFT brick-wall filter with soft edges (fine for short one-shot effects)."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def fade(x, a=.002, r=.01):
    n1, n2 = int(a * SR), int(r * SR); x = x.copy()
    if n1: x[:n1] *= np.linspace(0, 1, n1)
    if n2: x[-n2:] *= np.linspace(1, 0, n2)
    return x


# —— the set ——
def chalk(d=.45):
    """chalk stroke on a board: band-limited scratch with stick-slip grains"""
    n = band(noise(d), 1800, 7000); tt = t_(d)
    grains = (np.sin(2 * np.pi * 38 * tt + 6 * np.sin(2 * np.pi * 5 * tt)) > .2).astype(float)
    e = np.minimum(1, tt / .03) * np.minimum(1, (d - tt) / .08)
    return fade(norm(n * (.55 + .45 * grains) * e) * .8)


def tap(pitch=1.0):
    """UI click / tap on a screen: short transient + small resonance"""
    d = .05; tt = t_(d)
    x = band(noise(d), 2500) * env_exp(d, .0015) + np.sin(2 * np.pi * 2200 * pitch * tt) * env_exp(d, .006) * .5
    return fade(norm(x) * .9)


def pop():
    """a card or label appears"""
    d = .18; tt = t_(d); f = 500 + 1400 * tt / d
    return fade(norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .05)))


def card():
    """recap card lands (soft paper thud)"""
    d = .25; tt = t_(d)
    x = band(noise(d), 120, 1500) * env_exp(d, .03) + np.sin(2 * np.pi * 140 * tt) * env_exp(d, .05) * .6
    return fade(norm(x) * .9)


def whoosh(d=.4):
    """camera move / page handover"""
    n = noise(d); out = np.zeros_like(n); B = 960
    for i in range(0, len(n), B):
        f = 600 + 2600 * np.sin(np.pi * i / len(n)); j = min(len(n), i + B)
        out[i:j] = band(n[max(0, i - 4 * B):j], f * .7, f * 1.3)[-(j - i):]
    return fade(norm(out * np.sin(np.pi * t_(d) / d) ** 2) * .9)


def thump(f=70):
    d = .35; tt = t_(d)
    return fade(norm(np.sin(2 * np.pi * f * tt * (1 - .3 * tt)) * env_exp(d, .07) + band(noise(d), None, 300) * env_exp(d, .02) * .5))


def ding():
    """reveal / correct answer (use sparingly)"""
    d = 1.4; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * tt) * env_exp(d, tau) for f, a, tau in [(1318, 1, .6), (2637, .5, .35), (3951, .3, .2), (1976, .25, .5)])
    return fade(norm(x) * .8, r=.2)


def wrong():
    """a wrong intuition is crossed out: two short low buzzes"""
    d = .32; tt = t_(d)
    x = np.sign(np.sin(2 * np.pi * 180 * tt)) * .3 + np.sin(2 * np.pi * 180 * tt)
    gate = ((tt < .12) | ((tt > .17) & (tt < .29))).astype(float)
    return fade(norm(band(x * gate, None, 1800)) * .7)


def tick():
    """counter / one step of a process"""
    d = .03; tt = t_(d)
    return fade(norm(np.sin(2 * np.pi * 3200 * tt) * env_exp(d, .004)) * .6)


def heartbeat():
    """lub-dub (biology: one heartbeat)"""
    a = thump(55); b = thump(50) * .7; s = int(.22 * SR)
    out = np.zeros(len(a) + s); out[:len(a)] += a; out[s:s + len(b)] += b
    return fade(norm(out))


def bubble():
    """a molecule / particle released (biology, chemistry)"""
    d = .12; tt = t_(d); f = 900 + 1800 * (tt / d) ** 2
    return fade(norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .03)) * .7)


SET = {"chalk": chalk, "tap": tap, "pop": pop, "card": card, "whoosh": whoosh, "thump": thump, "ding": ding,
       "wrong": wrong, "tick": tick, "heartbeat": heartbeat, "bubble": bubble}


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    out = sys.argv[1]; names = sys.argv[2:] or list(SET)
    os.makedirs(out, exist_ok=True)
    for n in names:
        write(os.path.join(out, n + ".wav"), SET[n]())
    print("sfx:", ", ".join(names), "->", out)
