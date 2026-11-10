#!/usr/bin/env python3
"""Burn subtitles into a delivered film, for posting on social platforms (muted autoplay).
The library copy (deliver.py) never has burned-in subtitles; this writes a separate file next to it.

  python3 burnsubs.py <film.mp4> <film.vtt> <out.mp4> --lang zh|en [--fontsdir <dir>] [--size 50] [--margin 46] [--lufs -14]

Style: one white bold line (two at most) on a soft dark box, centred in the bottom 140 px band that every film
keeps free. Chinese uses "Noto Sans TC" Bold, English "Inter" Bold. libass needs a real TTF/OTF: the fontsource
packages in the studio are split into unicode-range subsets and do not work. Make a static bold Noto Sans TC once:
  curl -L -o NotoSansTC-VF.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"
  python3 -m fontTools.varLib.instancer NotoSansTC-VF.ttf wght=700 -o <fontsdir>/NotoSansTC-Bold.ttf --update-name-table
Video is re-encoded (libx264 crf 18, preset slow); audio is copied, or with --lufs re-normalised to that loudness
(social platforms such as Threads, Instagram and X do not normalise; the library copy is -16 LUFS, social copies -14)."""
import os, re, subprocess, sys, tempfile

args = sys.argv[1:]
if len(args) < 3:
    sys.exit(__doc__)
src, vtt, out = args[:3]
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)  # a new series has no social/ folder yet (ffmpeg exits 254 on a missing output dir)
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d
lang = opt('lang', 'zh')
fontsdir = opt('fontsdir')
font = "Noto Sans TC" if lang.startswith('zh') else "Inter"
size = int(opt('size', '50' if lang.startswith('zh') else '46'))
margin = int(opt('margin', '46'))
lufs = opt('lufs')


def ts(s):  # VTT "00:01:02.345" or "01:02.345" -> ASS "0:01:02.34"
    p = s.strip().split(':')
    h, m, sec = (int(p[0]), int(p[1]), float(p[2])) if len(p) == 3 else (0, int(p[0]), float(p[1]))
    cs = int(round(sec * 100))
    return f"{h}:{m:02d}:{cs // 100:02d}.{cs % 100:02d}"


cues, block = [], []
for line in open(vtt, encoding='utf-8').read().splitlines() + ['']:
    if line.strip():
        block.append(line)
        continue
    if block:
        for i, b in enumerate(block):
            if '-->' in b:
                a, z = [x.split()[0] for x in b.split('-->')]
                text = r'\N'.join(re.sub(r'<[^>]+>', '', t).strip() for t in block[i + 1:] if t.strip())
                if text:
                    cues.append((ts(a), ts(z), text.replace('{', '(').replace('}', ')')))
                break
    block = []
if not cues:
    sys.exit(f"no cues in {vtt}")

ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{font},{size},&H00FFFFFF,&H00FFFFFF,&H64141418,&H64141418,-1,0,0,0,100,100,{1 if lang.startswith('zh') else 0},0,3,14,0,2,220,220,{margin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + ''.join(f"Dialogue: 0,{a},{z},Sub,,0,0,0,,{t}\n" for a, z, t in cues)

with tempfile.NamedTemporaryFile('w', suffix='.ass', delete=False, encoding='utf-8') as f:
    f.write(ass)
    assp = f.name
esc = lambda p: p.replace('\\', '/').replace(':', r'\:').replace("'", r"\'")
vf = f"subtitles='{esc(assp)}'" + (f":fontsdir='{esc(fontsdir)}'" if fontsdir else '')
subprocess.run(["nice", "-n", "10", "ffmpeg", "-v", "error", "-y", "-i", src, "-vf", vf, "-c:v", "libx264", "-crf", "18",
                "-preset", "slow", "-pix_fmt", "yuv420p",
                *(["-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"] if lufs else ["-c:a", "copy"]),
                "-movflags", "+faststart", out], check=True)
os.remove(assp)
print(f"burned {len(cues)} cues ({font}) -> {out}")
