#!/usr/bin/env python3
"""music_gen.py - light background music for recall films, composed by rule for a given mood and played on sampled instruments.

  nice -n 10 python3 music_gen.py --mood warm --seed 7 --dur 70 --out demo/warm_7.wav
  nice -n 10 python3 music_gen.py --mood reflective --seed 3 --dur 40 --density bed --key Eb --out x.wav
  nice -n 10 python3 music_gen.py --mood thinking --seed 5 --dur 8 --key Eb --out recall.wav   # recall countdown: one held chord that slowly dissolves
  nice -n 10 python3 music_gen.py --mood chime --seed 1 --key Eb --out reveal.wav              # reveal: one pitched bell
  python3 music_gen.py --mood curious --seed 3 --dur 70 --plan     # print the composition plan only (key, tempo, chord chart); no audio
  python3 music_gen.py --list

Output: <out>.wav (48 kHz stereo, 24-bit PCM), <out>.notes.tsv (note table), <out>.json (plan, chord chart, loudness, credits).

Rule: background sound is always pitched music. No white noise, hiss, room tone or noise whoosh. The reverb impulse
response is built from decaying noise, but it is only convolved with the notes: with no note at the input there is no sound.
"""
import argparse, itertools, json, math, os, re, subprocess, sys, tempfile
from fractions import Fraction
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLE_DIR = os.path.join(HERE, 'samples')
# decoded samples (~260 MB): outside the skill folder by default, so the vault stays clean (MUSIC_CACHE_DIR overrides)
CACHE_DIR = os.environ.get('MUSIC_CACHE_DIR') or os.path.join(os.path.expanduser('~'), '.cache', 'engram-episodic-music')

# ============================================================================ sources & instruments
SOURCES = {
    'salamander': dict(
        title='Salamander Grand Piano V3', author='Alexander Holm', license='CC BY 3.0',
        license_url='https://creativecommons.org/licenses/by/3.0/',
        via='https://github.com/Tonejs/audio/tree/master/salamander',
        credit='Piano samples: "Salamander Grand Piano V3" by Alexander Holm, licensed under CC BY 3.0 '
               '(https://creativecommons.org/licenses/by/3.0/); sample set via github.com/Tonejs/audio.'),
    'fluidr3_gm': dict(
        title='FluidR3_GM SoundFont', author='Frank Wen (per-note renders: Benjamin Gleitzman, midi-js-soundfonts)',
        license='MIT (FluidR3 SoundFont) / CC BY 3.0 (midi-js-soundfonts renders)',
        license_url='https://creativecommons.org/licenses/by/3.0/us/',
        via='https://github.com/gleitz/midi-js-soundfonts/tree/gh-pages/FluidR3_GM',
        credit='Instrument samples: FluidR3_GM SoundFont by Frank Wen, Copyright (c) 2000-2002, 2008 (MIT License); '
               'per-note renders from "midi-js-soundfonts" by Benjamin Gleitzman, CC BY 3.0 '
               '(https://creativecommons.org/licenses/by/3.0/us/).'),
}

# kind: decay = the note dies away by itself (piano, glockenspiel, ...); sustain = a held tone (strings, pad: looped with a crossfade at the seam)
# tone: velocity -> brightness (one-pole lowpass, cutoff = base * 2**(vel*span)); None = no filter
INST = {
    'piano':     dict(src='salamander', dir='salamander', kind='decay', release=0.30, tone=(2600, 3.2)),
    'strings':   dict(src='fluidr3_gm', dir='fluidr3_gm/string_ensemble_1', kind='sustain', attack=0.55, release=1.4, loop_from=0.7, tone=(2600, 2.0)),
    'pad':       dict(src='fluidr3_gm', dir='fluidr3_gm/pad_2_warm', kind='sustain', attack=1.3, release=2.4, loop_from=1.0, tone=None),
    'music_box': dict(src='fluidr3_gm', dir='fluidr3_gm/music_box', kind='decay', release=0.9, tone=(2100, 1.8), eq=[('peak', 3150, -3.0, 0.9)]),
    'celesta':   dict(src='fluidr3_gm', dir='fluidr3_gm/celesta', kind='decay', release=0.8, tone=(3000, 2.0)),
    'glock':     dict(src='fluidr3_gm', dir='fluidr3_gm/glockenspiel', kind='decay', release=0.8, tone=(2500, 1.8)),
    'epiano':    dict(src='fluidr3_gm', dir='fluidr3_gm/electric_piano_1', kind='decay', release=0.25, tone=(1900, 2.4)),
    'vibes':     dict(src='fluidr3_gm', dir='fluidr3_gm/vibraphone', kind='decay', release=0.6, tone=(2800, 2.0)),
    'marimba':   dict(src='fluidr3_gm', dir='fluidr3_gm/marimba', kind='decay', release=0.15, tone=(2300, 2.2)),
    'harp':      dict(src='fluidr3_gm', dir='fluidr3_gm/orchestral_harp', kind='decay', release=0.5, tone=(2000, 2.4)),
}

