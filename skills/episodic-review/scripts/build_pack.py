#!/usr/bin/env python3
"""Recall pack: turn one JSON entry per topic into everything the review needs. No model calls, no rendering.

  python3 build_pack.py --vault <vault> --packs <dir with one .json per topic> --period 2026-10 [--lang zh-tw|en] [--tag flashcards]

Writes:
  1. topic cache   engram-quest/episodic-review/topics/<id>/topic.json   (reused next period when the notes have not changed)
  2. cards         engram-review/ai-cards/<prefix>-<title>.md + hints    (the Review Deck schedules them)
  3. overview      engram-quest/episodic-review/packs/<period>/<name>.md and pack.json
     with a film ranking: depth of the notes + how badly the topic's existing cards went + no cards yet.
The entry format is templates/topic.example.json. Labels follow --lang; entries are written in the notes' language.
"""
import argparse, glob, json, os, re, datetime as dt

LABELS = {
    'zh-tw': dict(prefix='情境回顧', deck='情境回顧', page='回顧包', title='回顧包：{y} 年 {m} 月',
                  intro='這段期間動過 {n} 個主題。每個主題一句話，加上進了 Review Deck 的 {c} 張回想題（牌組 `{deck}`）。',
                  how='用法：先遮住「結論」，看問題自己講一次，再對答案。之後交給 Review Deck 排時間再問。',
                  question='問題', context='那時候', answer='結論', why='為什麼', rule='判斷規則', case='案例', open='還沒定的事', quick='快問', apply='套用', notes='筆記',
                  filmed='已有回顧片（{f}）', rank='哪個主題值得做成片',
                  rank_note='分數＝筆記深度＋複習時答不好的比例＋平均難度＋還沒有任何複習卡。分數高的先做。複習紀錄少的時候，分數主要反映筆記深度。',
                  cols='| 主題 | 分數 | 筆記深度 | 原有複習卡 | 複習次數 | 答不好的次數 | 平均難度 | 狀態 |', has='已有片', cand='候選',
                  hint='情境：{context}。這個主題在回答：{question}', hint3='判斷規則的方向：{rule}', colon='：', sep='、', gap='　'),
    'en': dict(prefix='Recall', deck='Recall', page='Recall pack', title='Recall pack: {y}-{m:02d}',
               intro='{n} topics were touched in this period. One line each, plus {c} retrieval cards in the Review Deck (deck `{deck}`).',
               how='How to use: cover the conclusion, answer the question in your own words, then compare. The Review Deck brings the cards back later.',
               question='Question', context='At the time', answer='Conclusion', why='Why', rule='Rule', case='Case', open='Still open', quick='Quick question', apply='Apply', notes='Notes',
               filmed='has a recall film ({f})', rank='Which topics deserve a film',
               rank_note='Score = depth of the notes + share of bad answers in review + average difficulty + no cards yet. Higher first. With little review history the score mostly reflects depth.',
               cols='| Topic | Score | Depth | Existing cards | Reviews | Bad answers | Avg difficulty | Status |', has='filmed', cand='candidate',
               hint='Context: {context}. This topic answers: {question}', hint3='Direction of the rule: {rule}', colon=': ', sep=', ', gap='  '),
}
ap = argparse.ArgumentParser()
ap.add_argument('--vault', required=True); ap.add_argument('--packs', required=True); ap.add_argument('--period', required=True)
ap.add_argument('--lang', default='zh-tw'); ap.add_argument('--tag', default='flashcards')
a = ap.parse_args()
V, L = a.vault, LABELS.get(a.lang.lower(), LABELS['en'])
today = dt.date.today().isoformat()
DEPTH = {'L1': 1, 'L2': 2, 'L3': 3, 'L4': 4}


def sr_stats(notes):
    """Review history of the topic's own notes: cards, reviews, answers rated 1-2, average difficulty."""
    n = hard = reviews = 0; diff = []
    for p in notes:
        f = os.path.join(V, 'engram-review', 'sr', p[:-3].replace('/', '__') + '.json') if p.endswith('.md') else None
        if not f or not os.path.exists(f):
            continue
        for c in json.load(open(f, encoding='utf8')).values():
            n += 1
            if isinstance(c.get('difficulty'), (int, float)): diff.append(c['difficulty'])
            for l in c.get('log', []):
                reviews += 1; hard += 1 if l.get('r', 3) <= 2 else 0
    return dict(cards=n, reviews=reviews, hard=hard, difficulty=round(sum(diff) / len(diff), 2) if diff else None)


topics = []
for f in sorted(glob.glob(os.path.join(a.packs, '*.json'))):
    t = json.load(open(f, encoding='utf8'))
    if not isinstance(t, dict) or 'id' not in t or 'cards' not in t:
        continue
    s = t['sr'] = sr_stats(t.get('notes', []))
    t['filmScore'] = round(DEPTH.get(t.get('depth'), 2) + (3.0 * s['hard'] / s['reviews'] if s['reviews'] else 0) + (1.0 if s['cards'] == 0 else 0) + (s['difficulty'] or 0) / 10.0, 2)
    topics.append(t)
