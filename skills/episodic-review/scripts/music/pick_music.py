#!/usr/bin/env python3
"""pick_music.py - the background score of a recall film: one theme through the whole film, plus the short pieces a
recall moment may need. Picks mood, seed, density and key; --render writes the audio.

A whole film (the cue sheet render_stage.cjs --data writes):
  python3 -I pick_music.py --cues projects/<id>/music-cues.json --render projects/<id>/audio/
  -> NN_<segment>.wav (one per cue) + score.wav (as long as the film, on its timeline) + cues.json (the picks + credits)

One segment (prints JSON; audio only with --render):
  python3 -I pick_music.py --film oct-map --segment opening --dur 20 --render out/

Rules (the README has the full description)
  * Background sound is always pitched music. No white noise, hiss, room tone or noise whoosh.
  * One theme for the whole film: opening, body and ending are the same composition (warm, full arrangement, one seed,
    one key); the body plays 3 dB lower and consecutive body cues are merged into one continuous piece. The cue sheet's
    "marks" (recall countdowns) make the score step back and place one chime at the reveal.
  * A recall or quiz segment is one suspended chord that slowly dissolves (thinking); a reveal is one pitched sound
    (chime) or a short phrase that returns to the tonic.
  * Random within a mood: seed = sha256(film id:segment:None:salt) XOR a random number, so every film differs; --deterministic
    drops the random part (reproducible).
  * Picks are recorded in used.json so a film does not repeat the previous one: not its theme seed, not its key, not a
    (mood, seed) pair it used.
"""
import argparse, hashlib, json, os, secrets, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)                         # -I drops the script dir from sys.path; music_gen lives next to us
import numpy as np                               # noqa: E402
import music_gen as mg                           # noqa: E402

# which (mood, seed, key) earlier films used. Keep ONE file across films (e.g. engram-quest/episodic-review/music-used.json
# in the vault) and point MUSIC_USED at it, so 'do not repeat the last film' works between films.
USED = os.environ.get('MUSIC_USED') or os.path.join(os.path.expanduser('~'), '.local', 'state', 'engram-episodic-music', 'used.json')
os.makedirs(os.path.dirname(USED), exist_ok=True)

# ONE theme for the whole film. Opening, body and ending are the same composition (same seed, same arrangement), so the
# opening states the melody, the body restates it and carries on as one continuous piece (not a bed, not one piece per
# chapter), and the ending brings it back. The body only sits 3 dB lower.
# (A different density would change the melody: the generator draws a sparse melody differently.)
THEME_MOOD = 'warm'
THEME_LEVEL = {'opening': 'full', 'ending': 'full', 'overview': 'light', 'topic': 'light', 'closure': 'light'}     # loudness only
# keys the theme's piano and string ranges were tuned for
FILM_KEYS = ['C', 'D', 'Eb', 'F', 'G']
SEGMENTS = [*THEME_LEVEL, 'recall', 'quiz', 'reveal']
OPEN_TONIC = ('reveal', 'closure')        # after a recall countdown (V9sus4) these start on I


def moment(segment, dur):
    """(mood, density) for a segment outside the theme."""
    if segment in ('recall', 'quiz'):
        return 'thinking', 'bed'
    if segment == 'reveal':
        return ('chime', 'full') if dur <= 6 else (THEME_MOOD, 'light')
    raise SystemExit(f'unknown segment {segment}; use one of {", ".join(SEGMENTS)}')


def load_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_used(data):
    tmp = USED + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, USED)


def seed_for(film, segment, deterministic, salt=0):
    # "None" stood for a room number the old per-room scores used; it stays so earlier films keep their seeds
    h = int(hashlib.sha256(f'{film}:{segment}:None:{salt}'.encode()).hexdigest()[:8], 16)
    return (h ^ (0 if deterministic else secrets.randbits(32))) & 0x7FFFFFFF