# ============================================================================ theory
MAJOR = [0, 2, 4, 5, 7, 9, 11]
ROMAN = {'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6}
KEY_PC = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
FLAT_KEYS = {'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'}
CHORD_RE = re.compile(r'^(b?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)([a-z0-9]*)(?:/(\d))?$')


def note_name(m, flats=True):
    return (FLATS if flats else SHARPS)[m % 12] + str(m // 12 - 1)


class Chord:
    """Roman numeral relative to a tonic: case = quality, b = lowered root, suffix maj7/7/9/add9/sus2/sus4/6/maj9, /3 /5 /7 = inversion."""

    def __init__(self, sym, tonic):
        m = CHORD_RE.match(sym)
        if not m:
            raise ValueError('bad chord ' + sym)
        flat, rn, suf, inv = m.groups()
        self.sym, self.tonic = sym, tonic
        self.root = (tonic + MAJOR[ROMAN[rn.upper()]] - (1 if flat else 0)) % 12
        self.minor = rn.islower()
        tri = [0, 3 if self.minor else 4, 7]
        self.sus = 'sus4' if 'sus4' in suf else 'sus2' if 'sus2' in suf else None
        if self.sus == 'sus4': tri[1] = 5
        if self.sus == 'sus2': tri[1] = 2
        ext = []
        if 'maj9' in suf: ext += [11, 14]
        elif 'maj7' in suf: ext += [11]
        elif re.search(r'(^|[^d])9', suf): ext += [10, 14]
        elif '7' in suf: ext += [10]
        if 'add9' in suf: ext += [14]
        if '6' in suf: ext += [9]
        self.ivs = tri + ext
        self.ext = ext
        bass_iv = {None: 0, '3': tri[1], '5': 7, '7': (ext[0] if ext else 10)}[inv]
        self.bass_pc = (self.root + bass_iv) % 12
        self.order = [(self.root + i) % 12 for i in self.ivs]       # priority: root, 3rd, 5th, ext
        self.pcs = set(self.order)
        self.third = (self.root + tri[1]) % 12
        self.fifth = (self.root + 7) % 12
        self.suf, self.inv = suf, inv

    def name(self, flats=True):
        n = (FLATS if flats else SHARPS)[self.root]
        q = self.suf
        if self.minor and not self.sus:
            q = 'm' + q.replace('maj', 'M')
        if self.inv:
            q += '/' + (FLATS if flats else SHARPS)[self.bass_pc]
        return n + q

    def color(self):
        """Tones allowed on strong beats besides chord tones: the 9th over major-quality chords."""
        if not self.minor and not self.sus and 2 not in [i % 12 for i in self.ivs]:
            return {(self.root + 2) % 12}
        return set()


def local_scale(key_pc, chord):
    sc = {(key_pc + i) % 12 for i in MAJOR}
    for pc in chord.pcs - sc:                       # borrowed tones (e.g. iv in major) replace their neighbours
        sc -= {(pc + 1) % 12, (pc - 1) % 12}
        sc.add(pc)
    return sc


def smooth(u):
    u = np.clip(u, 0.0, 1.0)
    return u * u * (3 - 2 * u)


# ============================================================================ moods
# pools are 4-bar phrases (one symbol per bar; 'X|Y' = two chords in one bar).
# ante = antecedent phrase (ends off the tonic), cons = consequent phrase (returns to I), b = contrasting section;
# the b section of 'curious' is in the relative minor (its numerals are relative to the minor tonic).
MOODS = {
    'warm': dict(
        desc='warm, nostalgic (back in that room): broken piano chords + long string notes, major key', meter=4, bpm=(65, 75),
        keys=['C', 'D', 'Eb', 'F', 'G', 'Bb'], rt60=2.4, predelay=0.018, wet=0.30,
        pools=dict(
            ante=[['I', 'V/3', 'vi', 'IV'], ['I', 'vi7', 'IVmaj7', 'Vsus4|V'], ['Iadd9', 'iii', 'IV', 'V'],
                  ['IVmaj7', 'I/3', 'ii7', 'Vsus4|V'], ['I', 'IV/3', 'vi', 'V']],
            cons=[['IV', 'I/3', 'ii7|V', 'I'], ['vi7', 'IV', 'Vsus4|V', 'I'], ['ii7', 'V', 'I/3', 'IV|I'],
                  ['IV', 'iv', 'I', 'I'], ['I/3', 'IV', 'V', 'I']],
            b=[['vi', 'IV', 'I/5', 'V'], ['IV', 'V', 'iii', 'vi'], ['vi7', 'iii', 'IVmaj7', 'Vsus4|V'], ['ii7', 'I/3', 'IV', 'V']],
            intro1=[['Iadd9'], ['I']], intro2=[['I', 'IVmaj7'], ['Iadd9', 'Iadd9'], ['IVmaj7', 'Vsus4']],
            tag1=[['IV|V']], tag2=[['IV', 'Vsus4|V'], ['ii7', 'V']], tag3=[['vi', 'IV', 'Vsus4|V']],
            final=['Iadd9', 'I']),
        mel=dict(inst='piano', lo=65, hi=84, center=74, vel=0.52),
        rhythm=dict(bars=[[(0, 1.5), (1.5, 0.5), (2, 2)], [(0, 1), (1, 1), (2, 1.5), (3.5, 0.5)], [(0, 3), (3, 1)],
                          [(0.5, 0.5), (1, 1), (2, 2)], [(0, 2), (2, 1), (3, 1)], [(0, 1), (1, 0.5), (1.5, 0.5), (2, 2)]],
                    sparse=[[(0, 3)], [(0, 2), (2, 2)], [(1, 3)]],
                    end=[[(0, 3)], [(0, 2), (2, 1.5)], [(0, 2.5)]])),
    'curious': dict(
        desc='light and curious, like piecing clues together: syncopated electric-piano chords + plucked harp bass + marimba melody, '
             'major key alternating with its relative minor', meter=4, bpm=(80, 90),
        keys=['C', 'D', 'F', 'G', 'A', 'Bb'], rt60=1.7, predelay=0.012, wet=0.22,
        pools=dict(
            ante=[['I', 'V', 'vi', 'IV'], ['I', 'iii', 'IV', 'V'], ['IV', 'V', 'iii', 'vi'], ['I', 'IV', 'ii7', 'V'], ['I', 'vi', 'ii', 'V']],
            cons=[['I', 'IV', 'V', 'I'], ['I', 'vi', 'ii|V', 'I'], ['IV', 'V', 'I', 'I'], ['vi', 'ii', 'V', 'I'], ['IV', 'I/3', 'V', 'I']],
            b=[['i', 'bVI', 'bIII', 'bVII'], ['i', 'iv', 'bVII', 'bIII|bVII'], ['i', 'bVII', 'bVI', 'bVII'],
               ['iv', 'i', 'bVI', 'bVII'], ['i', 'v', 'bVI', 'bVII']],
            intro1=[['I'], ['IV|V']], intro2=[['I', 'IV'], ['I', 'I'], ['IV', 'V']],
            tag1=[['IV|V']], tag2=[['IV', 'V'], ['ii', 'V']], tag3=[['ii', 'IV', 'V']],
            final=['I', 'Iadd9']),
        minor_b=True,
        mel=dict(inst='marimba', lo=65, hi=84, center=74, vel=0.55),
        rhythm=dict(bars=[[(0, 0.5), (0.5, 0.5), (1, 1), (2.5, 0.5), (3, 1)], [(0, 0.75), (0.75, 0.25), (1, 0.5), (1.5, 0.5), (2, 1)],
                          [(0.5, 0.5), (1, 0.5), (1.5, 1), (3, 0.5), (3.5, 0.5)], [(0, 1), (1.5, 0.5), (2, 0.5), (2.5, 1)],
                          [(0, 0.5), (1, 0.5), (2, 0.5), (2.5, 0.5), (3, 1)]],
                    sparse=[[(0, 1), (2, 1)], [(0.5, 0.5), (1, 1.5)], [(0, 1.5), (2, 0.5)]],
                    end=[[(0, 1), (1, 0.5), (1.5, 1.5)], [(0, 2)], [(0, 0.5), (0.5, 1.5)]])),
    'reflective': dict(
        desc='reflective, looking back (rewind): slow 3/4 broken piano chords + music-box melody + a very faint pad, '
             'with a reversed-reverb "breath" where phrases meet', meter=3, bpm=(55, 65),
        keys=['C', 'D', 'Eb', 'F', 'G', 'Ab'], rt60=3.2, predelay=0.025, wet=0.36,
        pools=dict(
            ante=[['I', 'iii', 'vi', 'IV'], ['IVmaj7', 'I/3', 'ii7', 'Vsus4|V'], ['vi', 'IV', 'I', 'V'], ['I', 'IVmaj7', 'vi7', 'V']],
            cons=[['IV', 'iv', 'I', 'I'], ['ii7', 'Vsus4|V', 'I', 'I'], ['vi7', 'IV', 'V', 'I'], ['IVmaj7', 'I/3', 'ii7|V', 'I']],
            b=[['vi', 'iii', 'IV', 'I/3'], ['vi7', 'IVmaj7', 'I', 'V'], ['ii7', 'vi7', 'IVmaj7', 'Vsus4|V']],
            intro1=[['I'], ['Iadd9']], intro2=[['I', 'IVmaj7'], ['Iadd9', 'Iadd9']],
            tag1=[['iv']], tag2=[['IV', 'iv'], ['ii7', 'Vsus4|V']], tag3=[['vi7', 'IV', 'iv']],
            final=['I', 'Iadd9']),
        mel=dict(inst='music_box', lo=69, hi=86, center=77, vel=0.50),
        rhythm=dict(bars=[[(0, 2), (2, 1)], [(0, 3)], [(0, 1), (1, 2)], [(1, 2)], [(0, 1.5), (1.5, 0.5), (2, 1)], [(0, 1), (1, 1), (2, 1)]],
                    sparse=[[(0, 3)], [(1, 2)]],
                    end=[[(0, 3)], [(0, 2)]])),
    'bright': dict(
        desc='bright ending (everything lights up): rising broken piano chords + glockenspiel, major key, each phrase higher than the last',
        meter=4, bpm=(76, 84),
        keys=['C', 'D', 'Eb', 'F', 'G'], rt60=2.2, predelay=0.016, wet=0.27,
        pools=dict(
            ante=[['I', 'V', 'vi', 'IV'], ['I', 'IV', 'vi', 'V'], ['IV', 'V', 'iii', 'vi'], ['I', 'iii', 'IV', 'V']],
            cons=[['IV', 'V', 'I', 'I'], ['ii7', 'V', 'I', 'I'], ['vi', 'IV', 'V', 'I'], ['IV', 'I/3', 'V', 'I']],
            b=[['vi', 'IV', 'I', 'V'], ['IV', 'V', 'vi', 'I/3'], ['ii', 'IV', 'V', 'V']],
            intro1=[['I'], ['IV|V']], intro2=[['I', 'IV'], ['IV', 'V']],
            tag1=[['IV|V']], tag2=[['IV', 'V'], ['ii7', 'V']], tag3=[['IV', 'V', 'V']],
            final=['I', 'Iadd9']),
        mel=dict(inst='piano', lo=67, hi=86, center=74, vel=0.55),
        rhythm=dict(bars=[[(0, 1), (1, 1), (2, 1), (3, 1)], [(0, 1.5), (1.5, 0.5), (2, 1), (3, 1)], [(0, 2), (2, 0.5), (2.5, 0.5), (3, 1)],
                          [(0, 0.5), (0.5, 0.5), (1, 1), (2, 2)], [(0, 1), (1, 0.5), (1.5, 0.5), (2, 1), (3, 1)]],
                    sparse=[[(0, 2), (2, 2)], [(0, 3)], [(0, 1), (2, 2)]],
                    end=[[(0, 2), (2, 2)], [(0, 3)], [(0, 1), (1, 3)]])),
    'thinking': dict(
        desc='recall countdown: very sparse and unresolved (rests on V9sus4 or IVmaj7); under 16 s it is one held chord that slowly dissolves',
        meter=4, bpm=(58, 64),
        keys=['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'], rt60=3.6, predelay=0.03, wet=0.42, chord_bars=2,
        pools=dict(
            ante=[['Iadd9', 'vi7', 'IVmaj7', 'V9sus4'], ['IVmaj7', 'Iadd9/3', 'vi7', 'V9sus4'], ['vi7', 'IVmaj7', 'Iadd9', 'V9sus4']],
            cons=[['Iadd9', 'IVmaj7', 'ii7', 'V9sus4'], ['vi7', 'IVmaj7', 'ii7', 'V9sus4'], ['IVmaj7', 'vi7', 'IVmaj7', 'V9sus4']],
            b=[['vi7', 'IVmaj7', 'Iadd9', 'IVmaj7']],
            intro1=[['Iadd9']], intro2=[['Iadd9', 'IVmaj7']],
            tag1=[['IVmaj7']], tag2=[['vi7', 'IVmaj7']], tag3=[['Iadd9', 'vi7', 'IVmaj7']],
            final=['V9sus4', 'V9sus4', 'IVmaj7']),
        mel=dict(inst='piano', lo=67, hi=86, center=76, vel=0.36),
        rhythm=None),
    'chime': dict(desc='sound effect: one sound at the reveal (a clean pitched bell or pluck, never noise)', meter=4, bpm=(60, 60),
                  keys=['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'], rt60=2.6, predelay=0.02, wet=0.34),
}
DENSITY_LUFS = {'full': -20.0, 'light': -23.0, 'bed': -26.0}
MOOD_LUFS = {'thinking': -28.0, 'chime': -24.0}

# layer mix: gain dB, reverb send, pan (None = by pitch)
LAYERS = {
    'lh': (-0.5, 1.0, None), 'mel': (3.0, 1.0, None), 'strings': (-2.0, 1.0, 'spread'), 'sbass': (-6.0, 0.8, 0.0),
    'pad': (-5.0, 0.9, 0.0), 'box': (-1.0, 1.0, 0.25), 'glock': (-1.5, 1.0, 0.3), 'ep': (-2.0, 0.8, -0.18),
    'harp': (-1.0, 0.7, -0.25), 'marimba': (-1.5, 0.7, 0.2), 'vibes': (-3.0, 0.9, 0.28), 'cel': (-5.0, 1.0, 0.22),
    'rh': (-1.0, 1.0, None), 'fx': (0.0, 1.0, 0.1),
}


class Note:
    __slots__ = ('layer', 'inst', 'midi', 'beat', 'dur', 'vel', 'role', 'dt', 'hold_s', 't', 'hold', 'pan')

    def __init__(self, layer, inst, midi, beat, dur, vel, role='', dt=0.0, hold_s=None, pan=None):
        self.layer, self.inst, self.midi, self.beat, self.dur = layer, inst, int(midi), float(beat), float(dur)
        self.vel, self.role, self.dt, self.hold_s, self.pan = float(np.clip(vel, 0.05, 1.0)), role, dt, hold_s, pan
        self.t = self.hold = None


class Span:
    def __init__(self, b0, b1, chord, sec, part, role, mode, key_pc):
        self.b0, self.b1, self.chord, self.sec, self.part, self.role, self.mode = b0, b1, chord, sec, part, role, mode
        self.scale = local_scale(key_pc, chord)


# ============================================================================ composition
class Composer:
    def __init__(self, mood, seed, dur, density='full', key=None, open_tonic=False):
        if mood not in MOODS:
            raise SystemExit(f'unknown mood {mood}; choose from {", ".join(MOODS)}')
        self.mood, self.seed, self.dur, self.density = mood, int(seed), float(dur), density
        self.cfg = MOODS[mood]
        ss = np.random.SeedSequence([int(seed), sum(map(ord, mood)) * 7919])
        r_key, r_form, r_mel, r_arr, r_hum, self.r_render = [np.random.default_rng(s) for s in ss.spawn(6)]
        self.r_form, self.r_mel, self.r_arr, self.r_hum = r_form, r_mel, r_arr, r_hum
        k = str(r_key.choice(self.cfg['keys']))           # always drawn, so a fixed --key leaves tempo/form unchanged
        self.key = key if key else k
        self.open_tonic = open_tonic
        if self.key not in KEY_PC:
            raise SystemExit('key must be one of ' + ' '.join(KEY_PC))
        self.key_pc = KEY_PC[self.key]
        self.flats = self.key in FLAT_KEYS
        self.meter = self.cfg['meter']
        self.bpm0 = float(r_key.uniform(*self.cfg['bpm']))
        self.notes, self.swells, self.spans, self.sections = [], [], [], []
        self.lead = 0.25
        self.form_kind = 'song'
        if mood == 'chime':
            self.form_kind = 'chime'
        elif mood == 'thinking' and dur < 16:
            self.form_kind = 'dissolve'
        self.compose()

    # ------------------------------------------------------------------ form
    def pick(self, pool, avoid_first=None, avoid=None):
        opts = [p for p in pool if p[0].split('|')[0] != avoid_first and p != avoid] or pool
        return list(opts[self.r_form.integers(len(opts))])

    def build_form(self, B):
        P = self.cfg['pools']
        intro_n = 0 if B < 6 else (1 if B < 12 else 2)
        R = B - intro_n
        n_ph, left = divmod(R, 4)
        if left == 1 and intro_n < 2 and n_ph > 0:
            intro_n, left = intro_n + 1, 0
        secs = []
        if intro_n:
            secs.append(dict(part='intro', role='intro', mode='major', bars=self.pick(P['intro%d' % intro_n])))
        if n_ph == 0:
            secs.append(dict(part='A', role='cons', mode='major', bars=self.pick(P['tag%d' % left]) if left else []))
        cycle = ['ante', 'cons', 'b', 'cons2']
        roles = [cycle[i % 4] for i in range(n_ph)]
        if n_ph == 3: roles = ['ante', 'b', 'cons']
        if n_ph == 5: roles = ['ante', 'cons', 'b', 'ante', 'cons2']
        if roles and roles[-1] in ('ante', 'b'): roles[-1] = 'cons2'
        first_ante = first_cons = None
        for i, role in enumerate(roles):
            prev_last = secs[-1]['bars'][-1].split('|')[-1] if secs and secs[-1]['bars'] else None
            mode = 'major'
            if role == 'b':
                bars = self.pick(P['b'], avoid_first=prev_last)
                mode = 'minor' if self.cfg.get('minor_b') else 'major'
            elif role == 'ante':
                if first_ante and self.r_form.random() < 0.5:
                    bars = list(first_ante)
                else:
                    bars = self.pick(P['ante'], avoid_first=prev_last)
                if self.cfg.get('minor_b') and i >= 3 and self.r_form.random() < 0.5:
                    bars, mode = self.pick(P['b'], avoid_first=prev_last), 'minor'
                first_ante = first_ante or bars
            else:
                if role == 'cons2' and first_cons and self.r_form.random() < 0.6:
                    bars = list(first_cons)
                else:
                    pool = P['cons']
                    if prev_last and prev_last.startswith('bVII'):         # after the minor section's bVII (= V of the major key), land on I
                        pool = [p for p in pool if p[0] == 'I'] or pool
                    bars = self.pick(pool, avoid_first=prev_last)
                first_cons = first_cons or bars
            part = 'B' if role == 'b' or mode == 'minor' else ('A2' if role == 'cons2' else 'A')
            secs.append(dict(part=part, role=role, mode=mode, bars=bars))
        if left and n_ph > 0:
            secs.append(dict(part='tag', role='tag', mode='major', bars=self.pick(P['tag%d' % left])))
        if self.open_tonic and secs and secs[0]['bars'] and not secs[0]['bars'][0].split('|')[0].startswith('I'):
            secs[0]['bars'][0] = 'Iadd9' if self.mood in ('warm', 'reflective', 'thinking') else 'I'   # resolve the recall's V9sus4
        last = secs[-1]['bars'] if secs else []
        if len(last) >= 3 and last[-1] == last[-2] and last[-1] in ('I', 'Iadd9'):
            secs[-1]['bars'] = last[:-1]                      # '... I | I | (final I)' would sit on the tonic too long
        prev_last = secs[-1]['bars'][-1].split('|')[-1] if secs and secs[-1]['bars'] else None
        fopts = [f for f in P['final'] if f != prev_last] or P['final']
        fin = fopts[self.r_form.integers(len(fopts))]
        secs.append(dict(part='final', role='final', mode='major', bars=[fin]))
        return secs

    def spans_from(self, secs):
        cb = self.cfg.get('chord_bars', 1) * self.meter
        spans, b, sections = [], 0.0, []
        for si, s in enumerate(secs):
            b_start = b
            for bar in s['bars']:
                parts = bar.split('|')
                if len(parts) == 1:
                    lens = [cb]
                else:
                    lens = [2, 2] if self.meter == 4 else [2, 1]
                    lens = [l * cb / self.meter for l in lens]
                for sym, ln in zip(parts, lens):
                    tonic = (self.key_pc + 9) % 12 if s['mode'] == 'minor' else self.key_pc
                    spans.append(Span(b, b + ln, Chord(sym, tonic), si, s['part'], s['role'], s['mode'], self.key_pc))
                    b += ln
            sections.append(dict(part=s['part'], role=s['role'], mode=s['mode'], b0=b_start, b1=b, bars=s['bars']))
        return spans, sections

    # ------------------------------------------------------------------ tempo
    def tempo_factors(self, g, F, ends, rng_ph):
        m = self.meter
        f = 1 + 0.010 * np.sin(2 * np.pi * g / (m * 4) + rng_ph[0]) + 0.005 * np.sin(2 * np.pi * g / (m * 1.5) + rng_ph[1])
        for e in ends:
            mask = (g > e - 1.5) & (g < e)
            f[mask] *= 1 - 0.045 * smooth((g[mask] - (e - 1.5)) / 1.5)
        s = F - 1.5 * m
        mask = g > s
        f[mask] *= 1 - 0.22 * smooth((g[mask] - s) / (F - s))
        return f

    def make_tempo(self, F, ends, base, phases):
        step = 1 / 96
        grid = np.arange(0, F + 64 + step, step)
        spb = 60.0 / (base * self.tempo_factors(grid, F, ends, phases))
        t = self.lead + np.concatenate([[0.0], np.cumsum(spb[:-1] * step)])
        return grid, t

    def tmap(self, b):
        return np.interp(b, self.grid, self.tgrid)

    # ------------------------------------------------------------------ compose
    def compose(self):
        if self.form_kind == 'chime':
            return self.compose_chime()
        if self.form_kind == 'dissolve':
            return self.compose_dissolve()
        cb = self.cfg.get('chord_bars', 1) * self.meter
        nominal = float(min(np.clip(0.1 * self.dur, 4.5, 8.0), 0.45 * self.dur))
        tail_lo, tail_hi = min(3.5, 0.3 * self.dur), min(max(1.4 * nominal, 6.5), 0.5 * self.dur)
        lo, hi = self.cfg['bpm']
        lo_ok, hi_ok = lo * (0.93 if self.dur < 40 else 0.97), hi * (1.07 if self.dur < 40 else 1.03)
        phases = self.r_form.uniform(0, 2 * np.pi, 2)
        best = None
        B0 = max(1, int(round((self.dur - nominal - self.lead) / (cb * 60 / self.bpm0))))
        for B in range(max(1, B0 - 2), B0 + 3):
            state = self.r_form.bit_generator.state
            secs = self.build_form(B)
            spans, sections = self.spans_from(secs)
            F = spans[-1].b0
            ends = [s['b1'] for s in sections[:-1] if s['role'] in ('ante', 'cons', 'b', 'cons2')]
            grid, t = self.make_tempo(F, ends, 1.0, phases)
            K = np.interp(F, grid, t) - self.lead
            # 1st choice: keep the seed's own tempo (bpm0) and let the final chord's ring-out absorb the difference
            tail = self.dur - self.lead - K / self.bpm0
            if tail_lo <= tail <= tail_hi:
                base, score = self.bpm0, abs(tail - nominal)
            else:                                                      # otherwise stretch the tempo to fit
                base = K / (self.dur - nominal - self.lead)
                score = 50 + abs(base - self.bpm0) + (0 if lo_ok <= base <= hi_ok else 100)
            if best is None or score < best[0]:
                best = (score, B, secs, spans, sections, F, ends, base, self.r_form.bit_generator.state)
            self.r_form.bit_generator.state = state
        _, B, secs, self.spans, self.sections, F, ends, base, st = best
        self.r_form.bit_generator.state = st
        if not lo_ok <= base <= hi_ok:                                   # very short/odd durations: clamp tempo, let the tail absorb it
            base = float(np.clip(base, lo_ok, hi_ok))
        self.bpm = base
        self.grid, self.tgrid = self.make_tempo(F, ends, base, phases)
        self.F = F
        self.t_final = float(self.tmap(F))
        self.tail = self.dur - self.t_final
        self.spans[-1].b1 = F + cb
        getattr(self, 'arrange_' + self.mood)()

    # ------------------------------------------------------------------ helpers
    def span_at(self, b):
        for sp in self.spans:
            if sp.b0 - 1e-6 <= b < sp.b1 - 1e-6:
                return sp
        return self.spans[-1]

    def sec_of(self, sp):
        return self.sections[sp.sec]

    def arc(self, b):
        sp = self.span_at(b)
        s = self.sections[sp.sec]
        u = (b - s['b0']) / max(1e-6, s['b1'] - s['b0'])
        return 0.06 * math.sin(math.pi * u)

    def intensity(self, part):
        return dict(intro=-0.08, A=0.0, A2=0.03, B=0.06, tag=0.02, final=0.0).get(part, 0.0)

    def body_spans(self):
        return self.spans[:-1]

    def basses(self, lo, hi, start=None):
        out, prev = [], start
        for sp in self.spans:
            c = [m for m in range(lo, hi + 1) if m % 12 == sp.chord.bass_pc]
            ref = prev if prev is not None else lo + 6
            m = min(c, key=lambda m: (abs(m - ref), m))
            out.append(m)
            prev = m
        return out

    def voice(self, chord, prev, n, lo, hi, bass=None):
        cands = [m for m in range(lo, hi + 1) if m % 12 in chord.pcs]
        need = {chord.third}
        if chord.ext:
            need.add((chord.root + chord.ext[0]) % 12)
        if bass is None or bass % 12 != chord.root:
            need.add(chord.root) if n >= 3 and len(need) < n else None
        center = (lo + hi) / 2
        best = None
        for strict in (True, False):
            for combo in itertools.combinations(cands, n):
                pcs = {m % 12 for m in combo}
                if not need <= pcs:
                    continue
                gaps = [b - a for a, b in zip(combo, combo[1:])]
                if strict:
                    if any(g < 2 or (g == 2 and a < 62) or g > 9 for g, a in zip(gaps, combo)):
                        continue
                    if any((b - a) % 12 == 1 for a, b in itertools.combinations(combo, 2)):
                        continue
                    if bass is not None and any((m - bass) % 12 == 1 for m in combo):
                        continue
                cost = 0.12 * abs(np.mean(combo) - center) + (1.5 if len(pcs) < n else 0)
                if prev and len(prev) == n:
                    cost += sum(abs(a - b) for a, b in zip(combo, prev))
                cost += self.r_arr.random() * 0.3
                if best is None or cost < best[0]:
                    best = (cost, list(combo))
            if best:
                return best[1]
        return sorted(cands[:n])

    def arp_pool(self, chord, bass, top, size=5):
        pool, last = [bass], bass
        for m in range(bass + 5, top + 1):
            pc = m % 12
            if pc not in chord.pcs:
                continue
            if m < bass + 12 and pc not in (chord.root, chord.fifth) and not (chord.sus and pc == chord.third and m > 52):
                continue                                        # first octave over the bass: only 1 and 5 (no mud)
            if m - last < 3 or (m - bass) % 12 == 1:
                continue
            pool.append(m)
            last = m
            if len(pool) == size:
                break
        return pool

    def add(self, *a, **k):
        n = Note(*a, **k)
        self.notes.append(n)
        return n

    # ------------------------------------------------------------------ accompaniment building blocks
    def piano_arps(self, basses, pattern, top, vel0, step=0.5, layer='lh', inst='piano', parts=None, pedal=True):
        for sp, bass in zip(self.body_spans(), basses):
            if parts and sp.part not in parts:
                continue
            pool = self.arp_pool(sp.chord, bass, top)
            n = int(round((sp.b1 - sp.b0) / step))
            for k in range(n):
                idx = min(pattern[k % len(pattern)], len(pool) - 1)
                b = sp.b0 + k * step
                v = vel0 + self.intensity(sp.part) + self.arc(b) + (0.07 if k == 0 else 0) - 0.02 * (k % 2) + self.r_hum.normal(0, 0.03)
                dur = (sp.b1 - b + 0.06) if pedal else step * 1.6
                self.add(layer, inst, pool[idx], b, dur, v, role='arp' if k else 'bass')

    def pad_voices(self, n, lo, hi, vel0, inst='strings', layer='strings', parts=None, low=None, low_layer='sbass', start_part_vel=None):
        cur = {}  # voice index -> Note
        prev = None
        basses = self.basses(*low[:2]) if low else None
        spans = self.spans
        for i, sp in enumerate(spans):
            if parts and sp.part not in parts:
                for k in list(cur):
                    cur.pop(k)
                prev = None
                continue
            vo = self.voice(sp.chord, prev, n, lo, hi, bass=basses[i] if basses else None)
            v = vel0 + self.intensity(sp.part) * 1.5
            last = sp.part == 'final'
            for k, m in enumerate(vo):
                if k in cur and cur[k].midi == m and not last:
                    cur[k].dur = sp.b1 - cur[k].beat + 0.1
                    continue
                if last:
                    note = self.add(layer, inst, m, sp.b0, 1, v, role='pad', hold_s=max(1.0, self.tail - 3.4), pan=(k / max(1, n - 1) - 0.5) * 0.7)
                else:
                    note = self.add(layer, inst, m, sp.b0, sp.b1 - sp.b0 + 0.1, v, role='pad', pan=(k / max(1, n - 1) - 0.5) * 0.7)
                cur[k] = note
            if basses:
                m = basses[i]
                if 'lowcur' in cur and cur['lowcur'].midi == m and not last:
                    cur['lowcur'].dur = sp.b1 - cur['lowcur'].beat + 0.1
                else:
                    cur['lowcur'] = self.add(low_layer, inst, m, sp.b0, sp.b1 - sp.b0 + 0.1, v * 0.9, role='pad-bass',
                                             hold_s=max(1.0, self.tail - 3.4) if last else None)
            prev = vo

    def final_chord(self, bass, inst='piano', layer='lh', vel=0.42, top=None, n=3, lo=55, hi=72, roll=0.04, top_inst=None, top_layer='mel', bass_oct=True):
        sp = self.spans[-1]
        vo = self.voice(sp.chord, None, n, lo, hi, bass=bass)
        hold = max(1.5, self.tail - 1.6)
        ms = [bass] + ([bass - 12] if bass_oct and bass - 12 >= 36 and self.density != 'bed' else []) + vo
        for k, m in enumerate(sorted(ms)):
            self.add(layer, inst, m, sp.b0, 1, vel - 0.04 * (k == 0 and m < bass), role='final', dt=k * roll, hold_s=hold)
        if top is not None:
            self.add(top_layer, top_inst or inst, top, sp.b0, 1, vel + 0.08, role='final-mel', dt=len(ms) * roll + 0.02, hold_s=hold)
        return vo

    # ------------------------------------------------------------------ melody
    def is_strong(self, b, d):
        p = b % self.meter
        return abs(p) < 1e-6 or (self.meter == 4 and abs(p - 2) < 1e-6) or d >= 1.5 - 1e-6

    def melody_pitches(self, notes, lo, hi, target, end_pcs, prev=None, prefix=None, temp=0.7, width=40):
        beams = [(0.0, [], [])]   # score, pitches, is-chord-tone flags
        for i, (b, d) in enumerate(notes):
            sp = self.span_at(b)
            ch = sp.chord
            strong = self.is_strong(b, d)
            ok_strong = ch.pcs | ch.color()
            cands = [m for m in range(lo, hi + 1) if m % 12 in sp.scale]
            if i == len(notes) - 1:
                c2 = [m for m in cands if m % 12 in end_pcs]
                cands = c2 or [m for m in cands if m % 12 in ch.pcs]
            nb = []
            for sc, seq, cts in beams:
                p1 = seq[-1] if seq else prev
                p2 = seq[-2] if len(seq) >= 2 else (prev if seq else None)
                for m in cands:
                    pc = m % 12
                    ct = pc in ch.pcs
                    if strong and pc not in ok_strong:
                        continue
                    s = sc
                    if p1 is not None:
                        a = abs(m - p1)
                        if a in (6,) or a > 9:
                            continue
                        if not ct and pc not in ok_strong and not (1 <= a <= 2):
                            continue                              # non-chord tones only by step
                        if cts and not cts[-1] and not (1 <= a <= 2):
                            continue                              # ...and they resolve by step
                        if cts and not cts[-1] and not ct:
                            continue
                        s += {0: 0.2, 1: 2.4, 2: 2.4, 3: 1.1, 4: 1.1, 5: 0.1, 7: -0.6, 8: -1.6, 9: -1.6}[a]
                        if a == 0 and p2 is not None and p2 == p1:
                            s -= 3.0
                        if p2 is not None and m == p2 and 1 <= a <= 2 and 1 <= abs(p1 - p2) <= 2:
                            s -= 0.9                              # no D-C-D-C ping-pong
                        s -= 0.35 * max(0, seq[-6:].count(m) - 1)
                        if p2 is not None and abs(p1 - p2) >= 5:
                            if np.sign(m - p1) == -np.sign(p1 - p2) and 1 <= a <= 2:
                                s += 1.2
                            else:
                                s -= 2.0
                        if p2 is not None and a >= 3 and abs(p1 - p2) >= 3 and np.sign(m - p1) == np.sign(p1 - p2):
                            s -= 1.5
                    s -= 0.2 * abs(m - target[i])
                    if strong and ct:
                        s += 0.4
                    if prefix and i < len(prefix) and prefix[i] is not None:
                        s += 3.0 if m == prefix[i] else -0.25 * abs(m - prefix[i])
                    s += temp * self.r_mel.gumbel()
                    nb.append((s, seq + [m], cts + [ct or pc in ok_strong]))
            if not nb:   # relax: keep the beam alive with the nearest chord tone
                for sc, seq, cts in beams:
                    p1 = seq[-1] if seq else (prev or target[i])
                    m = min((m for m in range(lo, hi + 1) if m % 12 in ch.pcs), key=lambda m: abs(m - p1))
                    nb.append((sc - 5, seq + [m], cts + [True]))
            nb.sort(key=lambda x: -x[0])
            beams = nb[:width]
        return beams[0][1]

    def phrase_rhythm(self, sec, bars_n, base=None, sparse=False):
        R = self.cfg['rhythm']
        out = []
        for j in range(bars_n):
            if base and j < len(base):
                tpl = base[j]
            elif j == bars_n - 1:
                tpl = R['end'][self.r_mel.integers(len(R['end']))]
            elif sparse or (self.density == 'light' and j % 2 == 1):
                tpl = R['sparse'][self.r_mel.integers(len(R['sparse']))]
            else:
                tpl = R['bars'][self.r_mel.integers(len(R['bars']))]
            out.append(tpl)
        return out

    def melody(self, inst, layer, lo, hi, center, vel0, parts=None, rise=0.0, sparse=False, skip_bars=(), shift_b=3, octave_double=None):
        """Phrase-by-phrase melody: same rhythm/opening for parallel phrases, chord tones on strong beats,
        steps preferred, leaps recovered, a breath at the end of every phrase."""
        prev, first, first_cons = None, None, None
        out = []
        ph_i = 0
        for si, sec in enumerate(self.sections):
            if sec['role'] not in ('ante', 'cons', 'b', 'cons2'):
                continue
            if parts and sec['part'] not in parts:
                ph_i += 1
                continue
            bars_n = int(round((sec['b1'] - sec['b0']) / self.meter))
            base = None
            if sec['role'] in ('cons', 'cons2') and first:
                base = first['rhythm'][:2]
            rh = self.phrase_rhythm(sec, bars_n, base=base, sparse=sparse)
            notes = []
            for j, tpl in enumerate(rh):
                if j in skip_bars:
                    continue
                for on, d in tpl:
                    notes.append((sec['b0'] + j * self.meter + on, d))
            if not notes:
                continue
            c = center + (shift_b if sec['part'] == 'B' else 0) + rise * ph_i
            u = np.array([(b - sec['b0']) / (sec['b1'] - sec['b0']) for b, _ in notes])
            if rise:
                target = c - 3 + 7 * u
            else:
                target = c - 1 + 6 * np.sin(np.pi * np.clip(u * 1.15, 0, 1)) - (3 * u if sec['role'] in ('cons', 'cons2') else 0)
            last_sp = self.span_at(notes[-1][0])
            if sec['role'] in ('cons', 'cons2'):
                tonic = (self.key_pc + 9) % 12 if sec['mode'] == 'minor' else self.key_pc
                end_pcs = {tonic} if last_sp.chord.root == tonic else last_sp.chord.pcs
            else:
                end_pcs = last_sp.chord.pcs - {last_sp.chord.root} or last_sp.chord.pcs
            prefix = None
            if base and first:
                n0 = sum(len(t) for t in first['rhythm'][:2])
                prefix = first['pitches'][:n0]
            lo2, hi2 = int(min(lo + rise * ph_i, hi - 10)), int(min(hi + rise * ph_i, hi + 4))
            ps = self.melody_pitches(notes, lo2, hi2, target, end_pcs, prev=prev, prefix=prefix)
            if first is None:
                first = dict(rhythm=rh, pitches=ps)
            for k, ((b, d), m) in enumerate(zip(notes, ps)):
                uu = (b - sec['b0']) / (sec['b1'] - sec['b0'])
                v = vel0 + self.intensity(sec['part']) + 0.07 * math.sin(math.pi * uu) + (0.03 if d >= 1.5 else 0) \
                    + (0.04 if abs(b % self.meter) < 1e-6 else 0) - (0.05 if k == len(ps) - 1 else 0) + self.r_hum.normal(0, 0.03)
                n = self.add(layer, inst, m, b, d * 0.97, v, role='mel')
                out.append(n)
                if octave_double and sec['part'] in octave_double[2]:
                    self.add(octave_double[1], octave_double[0], m + 12, b, d, v * octave_double[3], role='mel8va')
            prev = ps[-1]
            ph_i += 1
        return out

    # ------------------------------------------------------------------ moods
    def arrange_warm(self):
        dens = self.density
        top = 64
        bass = self.basses(36, 50)
        pat = [[0, 1, 2, 3, 4, 3, 2, 1], [0, 1, 2, 3, 2, 4, 3, 2], [0, 2, 1, 3, 2, 4, 3, 1]][self.r_arr.integers(3)]
        if dens == 'bed':
            self.piano_arps(bass, [0, 1, 2, 3], top, 0.30, step=1.0)
            self.pad_voices(3, 55, 74, 0.30, low=(43, 55))
            if self.r_arr.random() < 0.6:
                self.melody('piano', 'mel', 65, 82, 74, 0.40, parts=('B',), sparse=True, skip_bars=(1,))
        else:
            self.piano_arps(bass, pat, top, 0.36 if dens == 'full' else 0.32)
            self.pad_voices(3, 55, 74, 0.32 if dens == 'full' else 0.27, parts=('A', 'A2', 'B', 'tag', 'final'), low=(43, 55))
            mel = self.cfg['mel']
            self.melody('piano', 'mel', mel['lo'], mel['hi'], mel['center'], mel['vel'] - (0.05 if dens == 'light' else 0))
        last_mel = [n.midi for n in self.notes if n.role == 'mel']
        top_note = None
        if last_mel:
            top_note = min((m for m in range(65, 86) if m % 12 == self.key_pc), key=lambda m: abs(m - last_mel[-1]))
        self.final_chord(bass[-1], top=top_note, vel=0.40)

    def arrange_reflective(self):
        dens = self.density
        bass = self.basses(36, 50)
        pat = [[0, 1, 2, 3, 2, 1], [0, 1, 2, 3, 4, 3], [0, 2, 3, 4, 3, 2]][self.r_arr.integers(3)]
        if dens == 'bed':
            self.piano_arps(bass, [0, 2, 3], 67, 0.28, step=1.0)
        else:
            self.piano_arps(bass, pat, 67, 0.33 if dens == 'full' else 0.30)
        self.pad_voices(3, 55, 72, 0.24 if dens != 'bed' else 0.27, inst='pad', layer='pad')
        mel = self.cfg['mel']
        if dens == 'bed':
            if self.r_arr.random() < 0.7:
                self.melody('music_box', 'box', 70, 84, 77, 0.40, parts=('A', 'B'), sparse=True, skip_bars=(1, 3))
        else:
            self.melody('music_box', 'box', mel['lo'], mel['hi'], mel['center'], mel['vel'] - (0.05 if dens == 'light' else 0), parts=('A', 'A2'))
            self.melody('piano', 'mel', 64, 81, 72, 0.40, parts=('B',), sparse=(dens == 'light'))
        # intro: a 3-note music-box motif over the first chord (like opening the lid)
        if self.sections[0]['role'] == 'intro' and dens != 'bed':
            sp = self.spans[0]
            tones = sorted({m for m in range(76, 89) if m % 12 in sp.chord.pcs})[:3]
            for k, m in enumerate(tones[::-1]):
                self.add('box', 'music_box', m, sp.b0 + 1 + k * 0.5, 1.2, 0.36 - 0.03 * k, role='motif')
        # rewind texture: reversed reverb swells that "breathe in" into new phrases and the final chord
        if dens != 'bed':
            for si, sec in enumerate(self.sections):
                if si == 0 or sec['role'] not in ('b', 'cons2', 'final', 'ante'):
                    continue
                sp = self.span_at(sec['b0'])
                vo = self.voice(sp.chord, None, 3, 60, 76)
                self.swells.append(dict(beat=sec['b0'], midis=vo, length=2.2 if sec['role'] != 'final' else 3.0, gain_db=-8.0))
        last_mel = [n.midi for n in self.notes if n.role == 'mel' or n.layer == 'box']
        top = None
        if last_mel:
            top = min((m for m in range(72, 92) if m % 12 == self.key_pc), key=lambda m: abs(m - last_mel[-1]))
        self.final_chord(bass[-1], top=top, top_inst='music_box', top_layer='box', vel=0.38, roll=0.06)

    def arrange_curious(self):
        dens = self.density
        harp_b = self.basses(36, 50)
        prev_vo = None
        comps = [[(0.5, 0.5), (1.5, 0.5), (2.5, 1.0)], [(0, 1.0), (1.5, 0.5), (3, 0.75)], [(0.5, 0.75), (2, 0.5), (3.5, 0.5)],
                 [(1, 0.5), (2.5, 0.5), (3, 1.0)], [(0, 0.5), (1.5, 1.0), (3, 0.5)]]
        sec_comp = {}
        for i, sp in enumerate(self.body_spans()):
            sec = sp.sec
            if sec not in sec_comp:
                sec_comp[sec] = comps[self.r_arr.integers(len(comps))]
            vo = self.voice(sp.chord, prev_vo, 3, 55, 72, bass=harp_b[i])
            prev_vo = vo
            v_add = self.intensity(sp.part)
            # harp: root, a fifth, and a step that leans into the next bass note
            L = sp.b1 - sp.b0
            self.add('harp', 'harp', harp_b[i], sp.b0, 1.5, 0.52 + v_add + self.r_hum.normal(0, 0.03), role='bass')
            if dens != 'bed' and L >= 3:
                f5 = harp_b[i] + 7 if harp_b[i] + 7 <= 60 else harp_b[i] - 5
                self.add('harp', 'harp', f5, sp.b0 + 2, 1.0, 0.40 + v_add, role='bass')
                nb = harp_b[i + 1]
                if nb != harp_b[i] and dens == 'full':
                    sc = sorted(m for m in range(nb - 3, nb + 4) if m % 12 in sp.scale and m != nb)
                    appr = min(sc, key=lambda m: (abs(m - nb), abs(m - harp_b[i])))
                    self.add('harp', 'harp', appr, sp.b0 + 3.5, 0.5, 0.34, role='bass')
            # electric piano: short off-beat chords
            pat = sec_comp[sec] if dens != 'bed' else [(0.5, 3.0)]
            for on, d in pat:
                if on >= L - 1e-6:
                    continue
                for k, m in enumerate(vo):
                    self.add('ep', 'epiano', m, sp.b0 + on, min(d, L - on) * 0.9, 0.36 + v_add - 0.02 * k + self.r_hum.normal(0, 0.025), role='comp')
        mel = self.cfg['mel']
        if dens == 'bed':
            if self.r_arr.random() < 0.6:
                self.melody('marimba', 'marimba', 65, 82, 72, 0.42, parts=('A', 'A2'), sparse=True, skip_bars=(1, 3))
        else:
            self.melody('marimba', 'marimba', mel['lo'], mel['hi'], mel['center'], mel['vel'] - (0.05 if dens == 'light' else 0), parts=('A', 'A2'))
            self.melody('vibes', 'vibes', 64, 83, 73, 0.46, parts=('B',), sparse=(dens == 'light'))
        last_mel = [n.midi for n in self.notes if n.role == 'mel']
        top = None
        if last_mel:
            top = min((m for m in range(65, 85) if m % 12 == self.key_pc), key=lambda m: abs(m - last_mel[-1]))
        sp = self.spans[-1]
        self.add('harp', 'harp', harp_b[-1], sp.b0, 1, 0.5, role='final', hold_s=max(1.5, self.tail - 1.6))
        self.final_chord(harp_b[-1] + 12, inst='epiano', layer='ep', vel=0.40, n=3, lo=57, hi=74, roll=0.03,
                         top=top, top_inst='marimba', top_layer='marimba', bass_oct=False)
        # the FluidR3 samples last ~3 s: a soft pad under the last chord carries the ring-out instead of dead air
        for k, m in enumerate(self.voice(sp.chord, None, 3, 55, 72)):
            self.add('pad', 'pad', m, sp.b0, 1, 0.26, role='final', dt=0.05, hold_s=max(1.0, self.tail - 2.6), pan=(k - 1) * 0.3)
        # a final vibes "ping" a fifth above the top note
        if top is not None and dens != 'bed':
            self.add('vibes', 'vibes', top + 7 if top + 7 <= 84 else top - 5, sp.b0, 1, 0.30, role='final', dt=0.35, hold_s=self.tail - 1.8)

    def arrange_bright(self):
        dens = self.density
        bass = self.basses(38, 52)
        pat = [[0, 1, 2, 3, 1, 2, 3, 4], [0, 1, 2, 3, 4, 3, 4, 2], [0, 2, 3, 4, 2, 3, 4, 3]][self.r_arr.integers(3)]
        self.piano_arps(bass, pat if dens != 'bed' else [0, 1, 2, 3], 67, 0.36 if dens == 'full' else 0.31, step=0.5 if dens != 'bed' else 1.0)
        self.pad_voices(3, 57, 76, 0.24, parts=('A2', 'B', 'tag', 'final'))
        mel = self.cfg['mel']
        n_ph = sum(1 for s in self.sections if s['role'] in ('ante', 'cons', 'b', 'cons2'))
        rise = 2.0 if n_ph > 1 else 0.0
        if dens == 'bed':
            self.melody('glock', 'glock', 79, 96, 86, 0.40, sparse=True, skip_bars=(1, 3))
        else:
            dbl = ('glock', 'glock', ('A2', 'B', 'tag'), 0.62) if dens == 'full' else None
            self.melody('piano', 'mel', mel['lo'], mel['hi'], mel['center'], mel['vel'] - (0.05 if dens == 'light' else 0), rise=rise, octave_double=dbl)
        # ascending glockenspiel arpeggio into the final chord
        sp_last = self.spans[-2] if len(self.spans) > 1 else self.spans[-1]
        fin = self.spans[-1].chord
        tones = [m for m in range(79, 101) if m % 12 in (fin.root, fin.third, fin.fifth)][:6]
        L = min(2.0, sp_last.b1 - sp_last.b0)
        for k, m in enumerate(tones):
            b = self.spans[-1].b0 - L + k * (L / len(tones))
            self.add('glock', 'glock', m, b, 0.5, 0.30 + 0.03 * k, role='sparkle')
        last_mel = [n.midi for n in self.notes if n.role == 'mel']
        top = None
        if last_mel:
            top = min((m for m in range(72, 89) if m % 12 == self.key_pc), key=lambda m: (abs(m - last_mel[-1] - 3)))
        self.final_chord(bass[-1], top=top, vel=0.42, roll=0.03)
        if top is not None:
            self.add('glock', 'glock', top + 12, self.spans[-1].b0, 1, 0.42, role='final', dt=0.2, hold_s=self.tail - 2)

    def arrange_thinking(self):
        bass = self.basses(36, 50)
        self.pad_voices(3, 55, 72, 0.28, inst='pad', layer='pad')
        prev = None
        for i, sp in enumerate(self.body_spans()):
            self.add('lh', 'piano', bass[i], sp.b0, sp.b1 - sp.b0 + 0.2, 0.28 + self.r_hum.normal(0, 0.02), role='bass')
            L = sp.b1 - sp.b0
            slots = [x for x in (0.5, 1.5, 3.0, 4.5, 6.0) if x < L - 1]
            k = 1 + int(self.r_arr.random() < 0.5)
            for on in sorted(self.r_arr.choice(slots, size=min(k, len(slots)), replace=False)):
                cands = [m for m in range(67, 87) if m % 12 in sp.chord.pcs | sp.chord.color()]
                ref = prev if prev is not None else 76
                near = [m for m in cands if 1 <= abs(m - ref) <= 2]               # steps first; the line drifts, it does not jump
                m = near[self.r_arr.integers(len(near))] if near else min(cands, key=lambda m: abs(m - ref) + (3 if m == ref else 0) + self.r_arr.random() * 2)
                prev = m
                self.add('rh', 'piano', m, sp.b0 + on, 2.5, 0.33 + self.r_hum.normal(0, 0.03), role='mel')
                if self.r_arr.random() < 0.3 and m + 12 <= 96:
                    self.add('cel', 'celesta', m + 12, sp.b0 + on + 0.75, 1.5, 0.22, role='echo')
        sp = self.spans[-1]
        self.final_chord(bass[-1], vel=0.30, roll=0.07)

    # ------------------------------------------------------------------ short forms (no tempo: 1 beat = 1 s)
    def flat_tempo(self):
        self.bpm = 60.0
        self.grid = np.arange(0, self.dur + 70, 0.01)
        self.tgrid = self.grid.copy()
        self.tail = self.dur

    def compose_dissolve(self):
        """Recall countdown: one suspended chord that slowly dissolves (still music, never a noise bed)."""
        self.flat_tempo()
        r = self.r_form
        sym = ['V9sus4', 'V9sus4', 'IVmaj7', 'ii7'][r.integers(4)]
        ch = Chord(sym, self.key_pc)
        self.spans = [Span(0, self.dur, ch, 0, 'final', 'final', 'major', self.key_pc)]
        self.sections = [dict(part='final', role='final', mode='major', b0=0, b1=self.dur, bars=[sym])]
        D = self.dur
        bass = min((m for m in range(36, 50) if m % 12 == ch.bass_pc), key=lambda m: abs(m - 43))
        vo = self.voice(ch, None, 3, 55, 72, bass=bass)
        hold_pad = max(1.0, D - 3.2)
        for k, m in enumerate(vo):
            self.add('pad', 'pad', m, 0.0, 1, 0.30, role='pad', hold_s=hold_pad, pan=(k - 1) * 0.3)
        for k, m in enumerate([bass] + vo):
            self.add('lh', 'piano', m, 0.05, 1, 0.30 - 0.02 * k, role='final', dt=k * 0.11, hold_s=max(1.0, D - 1.6))
        tops = [m for m in range(79, 92) if m % 12 in ch.pcs]
        if D >= 5 and tops:
            m = tops[r.integers(len(tops))]
            self.add('cel', 'celesta', m, D * float(r.uniform(0.35, 0.5)), 1, 0.21, role='mel', hold_s=2.0)
            if D >= 9:
                m2 = min((x for x in tops if x != m), key=lambda x: abs(x - m))
                self.add('cel', 'celesta', m2, D * float(r.uniform(0.62, 0.72)), 1, 0.17, role='mel', hold_s=2.0)

    def compose_chime(self):
        """Pitched one-shot for a reveal: a clean bell/pluck, no noise."""
        self.dur = self.dur if self.dur and self.dur < 10 else 3.5
        self.flat_tempo()
        r = self.r_form
        ch = Chord('I', self.key_pc)
        self.spans = [Span(0, self.dur, ch, 0, 'final', 'final', 'major', self.key_pc)]
        self.sections = [dict(part='final', role='final', mode='major', b0=0, b1=self.dur, bars=['I'])]
        self.lead = 0.0
        tonic = min((m for m in range(76, 90) if m % 12 == self.key_pc), key=lambda m: abs(m - 82))
        v = int(r.integers(3))
        hold = self.dur - 1.2
        if v == 0:   # celesta + glockenspiel, tonic and fifth
            self.add('cel', 'celesta', tonic, 0, 1, 0.55, role='chime', dt=0.01, hold_s=hold)
            self.add('glock', 'glock', tonic, 0, 1, 0.30, role='chime', dt=0.012, hold_s=hold)
            self.add('cel', 'celesta', tonic + 7, 0, 1, 0.40, role='chime', dt=0.09, hold_s=hold)
        elif v == 1:  # music box: fifth then tonic
            self.add('box', 'music_box', tonic - 5, 0, 1, 0.50, role='chime', dt=0.01, hold_s=hold)
            self.add('box', 'music_box', tonic, 0, 1, 0.55, role='chime', dt=0.16, hold_s=hold)
        else:         # harp pluck + vibraphone
            self.add('harp', 'harp', tonic - 12, 0, 1, 0.55, role='chime', dt=0.01, hold_s=hold)
            self.add('vibes', 'vibes', tonic, 0, 1, 0.45, role='chime', dt=0.03, hold_s=hold)
        # under the bell, the tonic chord blooms softly (the recall's V9sus4 resolves here) and rings out,
        # so a reveal never leaves dead air before the next segment; bell samples only last ~3 s
        for k, m in enumerate(self.voice(ch, None, 3, 55, 72)):
            self.add('pad', 'pad', m, 0, 1, 0.24, role='chime-pad', dt=0.02, hold_s=max(0.8, self.dur - 2.6), pan=(k - 1) * 0.3)

    # ------------------------------------------------------------------ timing
    def realize(self):
        sig = dict(lh=0.007, mel=0.009, rh=0.009, strings=0.012, sbass=0.012, pad=0.0, box=0.008, glock=0.006, ep=0.006,
                   harp=0.006, marimba=0.005, vibes=0.007, cel=0.008, fx=0.0)
        lay = dict(mel=0.008, box=0.006, marimba=0.004, vibes=0.006, rh=0.01)
        for n in self.notes:
            t0 = float(self.tmap(n.beat))
            n.hold = n.hold_s if n.hold_s is not None else float(self.tmap(n.beat + n.dur)) - t0
            j = 0.0 if self.form_kind != 'song' else float(np.clip(self.r_hum.normal(0, sig.get(n.layer, 0.008)), -0.02, 0.02))
            n.t = max(0.0, t0 + n.dt + j + (lay.get(n.layer, 0.0) if self.form_kind == 'song' else 0.0))
            if self.form_kind == 'song' and n.t + 0.01 >= self.dur - 0.5:
                n.vel = 0
        self.notes = [n for n in self.notes if n.vel > 0]
        self.notes.sort(key=lambda n: n.t)

    # ------------------------------------------------------------------ plan / tables
    def chart(self):
        rows = []
        for sp in self.spans:
            rows.append(dict(beat=round(sp.b0, 3), t=round(float(self.tmap(sp.b0)), 3), bar=int(sp.b0 // self.meter) + 1,
                             chord=sp.chord.name(self.flats), roman=sp.chord.sym, part=sp.part, mode=sp.mode))
        return rows

    def plan(self):
        return dict(mood=self.mood, seed=self.seed, density=self.density, dur=self.dur, key=self.key + (' major'),
                    bpm=round(self.bpm, 2), meter=f'{self.meter}/4', form_kind=self.form_kind,
                    form=[f"{s['part']}:{s['role']}{'(minor)' if s['mode'] == 'minor' else ''}" for s in self.sections],
                    final_chord_at=round(self.t_final, 2) if self.form_kind == 'song' else None,
                    chart=self.chart(), instruments=sorted({n.inst for n in self.notes}))


# ============================================================================ samples
def decode(path):
    os.makedirs(CACHE_DIR, exist_ok=True)
    rel = os.path.relpath(path, SAMPLE_DIR).replace(os.sep, '_')
    cache = os.path.join(CACHE_DIR, rel + '.npy')
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(path):
        return np.load(cache)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-af', 'aresample=resampler=soxr:precision=28',
                          '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    np.save(cache, x)
    return x


def trim(x):
    a = np.abs(x).max(1)
    pk = a.max()
    i = int(np.argmax(a > max(pk * 0.003, 1e-4)))
    i = max(0, i - int(0.001 * SR))
    y = x[i:].astype(np.float32)
    k = 48
    y[:k] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]
    k = int(0.02 * SR)
    y[-k:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]
    return y


class Bank:
    def __init__(self, name):
        self.name, self.spec = name, INST[name]
        folder = os.path.join(SAMPLE_DIR, self.spec['dir'])
        files = [f for f in os.listdir(folder) if f.endswith('.ogg') or f.endswith('.mp3')]
        if not files:
            raise SystemExit(f'no samples in {folder}; run tools/fetch_samples.py')
        self.raw = {int(f[:-4]): trim(decode(os.path.join(folder, f))) for f in sorted(files, key=lambda f: f.endswith('.ogg'))}
        self.keys = np.array(sorted(self.raw))
        self.gain = {}
        w = (0.6, 1.6) if self.spec['kind'] == 'sustain' else (0.0, 0.25)
        lv = {}
        for m, x in self.raw.items():
            seg = x[int(w[0] * SR):int(w[1] * SR)]
            lv[m] = 10 * np.log10(np.mean(seg.astype(np.float64) ** 2) + 1e-12)
        ks = np.array(sorted(lv))
        fit = np.polyval(np.polyfit(ks, [lv[k] for k in ks], 1), ks)
        center = np.polyval(np.polyfit(ks, [lv[k] for k in ks], 1), np.median(ks))
        for k, f in zip(ks, fit):
            corr = float(np.clip(f - lv[k], -4, 4))                  # smooth out sample-to-sample level jumps
            self.gain[k] = 10 ** ((corr + (-18.0 - center)) / 20)       # whole bank: -18 dBFS RMS at its middle
        self.cache = {}
        self.truncated = 0
        self.loops = 0
        self.far = 0

    def pitched(self, midi):
        if midi in self.cache:
            return self.cache[midi]
        k = int(self.keys[np.argmin(np.abs(self.keys - midi))])
        s = midi - k
        if abs(s) > 2:
            self.far += 1
        x = self.raw[k] * self.gain[k]
        if s:
            fr = Fraction(2 ** (-s / 12)).limit_denominator(240)
            x = signal.resample_poly(x, fr.numerator, fr.denominator, axis=0).astype(np.float32)
        self.cache[midi] = (x, s)
        return self.cache[midi]

    def sustain(self, x, n_total, rng):
        a = int(self.spec['loop_from'] * SR)
        L = len(x) - int(0.15 * SR)
        if n_total <= L:
            return x[:n_total].astype(np.float64)
        self.loops += 1
        nx, ns = int(0.30 * SR), int(1.0 * SR)
        out = np.zeros((n_total, 2))
        out[:L] = x[:L]
        fi = np.sin(np.linspace(0, np.pi / 2, nx))[:, None]
        fo = np.cos(np.linspace(0, np.pi / 2, nx))[:, None]
        w = L - nx
        while w < n_total:
            s = int(rng.integers(a, max(a + 1, L - ns - nx)))
            ch = x[s:s + ns + nx].astype(np.float64)
            end = min(w + len(ch), n_total)
            m = end - w
            k = min(nx, m)
            out[w:w + k] = out[w:w + k] * fo[:k] + ch[:k] * fi[:k]
            out[w + k:end] = ch[k:m]
            w += ns
        return out

    def render(self, midi, vel, hold, rng):
        x, shift = self.pitched(midi)
        sp = self.spec
        nh, nr = int(max(0.02, hold) * SR), int(sp['release'] * SR)
        if sp['kind'] == 'decay':
            n = min(len(x), nh + nr)
            y = x[:n].astype(np.float64)
            if nh < n:
                u = np.linspace(0, 1, n - nh)
                y[nh:] *= (np.exp(-4 * u) * (1 - u))[:, None]
            else:
                self.truncated += 1                                     # sample ran out while held: long fade, no click
                k = min(n, int(0.4 * SR))
                y[-k:] *= np.linspace(1, 0, k)[:, None] ** 2
        else:
            y = self.sustain(x, nh + nr, rng)
            ka = min(len(y), int(sp['attack'] * SR))
            y[:ka] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, ka)))[:, None]
            u = np.linspace(0, 1, len(y) - nh)
            y[nh:] *= (np.exp(-3 * u) * (1 - u))[:, None]
        k = min(len(y), 96)
        y[-k:] *= np.linspace(1, 0, k)[:, None]
        if sp['tone']:
            fc = min(18000.0, sp['tone'][0] * 2 ** (vel * sp['tone'][1]))
            a = math.exp(-2 * math.pi * fc / SR)
            y = signal.lfilter([1 - a], [1, -a], y, axis=0)
        for kind, f0, g, q in sp.get('eq', []):                        # fixed per-instrument EQ (e.g. tame the music box's ~3 kHz partial)
            c = rbj(kind, f0, g, q)
            y = signal.lfilter(c[:3], c[3:], y, axis=0)
        return y * vel ** 1.7


