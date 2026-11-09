#!/usr/bin/env python3
"""One data file for every film -> on-screen text dump, reading-time check, music cue sheet.

  python3 onscreen.py film.json                 # writes onscreen.txt next to film.json, prints the reading report
  python3 onscreen.py film.json --cues cues.json --style rooms --film-id ep-sep   # also writes a pick_music cue sheet
  --lang <tag>: the film's language (scripts/film_lang.py); default film.json "lang", else zh-tw.
Exit code 1 when a reading-time rule fails (so it can gate a hand-in).
If film.json has "length": "short|medium|long" it also compares the topic count and the film length with the range in
templates/length.json and prints a note when outside it (advisory only: the length is a range, not a target).

film.json (see templates/film.json):
  {"title": "...", "duration": 540.0,
   "segments": [{"id": "r1-topic", "kind": "topic", "from": 26.0, "to": 60.0, "topic": 1, "name": "房間 1 輕量 DDD"}, ...],
   "texts": [{"in": 30.0, "out": 42.0, "seg": "r1-topic", "use": "label", "where": "白板", "text": "Entity"}, ...]}
segment kind: intro | overview | topic | recall | reveal | closure | transition | quiz | ending
text use (the five allowed uses + helpers): context | question | rule | recall | reveal | label | quote | card | code | texture
  - code: counted as 2 s per line, not per character.  texture: background text nobody has to read (not counted).
Rules (reference/06-片子規格.md):
  - per segment: time >= new characters / 5 + 1.5 s per text of 7+ characters (code: 2 s per line)
  - every single text stays on screen >= its own characters / 5 + 1.5 s
  - recall: question read time + 6 s of silence before the segment ends; reveal: >= 8 s and readable
In a language written with spaces, "characters" above are reading units: one word = 1.75 units (film_lang.WORD_UNITS).
"""
import argparse, json, os, re, sys, unicodedata
from film_lang import normalise, per_word, reading_note, word_units

CHARS_PER_SEC = 5.0

def units(s):
    """CJK char = 1, latin word <= 3 letters = 1, longer word = 1.5, digits group = 1, punctuation/space = 0."""
    n = 0.0
    for tok in re.findall(r'[A-Za-z]+|\d+(?:[.,]\d+)*|.', s):
        if re.fullmatch(r'[A-Za-z]+', tok):
            n += 1.0 if len(tok) <= 3 else 1.5
        elif re.fullmatch(r'\d+(?:[.,]\d+)*', tok):
            n += 1.0
        else:
            cat = unicodedata.category(tok)
            if cat.startswith('L') or cat.startswith('N') or cat == 'So':
                n += 1.0
    return n

def need(t):
    if t.get('use') == 'texture':
        return 0.0
    if t.get('use') == 'code':
        return 2.0 * max(1, len(t['text'].strip().splitlines()))
    u = units(t['text'])
    return u / CHARS_PER_SEC + (1.5 if u >= 7 else 0.0)

