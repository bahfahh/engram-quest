#!/bin/bash
# Host side: fetch the parts a lesson's render session pushed, and join them into $STUDIO/projects/<id>/final.mp4.
#   STUDIO=<studio> bash land.sh <archive-dir> <project-id> <parts.json> <render-branch>
# Run from inside the repo checkout. Prints which parts are still missing (exit 2) — run again later.
set -e
ARCH=$1; ID=$2; PARTS_JSON=$3; BR=$4
S=${STUDIO:-/tmp/studio}
P="$S/projects/$ID"; mkdir -p "$P/_parts"
REPO=$(git -C "$ARCH" rev-parse --show-toplevel)
D=$(realpath --relative-to="$REPO" "$ARCH")/$ID/parts
PARTS=$(python3 -c "import json,sys;print(' '.join(p['part'] for p in json.load(open(sys.argv[1]))))" "$PARTS_JSON")
cd "$REPO"
for i in 1 2 3 4; do git fetch -q origin "$BR" && break; sleep $((2**i)); done
MISSING=""
for part in $PARTS; do
  [ -s "$P/_parts/$part.mp4" ] && continue
  if git cat-file -e "FETCH_HEAD:$D/$part.mp4" 2>/dev/null; then git show "FETCH_HEAD:$D/$part.mp4" > "$P/_parts/$part.mp4"
  elif git cat-file -e "FETCH_HEAD:$D/$part.mp4.part00" 2>/dev/null; then  # pushed as 45 MB chunks (farm.sh push)
    git -c core.quotepath=off ls-tree --name-only FETCH_HEAD "$D/" | grep "/$part\.mp4\.part[0-9][0-9]\$" | sort | while IFS= read -r c; do git show "FETCH_HEAD:$c"; done > "$P/_parts/$part.mp4"
  else MISSING="$MISSING $part"; fi
done
git cat-file -e "FETCH_HEAD:$D/poster.jpg" 2>/dev/null && git show "FETCH_HEAD:$D/poster.jpg" > "$P/poster.jpg"
[ -n "$MISSING" ] && { echo "missing:$MISSING"; exit 2; }
( for part in $PARTS; do echo "file '_parts/$part.mp4'"; done ) > "$P/_parts.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$P/_parts.txt" -c copy -movflags +faststart "$P/final.mp4"
echo "joined: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$P/final.mp4")s video vs timeline $(python3 -c "import json;print(json.load(open('$P/timeline.json'))['duration'])")s"
