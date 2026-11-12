#!/usr/bin/env python3
"""情境回顧：把一段期間的筆記整理成「主題資料包」（不用 AI，只用 git 和檔案）。

用法：
  python3 collect.py --vault <vault> --start 2026-10-01 --end 2026-10-31 --out <輸出資料夾> [--render]

輸出：
  <out>/pack.json            全部資料（主題、每篇筆記、每天、canvas、反向連結、複習紀錄、日記）
  <out>/topics/<主題>.md      每個主題一份資料包，給 AI 寫主題頁用
  <out>/canvas_png/           （--render）每張相關 canvas 畫成 PNG，給 AI 看圖理解關聯

規則照 (not public)）.md：
- 一篇筆記＝一個單位，不切段。
- 時間以「學習日」為單位：台灣時間，凌晨 5 點前算前一天。
- 主題先用使用者自己的結構：資料夾（地圖系列）、canvas、連結。
- 只算真的改了內容的日子：整庫搬家（大量改名、只改連結）的 commit 不算。
"""
import argparse, collections, datetime as dt, json, os, re, subprocess, sys

SKIP_DIRS = ('Clippings/', '.obsidian/', '.claude/', '.git/', 'engram-quest/', 'engram-review/')
# Vaults name their top-level folders differently; numbered prefixes ("3.專案", "1. Projects") are optional.
FOLDER_PREFIX = r'^(\d+[.\s_-]*)?'
DIARY_RX = re.compile(FOLDER_PREFIX + r'(日記|diary|journals?|daily( notes)?)/', re.I)
PROJECT_DIR = re.compile(FOLDER_PREFIX + r'(專案|projects?)$', re.I)
AREA_DIR = re.compile(FOLDER_PREFIX + r'(領域|areas?)$', re.I)
BULK_FILES = 150
STRUCT_RX = re.compile(r'(偏好|wiki)\.md$|(^|/)index\.md$|INDEX\.md$|preferences\.md$', re.I)
TZ = dt.timezone(dt.timedelta(hours=8))


def git(vault, *args):
    return subprocess.run(['git', '-c', 'core.quotepath=off', *args], cwd=vault,
                          capture_output=True, text=True, encoding='utf-8', errors='replace', check=True).stdout


def learn_day(ts):
    t = dt.datetime.fromisoformat(ts).astimezone(TZ)
    if t.hour < 5:
        t -= dt.timedelta(days=1)
    return t.date().isoformat()


def norm_rename(p):
    # git numstat 的改名寫法："a/{old => new}/f.md" 或 "old.md => new.md"
    if '=>' not in p:
        return p
    m = re.match(r'(.*)\{(.*) => (.*)\}(.*)', p)
    if m:
        return (m.group(1) + m.group(3) + m.group(4)).replace('//', '/')
    return p.split(' => ')[1]


def rename_map(vault, start):
    """期間開始之後的所有改名（含之後的整庫搬家），把舊路徑一路對到現在的路徑。"""
    out = git(vault, 'log', f'--since={start}T00:00:00+08:00', '-M', '--name-status', '--diff-filter=R', '--format=@@%h')
    ren = {}
    for block in reversed(out.split('@@')[1:]):          # 由舊到新
        for ln in block.strip().split('\n'):
            parts = ln.split('\t')
            if len(parts) == 3 and parts[0].startswith('R'):
                ren[parts[1]] = parts[2]
    def final(p):
        seen = set()
        while p in ren and p not in seen:
            seen.add(p); p = ren[p]
        return p
    return final


