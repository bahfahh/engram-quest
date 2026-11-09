#!/usr/bin/env python3
"""Copy a ready project's scene sources from the studio into the lesson archive (the render session renders
from there, and it is the permanent record of how the film was made).
Usage: STUDIO=<studio> python3 bundle.py <archive-dir> <project-id> ...
  -> <archive-dir>/<id>/src/      html, js, css, json, used images and fonts (no renders, no stills)
  -> <archive-dir>/<id>/*.md      UNDERSTANDING, CARD, SCRIPT, NOTES, SILENT (moved up next to src/)"""
import os, shutil, sys
STUDIO = os.environ.get("STUDIO", "/tmp/studio")
TEXT = {".html", ".js", ".mjs", ".css", ".json", ".md", ".svg"}
SKIP_DIRS = {"stills", "stills_old", "__pycache__", "asrclip", "_asr", "tools", "node_modules", "_parts"}
DOCS = ["UNDERSTANDING.md", "CARD.md", "SCRIPT.md", "FACTS.md", "NOTES.md", "SILENT.md"]

def walk(src):
    for root, dirs, files in os.walk(src):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS and not x.startswith("stills")]
        for f in files:
            yield root, f

def project(arch, pid):
    src = os.path.join(STUDIO, "projects", pid); out = os.path.join(arch, pid, "src")
    if os.path.exists(out): shutil.rmtree(out)
    os.makedirs(out)
    texts = [os.path.join(r, f) for r, f in walk(src)
             if os.path.splitext(f)[1].lower() in TEXT and not f.startswith(("asr", "preview", "final"))]
    blob = "".join(open(p, encoding="utf-8", errors="ignore").read() for p in texts if p.endswith((".html", ".js", ".mjs", ".css", ".json")))
    for root, f in walk(src):
        p = os.path.join(root, f); rel = os.path.relpath(p, src); ext = os.path.splitext(f)[1].lower()
        keep = p in texts or (ext in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff2", ".ttf", ".wav"} and (f in blob or rel.split(os.sep)[0] in ("img", "assets", "sfx")))
        if keep:
            os.makedirs(os.path.dirname(os.path.join(out, rel)), exist_ok=True); shutil.copy(p, os.path.join(out, rel))
    for f in DOCS:
        if os.path.exists(os.path.join(out, f)): shutil.move(os.path.join(out, f), os.path.join(arch, pid, f))
    print(pid, sum(len(fs) for _, _, fs in os.walk(out)), "files ->", out)

if __name__ == "__main__":
    arch = sys.argv[1]
    for a in sys.argv[2:]: project(arch, a)