def fmt(sec):
    m = int(sec // 60)
    return f'{m}:{sec - 60 * m:04.1f}'

ap = argparse.ArgumentParser()
ap.add_argument('film')
ap.add_argument('--cues')
ap.add_argument('--style', default='rooms')
ap.add_argument('--film-id', default=None)
ap.add_argument('--lang', default=None)
a = ap.parse_args()
F = json.load(open(a.film, encoding='utf-8'))
lang = normalise(a.lang or F.get('lang') or 'zh-tw')
if per_word(lang):
    units = word_units
if reading_note(lang):
    print('note: ' + reading_note(lang))
if not a.lang and not F.get('lang'):
    prose = ''.join(t['text'] for t in F['texts'] if t.get('use') not in ('code', 'texture'))
    if len(re.findall('[A-Za-z]', prose)) > 3 * len(re.findall('[㐀-鿿]', prose)):
        print('note: no film language given and the text is mostly Latin letters: pass --lang or set "lang" in film.json')
segs = sorted(F['segments'], key=lambda s: s['from'])
texts = sorted(F['texts'], key=lambda t: (t['in'], t['out']))
byseg = {s['id']: [] for s in segs}
for t in texts:
    byseg.setdefault(t['seg'], []).append(t)

# ---- onscreen.txt (input for the text test)
out = [f'# {F.get("title", "")} 片上的字（照出現順序，附秒數）', f'# 片長 {fmt(F["duration"])}', '']
for s in segs:
    out.append(f'【{s.get("name", s["id"])}　{fmt(s["from"])}–{fmt(s["to"])}】')
    for t in byseg.get(s['id'], []):
        if t.get('use') == 'texture':
            continue
        where = f'{t["where"]}・' if t.get('where') else ''
        body = t['text'].replace('\n', '｜')
        out.append(f'  [{fmt(t["in"])}–{fmt(t["out"])}] {where}{body}')
    out.append('')
path = os.path.join(os.path.dirname(os.path.abspath(a.film)), 'onscreen.txt')
open(path, 'w', encoding='utf-8').write('\n'.join(out))

# ---- reading report
fails, total_units = [], 0.0
print(f'{"段落":<20}{"秒":>7}{"需要":>7}  狀態')
for s in segs:
    ts = [t for t in byseg.get(s['id'], []) if t.get('use') != 'texture']
    dur = s['to'] - s['from']
    req = sum(need(t) for t in ts)
    total_units += sum(units(t['text']) for t in ts if t.get('use') not in ('code', 'texture'))
    status = 'ok'
    if req > dur + 0.05:
        status = f'讀不完（差 {req - dur:.1f} 秒）'
        fails.append((s['id'], status))
    if s['kind'] == 'recall':
        q = sum(need(t) for t in ts if t.get('use') == 'recall')
        if dur < q + 6 - 0.05:
            status = f'回想不夠（讀題 {q:.1f}＋6 秒 > {dur:.1f}）'
            fails.append((s['id'], status))
    if s['kind'] == 'reveal' and dur < max(8.0, req) - 0.05:
        status = f'揭曉不夠（至少 {max(8.0, req):.1f} 秒）'
        fails.append((s['id'], status))
    print(f'{s.get("name", s["id"])[:18]:<20}{dur:7.1f}{req:7.1f}  {status}')
for t in texts:
    if t.get('use') == 'texture':
        continue
    if t['out'] - t['in'] < need(t) - 0.05:
        fails.append((t['seg'], f'單張讀不完 {fmt(t["in"])}：{t["text"][:20]}…（{t["out"] - t["in"]:.1f} < {need(t):.1f} 秒）'))
print(f'\n片長 {fmt(F["duration"])}；要讀的字約 {total_units:.0f} 字；onscreen.txt -> {path}')
# ---- length preset (templates/length.json): ranges, advisory only (never fails the hand-in)
if F.get('length') in ('short', 'medium', 'long'):
    LJ = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'templates', 'length.json'), encoding='utf-8'))
    P = LJ['presets'][F['length']]
    n_topics = len({s['topic'] for s in segs if s['kind'] == 'topic' and s.get('topic') is not None})
    t0, t1 = P['topics']; s0, s1 = P['seconds']
    print(f'片長檔：{P["label"]}（主題 {t0}～{t1}、{s0}～{s1} 秒）；這支 {n_topics} 個主題、{F["duration"]:.0f} 秒')
    if not t0 <= n_topics <= t1:
        print(f'  ! 主題數 {n_topics} 不在「{P["label"]}」的 {t0}～{t1} 個之內：換檔，或確認使用者同意')
    if F['duration'] > s1:
        print(f'  ! 片長 {F["duration"]:.0f} 秒超過「{P["label"]}」的範圍上限 {s1} 秒（雲端 session 數可能多一個；內容需要就不必硬砍）')
    elif F['duration'] < s0:
        print(f'  ! 片長 {F["duration"]:.0f} 秒低於「{P["label"]}」的下限 {s0} 秒（主題是不是被削淺了？）')
# ---- cue sheet for scripts/music/pick_music.py
if a.cues:
    kind2seg = {'intro': 'opening', 'overview': 'overview', 'topic': 'topic', 'recall': 'recall', 'reveal': 'reveal',
                'closure': 'closure', 'transition': 'overview', 'quiz': 'quiz', 'ending': 'ending'}
    cues = []
    for s in segs:
        c = {'segment': kind2seg.get(s['kind'], 'topic'), 'start': round(s['from'], 3), 'dur': round(s['to'] - s['from'], 3)}
        if s.get('topic') is not None:
            c['room'] = s['topic']
        cues.append(c)
    json.dump({'film': a.film_id or F.get('id', 'film'), 'style': a.style, 'duration': F['duration'], 'cues': cues},
              open(a.cues, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'cue sheet -> {a.cues}')
sys.exit(1 if fails else 0)
