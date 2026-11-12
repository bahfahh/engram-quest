#!/usr/bin/env python3
"""pick_music.py - choose the music for a situation: style x segment x film id -> mood / seed / density / key, or a real track from library/.

One segment (prints JSON; audio is only rendered with --render):
  python3 -I pick_music.py --film rooms-oct --style rooms --segment opening --dur 20
  python3 -I pick_music.py --film rooms-oct --style rooms --segment opening --dur 20 --render out/

A whole film (a cue sheet covering every segment from opening to ending, topic segments and recall countdowns included):
  python3 -I pick_music.py --cues examples/cues_rooms.json --render out/rooms-oct/
  -> out/rooms-oct/NN_<segment>.wav (one per cue) + score.wav (as long as the film, placed on the timeline, neighbouring
     cues overlapping) + cues.json (the picks + credits)

Rules (the README has the full description)
  * Background sound is always pitched music: a topic segment = very quiet music (density bed), a recall countdown = one
    suspended chord that slowly dissolves (thinking), a reveal = one pitched sound (chime) or a short phrase that returns to
    the tonic. No white noise, hiss, room tone or noise whoosh.
  * Random within a mood: seed = sha256(film id:segment:room) XOR a random number, so every film differs;
    --deterministic drops the random part (reproducible).
  * Picks are recorded in used.json so a film does not repeat the previous one: a mood the previous film used for the same
    segment gets weight x0.35; the same (mood, seed) is not used again; the same segment does not get the same key; a library
    track the previous film used is not picked.
  * One key for the whole film (--key-policy film, the default; it avoids the previous film's key): where cues meet, the tail
    of one overlaps the fade-in of the next, and only a shared key keeps them from clashing. A recall rests on V9sus4
    (suspended); the reveal / closure starts on I (resolved). With --key-policy room each room gets its own key.
  * Style map is one theme for the whole film: opening, body and ending are the same composition, and the cue sheet's
    "marks" (recall countdowns) make the score step back and place one chime at the reveal.
  * Tracks tagged "course" in library.json (meant for teaching videos) are not picked for recall films unless
    --allow-course is given.
"""
import argparse, hashlib, json, os, secrets, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)                         # -I drops the script dir from sys.path; music_gen lives next to us
import numpy as np                               # noqa: E402
import music_gen as mg                           # noqa: E402

# which (mood, seed, key) earlier films used. Keep ONE file across films (e.g. engram-quest/episodic-review/music-used.json
# in the vault) and point MUSIC_USED at it, so 'do not repeat the last film' works between films.
USED = os.environ.get('MUSIC_USED') or os.path.join(os.path.expanduser('~'), '.local', 'state', 'engram-episodic-music', 'used.json')
os.makedirs(os.path.dirname(USED), exist_ok=True)
LIB_DIR = os.path.join(HERE, 'library')
LIB_JSON = os.path.join(LIB_DIR, 'library.json')

# 'map' (full-frame topic films, no narration): ONE theme for the whole film. Opening, body and ending are the same composition
# (same seed, same arrangement), so the opening states the melody, the body restates it and carries on as one continuous piece
# (not a bed, not one piece per chapter), and the ending brings it back. The body only sits 3 dB lower.
# (A different density would change the melody: the generator draws a sparse melody differently.)
STYLE_MOOD = {'rooms': 'warm', 'board': 'curious', 'rewind': 'reflective', 'map': 'warm'}
STYLE_ALT = {'rooms': 'reflective', 'board': 'warm', 'rewind': 'warm', 'map': 'warm'}
ONE_THEME = ('map',)
THEME_LEVEL = {'opening': 'full', 'ending': 'full', 'overview': 'light', 'topic': 'light', 'closure': 'light'}     # loudness only
# film keys = keys every mood the style can use is happy in (piano/strings/music-box ranges were tuned for these)
STYLE_KEYS = {'rooms': ['C', 'D', 'Eb', 'F', 'G'], 'board': ['C', 'D', 'F', 'G'], 'rewind': ['C', 'D', 'Eb', 'F', 'G'], 'map': ['C', 'D', 'Eb', 'F', 'G']}
SEGMENTS = ['opening', 'overview', 'topic', 'recall', 'reveal', 'closure', 'ending', 'quiz']
OPEN_TONIC = ('reveal', 'closure')        # after a recall countdown (V9sus4) these start on I


