#!/usr/bin/env python3
"""Check that this machine can make films, and say how to fix what is missing.

  python3 scripts/doctor.py [--studio <studio folder>]

Exit code 0: everything required is present. 1: something required is missing.
Optional items only limit extras (speech recognition checks)."""
import importlib.util, os, shutil, subprocess, sys

args = sys.argv[1:]
studio = args[args.index('--studio') + 1] if '--studio' in args else os.getcwd()
PY_FIX = "pip install {}"


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