# ============================================================================ dsp
def rbj(kind, f0, gain_db=0.0, q=0.707):
    A = 10 ** (gain_db / 40)
    w = 2 * math.pi * f0 / SR
    cs, sn = math.cos(w), math.sin(w)
    al = sn / (2 * q)
    if kind == 'peak':
        b = [1 + al * A, -2 * cs, 1 - al * A]; a = [1 + al / A, -2 * cs, 1 - al / A]
    elif kind == 'highshelf':
        sq = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cs + sq), -2 * A * ((A - 1) + (A + 1) * cs), A * ((A + 1) + (A - 1) * cs - sq)]
        a = [(A + 1) - (A - 1) * cs + sq, 2 * ((A - 1) - (A + 1) * cs), (A + 1) - (A - 1) * cs - sq]
    else:
        raise ValueError(kind)
    return np.array(b + a) / a[0]


def master_eq(x):
    sos = np.vstack([signal.butter(2, 35, 'highpass', fs=SR, output='sos'),
                     rbj('peak', 320, -1.5, 0.8)[None],
                     rbj('highshelf', 7000, -1.5, 0.7)[None],
                     signal.butter(2, 16000, 'lowpass', fs=SR, output='sos')])
    return signal.sosfilt(sos, x, axis=0)


def make_ir(rt60, predelay, rng):
    n = int((rt60 * 1.3 + predelay + 0.05) * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal((n, 2))
    spec = np.fft.rfft(noise, axis=0)
    f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1.0)
    xo = [250, 1000, 3000, 6500]
    k = [1.15, 1.0, 0.82, 0.55, 0.32]                 # decay-time multipliers per band (air absorbs highs)
    c = [0.5 * (1 + np.tanh((np.log2(f) - np.log2(x)) / 0.35)) for x in xo]
    masks = [1 - c[0]] + [c[i] - c[i + 1] for i in range(len(c) - 1)] + [c[-1]]
    late = np.zeros((n, 2))
    for m, kk in zip(masks, k):
        band = np.fft.irfft(spec * m[:, None], n, axis=0)
        late += band * np.exp(-6.91 * t / (rt60 * kk))[:, None]
    late *= smooth((t - predelay - 0.006) / 0.045)[:, None]
    early = np.zeros((n, 2))
    for i in range(12):
        d = predelay * 0.6 + rng.uniform(0.004, 0.07)
        g = 0.55 * math.exp(-d / 0.05) * (1 if rng.random() < 0.5 else -1)
        j = int(d * SR)
        early[j, i % 2] += g
        early[min(n - 1, j + int(rng.integers(20, 90))), 1 - i % 2] += g * 0.35
    early = signal.lfilter([0.25, 0.5, 0.25], [1], early, axis=0)
    ir = late / np.sqrt(np.sum(late ** 2, axis=0)) + early * 0.5
    ir[-int(0.1 * n):] *= np.linspace(1, 0, int(0.1 * n))[:, None]
    return ir / np.sqrt(np.sum(ir ** 2, axis=0))