def candidates(style, segment, dur):
    """[(mood, weight, density)] for a situation."""
    m = STYLE_MOOD.get(style, 'warm')
    alt = STYLE_ALT.get(style, 'reflective')
    if segment == 'opening':
        return [(m, 1.0, 'full')]
    if segment == 'overview':
        return [(m, 1.0, 'light')]
    if segment == 'topic':
        return [(m, 0.75, 'bed'), (alt, 0.25, 'bed')]
    if segment in ('recall', 'quiz'):
        return [('thinking', 1.0, 'bed')]
    if segment == 'reveal':
        return [('chime', 1.0, 'full')] if dur <= 6 else [(m, 1.0, 'light')]
    if segment == 'closure':
        return [(m, 1.0, 'light')]
    if segment == 'ending':
        return [('bright', 0.7, 'full'), (m, 0.3, 'full')]
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


def library(allow_course):
    lib = load_json(LIB_JSON, {'tracks': []})
    out = []
    for t in lib.get('tracks', []):
        if 'course' in t.get('tags', []) and not allow_course:
            continue
        path = os.path.normpath(os.path.join(LIB_DIR, t['file']))
        if os.path.exists(path):
            out.append(dict(t, path=path))
    return out


def seed_for(film, segment, room, deterministic, salt=0):
    h = int(hashlib.sha256(f'{film}:{segment}:{room}:{salt}'.encode()).hexdigest()[:8], 16)
    return (h ^ (0 if deterministic else secrets.randbits(32))) & 0x7FFFFFFF


class Picker:
    def __init__(self, film, style, deterministic=False, allow_course=False, lib_weight=0.3, rng_seed=None, key_policy='film'):
        self.film, self.style, self.det = film, style, deterministic
        self.used = load_json(USED, {'history': []})
        hist = self.used['history']
        prev_films = [r['film'] for r in hist if r['film'] != film]
        self.prev_film = prev_films[-1] if prev_films else None
        self.prev = [r for r in hist if r['film'] == self.prev_film]
        self.lib = library(allow_course)
        self.lib_weight = lib_weight
        self.rng = np.random.default_rng(int(hashlib.sha256(film.encode()).hexdigest()[:8], 16) if deterministic else rng_seed)
        self.taken = set()          # (mood, seed) in this film
        self.room_keys = {}
        self.records = []
        self.key_policy = key_policy
        self.film_key = self.choose_film_key()

    def prev_same(self, segment):
        return [r for r in self.prev if r['segment'] == segment]

    def choose_film_key(self):
        """One home key per film: neighbouring cues overlap at their boundaries, so they must not clash.
        Reuse the key of earlier picks for this film; otherwise avoid the previous film's key."""
        earlier = [r.get('key') for r in self.used['history'] if r['film'] == self.film and r.get('key')]
        if earlier:
            return earlier[-1]
        keys = STYLE_KEYS.get(self.style, ['C', 'D', 'F', 'G'])
        prev = {r.get('key') for r in self.prev}
        opts = [k for k in keys if k not in prev] or keys
        return str(opts[self.rng.integers(len(opts))])

    def room_key(self, room, mood):
        if room in self.room_keys:
            return self.room_keys[room]
        earlier = [r.get('key') for r in self.used['history'] if r['film'] == self.film and r.get('room') == room and r.get('key')]
        if earlier:                                   # picked in an earlier call for this film: keep the room in one key
            self.room_keys[room] = earlier[-1]
            return earlier[-1]
        keys = list(mg.MOODS[mood]['keys'])
        last = self.room_keys.get(room - 1) if isinstance(room, int) else None
        prev_keys = {r.get('key') for r in self.prev if r.get('room') == room}
        opts = [k for k in keys if k != last and k not in prev_keys] or [k for k in keys if k != last] or keys
        k = str(opts[self.rng.integers(len(opts))])
        self.room_keys[room] = k
        return k

    def theme_seed(self):
        """One seed per film (kept across calls for the same film; never the previous film's)."""
        if getattr(self, '_theme', None) is None:
            earlier = [r.get('seed') for r in self.used['history'] if r['film'] == self.film and r.get('style') in ONE_THEME and r.get('seed')]
            prev = {r.get('seed') for r in self.prev}
            self._theme = earlier[-1] if earlier else next(s for s in (seed_for(self.film, 'theme', None, self.det, k) for k in range(24)) if s not in prev)
        return self._theme

    def pick(self, segment, dur, room=None):
        if self.style in ONE_THEME and segment in THEME_LEVEL:
            mood, density, seed = STYLE_MOOD[self.style], 'full', self.theme_seed()
            plan = mg.plan_only(mood, seed, dur, density, self.film_key)
            rec = dict(film=self.film, style=self.style, segment=segment, room=room, dur=dur, kind='generated', mood=mood, seed=seed,
                       density=density, key=plan['key'].split()[0], bpm=plan['bpm'], form=plan['form'], instruments=plan['instruments'],
                       lufs=mg.DENSITY_LUFS[THEME_LEVEL[segment]])
            self.records.append(rec)
            return rec
        cands = candidates(self.style, segment, dur)
        prev_moods = {r.get('mood') for r in self.prev_same(segment)}
        w = np.array([wt * (0.35 if (mood in prev_moods and len(cands) > 1) else 1.0) for mood, wt, _ in cands])
        mood, _, density = cands[int(self.rng.choice(len(cands), p=w / w.sum()))]
        # a real track from library/ ?
        if segment in ('opening', 'overview', 'topic', 'ending', 'closure'):
            used_files = {r.get('file') for r in self.prev if r.get('kind') == 'library'} | {r.get('file') for r in self.records if r.get('kind') == 'library'}
            libc = [t for t in self.lib if mood in t.get('moods', []) and t['file'] not in used_files
                    and (not t.get('segments') or segment in t['segments'])]
            if libc and self.rng.random() < self.lib_weight:
                t = libc[int(self.rng.integers(len(libc)))]
                rec = dict(film=self.film, style=self.style, segment=segment, room=room, dur=dur, kind='library', mood=mood,
                           file=t['file'], path=t['path'], title=t.get('title'), license=t.get('license'), credit=t.get('credit'))
                self.records.append(rec)
                return rec
        key = self.film_key if self.key_policy == 'film' else None
        if self.key_policy == 'room' and room is not None and segment in ('topic', 'recall', 'quiz', 'reveal', 'closure'):
            key = self.room_key(room, STYLE_MOOD.get(self.style, 'warm'))
        prev_keys = {r.get('key') for r in self.prev_same(segment)} if key is None else set()
        prev_pairs = {(r.get('mood'), r.get('seed')) for r in self.prev}
        best = None
        for salt in range(24):
            seed = seed_for(self.film, segment, room, self.det, salt)
            if (mood, seed) in prev_pairs or (mood, seed) in self.taken:
                continue
            plan = mg.plan_only(mood, seed, dur, density, key, open_tonic=segment in OPEN_TONIC)
            k = plan['key'].split()[0]
            best = (seed, plan)
            if key is not None or k not in prev_keys:
                break
        seed, plan = best
        self.taken.add((mood, seed))
        rec = dict(film=self.film, style=self.style, segment=segment, room=room, dur=dur, kind='generated', mood=mood, seed=seed,
                   density=density, key=plan['key'].split()[0], bpm=plan['bpm'], form=plan['form'], instruments=plan['instruments'],
                   lufs=mg.default_lufs(mood, density))
        self.records.append(rec)
        return rec

    def commit(self):
        now = time.strftime('%Y-%m-%dT%H:%M:%S')
        for r in self.records:
            self.used['history'].append({k: v for k, v in r.items() if k in
                                         ('film', 'style', 'segment', 'room', 'kind', 'mood', 'seed', 'density', 'key', 'bpm', 'file')} | {'at': now})
        save_used(self.used)


