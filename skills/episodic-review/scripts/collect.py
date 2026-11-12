#!/usr/bin/env python3
"""Episodic review: group the notes touched in a period into topic packs (no model calls, only git and the files).

  python3 collect.py --vault <vault> --start 2026-10-01 --end 2026-10-31 --out <output folder> [--render]

Writes:
  <out>/pack.json            everything (topics, each note, each day, canvases, backlinks, review history, diary entries)
  <out>/topics/<topic>.md    one pack per topic, the material for writing that topic's entry
  <out>/canvas_png/          (--render) each related canvas as a PNG, so its relations can be read by eye

Rules:
- One note is one unit; notes are not split into sections.
- Time is counted in learning days: UTC+8, and anything before 05:00 belongs to the day before.
- Topics follow the person's own structure first: folders (map series), canvases, links.
- Only days when content really changed count: commits that move the whole vault (mass renames, link-only edits) do not.
"""
import argparse, collections, datetime as dt, json, os, re, subprocess, sys

SKIP_DIRS = ('Clippings/', '.obsidian/', '.claude/', '.git/', 'engram-quest/', 'engram-review/')
# Vaults name their top-level folders differently; numbered prefixes ("1. Projects", "3_areas") are optional.
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
    # how git numstat writes a rename: "a/{old => new}/f.md" or "old.md => new.md"
    if '=>' not in p:
        return p
    m = re.match(r'(.*)\{(.*) => (.*)\}(.*)', p)
    if m:
        return (m.group(1) + m.group(3) + m.group(4)).replace('//', '/')
    return p.split(' => ')[1]


def rename_map(vault, start):
    """Every rename since the period began (later whole-vault moves included): follows an old path to its current one."""
    out = git(vault, 'log', f'--since={start}T00:00:00+08:00', '-M', '--name-status', '--diff-filter=R', '--format=@@%h')
    ren = {}
    for block in reversed(out.split('@@')[1:]):          # oldest first
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
    """Returns {path: set(learning days)} (only real content changes) and the days of commits judged to be bulk moves."""
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
        # bulk move: 30 or more renames, 150 or more files in one commit, or many files with only a line or two changed
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
            if len(rest) < 8:   # a heading line: take the next non-empty line
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
    """Backlinks: linked note name -> the files that link to it. File nodes of a canvas count too."""
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
    """The plugin's review history (engram-review/sr): the file name is the note path with / replaced by __.
    Only entries inside the period are kept."""
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
    ap.add_argument('--render', action='store_true', help='render the related canvases to PNG with render_canvas.cjs')
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, 'topics'), exist_ok=True)

    if not os.path.isdir(a.vault):
        sys.exit(f'vault folder not found: {a.vault}')
    has_git = history_covers(a.vault, a.start)
    if not has_git:
        print('No git history covers this period: using file modification times instead. Each note counts only on the day '
              'it was last modified, and notes edited again after the period are not listed.')
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
        L = [f"# Topic pack: {k}", '', f"- Days touched ({len(t['days'])}): {', '.join(d[5:] for d in t['days'])}",
             f"- Notes: {len(t['notes'])}; distilled knowledge-base notes: {len(t['craft'])}", '']
        if t['canvases']:
            L += ['## The existing structure (canvases: look at the image first)'] + [f"- {c} -> {png(c) if a.render else '(not rendered)'}" for c in t['canvases']] + ['']
        L.append('## Notes (in order of the first day touched)')
        for p in t['notes'] + t['craft']:
            n = notes[p]
            L.append(f"### {n['title']} ({', '.join(d[5:] for d in n['days'])})")
            L.append(f"- Path: {p} ({n['chars']} characters)")
            if n['summary']: L.append(f"- The note's own summary line: {n['summary']}")
            if n['source_line'] or n['fm'].get('source'): L.append(f"- Source: {n['source_line'] or n['fm'].get('source')}")
            if n['fm'].get('context'): L.append(f"- Context: {n['fm']['context']}")
            if n['backlinks']: L.append(f"- Backlinks: {', '.join(os.path.basename(x) for x in n['backlinks'][:10])}")
            for r in rv.get(p, [])[:5]: L.append(f"- Reviewed {r['d']}, rated {r['r']}: {r['q']}")
            L.append('')
        safe = k.replace('/', '__')
        open(os.path.join(a.out, 'topics', f'{safe}.md'), 'w', encoding='utf-8').write('\n'.join(L))

    if a.render:
        allc = sorted({c for t in pack['topics'].values() for c in t['canvases']})
        lst = os.path.join(a.out, 'canvas_list.txt')
        open(lst, 'w', encoding='utf-8').write('\n'.join(allc))
        here = os.path.dirname(os.path.abspath(__file__))
        subprocess.run(['node', os.path.join(here, 'render_canvas.cjs'), lst, os.path.join(a.out, 'canvas_png'), a.vault], check=False)

    print(f"Period {a.start} to {a.end}: {len(notes)} notes, {len(pack['topics'])} topics, {len(diaries)} diary entries, "
          f"{len(structs)} structure pages, bulk-move days {bulk}, {len(rv)} notes with review history")


if __name__ == '__main__':
    main()