def k_weight(x):
    sos = np.array([[1.53512485958697, -2.69169618940638, 1.19839281085285, 1.0, -1.69065929318241, 0.73248077421585],
                    [1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621]])
    return signal.sosfilt(sos, x, axis=0)


def lufs(x):
    y = k_weight(x) ** 2
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if len(y) < blk:
        return -70.0
    cs = np.vstack([np.zeros((1, y.shape[1])), np.cumsum(y, axis=0)])
    starts = np.arange(0, len(y) - blk + 1, hop)
    z = (cs[starts + blk] - cs[starts]) / blk
    l = -0.691 + 10 * np.log10(z.sum(1) + 1e-15)
    g = z[l > -70]
    if not len(g):
        return -70.0
    lr = -0.691 + 10 * np.log10(g.sum(1).mean()) - 10
    g = z[(l > -70) & (l > lr)]
    return float(-0.691 + 10 * np.log10(g.sum(1).mean()))


def true_peak(x):
    return float(20 * np.log10(np.abs(signal.resample_poly(x, 4, 1, axis=0)).max() + 1e-12))


def limiter(x, thr_db):
    thr = 10 ** (thr_db / 20)
    a = np.abs(x).max(1)
    g = np.minimum(1.0, thr / np.maximum(a, 1e-9))
    L, M = int(0.005 * SR), int(0.05 * SR)
    g = uniform_filter1d(minimum_filter1d(g, 2 * L + 1), L)
    g = uniform_filter1d(minimum_filter1d(g, 2 * M + 1), M)
    return x * g[:, None], float(20 * np.log10(g.min()))