def scan_commits(vault, start, end):
    """回傳 {path: set(學習日)}（只算真的改了內容），以及被判成搬家的 commit 日。"""
    since = f'{start}T05:00:00+08:00'
    until = (dt.date.fromisoformat(end) + dt.timedelta(days=1)).isoformat() + 'T05:00:00+08:00'
    out = git(vault, 'log', f'--since={since}', f'--until={until}', '-M', '-w', '--ignore-cr-at-eol',
              '--numstat', '--format=@@%H|%aI')
    days = collections.defaultdict(set)
    bulk = []
    final = rename_map(vault, start)
    for block in out.split('@@')[1:]:
        lines = block.strip().split('\n')
        h, ts = lines[0].split('|')
        rows = []
        for ln in lines[1:]:
            parts = ln.split('\t')
            if len(parts) != 3:
                continue
            a, d, p = parts
            p = final(norm_rename(p))
            if p.startswith(SKIP_DIRS) or not (p.endswith('.md') or p.endswith('.canvas')):
                continue
            n = (int(a) if a.isdigit() else 0) + (int(d) if d.isdigit() else 0)
            rows.append((p, n, '=>' in ln))
        if not rows:
            continue
        day = learn_day(ts)
        renames = sum(1 for _, _, ren in rows if ren)
        small = sum(1 for _, n, ren in rows if ren or n < 3)
        # 整庫搬家：一次改名 30 個以上、一次動 150 個以上，或大量檔案只改一兩行
        if renames >= 30 or len(rows) >= BULK_FILES or (len(rows) >= 30 and small / len(rows) > 0.8):
            bulk.append(day)
            continue
        for p, n, ren in rows:
            if n >= 3:
                days[p].add(day)
    return days, sorted(set(bulk))


def history_covers(vault, start):
    """Git can be trusted for this period only when the vault is the repo root and history reaches back before it."""
    try:
        return git(vault, 'rev-parse', '--show-prefix').strip() == '' and \
            git(vault, 'log', '-1', '--format=%H', f'--before={start}T05:00:00+08:00').strip() != ''
    except (OSError, subprocess.CalledProcessError):
        return False


def vault_files(vault):
    out = []
    for root, dirs, files in os.walk(vault):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules'
                   and not (os.path.relpath(os.path.join(root, d), vault).replace('\\', '/') + '/').startswith(SKIP_DIRS)]
        out += [os.path.relpath(os.path.join(root, f), vault).replace('\\', '/') for f in files]
    return out


def scan_mtimes(vault, start, end):
    """Without usable history each file counts once, on the day it was last modified; a day when a whole vault
    was copied or restored says nothing about what was studied, so it is reported as bulk like a mass move."""
    per_day = collections.defaultdict(list)
    for p in vault_files(vault):
        if not p.endswith(('.md', '.canvas')):
            continue
        try:
            day = learn_day(dt.datetime.fromtimestamp(os.path.getmtime(os.path.join(vault, p)), TZ).isoformat())
        except (OSError, ValueError, OverflowError):
            continue
        if start <= day <= end:
            per_day[day].append(p)
    days = collections.defaultdict(set)
    bulk = []
    for day, paths in per_day.items():
        if len(paths) >= BULK_FILES:
            bulk.append(day)
            continue
        for p in paths:
            days[p].add(day)
    return days, sorted(bulk)


def read(vault, p):
    try:
        return open(os.path.join(vault, p), encoding='utf-8').read()
    except Exception:
        return ''


FM = re.compile(r'^---\n(.*?)\n---\n', re.S)
SUMMARY = re.compile(r'(一句話總結|核心一句話|一句話|結論|總結|TL;?DR|核心重點)[：:]?\s*(.*)', re.I)


def note_info(vault, p):
    t = read(vault, p)
    fm = FM.match(t)
    body = t[fm.end():] if fm else t
    fmtxt = fm.group(1) if fm else ''
    title = os.path.splitext(os.path.basename(p))[0]
    summary = ''
    lines = [l.strip() for l in body.split('\n')]
    for i, l in enumerate(lines):
        m = SUMMARY.search(l)
        if m and not l.startswith(('來源', '- 來源')) and (l.startswith(('>', '#', '**')) or len(l) < 200):
            rest = re.sub(r'^[>*#\s]+', '', m.group(2)).strip(' *')
            if len(rest) < 8:   # 標題行，取下一個非空行
                rest = next((x for x in lines[i + 1:i + 4] if x), '')
            summary = re.sub(r'^[>\-*\s]+', '', rest)[:240]
            break
    if not summary:
        summary = next((re.sub(r'^[>\-*#\s]+', '', l) for l in lines if l and not l.startswith(('#', '!', '|', '```', '---'))), '')[:240]
    fields = {k: v.strip() for k, v in re.findall(r'^(source|context|emotion|Use Case|來源)\s*:\s*(.+)$', fmtxt, re.M)}
    src_line = re.search(r'^(來源(影片)?|原文|source)\s*[:：]\s*(.+)$', body, re.M | re.I)
    urls = sorted(set(re.findall(r'https?://[^\s)\]>"]+', t)))[:8]
    links = sorted(set(re.findall(r'\[\[([^\]|#]+)', t)))
    return dict(title=title, chars=len(body), summary=summary, fm=fields,
                source_line=src_line.group(3)[:200] if src_line else '', urls=urls, links=links)


