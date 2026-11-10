#!/usr/bin/env python3
"""Inline the mission house style into mission files, then check what the plugin's frame enforces silently.

Usage: python build_quest.py <mission.html> [more.html ...]

A mission marks where the shared files go with two comment lines:
    /*! quest-base.css */    first line inside <style>
    /*! quest-base.js */     first line inside <script>
Running this rewrites the mission in place, replacing each marker with the file's content between
"/*! name */" and "/*! end name */". Running it again refreshes that content, so a mission can be
rebuilt after the house style changes.
Exit code 1 when a mission cannot be built or would fail inside the frame; the problems are printed.
"""
import pathlib
import re
import sys

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"
PARTS = ["quest-base.css", "quest-base.js"]
LOCAL = r"(?!\s*[\"']?\s*(?:data:|#))"  # anything that is not a data: URI or an in-page reference
ATTR = r"\b[^>]*(?<![\w-])"             # inside a tag, up to an attribute that is not part of a longer name
GLOBAL = r"(?:(?<![\w.$])|(?<![\w$])(?:window|self|globalThis|top|parent)\.)"   # a bare call, or one on the window
# What fails inside the frame without an error: anything loaded from elsewhere (a network address or a
# file beside the mission), and the browser features a sandboxed frame does not have. The calls are
# matched as code is written, name then bracket, so the same words in a sentence pass. A clean build
# means none of these was recognised; it is not proof that the mission works.
SILENT = [
    (r"<script" + ATTR + r"src\s*=", "<script src> (scripts must be inline)"),
    (r"<link" + ATTR + r"href\s*=", "<link href> (styles and fonts must be inline)"),
    (r"<(?:img|video|audio|source|track|iframe|embed|input)" + ATTR + r"src\s*=" + LOCAL, "src that is not a data: URI"),
    (r"<(?:img|source)" + ATTR + r"srcset\s*=", "srcset"),
    (r"<video" + ATTR + r"poster\s*=" + LOCAL, "video poster that is not a data: URI"),
    (r"<object" + ATTR + r"data\s*=" + LOCAL, "<object data>"),
    (r"<(?:image|use)" + ATTR + r"(?:xlink:)?href\s*=" + LOCAL, "SVG image/use pointing outside the page"),
    (r"@import\b", "CSS @import"),
    (r"(?<![\w-])url\(" + LOCAL, "CSS url() that is not a data: URI"),
    (r"(?-i:" + GLOBAL + r"fetch\()|\bXMLHttpRequest\b", "network request from script"),
    (r"(?-i:" + GLOBAL + r"eval\(|\bnew\s+Function\s*\()", "eval() or new Function()"),
    (r"(?-i:\b(?:localStorage|sessionStorage|indexedDB)\b|\bdocument\.cookie\b)", "browser storage (the frame has none; touching it stops the script)"),
    (r"(?-i:" + GLOBAL + r"(?<!function\s)(?:alert|confirm|prompt)\()", "alert() / confirm() / prompt() (the frame shows no dialogs)"),
    (r"(?-i:" + GLOBAL + r"(?<!function\s)open\()|<a" + ATTR + r"href\s*=\s*[\"']?\s*(?:https?:)?//", "a link or window that leaves the mission (the frame cannot open one)"),
    (r"\d\s*(?:[dsl]?vh|vmin|vmax)\b", "a size in viewport units (the frame takes its height from the page, so the page must not take its height from the frame)"),
]


def inline(text, name):
    start, end = "/*! %s */" % name, "/*! end %s */" % name
    with open(ASSETS / name, encoding="utf-8", newline="") as f:
        body = f.read().replace("\r\n", "\n").strip()
    block = start + "\n" + body + "\n" + end
    if "\r\n" in text:  # keep the mission's own line endings
        block = block.replace("\n", "\r\n")
    if start in text and end in text[text.index(start):]:
        return re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: block, text, count=1, flags=re.S), True
    if start in text:
        return text.replace(start, block, 1), True
    return text, False


def problems(text):
    found = []
    own = text
    for name in PARTS:  # the shared files are trusted; only the mission's own markup is checked
        own = re.sub(re.escape("/*! %s */" % name) + r".*?" + re.escape("/*! end %s */" % name), "", own, flags=re.S)
    # Code shown to the learner inside <pre> or <code> is material, not something the page runs.
    own = re.sub(r"<(pre|code)\b.*?</\1>", "", own, flags=re.S | re.I)
    if not re.search(r"\bQZ\.verdict\s*\(", own):
        found.append("no way to finish: the mission never calls QZ.verdict(), so the plugin never gets a score")
    for pattern, label in SILENT:
        if re.search(pattern, own, flags=re.I):
            found.append(label)
    if not re.search(r"<title>\s*\S", text, flags=re.I):
        found.append("missing <title>")
    if not re.search(r"<meta\b[^>]*\bcharset\b", text, flags=re.I):
        found.append("missing <meta charset>")
    if not re.search(r"<meta\b[^>]*\bname\s*=\s*[\"']?viewport", text, flags=re.I):
        found.append("missing viewport meta")
    if not re.search(r"<html\b[^>]*\blang\s*=\s*[\"']?[a-z]", text, flags=re.I):
        found.append("<html> has no lang (the verdict's wording follows the mission's language)")
    if not re.search(r"<body\b[^>]*\bclass\s*=\s*[\"'][^\"']*(?<![\w-])qz(?![\w-])", text, flags=re.I):
        found.append('body is missing class "qz" (the house style depends on it)')
    # The shared script needs <body> to exist when it runs. Positions are compared in the whole file,
    # using the closing head tag, which neither shared file contains.
    marker, head_end = text.find("/*! quest-base.js */"), re.search(r"</head\s*>", text, flags=re.I)
    if marker != -1 and head_end and marker < head_end.start():
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
