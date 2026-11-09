#!/usr/bin/env python3
"""Length presets -> topics, length, frames, render sessions, time. Reads templates/length.json.

  python3 length_estimate.py                       # table of short / medium / long
  python3 length_estimate.py --length medium       # one preset
  python3 length_estimate.py --minutes 8           # the tier whose typical length is closest (short / medium / long)
  python3 length_estimate.py --length long --json  # machine-readable (for the plugin / the first-stage report)
"""
import argparse, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(HERE, '..', 'templates', 'length.json'), encoding='utf-8'))
M, R = L['model'], L['render']


def overhead(n):
    k = str(min(max(n, 1), 5))
    return M['overhead_s'][k]


def seconds_for(topics):
    return overhead(topics) + topics * M['per_topic_s']


def plan(name, topics=None, seconds=None):
    p = L['presets'].get(name, {})
    if topics is None:
        topics = p['topics'][0] if p.get('topics') else 3
    mid = seconds_for(topics)
    lo_s, hi_s = p['seconds']
    lo_s, hi_s = round(lo_s), round(hi_s)
    sess = lambda x: math.ceil(x / R['session_s'])
    w_lo, w_hi = R['wall_minutes']
    q_lo, q_hi = R['join_qa_deliver_minutes']
    mb_lo, mb_hi = R['file_mb_estimate_per_minute']
    eff = p.get('effort', {})
    return {'length': name, 'label': p['label'], 'topics': topics,
            'minutes': [round(lo_s / 60, 1), round(hi_s / 60, 1)], 'typical_minutes': round(mid / 60, 1),
            'sessions': [sess(lo_s), sess(hi_s)], 'frames_typical': round(mid * R['fps']),
            'render_minutes': [w_lo, w_hi], 'finish_minutes': [w_lo + q_lo, w_hi + q_hi],
            'file_mb': [round(lo_s / 60 * mb_lo), round(hi_s / 60 * mb_hi)],
            'polish': eff['polish'], 'checks': eff.get('checks', ''),
            'render_width': eff.get('render_width', 1920), 'token_hint': p.get('token_hint')}


def show(x):
    ss = x['sessions']
    sess = f"{ss[0]}" if ss[0] == ss[1] else f"{ss[0]}～{ss[1]}"
    tok = f"  token 約 {x['token_hint']}×（相對長版，粗估）" if x['token_hint'] else ''
    print(f"{x['label']:<6} {x['topics']} 個主題  {x['minutes'][0]}～{x['minutes'][1]} 分（通常約 {x['typical_minutes']}）  "
          f"精緻度：{x['polish']}  {x['render_width']}px  雲端 {sess} 個 session，算圖約 {x['render_minutes'][0]}～{x['render_minutes'][1]} 分"
          f"（含接片檢查交付約 {x['finish_minutes'][0]}～{x['finish_minutes'][1]} 分）  檔案約 {x['file_mb'][0]}～{x['file_mb'][1]} MB{tok}")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--length', choices=['short', 'medium', 'long'])
    ap.add_argument('--minutes', type=float)
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    if a.minutes:
        k = min(('short', 'medium', 'long'), key=lambda n: abs(seconds_for(L['presets'][n]['topics'][0]) - a.minutes * 60))
        out = [plan(k)]
    elif a.length:
        out = [plan(a.length)]
    else:
        out = [plan(k) for k in ('short', 'medium', 'long')]
    if a.json:
        print(json.dumps(out if len(out) > 1 else out[0], ensure_ascii=False, indent=1))
    else:
        for x in out:
            show(x)