def link_index(vault, files):
    """反向連結：被連到的檔名 → 連到它的檔案。canvas 的檔案節點也算。"""
    idx = collections.defaultdict(set)
    for f in files:
        t = read(vault, f)
        if f.endswith('.canvas'):
            try:
                for n in json.loads(t).get('nodes', []):
                    if n.get('type') == 'file' and n.get('file', '').endswith('.md'):
                        idx[os.path.splitext(os.path.basename(n['file']))[0]].add(f)
            except Exception:
                pass
            continue
        for target in set(re.findall(r'\[\[([^\]|#]+)', t)):
            idx[os.path.splitext(os.path.basename(target.strip()))[0]].add(f)
    return idx


def topic_key(p):
    parts = p.split('/')
    if parts[0] == '0.職人知識庫':
        return '0.職人知識庫'
    if PROJECT_DIR.match(parts[0]) and len(parts) > 2:
        return parts[0] + '/' + parts[1]
    if AREA_DIR.match(parts[0]) and len(parts) > 2:
        rest = [x for x in parts[2:-1] if x not in ('知識', '紀錄')]
        if not rest:
            return parts[1]
        for i, x in enumerate(rest):
            if re.search(r'地圖|map', x, re.I):
                return parts[1] + '/' + '/'.join(rest[:i + 1])
        return parts[1] + '/' + rest[0]
    if len(parts) == 1:
        return 'Vault root'
    return '/'.join(parts[:2]) if len(parts) > 2 else parts[0]