class Picker:
    def __init__(self, film, deterministic=False, rng_seed=None):
        self.film, self.det = film, deterministic
        self.used = load_json(USED, {'history': []})
        hist = self.used['history']
        prev_films = [r['film'] for r in hist if r['film'] != film]
        self.prev_film = prev_films[-1] if prev_films else None
        self.prev = [r for r in hist if r['film'] == self.prev_film]
        self.rng = np.random.default_rng(int(hashlib.sha256(film.encode()).hexdigest()[:8], 16) if deterministic else rng_seed)
        self.taken = set()          # (mood, seed) in this film
        self.records = []
        self._theme = None
        self.film_key = self.choose_film_key()

    def choose_film_key(self):
        """One home key per film: neighbouring cues overlap at their boundaries, so they must not clash.
        Reuse the key of earlier picks for this film; otherwise avoid the previous film's key."""
        earlier = [r.get('key') for r in self.used['history'] if r['film'] == self.film and r.get('key')]
        if earlier:
            return earlier[-1]
        prev = {r.get('key') for r in self.prev}
        opts = [k for k in FILM_KEYS if k not in prev] or FILM_KEYS
        return str(opts[self.rng.integers(len(opts))])

    def theme_seed(self):
        """One seed per film (kept across calls for the same film; never the previous film's)."""
        if self._theme is None:
            # records of an older scoring style under the same film id are not this film's theme
            earlier = [r.get('seed') for r in self.used['history'] if r['film'] == self.film and r.get('style', 'map') == 'map'
                       and r.get('segment') in THEME_LEVEL and r.get('seed')]
            prev = {r.get('seed') for r in self.prev}
            self._theme = earlier[-1] if earlier else next(s for s in (seed_for(self.film, 'theme', self.det, k) for k in range(24)) if s not in prev)
        return self._theme

    def pick(self, segment, dur):
        if segment in THEME_LEVEL:
            mood, density, seed = THEME_MOOD, 'full', self.theme_seed()
            lufs = mg.DENSITY_LUFS[THEME_LEVEL[segment]]
            plan = mg.plan_only(mood, seed, dur, density, self.film_key)
        else:
            mood, density = moment(segment, dur)
            prev_pairs = {(r.get('mood'), r.get('seed')) for r in self.prev}
            seed = next(s for s in (seed_for(self.film, segment, self.det, k) for k in range(24))
                        if (mood, s) not in prev_pairs and (mood, s) not in self.taken)
            self.taken.add((mood, seed))
            lufs = mg.default_lufs(mood, density)
            plan = mg.plan_only(mood, seed, dur, density, self.film_key, open_tonic=segment in OPEN_TONIC)
        rec = dict(film=self.film, segment=segment, dur=dur, mood=mood, seed=seed, density=density,
                   key=plan['key'].split()[0], bpm=plan['bpm'], form=plan['form'], instruments=plan['instruments'], lufs=lufs)
        self.records.append(rec)
        return rec

    def commit(self):
        now = time.strftime('%Y-%m-%dT%H:%M:%S')
        for r in self.records:
            self.used['history'].append({k: v for k, v in r.items() if k in
                                         ('film', 'segment', 'mood', 'seed', 'density', 'key', 'bpm')} | {'at': now})
        save_used(self.used)


def credits(records):
    insts = set().union(*(r.get('instruments', []) for r in records)) if records else set()
    if not insts:
        return []
    return ['Music: original background score generated for this video (music_gen.py, procedural composition).'] + mg.credits_for(insts)


def render_record(r, out_path, extra=0.0):
    mg.generate(r['mood'], r['seed'], r['dur'] + extra, out_path, r['density'], r.get('key'), lufs_target=r.get('lufs'),
                open_tonic=r['segment'] in OPEN_TONIC)
    return out_path


def merge_body(cues):
    """Consecutive topic-like cues become one: the body of a one-theme film is a single continuous piece."""
    out = []
    for c in cues:
        if out and c['segment'] in ('topic', 'overview', 'closure') and out[-1]['segment'] == c['segment'] and abs(out[-1]['start'] + out[-1]['dur'] - c['start']) < 0.5:
            out[-1] = dict(out[-1], dur=round(c['start'] + c['dur'] - out[-1]['start'], 3))        # cue times are rounded: allow a small gap
        else:
            out.append(dict(c))
    return out


def apply_marks(score, marks, key, outdir, depth_db=-9.0):
    """Recall moments: the music steps back while the viewer thinks (it keeps going, quieter), and one clean chime marks the reveal."""
    if not marks:
        return score
    chime = os.path.join(outdir, 'reveal_chime.wav')
    mg.generate('chime', 1, 4.0, chime, 'full', key)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', chime, '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    ch = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64) * 10 ** (-8 / 20)     # about as loud as the music it returns to, not above it
    g = np.ones(len(score))
    lo, down, up = 10 ** (depth_db / 20), int(0.8 * mg.SR), int(1.5 * mg.SR)
    for m in marks:
        a, b = int(m['start'] * mg.SR), int((m['start'] + m['dur']) * mg.SR)
        a0 = max(0, a - down)
        g[a0:a] = np.minimum(g[a0:a], np.linspace(1, lo, a - a0))
        g[a:b] = lo
        b1 = min(len(g), b + up)
        g[b:b1] = np.minimum(g[b:b1], np.linspace(lo, 1, b1 - b))
    score = score * g[:, None]
    for m in marks:
        b = int((m['start'] + m['dur']) * mg.SR)
        y = ch[:max(0, len(score) - b)]
        score[b:b + len(y)] += y
    return score


