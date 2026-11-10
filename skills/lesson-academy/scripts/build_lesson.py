#!/usr/bin/env python3
"""Inline the lesson house style into lesson files, then check the rules Obsidian enforces silently.

Usage: python build_lesson.py <lesson.html> [more.html ...]

A lesson marks where the shared files go with two comment lines:
    /*! lesson-base.css */    first line inside <style>
    /*! lesson-base.js */     first line inside <script>
Running this rewrites the lesson in place, replacing each marker with the file's content between
"/*! name */" and "/*! end name */". Running it again refreshes that content, so a lesson can be
rebuilt after the house style changes.
Exit code 1 when a lesson cannot be built or breaks a rule; the problems are printed.
"""
import pathlib
import re
import sys

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"
PARTS = ["lesson-base.css", "lesson-base.js"]
LOCAL = r"(?!\s*[\"']?\s*(?:data:|#))"  # anything that is not a data: URI or an in-page reference
# Everything the page would load from somewhere else. Obsidian drops these without an error, whether
# the address is on the network or a file beside the lesson.
LOADS = [
    (r"<script\b[^>]*\bsrc\s*=", "<script src> (scripts must be inline)"),
    (r"<link\b[^>]*\bhref\s*=", "<link href> (styles and fonts must be inline)"),
    (r"<(?:img|video|audio|source|track|iframe|embed|input)\b[^>]*\bsrc\s*=" + LOCAL, "src that is not a data: URI"),
    (r"<(?:img|source)\b[^>]*\bsrcset\s*=", "srcset"),
    (r"<video\b[^>]*\bposter\s*=" + LOCAL, "video poster that is not a data: URI"),
    (r"<object\b[^>]*\bdata\s*=" + LOCAL, "<object data>"),
    (r"<(?:image|use)\b[^>]*\b(?:xlink:)?href\s*=" + LOCAL, "SVG image/use pointing outside the page"),
    (r"@import\b", "CSS @import"),
    (r"url\(" + LOCAL, "CSS url() that is not a data: URI"),
    (r"\bfetch\s*\(|\bXMLHttpRequest\b", "network request from script"),
    (r"\beval\s*\(|\bnew\s+Function\s*\(", "eval() or new Function()"),
]


def inline(text, name):
    start, end = "/*! %s */" % name, "/*! end %s */" % name
    with open(ASSETS / name, encoding="utf-8", newline="") as f:
        body = f.read().replace("\r\n", "\n").strip()
    block = start + "\n" + body + "\n" + end
    if "\r\n" in text:  # keep the lesson's own line endings
        block = block.replace("\n", "\r\n")
    if start in text and end in text:
        return re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: block, text, count=1, flags=re.S), True
    if start in text:
        return text.replace(start, block, 1), True
    return text, False


def problems(text):
    found = []
    own = text
    for name in PARTS:  # the shared files are trusted; only the lesson's own markup is checked
        own = re.sub(re.escape("/*! %s */" % name) + r".*?" + re.escape("/*! end %s */" % name), "", own, flags=re.S)
    # Code shown to the learner is content, not something the page runs.
    own = re.sub(r"<(pre|code)\b.*?</\1>", "", own, flags=re.S | re.I)
    for pattern, label in LOADS:
        if re.search(pattern, own, flags=re.I):
            found.append(label)
    if not re.search(r"<title>\s*\S", text, flags=re.I):
        found.append("missing <title>")
    if not re.search(r"<meta\b[^>]*\bcharset\b", text, flags=re.I):
        found.append("missing <meta charset>")
    if not re.search(r"<meta\b[^>]*\bname\s*=\s*[\"']?viewport", text, flags=re.I):
        found.append("missing viewport meta")
    if not re.search(r"<body\b[^>]*\bclass\s*=\s*[\"'][^\"']*(?<![\w-])lz(?![\w-])", text, flags=re.I):
        found.append('body is missing class "lz" (the house style and the phone layout depend on it)')
    head = re.split(r"<body\b", text, maxsplit=1, flags=re.I)[0]
    if "/*! lesson-base.js */" in head:
        found.append("the script block is in <head>; it must be the last thing in <body>")
    return found


def build(path):
    try:
        with open(path, encoding="utf-8", newline="") as f:
            text = f.read()
    except OSError as err:
        return ["cannot read (%s)" % err.strerror], 0
    issues = []
    for name in PARTS:
        try:
            text, ok = inline(text, name)
        except OSError as err:
            return ["cannot read the shared file %s (%s)" % (name, err.strerror)], 0
        if not ok:
            issues.append("marker /*! %s */ not found" % name)
    if not issues:  # write only a complete build
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    return issues + problems(text), len(text.encode("utf-8")) // 1024


def main(paths):
    failed = False
    for p in map(pathlib.Path, paths):
        issues, size = build(p)
        failed = failed or bool(issues)
        print("%s: %s" % (p.name, "%d KB, ok" % size if not issues else "; ".join(issues)))
    return 1 if failed else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