def write_wav24(path, x):
    q = np.ascontiguousarray(np.round(np.clip(x, -1, 1 - 2 ** -23) * 8388607).astype('<i4'))
    data = q.view(np.uint8).reshape(len(q), 2, 4)[:, :, :3].tobytes()
    hdr = b'RIFF' + (36 + len(data)).to_bytes(4, 'little') + b'WAVEfmt ' + (16).to_bytes(4, 'little') + \
        (1).to_bytes(2, 'little') + (2).to_bytes(2, 'little') + SR.to_bytes(4, 'little') + (SR * 6).to_bytes(4, 'little') + \
        (6).to_bytes(2, 'little') + (24).to_bytes(2, 'little') + b'data' + len(data).to_bytes(4, 'little')
    with open(path, 'wb') as f:
        f.write(hdr + data)


def pan_gains(p):
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.array([math.cos(th), math.sin(th)]) * math.sqrt(2)


# ============================================================================ render
def render(c, lufs_target, tp_max=-1.0):
    banks = {}
    rng = c.r_render
    N = int(round(c.dur * SR))
    pad = 10 * SR
    stems = {}
    send = np.zeros(N + pad)
    for n in c.notes:
        if n.inst not in banks:
            banks[n.inst] = Bank(n.inst)
        y = banks[n.inst].render(n.midi, n.vel, n.hold, rng)
        gdb, snd, pan = LAYERS[n.layer]
        p = n.pan if n.pan is not None else (pan if isinstance(pan, (int, float)) else float(np.clip((n.midi - 62) / 60, -0.3, 0.3)))
        y = y * 10 ** (gdb / 20)
        i0 = int(round(n.t * SR))
        i1 = min(N + pad, i0 + len(y))
        if i1 <= i0:
            continue
        st = stems.setdefault(n.layer, np.zeros((N + pad, 2)))
        st[i0:i1] += y[:i1 - i0] * pan_gains(p)
        send[i0:i1] += y[:i1 - i0].mean(1) * snd
    cfg = c.cfg
    ir = make_ir(cfg['rt60'], cfg['predelay'], np.random.default_rng(c.seed + 99))
    for sw in c.swells:                     # reversed reverb "breath in", ends exactly on the downbeat
        if 'piano' not in banks:
            banks['piano'] = Bank('piano')
        b = banks['piano']
        L = int(sw['length'] * SR)
        buf = np.zeros(int(1.5 * SR))
        for k, m in enumerate(sw['midis']):
            y = b.render(m, 0.42, 1.2, rng).mean(1)
            j = int(k * 0.02 * SR)
            buf[j:j + len(y)] += y[:len(buf) - j]
        wet = np.stack([signal.oaconvolve(buf, ir[:, ch])[:len(buf) + len(ir) - 1] for ch in (0, 1)], 1)[::-1]
        wet = wet[-L:] if len(wet) >= L else np.vstack([np.zeros((L - len(wet), 2)), wet])
        u = np.linspace(0, 1, L)
        wet *= (u ** 2.2)[:, None]
        wet[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))[:, None]
        wet *= 10 ** (sw['gain_db'] / 20) * 10 ** (LAYERS['fx'][0] / 20)
        t_end = float(c.tmap(sw['beat'])) + 0.01
        i1 = int(t_end * SR)
        i0 = i1 - L
        if i0 < 0:
            wet, i0 = wet[-i0:], 0
        st = stems.setdefault('fx', np.zeros((N + pad, 2)))
        st[i0:i1] += wet[:i1 - i0]
    # send filter: no mud, no fizz in the room
    send = signal.sosfilt(np.vstack([signal.butter(2, 160, 'highpass', fs=SR, output='sos'),
                                     signal.butter(2, 7500, 'lowpass', fs=SR, output='sos')]), send)
    wet = np.stack([signal.oaconvolve(send, ir[:, ch])[:N + pad] for ch in (0, 1)], 1) * cfg['wet']
    dry = sum(stems.values())
    mix = master_eq(dry + wet)[:N]
    # fades: in at the start (not for the chime), out over the very end so the last sample is silence
    fi = int(min(1.5, 0.1 * c.dur) * SR) if c.mood != 'chime' else int(0.003 * SR)
    mix[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi)))[:, None]
    fo = int(min(2.5, 0.25 * c.dur) * SR)
    mix[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None] ** 1.5
    # per-layer loudness (balance report) before mastering
    layer_lufs = {}
    ref = lufs(mix)
    for k, s in stems.items():
        layer_lufs[k] = round(lufs(master_eq(s[:N])) - ref, 1)
    # loudness + true peak
    gr = 0.0
    thr = -1.8
    for it in range(6):
        mix *= 10 ** ((lufs_target - lufs(mix)) / 20)
        mix, gr = limiter(mix, thr)
        tp = true_peak(mix)
        L = lufs(mix)
        if tp <= tp_max - 0.15 and abs(L - lufs_target) < 0.1:
            break
        if tp > tp_max - 0.15:
            thr -= (tp - (tp_max - 0.3))
    stats = dict(lufs=round(lufs(mix), 2), true_peak=round(true_peak(mix), 2), limiter_max_gr_db=round(gr, 2),
                 layer_lufs_rel=layer_lufs, truncated_notes={k: b.truncated for k, b in banks.items() if b.truncated},
                 sustain_loops={k: b.loops for k, b in banks.items() if b.loops},
                 out_of_range_pitches={k: b.far for k, b in banks.items() if b.far}, rt60=cfg['rt60'], wet=cfg['wet'])
    return mix, stats


