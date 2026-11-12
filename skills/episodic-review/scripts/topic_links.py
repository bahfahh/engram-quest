#!/usr/bin/env python3
"""Relations between the topics of a period, from the links between their notes.

  python3 topic_links.py --vault <vault> --period 2026-10 [--out links.json] [--hub 4]

Reads the topic cache (engram-quest/episodic-review/topics/*/topic.json) for topics that list the period.
A relation exists when a note of one topic links to a note of another ([[wikilink]] or a markdown link).
Notes linked from, or linking to, --hub or more topics are hubs (indexes, subscription lists, skill trees) and are
left out: with them every topic relates to every other. With no links at all it falls back to note titles mentioned
in the text of another topic's notes; those are candidates to verify by reading.

Output: { links: [{ a, b, count, how: "link" | "mention", evidence: [[from note, to note]] }], isolated: [topic id], hubs: [note] }
Each link still needs one sentence that states the relation, written from what the linking note says there.
"""
import argparse, collections, glob, json, os, re

ap = argparse.ArgumentParser()
ap.add_argument('--vault', default='.'); ap.add_argument('--period', required=True); ap.add_argument('--out'); ap.add_argument('--hub', type=int, default=4)
a = ap.parse_args()
T = {}
for f in glob.glob(os.path.join(a.vault, 'engram-quest', 'episodic-review', 'topics', '*', 'topic.json')):
    t = json.load(open(f, encoding='utf8'))
    if a.period in t.get('periods', []):
        T[t['id']] = t
owner = collections.defaultdict(set); text = {}
for i, t in T.items():
    for n in t.get('notes', []):
        p = os.path.join(a.vault, n)
        if n.endswith('.md') and os.path.exists(p):
            owner[os.path.splitext(os.path.basename(n))[0]].add(i); text[(i, n)] = open(p, encoding='utf8', errors='ignore').read()
LINK = re.compile(r'\[\[([^\]|#]+)|\]\(([^)#]+?\.md)')


def targets(s):
    for m in LINK.finditer(s):
        yield os.path.splitext(os.path.basename((m.group(1) or m.group(2)).strip().replace('%20', ' ')))[0]


# hubs: a note that reaches many topics, or a note name that belongs to several topics
reach = collections.defaultdict(set)
for (i, n), s in text.items():
    for b in targets(s):
        reach[n] |= owner.get(b, set()) - {i}
inbound = collections.defaultdict(set)              # a note that many topics point at is a hub too
for (i, n), s in text.items():
    for b in targets(s):
        if b in owner and i not in owner[b]:
            inbound[b].add(i)
hubs = {n for n, r in reach.items() if len(r) >= a.hub} | {b for b, o in owner.items() if len(o) > 1} | {b for b, r in inbound.items() if len(r) >= a.hub - 1}
hub_names = {os.path.splitext(os.path.basename(n))[0] for n in hubs}
pairs = collections.defaultdict(list)
for (i, n), s in text.items():
    if n in hubs:
        continue
    for b in targets(s):
        if b in hub_names:
            continue
        for j in owner.get(b, ()):
            if j != i:
                pairs[tuple(sorted((i, j)))].append([os.path.basename(n)[:-3], b])
how = 'link'
if not pairs:                                   # no links anywhere: titles mentioned in another topic's text
    how = 'mention'
    for (i, n), s in text.items():
        for b, o in owner.items():
            if len(b) >= 4 and b in s:
                for j in o - {i}:
                    pairs[tuple(sorted((i, j)))].append([os.path.basename(n)[:-3], b])
links = [dict(a=k[0], b=k[1], count=len(v), how=how, evidence=v[:4]) for k, v in sorted(pairs.items(), key=lambda kv: -len(kv[1]))]
linked = {x for l in links for x in (l['a'], l['b'])}
out = dict(period=a.period, links=links, isolated=sorted(set(T) - linked), hubs=sorted(hubs))
if a.out:
    json.dump(out, open(a.out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for l in links:
    print(f'{T[l["a"]]["title"]}  <->  {T[l["b"]]["title"]}   {l["count"]} {l["how"]}(s)   e.g. {l["evidence"][0][0]} -> {l["evidence"][0][1]}')
print('isolated:', [T[i]['title'] for i in out['isolated']]); print('hubs left out:', len(hubs))
