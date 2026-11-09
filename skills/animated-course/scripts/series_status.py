#!/usr/bin/env python3
"""Read the plugin's video requests and report production progress back to it.

  python3 scripts/series_status.py list [--vault <vault root>]
      -> JSON array of the series waiting to be made, oldest first:
         [{"slug", "title", "request": {"text", "detail", "source", "refs", "createdAt"}, "cast"}]
  python3 scripts/series_status.py <slug> making|ready [--vault <vault root>]
  python3 scripts/series_status.py <slug> failed --error "<one line the learner can read>" [--vault <vault root>]

Only `status` and `error` are written, read-merge-write: the plugin owns `progress` and `starred`, deliver.py owns `videos`.
Vault: --vault, else $VAULT, else the first folder above the cwd or this file that has engram-quest/."""
import json, os, sys

args = sys.argv[1:]
opt = lambda k: args[args.index('--' + k) + 1] if '--' + k in args else None


def find_vault(d):
    d = os.path.abspath(d)
    for _ in range(12):
        if os.path.isdir(os.path.join(d, "engram-quest")): return d
        if os.path.dirname(d) == d: break
        d = os.path.dirname(d)
    return None


vault = opt('vault') or os.environ.get('VAULT') or find_vault(os.getcwd()) or find_vault(os.path.dirname(os.path.abspath(__file__)))
if not vault: sys.exit("vault not found: pass --vault <vault root>")
root = os.path.join(vault, "engram-quest", "videos")


def read(path):
    try:
        with open(path, encoding="utf-8") as f: return json.load(f)
    except (OSError, ValueError):
        return None


if not args: sys.exit(__doc__)
if args[0] == 'list':
    waiting = []
    for slug in (sorted(os.listdir(root)) if os.path.isdir(root) else []):
        meta = read(os.path.join(root, slug, "meta.json"))
        if isinstance(meta, dict) and meta.get("status") == "pending":
            waiting.append({"slug": slug, "title": meta.get("title", slug), "request": meta.get("request"), "cast": meta.get("cast")})
    waiting.sort(key=lambda s: ((s["request"] or {}).get("createdAt") or ""))
    print(json.dumps(waiting, ensure_ascii=False, indent=2))
    sys.exit(0)

if len(args) < 2 or args[1] not in ("making", "ready", "failed"): sys.exit(__doc__)
slug, status = args[0], args[1]
path = os.path.join(root, slug, "meta.json")
meta = read(path)
if not isinstance(meta, dict): sys.exit(f"no meta.json for series {slug}")
if status == "failed" and not opt('error'): sys.exit('failed needs --error "<one line the learner can read>"')
meta["status"] = status
if status == "failed": meta["error"] = opt('error')
else: meta.pop("error", None)
# Replace in one step: the plugin may read this file at any moment.
with open(path + ".tmp", "w", encoding="utf-8") as f: json.dump(meta, f, ensure_ascii=False, indent=2)
os.replace(path + ".tmp", path)
print(f"{slug}: {status}")
