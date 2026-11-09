#!/bin/bash
# Local render of ONE lesson in parallel parts, without a cloud session (used for experiment 17, 2026-11-06):
# plan.py (GPU parts <= 22 s, DOM parts <= 70 s) -> compose.py per part, PAR at a time, each in its own project copy
# -> join into projects/<id>/final.mp4 (video only; deliver.py adds the narration and takes the poster from READY).
#   bash scripts/farm/localfarm.sh <project-id> [par=4]
# Finished parts are kept in projects/<id>/_parts/ and skipped on a re-run: to redo a part after a fix, delete its .mp4.
# A ~4.5 min lesson took about 75 min on a 4-core cloud container. Then run joincheck.py on projects/<id>/_parts.json.
set -uo pipefail
ID=$1; PAR=${2:-4}
SKILL="$(cd "$(dirname "$0")/../.." && pwd)"
ST=$SKILL/scripts/studio
P=$ST/projects/$ID
mkdir -p "$P/_parts"
STUDIO=$ST python3 $SKILL/scripts/farm/plan.py "$ID" 0 22 70 > "$P/_parts.json" || exit 1
echo "parts: $(python3 -c "import json;print(len(json.load(open('$P/_parts.json'))))")"
one() {
  part=$1; a=$2; b=$3
  [ -s "$P/_parts/$part.mp4" ] && { echo "skip $part"; return 0; }
  W="$ST/projects/${ID}__$part"; rm -rf "$W"; mkdir -p "$W"
  # copy the project without its outputs
  (cd "$P" && tar cf - --exclude=_parts --exclude=stills --exclude='*.mp4' --exclude='preview*' . ) | (cd "$W" && tar xf -)
  ( cd "$ST" && RENDER_SLOTS=$PAR python3 compose.py "projects/${ID}__$part" --from "$a" --to "$b" ) > "$ST/projects/$ID-$part.log" 2>&1 \
    || { echo "FAILED $part (log projects/$ID-$part.log)"; return 1; }
  mv "$W/final_part.mp4" "$P/_parts/$part.mp4" && rm -rf "$W"
  echo "done $part $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$P/_parts/$part.mp4")s"
}
export -f one; export ID P ST PAR
python3 -c "import json;[print(p['part'],p['from'],p['to']) for p in json.load(open('$P/_parts.json'))]" | xargs -P "$PAR" -n 3 bash -c 'one "$@"' _
MISSING=$(python3 -c "import json,os;print(' '.join(p['part'] for p in json.load(open('$P/_parts.json')) if not (os.path.exists('$P/_parts/'+p['part']+'.mp4') and os.path.getsize('$P/_parts/'+p['part']+'.mp4')>0)))")
[ -n "$MISSING" ] && { echo "missing: $MISSING"; exit 2; }
python3 -c "import json;[print(\"file '_parts/%s.mp4'\" % p['part']) for p in json.load(open('$P/_parts.json'))]" > "$P/_parts.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$P/_parts.txt" -c copy -movflags +faststart "$P/final.mp4"
echo "joined: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$P/final.mp4")s vs timeline $(python3 -c "import json;print(json.load(open('$P/timeline.json'))['duration'])")s"
