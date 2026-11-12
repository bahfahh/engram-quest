#!/usr/bin/env python3
"""Key stills for review: each time rendered with and without text, numbered names (blind picture test),
plus a side-by-side sheet against the approved reference looks.

  python3 keystills.py --studio $STUDIO --project projects/<id> --times 12,40,90.2 [--labels "全貌,時刻表,第1站"] \
      [--gpu] [--style rooms|rewind|board] [--scene scene.html]
Output in <project>/stills/key/:
  text/k01.jpg …   notext/k01.jpg …   (same number = same moment; notext is what the picture tester gets)
  index.json       number -> time and label (for the host only; do not give it to the picture tester)
  compare.jpg      left: the style's reference looks (assets/looks/<style>-*.jpg), right: these stills (with text)
The scene must hide its text layer when the URL has ?notext=1.
"""
import argparse, glob, json, os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)

ap = argparse.ArgumentParser()
ap.add_argument('--studio', required=True)
ap.add_argument('--project', required=True, help='path relative to the studio, e.g. projects/ep-sep')
ap.add_argument('--times', required=True)
ap.add_argument('--labels', default='')
ap.add_argument('--scene', default='scene.html')
ap.add_argument('--gpu', action='store_true')
ap.add_argument('--style', default='')
a = ap.parse_args()

times = [t.strip() for t in a.times.split(',') if t.strip()]
labels = [l.strip() for l in a.labels.split(',')] if a.labels else [''] * len(times)
proj = os.path.join(a.studio, a.project)
key = os.path.join(proj, 'stills', 'key')
for sub in ('text', 'notext'):
    os.makedirs(os.path.join(key, sub), exist_ok=True)
env = dict(os.environ, **({'RENDER_GPU': '1'} if a.gpu else {}))

def render(scene, sub):
    # render.cjs names stills t-<Number(time)>.jpg (14.0 -> t-14.jpg); render into a scratch folder, then rename
    subprocess.run(['node', 'render.cjs', a.project, '--scene', scene, '--stills', ','.join(times)],
                   cwd=a.studio, env=env, check=True, stdout=subprocess.DEVNULL)
    for i, t in enumerate(times, 1):
        src = os.path.join(proj, 'stills', f't-{float(t):g}.jpg')
        shutil.move(src, os.path.join(key, sub, f'k{i:02d}.jpg'))

sep = '&' if '?' in a.scene else '?'
render(a.scene, 'text')
render(a.scene + sep + 'notext=1', 'notext')
json.dump([{'n': f'k{i:02d}', 'time': float(t), 'label': labels[i - 1] if i - 1 < len(labels) else ''}
           for i, t in enumerate(times, 1)], open(os.path.join(key, 'index.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

if a.style:
    from PIL import Image
    refs = sorted(glob.glob(os.path.join(SKILL, 'assets', 'looks', f'{a.style}-*.jpg')))
    mine = [os.path.join(key, 'text', f'k{i:02d}.jpg') for i in range(1, len(times) + 1)]
    rows = max(len(refs), len(mine))
    W, H = 960, 540
    sheet = Image.new('RGB', (W * 2 + 20, rows * (H + 10)), (24, 24, 28))
    for col, files in ((0, refs), (1, mine)):
        for r, f in enumerate(files):
            im = Image.open(f).convert('RGB')
            im.thumbnail((W, H))
            sheet.paste(im, (col * (W + 20), r * (H + 10)))
    sheet.save(os.path.join(key, 'compare.jpg'), quality=85)
print(f'{len(times)} stills x2 -> {key}')
