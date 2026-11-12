#!/usr/bin/env python3
"""Write the film.js of a month overview film from the recall pack and the topic links. No screen code is written by hand.

  python3 month_film.py --pack <vault>/engram-quest/episodic-review/packs/2026-10/pack.json --links links.json \
      --out <studio>/projects/<id>/film.js [--sentences sentences.json] [--id month-2026-10] [--lang zh-tw|en]

links.json is the output of topic_links.py. sentences.json holds the one sentence that states each relation, written by
whoever read the linking notes:  { "t01|t07": "sentence", ... }  (the two topic ids, either order; also for shared notes).
A link without a sentence is NOT drawn (it is listed on stdout instead): a line needs the sentence that explains it.
The film: opening (the period, the areas) -> month map (areas, links one at a time, topics that stand alone)
-> one quick question per topic (the pack's `quick`) -> closing.
"""
import argparse, collections, json, os, sys

L = {
    'zh-tw': dict(count='這個月，動過 {n} 個主題', areas='分在 {n} 個領域', n='{n} 個主題', q='這些主題，哪些是接在一起的？', map='{n} 個主題，怎麼接在一起',
                  alone1='「{a}」這個月沒有接到別的主題。', alone='有圈的 {n} 個主題，這個月沒有接到別的。', quiz='每個主題一題', ask='先自己講一次。', clue='線索　',
                  last='每個主題的題目都在 Review Deck，過幾天會再問你。', month='這個月', quick='快問', close='收尾', sep='、',
                  months=['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']),
    'en': dict(count='{n} topics touched this month', areas='in {n} areas', n='{n} topics', q='Which of these topics connect?', map='{n} topics and how they connect',
               alone1='"{a}" did not connect to another topic this month.', alone='The {n} circled topics did not connect to another this month.', quiz='One question per topic', ask='Say it yourself first.', clue='Clue: ',
               last='Every topic has its questions in the Review Deck; they will come back in a few days.', month='This month', quick='Quick questions', close='Close', sep=', ', months=None),
}
ap = argparse.ArgumentParser()
ap.add_argument('--pack', required=True); ap.add_argument('--links', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--sentences'); ap.add_argument('--id'); ap.add_argument('--lang', default='zh-tw', choices=list(L))
a = ap.parse_args()
t = L[a.lang]
pack = json.load(open(a.pack, encoding='utf8')); links = json.load(open(a.links, encoding='utf8'))
sent = json.load(open(a.sentences, encoding='utf8')) if a.sentences else {}
say = lambda x, y: sent.get(f'{x}|{y}') or sent.get(f'{y}|{x}')
topics = pack['topics']; ids = {x['id'] for x in topics}
areas = collections.OrderedDict()
for x in topics:
    areas.setdefault(x['domain'], []).append(x)
drawn, shared, missing = [], [], []
for l in links.get('links', []):
    if l['a'] in ids and l['b'] in ids:
        (drawn if say(l['a'], l['b']) else missing).append(l)
pairs = {frozenset((l['a'], l['b'])) for l in links.get('links', [])}
for s in links.get('shared', []):
    for i, x in enumerate(s['topics']):
        for y in s['topics'][i + 1:]:
            if frozenset((x, y)) in pairs:              # already drawn as a link, or already drawn as shared: one line per pair
                continue
            pairs.add(frozenset((x, y)))
            if x in ids and y in ids:
                (shared.append((x, y, say(x, y))) if say(x, y) else missing.append(dict(a=x, b=y, evidence=[[s['note'], '(shared note)']])))
linked = {z for l in drawn for z in (l['a'], l['b'])} | {z for s in shared for z in s[:2]}
lone = [x['title'] for x in topics if x['id'] not in linked]
year, mon = pack['period'].split('-')[:2]
month = t['months'][int(mon) - 1] if t['months'] else pack['period']
J = lambda o: json.dumps(o, ensure_ascii=False)
area_list = [[k, t['n'].format(n=len(v))] for k, v in areas.items()]
film = dict(
    opening=dict(year=year, month=month, count=t['count'].format(n=len(topics)), areasTitle=t['areas'].format(n=len(areas)), areas=area_list, question=t['q']),
    map=dict(title=t['map'].format(n=len(topics)), areas=[dict(name=k, topics=[[x['id'], x['title']] for x in v]) for k, v in areas.items()],
             links=[[l['a'], l['b'], say(l['a'], l['b'])] for l in drawn], shared=[list(s) for s in shared],
             alone=(t['alone1'].format(a=lone[0]) if len(lone) == 1 else t['alone'].format(n=len(lone), a=t['sep'].join(lone))) if lone else ''),
    quiz=dict(casesTitle=t['quiz'], ask=t['ask'], cases=[[x['quick']['q'], x['quick']['a'], x['quick'].get('because', ''), t['clue'] + x['quick']['clue'] if x['quick'].get('clue') else '', x['title'], x['id']] for x in topics if x.get('quick')]),
    closing=dict(areas=area_list, last=t['last']),
)
out = f"""// Written by scripts/month_film.py from {os.path.basename(a.pack)} and {os.path.basename(a.links)}. Edit the data, not the patterns.
import {{ opening, monthMap, recall, closing }} from './patterns.js';
export const FILM = {{
  id: {J(a.id or 'month-' + pack['period'])}, topicId: '', crumb: {J([month])}, badge: '',
  chapters: [
    {{ name: '', run: opening({J(film['opening'])}) }},
    {{ name: {J(t['month'])}, run: monthMap({J(film['map'])}) }},
    {{ name: {J(t['quick'])}, run: recall({J(film['quiz'])}) }},
    {{ name: {J(t['close'])}, run: closing({J(film['closing'])}) }},
  ],
}};
"""
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
open(a.out, 'w', encoding='utf8').write(out)
print(f'ok: {a.out}   {len(topics)} topics, {len(areas)} areas, {len(drawn)} links and {len(shared)} shared notes drawn, {len(lone)} topics alone')
for l in missing:
    print(f'not drawn (no sentence yet): "{l["a"]}|{l["b"]}"   evidence: {l.get("evidence", [])[:2]}')