def assemble(cues, records, outdir, total, overlap, marks=None, key=None):
    N = int(round(total * mg.SR))
    score = np.zeros((N + 12 * mg.SR, 2))
    for i, (c, r) in enumerate(zip(cues, records)):
        nxt = cues[i + 1]['start'] if i + 1 < len(cues) else None
        contiguous = nxt is not None and abs(nxt - (c['start'] + c['dur'])) < 0.05
        extra = overlap if contiguous else 0.0          # every cue rings on under the next one's fade-in: no dead air between segments
        path = os.path.join(outdir, f'{i:02d}_{r["segment"]}.wav')
        render_record(r, path, extra)
        r['wav'] = path
        r['placed_at'] = c['start']
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        y = np.frombuffer(raw, np.float32).reshape(-1, 2)
        i0 = int(round(c['start'] * mg.SR))
        score[i0:i0 + len(y)] += y[:len(score) - i0]
        print(f'  [{i + 1}/{len(cues)}] {c["start"]:7.2f}s {r["segment"]:8s} {r["mood"]}/{r["density"]} '
              f'seed={r["seed"]} key={r["key"]} -> {os.path.basename(path)}', file=sys.stderr)
    score = score[:N]
    score = apply_marks(score, marks, key, outdir)
    score, _ = mg.limiter(score, -1.5)
    mg.write_wav24(os.path.join(outdir, 'score.wav'), score)
    return os.path.join(outdir, 'score.wav')


def write_score_meta(outdir, out):
    """score.json next to score.wav, in the shape qa_music.py plots (cue boundaries instead of chords)."""
    chart = [dict(t=c['start'], beat=0, bar=0, chord=f"{c['mood']}/{c['density']}", roman='', part=c['segment'], mode='')
             for c in out['cues']]
    meta = dict(mood='film', seed='-', density='-', key=(out.get('film_key') or '') + ' major', bpm='-', meter='4/4',
                lufs_target=None, chart=chart, credits=out.get('credits', []), film=out['film'])
    with open(os.path.join(outdir, 'score.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--film', help='film id, e.g. oct-map')
    ap.add_argument('--segment', choices=SEGMENTS)
    ap.add_argument('--dur', type=float, default=30.0)
    ap.add_argument('--cues', help='cue sheet JSON for a whole film (see examples/)')
    ap.add_argument('--render', metavar='DIR', help='render the audio into this folder')
    ap.add_argument('--overlap', type=float, default=2.0, help='seconds neighbouring cues overlap (the tail of one under the fade-in of the next)')
    ap.add_argument('--deterministic', action='store_true', help='derive seeds from the film id hash only, nothing random (reproducible)')
    ap.add_argument('--dry-run', action='store_true', help='do not write used.json')
    a = ap.parse_args()
    if a.render and hasattr(os, 'nice'):           # no nice() on Windows
        try:
            os.nice(max(0, 10 - os.nice(0)))       # background render is running: stay polite
        except OSError:
            pass
    if a.cues:
        sheet = json.load(open(a.cues))
        if sheet.get('style', 'map') != 'map':
            raise SystemExit(f"cue sheet style {sheet['style']!r}: only 'map' films are scored")
        film = a.film or sheet['film']
        cues = merge_body(sorted(sheet['cues'], key=lambda c: c['start']))
        p = Picker(film, a.deterministic)
        recs = [p.pick(c['segment'], c['dur']) for c in cues]
        total = sheet.get('duration') or max(c['start'] + c['dur'] for c in cues)
        out = dict(film=film, style='map', previous_film=p.prev_film, film_key=p.film_key, duration=total, cues=[])
        if a.render:
            os.makedirs(a.render, exist_ok=True)
            out['score'] = assemble(cues, recs, a.render, total, a.overlap, marks=sheet.get('marks'), key=p.film_key)
        for c, r in zip(cues, recs):
            out['cues'].append(dict(start=c['start'], **{k: v for k, v in r.items() if k != 'film'}))
        out['credits'] = credits(recs)
        if a.render:
            with open(os.path.join(a.render, 'cues.json'), 'w') as f:
                json.dump(out, f, ensure_ascii=False, indent=1)
            write_score_meta(a.render, out)
        if not a.dry_run:
            p.commit()
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return
    if not (a.film and a.segment):
        raise SystemExit('need --film --segment (or --cues)')
    p = Picker(a.film, a.deterministic)
    r = p.pick(a.segment, a.dur)
    if a.render:
        os.makedirs(a.render, exist_ok=True)
        r['wav'] = render_record(r, os.path.join(a.render, f'{a.film}_{a.segment}.wav'))
    r['credits'] = credits([r])
    r['previous_film'] = p.prev_film
    if not a.dry_run:
        p.commit()
    print(json.dumps(r, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
