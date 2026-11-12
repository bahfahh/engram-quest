#!/usr/bin/env python3
"""Deliver a finished episodic review film into the engram-quest video library.

  python3 deliver.py --final <final.mp4> --poster <poster.jpg> --id <id> --title "<film title>" \
      --style episodic-map --vault <vault root> --period 2026-10 --length medium \
      [--topics-json topics.json] [--not-taken "Topic A,Topic B"] [--request-id req-1] [--credits "<text>"] [--crf 26] [--max-mb 95]

- Compresses to the vault version (x264 slow, CRF 26, max 1800 kbps, AAC 128k, faststart), run at nice 19.
  engram-quest/videos/settings.json quality "compact" scales the delivered copy to 720p.
- GitHub refuses files over 100 MB. If the CRF version is bigger than --max-mb (busy textures such as the cork
  board do this), it is re-encoded two-pass at the bitrate that fits (about 92% of --max-mb).
- Copies the poster, then adds or replaces the entry in engram-quest/videos/episodic-recall/meta.json and marks the
  series with "kind": "episodic" (the EngramQuest plugin lists kind=episodic series in the Memory category).
- Entry fields the plugin UI reads: period ("2026-10", or "2026-08..2026-09"), length (short|medium|long), createdAt,
  topics (chapters: [{"title": "...", "from": sec, "to": sec}]), notTaken (topics left out, candidates for the next film), credits.
- --request-id: a pending request the plugin UI wrote into meta.json "requests" is marked done with this video's id.
- Stops before writing anything if the project (--project, default the folder of --final) still has an unfilled
  {{FILL:key}} marker in a file that reaches the screen; notes and comments do not count. Exit code 2.
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile

MARKER = re.compile(r'\{\{FILL:([^{}\n]+)\}\}')
MARKED_FILES = ('.js', '.mjs', '.cjs', '.html', '.json', '.svg', '.css')
SKIP_DIRS = {'node_modules', '.git', 'stills', 'tools'}


def in_comment(line, col, name):
    """A marker in a comment never reaches the screen. Script comment syntax counts only in script files."""
    head = line[:col].lstrip()
    if head.startswith('<!--'):
        return True
    if not name.endswith(('.js', '.mjs', '.cjs')):
        return False
    return head.startswith(('//', '/*', '*')) or ('//' in head and not any(head.count(q) % 2 for q in '\'"`'))


def unfilled_markers(project):
    """{file relative to the project: [keys]} for every marker still in a project that has a scene."""
    found = {}
    if not os.path.isfile(os.path.join(project, 'scene.html')):
        return found
    for folder, dirs, files in os.walk(project):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if not name.endswith(MARKED_FILES):
                continue
            path = os.path.join(folder, name)
            with open(path, encoding='utf-8', errors='replace') as f:
                keys = [m.group(1) for line in f for m in MARKER.finditer(line) if not in_comment(line, m.start(), name)]
            if keys:
                found[os.path.relpath(path, project).replace(os.sep, '/')] = sorted(set(keys))
    return found


ap = argparse.ArgumentParser()
ap.add_argument('--final', required=True)
ap.add_argument('--poster', required=True)
ap.add_argument('--id', required=True)
ap.add_argument('--title', required=True)
ap.add_argument('--style', required=True, help='a label stored with the film; episodic-map for the films this skill makes')
ap.add_argument('--vault', default='.')
ap.add_argument('--credits', default='', help='music credits, if a licensed track was used')
ap.add_argument('--crf', default='26')
ap.add_argument('--max-mb', type=float, default=95, help='size cap for the library file (GitHub limit is 100 MB)')
ap.add_argument('--period', required=True, help='the month(s) the film reviews: 2026-10 or 2026-08..2026-09')
ap.add_argument('--length', required=True, choices=['short', 'medium', 'long'])
ap.add_argument('--topics-json', help='JSON file: [{"title": "...", "from": 12.0, "to": 190.5}, ...] (chapters, seconds)')
ap.add_argument('--not-taken', default='', help='comma-separated topics that were not taken into this film')
ap.add_argument('--request-id', default='', help='id of the pending request in meta.json "requests" that this film fulfils')
ap.add_argument('--project', help='the film\'s project folder, checked for unfilled markers (default: the folder of --final)')
a = ap.parse_args()

project = a.project or os.path.dirname(os.path.abspath(a.final))
if not os.path.isfile(os.path.join(project, 'scene.html')):
    print(f'note: no scene.html in {project}, so unfilled markers were not checked; use --project if the film was built elsewhere', file=sys.stderr)
unfilled = unfilled_markers(project)
if unfilled:
    print(f'delivery stopped: unfilled {{{{FILL:...}}}} markers in {project}', file=sys.stderr)
    for name, keys in sorted(unfilled.items()):
        print(f'  {name}: {", ".join(keys)}', file=sys.stderr)
    print('Fill them in and re-render; nothing was written to the library.', file=sys.stderr)
    sys.exit(2)

lib = os.path.join(a.vault, 'engram-quest', 'videos', 'episodic-recall')
os.makedirs(lib, exist_ok=True)
mp4 = os.path.join(lib, a.id + '.mp4')
settings_path = os.path.join(a.vault, 'engram-quest', 'videos', 'settings.json')
try:
    settings = json.load(open(settings_path, encoding='utf-8'))
except (OSError, ValueError):
    settings = {}
scale = ['-vf', 'scale=-2:720:flags=lanczos'] if settings.get('quality') == 'compact' else []
subprocess.run(['nice', '-n', '19', 'ffmpeg', '-v', 'error', '-y', '-i', a.final, *scale,
                '-c:v', 'libx264', '-preset', 'slow', '-crf', a.crf, '-maxrate', '1800k', '-bufsize', '3600k',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', mp4], check=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4],
                           capture_output=True, text=True, check=True).stdout.strip())
if os.path.getsize(mp4) > a.max_mb * 1e6:
    kbps = int(a.max_mb * 0.92 * 8e3 / dur) - 128          # video bitrate that leaves room for 128k audio
    print(f'{os.path.getsize(mp4) / 1e6:.1f} MB > {a.max_mb} MB: two-pass at {kbps} kbps')
    with tempfile.TemporaryDirectory() as td:
        log = os.path.join(td, 'x264')
        base = ['nice', '-n', '19', 'ffmpeg', '-v', 'error', '-y', '-i', a.final, *scale, '-c:v', 'libx264', '-preset', 'slow',
                '-b:v', f'{kbps}k', '-maxrate', '1800k', '-bufsize', '3600k', '-pix_fmt', 'yuv420p', '-passlogfile', log]
        subprocess.run(base + ['-pass', '1', '-an', '-f', 'null', os.devnull], check=True)
        subprocess.run(base + ['-pass', '2', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', mp4], check=True)
shutil.copyfile(a.poster, os.path.join(lib, a.id + '.jpg'))
meta_path = os.path.join(lib, 'meta.json')
meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {'videos': []}
items = meta['videos'] if isinstance(meta, dict) else meta
items[:] = [v for v in items if v.get('id') != a.id]
import datetime
entry = {'id': a.id, 'title': a.title, 'file': a.id + '.mp4', 'duration': round(dur), 'style': a.style,
         'mode': 'basic', 'source': 'skill', 'poster': a.id + '.jpg',
         'period': a.period, 'length': a.length,
         'createdAt': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}
if a.topics_json:
    entry['topics'] = json.load(open(a.topics_json, encoding='utf-8'))
nt = [x.strip() for x in a.not_taken.split(',') if x.strip()]
if nt:
    entry['notTaken'] = nt
if a.credits:
    entry['credits'] = a.credits
items.append(entry)
if isinstance(meta, dict):
    meta['kind'] = 'episodic'
    for r in meta.get('requests', []):
        if a.request_id and r.get('id') == a.request_id:
            r['status'] = 'done'; r['videoId'] = a.id; r['doneAt'] = entry['createdAt']
# Replace in one step: the plugin may read this file at any moment.
with open(meta_path + '.tmp', 'w', encoding='utf-8') as f:
    f.write(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
os.replace(meta_path + '.tmp', meta_path)
print(f'{mp4}  {os.path.getsize(mp4) / 1e6:.1f} MB  {dur:.1f} s')