def notes_table(c):
    rows = ['time_s\tbar\tbeat\tlayer\tinstrument\tnote\tmidi\tvel\thold_s\tchord\tpart\trole\tin_key\tchord_tone']
    key_set = {(c.key_pc + i) % 12 for i in MAJOR}
    for n in c.notes:
        sp = c.span_at(n.beat)
        bar = int(n.beat // c.meter) + 1
        rows.append('\t'.join(map(str, [f'{n.t:.3f}', bar, f'{n.beat % c.meter + 1:.2f}', n.layer, n.inst, note_name(n.midi, c.flats), n.midi,
                                        f'{n.vel:.2f}', f'{n.hold:.2f}', sp.chord.name(c.flats), sp.part, n.role,
                                        'yes' if n.midi % 12 in key_set else ('borrowed' if n.midi % 12 in sp.scale else 'NO'),
                                        'yes' if n.midi % 12 in sp.chord.pcs else ('color9' if n.midi % 12 in sp.chord.color() else 'no')])))
    return '\n'.join(rows) + '\n'


def credits_for(insts):
    srcs = sorted({INST[i]['src'] for i in insts}, key=lambda s: s != 'salamander')
    return [SOURCES[s]['credit'] for s in srcs]


def default_lufs(mood, density):
    return MOOD_LUFS.get(mood, DENSITY_LUFS[density])


def plan_only(mood, seed, dur, density='full', key=None, open_tonic=False):
    c = Composer(mood, seed, dur, density, key, open_tonic)
    c.realize()
    return c.plan()


def generate(mood, seed, dur, out, density='full', key=None, lufs_target=None, mp3=False, open_tonic=False):
    """Compose + render one cue. Writes <out>.wav/.notes.tsv/.json (and .mp3). Returns the metadata dict."""
    c = Composer(mood, seed, dur, density, key, open_tonic)
    c.realize()
    target = lufs_target if lufs_target is not None else default_lufs(mood, density)
    mix, stats = render(c, target)
    out = os.path.abspath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    write_wav24(out, mix)
    base = os.path.splitext(out)[0]
    with open(base + '.notes.tsv', 'w') as f:
        f.write(notes_table(c))
    meta = c.plan()
    meta.update(stats=stats, lufs_target=target, credits=credits_for({n.inst for n in c.notes}), file=out,
                generator='music_gen.py', n_notes=len(c.notes))
    with open(base + '.json', 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    if mp3:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-c:a', 'libmp3lame', '-b:a', '192k', base + '.mp3'], check=True)
    return meta


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--mood', default='warm')
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--dur', type=float, default=70.0)
    ap.add_argument('--density', choices=['full', 'light', 'bed'], default='full',
                    help='full = opening/ending; light = overview/after a reveal; bed = topic segments (very quiet, still music)')
    ap.add_argument('--key', help='fix the key (e.g. Eb) so the topic, recall and reveal of one room connect')
    ap.add_argument('--lufs', type=float, help='integrated loudness target; default full -20, light -23, bed -26, thinking -28, chime -24')
    ap.add_argument('--out', help='output wav path')
    ap.add_argument('--mp3', action='store_true', help='also write a 192k mp3')
    ap.add_argument('--plan', action='store_true', help='print the composition plan as JSON only; no audio')
    ap.add_argument('--open-tonic', action='store_true', help='the first chord is always I (reveal segments: resolves the suspense of the recall)')
    ap.add_argument('--list', action='store_true', help='list the moods')
    a = ap.parse_args()
    if a.list:
        for k, v in MOODS.items():
            print(f'{k:11s} {v["desc"]}')
        return
    if a.plan:
        print(json.dumps(plan_only(a.mood, a.seed, a.dur, a.density, a.key, a.open_tonic), ensure_ascii=False, indent=1))
        return
    if not a.out:
        raise SystemExit('--out is required (or use --plan)')
    meta = generate(a.mood, a.seed, a.dur, a.out, a.density, a.key, a.lufs, a.mp3, a.open_tonic)
    st = meta['stats']
    print(json.dumps(dict(file=meta['file'], key=meta['key'], bpm=meta['bpm'], form=meta['form'], lufs=st['lufs'], true_peak=st['true_peak']),
                     ensure_ascii=False))


if __name__ == '__main__':
    main()
