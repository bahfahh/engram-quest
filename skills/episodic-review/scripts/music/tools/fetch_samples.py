#!/usr/bin/env python3
"""Download the instrument samples used by music_gen.py (every minor third: C, Eb, Gb, A; the generator
transposes by at most one semitone to reach the notes in between).

Only sources whose licence allows redistribution and commercial use (with attribution):
  salamander  : Salamander Grand Piano V3, Alexander Holm, CC BY 3.0  (github.com/Tonejs/audio, salamander/README)
                -> the .ogg set (Vorbis ~160 kb/s). The .mp3 set in the same folder is ~36 kb/s and cut off above ~5-7 kHz.
  fluidr3_gm  : FluidR3_GM SoundFont, Frank Wen, MIT; rendered by Benjamin Gleitzman's midi-js-soundfonts, CC BY 3.0
                -> taken from <instrument>-ogg.js (Vorbis 80 kb/s, base64 data inside a JS object; parsed as text, never executed),
                   because the loose <instrument>-mp3/*.mp3 files are band-limited to ~8 kHz.
MusyngKite / FatBoy from the same repo are CC BY-SA 3.0 (share-alike) and are NOT used.

  python3 -I tools/fetch_samples.py            # needs only curl; raw.githubusercontent.com must be reachable
"""
import base64, os, re, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'samples')
SHARP = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']
FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']


def name(m, table):
    return f'{table[m % 12]}{m // 12 - 1}'


def thirds(lo, hi):
    return [m for m in range(lo, hi + 1) if m % 3 == 0]   # MIDI 60 = C4; multiples of 3 are C, Eb, Gb, A


SAL = 'https://raw.githubusercontent.com/Tonejs/audio/master/salamander/'
FLU = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/'
FLUID = {  # instrument: (lowest, highest) MIDI note to keep
    'string_ensemble_1': (36, 81), 'pad_2_warm': (36, 81), 'music_box': (60, 96), 'celesta': (60, 96),
    'glockenspiel': (72, 105), 'vibraphone': (48, 84), 'electric_piano_1': (36, 84), 'marimba': (48, 84),
    'orchestral_harp': (36, 84),
}


def curl(url, dst):
    for _ in range(3):
        r = subprocess.run(['curl', '-sS', '-f', '-L', '-o', dst, url])
        if r.returncode == 0 and os.path.getsize(dst) > 1000:
            return True
        time.sleep(1)
    return False


def main():
    bad = []
    d = os.path.join(OUT, 'salamander')
    os.makedirs(d, exist_ok=True)
    for m in thirds(33, 96):
        dst = os.path.join(d, f'{m}.ogg')
        if not (os.path.exists(dst) and os.path.getsize(dst) > 1000) and not curl(SAL + name(m, SHARP) + '.ogg', dst):
            bad.append(dst)
    tmp = tempfile.mkdtemp(prefix='fluid_js_')
    for inst, (lo, hi) in FLUID.items():
        d = os.path.join(OUT, 'fluidr3_gm', inst)
        os.makedirs(d, exist_ok=True)
        want = thirds(lo, hi)
        if all(os.path.exists(os.path.join(d, f'{m}.ogg')) for m in want):
            continue
        js = os.path.join(tmp, inst + '-ogg.js')
        if not curl(FLU + inst + '-ogg.js', js):
            bad.append(js)
            continue
        text = open(js, encoding='utf-8', errors='replace').read()
        for m in want:
            mm = re.search(r'"%s"\s*:\s*"data:audio/ogg;base64,([A-Za-z0-9+/=]+)"' % name(m, FLAT), text)
            if not mm:
                bad.append(f'{inst}:{name(m, FLAT)}')
                continue
            with open(os.path.join(d, f'{m}.ogg'), 'wb') as f:
                f.write(base64.b64decode(mm.group(1)))
        os.remove(js)
    os.rmdir(tmp) if not os.listdir(tmp) else None
    print('missing:', *bad, sep='\n  ') if bad else print('all samples present in', OUT)


if __name__ == '__main__':
    main()
