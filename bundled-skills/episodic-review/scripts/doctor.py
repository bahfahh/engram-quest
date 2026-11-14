#!/usr/bin/env python3
"""Check that this machine can make films, and say how to fix what is missing.

  python3 scripts/doctor.py [--studio <studio folder>] [--vault <vault root>] [--keys]

Exit code 0: everything required is present. 1: something required is missing.
Optional items only limit extras (speech recognition checks).
It also warns about anything shaped like an API key or token in the user's custom area, engram-quest/custom/
(keys belong in environment variables only). --keys runs only that scan: exit code 1 when it finds one, 2 when
no vault was found to scan."""
import importlib.util, os, re, shutil, subprocess, sys

args = sys.argv[1:]
studio = args[args.index('--studio') + 1] if '--studio' in args else os.getcwd()
PY_FIX = "pip install {}"
KEYS_ONLY = '--keys' in args


# Keys never belong in a file: the vault is often synced to git or a cloud drive. This scans the user's custom area
# (engram-quest/custom/) for strings shaped like keys and names the file and line, never the value.
KEY_SHAPES = [
    re.compile(r"\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[abprs]-[A-Za-z0-9-]{10,})"),
    # a value given to anything named like a key (AZURE_SPEECH_KEY=, "api_key": , token: ...); a real key has a digit
    re.compile(r"(?i)(?<![a-z])(?:key|secret|token|password|passwd|credential)s?[\"']?\s*[:=]\s*[\"']?(?=[A-Za-z0-9_\-./+=]*\d)[A-Za-z0-9_\-./+=]{16,}"),
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9_\-.=]{20,}"),
]


def find_vault():
    if '--vault' in args: return args[args.index('--vault') + 1]
    if os.environ.get('VAULT'): return os.environ['VAULT']
    for start in (os.getcwd(), os.path.dirname(os.path.abspath(__file__))):
        d = start
        for _ in range(12):
            if os.path.isdir(os.path.join(d, 'engram-quest')): return d
            if os.path.dirname(d) == d: break
            d = os.path.dirname(d)
    return None


def key_findings(vault):
    found = []
    for folder, _, files in os.walk(os.path.join(vault, 'engram-quest', 'custom')):
        for name in sorted(files):
            p = os.path.join(folder, name)
            try:
                if os.path.getsize(p) > 2_000_000: continue
                with open(p, encoding='utf-8') as f: lines = f.read().splitlines()
            except (OSError, UnicodeDecodeError):
                continue  # music, images: not text
            found += [f"{os.path.relpath(p, vault)}:{n}" for n, line in enumerate(lines, 1) if any(s.search(line) for s in KEY_SHAPES)]
    return found


vault = find_vault()
keys = key_findings(vault) if vault else []
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(errors='replace')  # a file name the console cannot show
for where in keys:
    print(f"WARNING  something shaped like a key in {where}  ->  delete it from the file and set it as an environment variable")
if KEYS_ONLY:
    if not vault:
        print("no vault found (no engram-quest/ above this folder): nothing scanned; pass --vault <vault root>")
        sys.exit(2)
    sys.exit(1 if keys else 0)


def tool(name, fix):
    return (name, shutil.which(name) is not None, fix, True)


def package(module, pip, required=True):
    return (f"python: {pip}", importlib.util.find_spec(module) is not None, PY_FIX.format(pip), required)


def chromium():
    node = shutil.which("node")
    fix = "cd <studio> && npm install playwright && npx playwright install chromium"
    if not node: return ("Playwright Chromium", False, fix, True)
    env = dict(os.environ)
    npm = shutil.which("npm")
    if npm:
        root = subprocess.run([npm, "root", "-g"], capture_output=True, text=True).stdout.strip()
        env["NODE_PATH"] = os.pathsep.join(p for p in (root, env.get("NODE_PATH")) if p)
    code = "const fs=require('fs');const {chromium}=require('playwright');process.exit(fs.existsSync(chromium.executablePath())?0:1)"
    ok = subprocess.run([node, "-e", code], cwd=studio if os.path.isdir(studio) else None, env=env, capture_output=True).returncode == 0
    return ("Playwright Chromium", ok, fix, True)


checks = [
    tool("node", "install Node.js 18 or newer: https://nodejs.org"),
    tool("npm", "comes with Node.js"),
    tool("ffmpeg", "install ffmpeg: https://ffmpeg.org/download.html"),
    tool("ffprobe", "comes with ffmpeg"),
    package("edge_tts", "edge-tts"),
    package("numpy", "numpy"),
    package("scipy", "scipy"),
    package("PIL", "pillow"),
    chromium(),
    package("faster_whisper", "faster-whisper", required=False),
    package("opencc", "opencc-python-reimplemented", required=False),
    package("pypinyin", "pypinyin", required=False),
]
missing = False
for name, ok, fix, required in checks:
    print(f"{'ok' if ok else ('MISSING' if required else 'optional')}  {name}" + ("" if ok else f"  ->  {fix}"))
    missing = missing or (required and not ok)
sys.exit(1 if missing else 0)