order = []
for t in topics:
    if t['domain'] not in order: order.append(t['domain'])
topics.sort(key=lambda t: (order.index(t['domain']), t['id']))

# 1 topic cache
for t in topics:
    d = os.path.join(V, 'engram-quest', 'episodic-review', 'topics', t['id']); os.makedirs(d, exist_ok=True)
    old = os.path.join(d, 'topic.json')
    periods = json.load(open(old, encoding='utf8')).get('periods', []) if os.path.exists(old) else []
    mt = {p: int(os.path.getmtime(os.path.join(V, p)) * 1000) for p in t.get('notes', []) if os.path.exists(os.path.join(V, p))}
    out = dict(t); out.update(cachedAt=today, periods=sorted(set(periods + [a.period])), noteMtime=mt)
    json.dump(out, open(old, 'w', encoding='utf8'), ensure_ascii=False, indent=1)

# 2 cards and hints
os.makedirs(os.path.join(V, 'engram-review', 'ai-cards'), exist_ok=True); os.makedirs(os.path.join(V, 'engram-review', 'hints'), exist_ok=True)
deck = f'{L["deck"]}/{a.period}'; ncards = 0
for t in topics:
    name = L['prefix'] + '-' + re.sub(r'[\\/:*?"<>|]', ' ', t['title'])
    out = ['---', f'tags: [{a.tag}/{deck}]', f'topic: {t["id"]}', f'period: {a.period}', '---', f'TARGET DECK: {deck}', '']
    hints = {}
    for c in list(t['cards']) + [dict(kind='apply', q=t['apply']['q'], a=t['apply']['a'])]:
        q = ' '.join(c['q'].split())
        out += ['%%card%%', 'Q: ' + q, 'A:', c['a'].strip(), '%%card%%', '']
        # the first hint is the context cue (what the person was doing, what the topic answers); it never holds the answer
        hints[q] = dict(l1=L['hint'].format(context=t['context'], question=t['question']), l2='',
                        l3=L['hint3'].format(rule=t['rule']) if t.get('rule') and c['kind'] == 'apply' else '')
        ncards += 1
    open(os.path.join(V, 'engram-review', 'ai-cards', name + '.md'), 'w', encoding='utf8').write('\n'.join(out))
    json.dump(dict(note=f'engram-quest/episodic-review/topics/{t["id"]}/topic.json', generated=today, cards=hints),
              open(os.path.join(V, 'engram-review', 'hints', name + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

# 3 overview and ranking
pd = os.path.join(V, 'engram-quest', 'episodic-review', 'packs', a.period); os.makedirs(pd, exist_ok=True)
rank = sorted(topics, key=lambda t: -t['filmScore'])
json.dump(dict(period=a.period, builtAt=today, topics=[{k: t.get(k) for k in ('id', 'title', 'domain', 'question', 'answer', 'context', 'depth', 'quick', 'filmed', 'filmScore', 'sr')} for t in topics],
               filmOrder=[t['id'] for t in rank if not t.get('filmed')]), open(os.path.join(pd, 'pack.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
y, m = a.period.split('..')[0].split('-')
M = ['# ' + L['title'].format(y=y, m=int(m)), '', '> ' + L['intro'].format(n=len(topics), c=ncards, deck=deck), '> ' + L['how'], '']
dom = None
for t in topics:
    if t['domain'] != dom:
        dom = t['domain']; M += [f'## {dom}', '']
    M += [f'### {t["title"]}' + (L['gap'] + L['filmed'].format(f=t['filmed']['film']) if t.get('filmed') else ''), '']
    for k in ('question', 'context', 'answer', 'why', 'rule', 'case', 'open'):
        if t.get(k): M += [f'- **{L[k]}**{L["colon"]}{t[k]}']
    M += [f'- **{L["quick"]}**{L["colon"]}{t["quick"]["q"]}', f'- **{L["apply"]}**{L["colon"]}{t["apply"]["q"]}']
    ln = [f'[[{p[:-3]}|{os.path.basename(p)[:-3]}]]' for p in t.get('notes', []) if p.endswith('.md') and os.path.exists(os.path.join(V, p))][:6]
    if ln: M += [f'- **{L["notes"]}**{L["colon"]}' + L['sep'].join(ln)]
    M += ['']
M += ['## ' + L['rank'], '', L['rank_note'], '', L['cols'], '|---|---|---|---|---|---|---|---|']
for t in rank:
    s = t['sr']
    M += [f'| {t["title"]} | {t["filmScore"]} | {t.get("depth", "")} | {s["cards"]} | {s["reviews"]} | {s["hard"]} | {s["difficulty"] if s["difficulty"] is not None else "—"} | {L["has"] if t.get("filmed") else L["cand"]} |']
open(os.path.join(pd, f'{L["page"]}-{a.period}.md'), 'w', encoding='utf8').write('\n'.join(M) + '\n')
print(f'{len(topics)} topics, {ncards} cards -> deck {deck}; film order: {[t["title"] for t in rank if not t.get("filmed")][:5]}')
