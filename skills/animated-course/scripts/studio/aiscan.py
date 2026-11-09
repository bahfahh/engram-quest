#!/usr/bin/env python3
"""aiscan.py <script.json> ... : advisory scan for "AI-sounding" Chinese narration (07-voice-and-language.md §1d).
Flags lines to re-read aloud; it never fails the build. Each flag is a smell, not proof: decide by ear."""
import json, re, sys, collections

SMELLS = [
  ("口號對仗（缺主詞的 X就Y，Z就W）", r"[^，。；？]{1,6}就[^，。；？]{1,4}[，；][^，。；？]{1,6}就[^，。；？]{1,4}"),
  ("光禿禿的結果動詞（就長／就掉／就漲）", r"就(長|掉|漲|跌|升|降)[，。；]"),
  ("否定式金句（不等於／不代表／不只）", r"不等於|不代表|不只|不單|不僅"),
  ("不是…是…", r"不是[^，。]{1,16}[，,]?(而)?是"),
  ("書面抽象詞", r"留下來的|每一環|這一環|落在.{1,6}之間|緩衝|撐得住|吃掉|由此推論|憑什麼|到底"),
  ("反而／才（轉折副詞堆疊）", r"反而"),
]

def chars(t): return len(re.sub(r"[，。？；！、\s]", "", t))

def scan(path):
    d = json.load(open(path, encoding="utf8"))
    lines = [(l["id"], l["speaker"], l["text"]) for l in d["lines"] if "text" in l]
    print(f"== {path}  ({len(lines)} lines)")
    hits = collections.defaultdict(list)
    for i, sp, t in lines:
        for name, pat in SMELLS:
            if re.search(pat, t): hits[i].append(name)
        if chars(t) <= 6 and not t.endswith("？"): hits[i].append("極短斷句（≤6 字，非問句）")
    for i, sp, t in lines:
        if i in hits: print(f"  {i:5s} {t}\n        ↳ " + "；".join(hits[i]))
    teach = [chars(t) for i, sp, t in lines if sp == "teacher"]
    avg = sum(teach) / max(1, len(teach))
    openers = collections.Counter(t[:2] for i, sp, t in lines if sp == "teacher")
    rep = [f"{k}…×{n}" for k, n in openers.items() if n >= 4]
    print(f"  老師句平均 {avg:.1f} 字（實驗 15 約 26–33；低於 20 多半是電報體）；flagged {len(hits)}/{len(lines)}" + (f"；同開頭 {', '.join(rep)}" if rep else ""))

if __name__ == "__main__":
    for p in sys.argv[1:] or ["script.json"]: scan(p)
