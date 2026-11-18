#!/usr/bin/env python3
"""timeline.json (from voice.py) -> subtitles-en.srt, subtitles-zh-TW.srt, subtitles-en.vtt (for burning).
One cue per narration line; cue times follow the voice timeline; text is wrapped to at most two short lines."""
import json, sys, re
tl = json.load(open(sys.argv[1])); out = sys.argv[2]
ZH = {
 "Q1": "你的 AI 第二大腦什麼都記得。", "Q2": "那你呢？",
 "I1a": "你問 AI 一個很難的問題，", "I1b": "答案清楚得不得了。",
 "I2a": "一切都說得通。", "I2b": "你覺得自己已經學會了。",
 "I3": "但一週後，你又問了一模一樣的問題。",
 "I4a": "記憶一開始退得很快，之後才變慢。",
 "I4b": "研究者在 1885 年量出了這條曲線，", "I4c": "2015 年的重做研究也得到相似的曲線。",
 "E1": "在一項經典實驗中，學生讀了幾篇短文。",
 "E2a": "接著，他們把其中一篇再讀一遍。", "E2b": "另一篇則蓋起來，把記得的內容寫下來。",
 "E3": "五分鐘後，重讀的人較強：81% 對 75%。",
 "E4a": "但過了一週，結果反過來了。", "E4b": "回想勝過重讀：56% 對 42%。",
 "E5a": "在第二個實驗中，重讀的人最有把握會記得，", "E5b": "實際卻記得比較少。",
 "P1a": "所以 AI 解釋完之後，先把答案蓋起來，", "P1b": "憑記憶說出來，", "P1c": "再隔越來越長的間隔回來複習。",
 "P2": "像 FSRS 這類間隔重複工具，會幫你排好這些間隔。",
 "R1": "閱讀讓人覺得自己學會了。", "R2": "每次隔久一點，從記憶裡提取，才記得牢。",
}
def wrap_en(s, n=34):
    if len(s) <= n: return s
    words = s.split(' '); best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        sc = abs(len(a) - len(b))
        if best is None or sc < best[0]: best = (sc, a, b)
    return best[1] + '\n' + best[2]
def wrap_zh(s, n=15):
    if len(s) <= n: return s
    cands = [i + 1 for i, c in enumerate(s) if c in '，、：；' and 3 <= i + 1 <= len(s) - 3]
    k = min(cands, key=lambda i: abs(i - len(s) / 2)) if cands else (len(s) + 1) // 2
    return s[:k] + '\n' + s[k:].lstrip()
lines = [l for l in tl['lines'] if l.get('speaker')]
def ts(x, vtt=False):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{'.' if vtt else ','}{ms:03d}"
cues = []
for i, l in enumerate(lines):
    a = max(0, l['start'] - 0.04)
    nxt = lines[i + 1]['start'] - 0.04 if i + 1 < len(lines) else tl['duration'] - 3.6
    b = min(nxt, max(l['end'] + 0.3, a + 1.3))
    cues.append((l['id'], a, b, l.get('sub') or l['text']))
def write(path, texts, vtt=False):
    with open(path, 'w', encoding='utf-8') as f:
        if vtt: f.write('WEBVTT\n\n')
        for n, ((cid, a, b, _), t) in enumerate(zip(cues, texts), 1):
            if not vtt: f.write(f"{n}\n")
            f.write(f"{ts(a, vtt)} --> {ts(b, vtt)}\n{t}\n\n")
en = [wrap_en(c[3]) for c in cues]; ZHBREAK = {'Q1': '你的 AI 第二大腦\n什麼都記得。', 'I4b': '研究者在 1885 年\n量出了這條曲線，', 'I4c': '2015 年的重做研究\n也得到相似的曲線。'}
zh = [ZHBREAK.get(c[0]) or wrap_zh(ZH[c[0]]) for c in cues]
write(f"{out}/subtitles-en.srt", en); write(f"{out}/subtitles-zh-TW.srt", zh); write(f"{out}/subtitles-en.vtt", en, True)
print(len(cues), 'cues; max EN line', max(len(x) for t in en for x in t.split('\n')), 'max ZH line', max(len(x) for t in zh for x in t.split('\n')))