def reviews(vault, note_paths, start, end):
    """插件複習紀錄（engram-review/sr）：檔名是筆記路徑把 / 換成 __。只留期間內的紀錄。"""
    srdir = os.path.join(vault, 'engram-review', 'sr')
    out = {}
    if not os.path.isdir(srdir):
        return out
    names = {f[:-5]: f for f in os.listdir(srdir) if f.endswith('.json')}
    for p in note_paths:
        key = p[:-3].replace('/', '__')
        if key not in names:
            continue
        try:
            data = json.load(open(os.path.join(srdir, names[key]), encoding='utf-8'))
        except Exception:
            continue
        logs = []
        for q, v in data.items():
            for e in (v.get('log') or []):
                if start <= e.get('d', '') <= end:
                    logs.append(dict(d=e['d'], r=e.get('r'), q=q[:120]))
        if logs:
            out[p] = sorted(logs, key=lambda x: x['d'])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--vault', required=True)
    iso_day = lambda s: dt.date.fromisoformat(s).isoformat()
    ap.add_argument('--start', required=True, type=iso_day)
    ap.add_argument('--end', required=True, type=iso_day)
    ap.add_argument('--out', required=True)
    ap.add_argument('--render', action='store_true', help='用 render_canvas.cjs 把相關 canvas 畫成 PNG')
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, 'topics'), exist_ok=True)

    if not os.path.isdir(a.vault):
        sys.exit(f'vault folder not found: {a.vault}')
    has_git = history_covers(a.vault, a.start)
    if not has_git:
        print('沒有涵蓋這段期間的 git 歷史：改用檔案修改時間，每篇只算最後修改的那一天，期間之後又改過的筆記不會列入。')
    days, bulk = scan_commits(a.vault, a.start, a.end) if has_git else scan_mtimes(a.vault, a.start, a.end)
    head = set(git(a.vault, 'ls-files').split('\n')) if has_git else set(vault_files(a.vault))
    notes, diaries, structs = {}, {}, []
    for p, ds in days.items():
        if p not in head or not p.endswith('.md'):
            continue
        if DIARY_RX.match(p):
            diaries[p] = sorted(ds)
        elif STRUCT_RX.search(p):
            structs.append(p)
        else:
            notes[p] = dict(days=sorted(ds), **note_info(a.vault, p))

    allfiles = [f for f in head if f and f.endswith(('.md', '.canvas')) and not f.startswith(SKIP_DIRS)]
    idx = link_index(a.vault, allfiles)
    for p, n in notes.items():
        n['backlinks'] = sorted(x for x in idx.get(n['title'], ()) if x != p)[:30]

    topics = collections.defaultdict(lambda: dict(notes=[], canvases=set(), craft=[]))
    for p, n in notes.items():
        if p.startswith('0.職人知識庫'):
            src = read(a.vault, p)[:1500]
            m = re.search(r'來源[:：]\s*(.+)', src)
            hit = None
            if m:
                for q in notes:
                    if not q.startswith('0.職人知識庫') and os.path.splitext(os.path.basename(q))[0] in m.group(1):
                        hit = topic_key(q); break
            if hit:
                topics[hit]['craft'].append(p); continue
        topics[topic_key(p)]['notes'].append(p)
    canvases = [f for f in allfiles if f.endswith('.canvas')]
    for k, t in topics.items():
        members = set(t['notes'])
        for c in canvases:
            folder_hit = any(os.path.dirname(c) == os.path.dirname(p) for p in members)
            node_hit = sum(1 for p in members if c in idx.get(notes[p]['title'], ()))
            if folder_hit or node_hit >= 2:
                t['canvases'].add(c)
    rv = reviews(a.vault, list(notes), a.start, a.end)

    pack = dict(period=[a.start, a.end], bulk_days=bulk, diaries=diaries, structure_pages=sorted(structs),
                notes=notes, reviews=rv,
                topics={k: dict(notes=sorted(v['notes'], key=lambda p: (notes[p]['days'][0], p)), craft=v['craft'],
                                canvases=sorted(v['canvases']),
                                days=sorted({d for p in v['notes'] + v['craft'] for d in notes[p]['days']}))
                        for k, v in topics.items()})
    if not has_git:
        pack['scan'] = 'mtime'
    json.dump(pack, open(os.path.join(a.out, 'pack.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    png = lambda c: f"canvas_png/{c.replace('/', '__')[:-7]}.png"
    for k, t in sorted(pack['topics'].items(), key=lambda x: -len(x[1]['notes'])):
        L = [f"# 主題資料包：{k}", '', f"- 動過的日子：{'、'.join(d[5:] for d in t['days'])}（共 {len(t['days'])} 天）",
             f"- 筆記 {len(t['notes'])} 篇；職人知識庫整理 {len(t['craft'])} 篇", '']
        if t['canvases']:
            L += ['## 你的結構（canvas，先看圖）'] + [f"- {c} → {png(c) if a.render else '（未畫圖）'}" for c in t['canvases']] + ['']
        L.append('## 筆記（照第一次動到的日子排）')
        for p in t['notes'] + t['craft']:
            n = notes[p]
            L.append(f"### 〈{n['title']}〉 {'、'.join(d[5:] for d in n['days'])}")
            L.append(f"- 路徑：{p}（{n['chars']} 字）")
            if n['summary']: L.append(f"- 筆記自己的總結句：{n['summary']}")
            if n['source_line'] or n['fm'].get('source'): L.append(f"- 來源：{n['source_line'] or n['fm'].get('source')}")
            if n['fm'].get('context'): L.append(f"- context：{n['fm']['context']}")
            if n['backlinks']: L.append(f"- 反向連結：{'、'.join(os.path.basename(x) for x in n['backlinks'][:10])}")
            for r in rv.get(p, [])[:5]: L.append(f"- 複習 {r['d']} 評 {r['r']}：{r['q']}")
            L.append('')
        safe = k.replace('/', '__')
        open(os.path.join(a.out, 'topics', f'{safe}.md'), 'w', encoding='utf-8').write('\n'.join(L))

    if a.render:
        allc = sorted({c for t in pack['topics'].values() for c in t['canvases']})
        lst = os.path.join(a.out, 'canvas_list.txt')
        open(lst, 'w', encoding='utf-8').write('\n'.join(allc))
        here = os.path.dirname(os.path.abspath(__file__))
        subprocess.run(['node', os.path.join(here, 'render_canvas.cjs'), lst, os.path.join(a.out, 'canvas_png'), a.vault], check=False)

    print(f"期間 {a.start}～{a.end}：筆記 {len(notes)} 篇、主題 {len(pack['topics'])} 個、日記 {len(diaries)} 篇、"
          f"結構頁 {len(structs)} 篇、搬家日 {bulk}、有複習紀錄 {len(rv)} 篇")


if __name__ == '__main__':
    main()
