#!/usr/bin/env python3
"""Middle-section pacing numbers for one studio project (targets: reference/04-skeleton.md §2).
  python3 pacecheck.py projects/<id>
Middle = from the first non-classroom segment to the next classroom segment (segments.json), measured on timeline.json."""
import json, os, re, sys
p = sys.argv[1]
tl = json.load(open(os.path.join(p, 'timeline.json'))); seg = json.load(open(os.path.join(p, 'segments.json')))
sc = [(s['scene'], float(s['from'])) for s in seg]
mid = [i for i, (s, f) in enumerate(sc) if 'classroom' not in s]
m0 = sc[mid[0]][1]; m1 = sc[mid[-1] + 1][1] if mid[-1] + 1 < len(sc) else tl['duration']
L = [l for l in tl['lines'] if m0 <= l['start'] < m1]
sp = [l for l in L if l.get('text')]; sil = [l for l in L if not l.get('text')]
dur = m1 - m0; spoken = sum(l['end'] - l['start'] for l in sp)
cjk = lambda s: len(re.findall(r'[一-鿿]', s))
gaps = []; st = sp[0]['start']; longest = 0; longest_at = st
for i in range(len(sp) - 1):
    g = sp[i + 1]['start'] - sp[i]['end']
    if g >= 1.0:
        if sp[i]['end'] - st > longest: longest, longest_at = sp[i]['end'] - st, st
        st = sp[i + 1]['start']
if sp[-1]['end'] - st > longest: longest, longest_at = sp[-1]['end'] - st, st
big = [(l['id'], round(l['end'] - l['start'], 1)) for l in sil]
print(f"middle {m0:.2f}–{m1:.2f} s = {dur:.1f} s | speech {spoken/dur*100:.0f}% | {cjk(''.join(l['text'] for l in sp))/spoken*60:.0f} 字/分 spoken")
print(f"silence beats: {len(sil)} totalling {sum(b for _, b in big):.1f} s -> {big}")
print(f"longest stretch without a >=1 s pause: {longest:.0f} s (from {longest_at:.1f} s)")
print(f"student lines: {sum(1 for l in sp if l['speaker'] not in ('teacher', None))} of {len(sp)}")
print("targets: speech <= 80%, longest stretch <= 40 s, recap silence 2.5–3 s, one 3–5 s silent picture at the moment of understanding (04-skeleton.md §2)")