def credits(records):
    out = []
    insts = set()
    for r in records:
        if r['kind'] == 'generated':
            insts |= set(r.get('instruments', []))
        elif r.get('credit') and r['credit'] not in out:
            out.append(r['credit'])
    gen = mg.credits_for(insts) if insts else []
    lines = []
    if insts:
        lines.append('Music: original background score generated for this video (music_gen.py, procedural composition).')
    return lines + gen + out


def render_record(r, out_path, extra=0.0):
    dur = r['dur'] + extra
    if r['kind'] == 'generated':
        mg.generate(r['mood'], r['seed'], dur, out_path, r['density'], r.get('key'), lufs_target=r.get('lufs'), open_tonic=r['segment'] in OPEN_TONIC)
    else:   # library track: cut to length with a fade, normalised to the segment's loudness
        tgt = mg.DENSITY_LUFS['full' if r['segment'] in ('opening', 'ending') else 'bed']
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', r['path'], '-t', f'{dur:.3f}', '-ac', '2', '-ar', str(mg.SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
        fo = int(min(3.0, 0.2 * dur) * mg.SR)
        x[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
        x *= 10 ** ((tgt - mg.lufs(x)) / 20)
        x, _ = mg.limiter(x, -1.8)
        mg.write_wav24(os.path.abspath(out_path), x)
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
        path = os.path.join(outdir, f'{i:02d}_{r["segment"]}' + (f'_r{r["room"]}' if r.get('room') is not None else '') + '.wav')
        render_record(r, path, extra)
        r['wav'] = path
        r['placed_at'] = c['start']
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        y = np.frombuffer(raw, np.float32).reshape(-1, 2)
        i0 = int(round(c['start'] * mg.SR))
        score[i0:i0 + len(y)] += y[:len(score) - i0]
        print(f'  [{i + 1}/{len(cues)}] {c["start"]:7.2f}s {r["segment"]:8s} {r.get("mood", "")}/{r.get("density", "")} '
              f'seed={r.get("seed", "-")} key={r.get("key", "-")} -> {os.path.basename(path)}', file=sys.stderr)
    score = score[:N]
    score = apply_marks(score, marks, key, outdir)
    score, _ = mg.limiter(score, -1.5)
    mg.write_wav24(os.path.join(outdir, 'score.wav'), score)
    return os.path.join(outdir, 'score.wav')


def write_score_meta(outdir, out):
    """score.json next to score.wav, in the shape qa_music.py plots (cue boundaries instead of chords)."""
    chart = [dict(t=c['start'], beat=0, bar=0, chord=f"{c.get('mood', '')}/{c.get('density', c.get('kind', ''))}", roman='',
                  part=c['segment'] + (f" r{c['room']}" if c.get('room') is not None else ''), mode='') for c in out['cues']]
    meta = dict(mood='film', seed='-', density='-', key=(out.get('film_key') or '') + ' major', bpm='-', meter='4/4',
                lufs_target=None, chart=chart, credits=out.get('credits', []), film=out['film'])
    with open(os.path.join(outdir, 'score.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--film', help='film id, e.g. rooms-oct')
    ap.add_argument('--style', choices=list(STYLE_MOOD), help='rooms / board / rewind / map (one theme through the whole film)')
    ap.add_argument('--segment', choices=SEGMENTS)
    ap.add_argument('--room', type=int, help='number of the room/topic (segments of one room share a key)')
    ap.add_argument('--dur', type=float, default=30.0)
    ap.add_argument('--cues', help='cue sheet JSON for a whole film (see examples/)')
    ap.add_argument('--render', metavar='DIR', help='render the audio into this folder')
    ap.add_argument('--overlap', type=float, default=2.0, help='seconds neighbouring cues overlap (the tail of one under the fade-in of the next)')
    ap.add_argument('--deterministic', action='store_true', help='derive seeds from the film id hash only, nothing random (reproducible)')
    ap.add_argument('--dry-run', action='store_true', help='do not write used.json')
    ap.add_argument('--allow-course', action='store_true', help='allow library tracks tagged "course" (meant for teaching videos)')
    ap.add_argument('--library-weight', type=float, default=0.3, help='probability of picking a real track when one matches')
    ap.add_argument('--key-policy', choices=['film', 'room'], default='film',
                    help='film = one key for the whole film (cues do not clash where they meet; default); '
                         'room = each room has its own key (opening/overview/ending are not fixed)')
    a = ap.parse_args()
    if a.render:
        try:
            os.nice(max(0, 10 - os.nice(0)))       # background render is running: stay polite
        except OSError:
            pass
    if a.cues:
        sheet = json.load(open(a.cues))
        film, style = a.film or sheet['film'], a.style or sheet['style']
        cues = sorted(sheet['cues'], key=lambda c: c['start'])
        if style in ONE_THEME:
            cues = merge_body(cues)
        p = Picker(film, style, a.deterministic, a.allow_course, a.library_weight, key_policy=a.key_policy)
        recs = [p.pick(c['segment'], c['dur'], c.get('room')) for c in cues]
        total = sheet.get('duration') or max(c['start'] + c['dur'] for c in cues)
        out = dict(film=film, style=style, previous_film=p.prev_film, film_key=p.film_key, key_policy=a.key_policy, duration=total, cues=[])
        if a.render:
            os.makedirs(a.render, exist_ok=True)
            out['score'] = assemble(cues, recs, a.render, total, a.overlap, marks=sheet.get('marks') if style in ONE_THEME else None, key=p.film_key)
        for c, r in zip(cues, recs):
            out['cues'].append(dict(start=c['start'], **{k: v for k, v in r.items() if k not in ('film', 'style', 'path')}))
        out['credits'] = credits(recs)
        if a.render:
            with open(os.path.join(a.render, 'cues.json'), 'w') as f:
                json.dump(out, f, ensure_ascii=False, indent=1)
            write_score_meta(a.render, out)
        if not a.dry_run:
            p.commit()
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return
    if not (a.film and a.style and a.segment):
        raise SystemExit('need --film --style --segment (or --cues)')
    p = Picker(a.film, a.style, a.deterministic, a.allow_course, a.library_weight, key_policy=a.key_policy)
    r = p.pick(a.segment, a.dur, a.room)
    if a.render:
        os.makedirs(a.render, exist_ok=True)
        r['wav'] = render_record(r, os.path.join(a.render, f'{a.film}_{a.segment}' + (f'_r{a.room}' if a.room is not None else '') + '.wav'))
    r['credits'] = credits([r])
    r['previous_film'] = p.prev_film
    if not a.dry_run:
        p.commit()
    print(json.dumps({k: v for k, v in r.items() if k != 'path'}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
