#!/bin/bash
# Cloud render of a WHOLE lesson in ONE session (rule: one cloud session per lesson, never one per part).
# Runs inside the render session, from the repo root of a checkout that contains the lesson archive.
#   bash farm.sh <archive-dir> <project-id> <parts.json> [poster-seconds]
#     <archive-dir>/<project-id>/src/   the lesson's scene sources (written by bundle.py)
#     parts.json                        from plan.py: [{"part":"p01","from":"0.0000","to":"21.4333","gpu":true}, ...]
# Renders FARM_PAR parts at a time (default: number of cores), each in its own copy of the project
# (compose.py writes fixed temp names), then commits and pushes each finished part on its own, so the host
# can collect finished parts while the rest are still rendering. Finished parts are skipped on a re-run.
# Output: <archive-dir>/<project-id>/parts/<pNN>.mp4 (video only; the host joins them and adds narration) + poster.jpg
set -uo pipefail
ARCH=$(cd "$1" && pwd); ID=$2; PARTS=$3; POSTER=${4:-}
HERE="$(cd "$(dirname "$0")" && pwd)"; TOOLS="$(dirname "$HERE")/studio"
ST=${FARM_STUDIO:-/tmp/studio}
PAR=${FARM_PAR:-$(nproc)}
SRC="$ARCH/$ID/src"; OUT="$ARCH/$ID/parts"; mkdir -p "$OUT"
[ -d "$SRC" ] || { echo "no sources at $SRC"; exit 1; }
REPO="$(git -C "$ARCH" rev-parse --show-toplevel)"; LOCK=/tmp/farm-git.lock
mkdir -p "$ST/projects"
cp -r "$TOOLS"/render.cjs "$TOOLS"/compose.py "$TOOLS"/package.json "$TOOLS"/lib "$ST/"
[ -d "$ST/node_modules/three" ] || (cd "$ST" && npm install --no-audit --no-fund >/dev/null 2>&1) || { echo "npm install failed"; exit 1; }

push() {  # commit and push one file, serialized; retry on network errors
  # GitHub refuses files over 100 MB, and one refused commit blocks every later push: a part over 90 MB is split into
  # 45 MB byte chunks (pNN.mp4.part00, …) + .sha256; land.sh puts them back together with cat (the film is unchanged).
  ( flock 9
    F="$1"; ADD=("$F")
    if [ "$(stat -c %s "$F")" -gt $((90*1024*1024)) ]; then
      ( cd "$(dirname "$F")" && sha256sum "$(basename "$F")" > "$(basename "$F").sha256" \
        && split -b 45M -d -a 2 "$(basename "$F")" "$(basename "$F").part" ) || exit 1
      rm -f "$F"; ADD=("$F".part?? "$F.sha256")
    fi
    cd "$REPO" && git add "${ADD[@]}" && git commit -q -m "$2" || exit 0
    for w in 2 4 8 16 0; do git push -q -u origin HEAD && exit 0; [ $w -gt 0 ] && sleep $w; done
    echo "push failed: $1"; exit 1 ) 9>"$LOCK"
}
export -f push; export ID ST OUT SRC REPO LOCK PAR

one() {  # render one part in its own project copy
  P=$1; A=$2; B=$3; W="$ST/projects/${ID}__$P"
  { [ -s "$OUT/$P.mp4" ] || [ -s "$OUT/$P.mp4.part00" ]; } && { echo "skip $P (already rendered)"; return 0; }
  rm -rf "$W"; cp -r "$SRC" "$W"
  ( cd "$ST" && RENDER_SLOTS=$PAR python3 compose.py "projects/${ID}__$P" --from "$A" --to "$B" ) > "$ST/$ID-$P.log" 2>&1 \
    || { echo "FAILED $P (log: $ST/$ID-$P.log)"; return 1; }
  mv "$W/final_part.mp4" "$OUT/$P.mp4" && rm -rf "$W"
  push "$OUT/$P.mp4" "render: $ID $P"
  echo "done: $P"
}
export -f one

python3 -c "import json,sys;[print(p['part'],p['from'],p['to']) for p in json.load(open(sys.argv[1]))]" "$PARTS" \
  | xargs -P "$PAR" -L 1 bash -c 'one "$@"' _
FAIL=0
for P in $(python3 -c "import json,sys;print(' '.join(p['part'] for p in json.load(open(sys.argv[1]))))" "$PARTS"); do
  [ -s "$OUT/$P.mp4" ] || [ -s "$OUT/$P.mp4.part00" ] || { echo "missing $P"; FAIL=1; }
done

if [ -n "$POSTER" ]; then
  rm -rf "$ST/projects/$ID"; cp -r "$SRC" "$ST/projects/$ID"
  cd "$ST"
  SC=$(python3 -c "
import json;s=json.load(open('projects/$ID/segments.json'));p=float('$POSTER')
seg=[x for x in s if float(x['from'])<=p+1e-6][-1];print(seg['scene']+('|gpu' if seg.get('gpu') else ''))")
  PN=$(node -e "console.log(String(Number(process.argv[1])))" "$POSTER")
  if [[ $SC == *"|gpu" ]]; then RENDER_GPU=1 node render.cjs "projects/$ID" --scene "${SC%|gpu}" --stills "$PN" >/dev/null
  else node render.cjs "projects/$ID" --scene "$SC" --stills "$PN" >/dev/null; fi
  cp "projects/$ID/stills/t-$PN.jpg" "$OUT/poster.jpg" && push "$OUT/poster.jpg" "render: $ID poster"
fi
[ $FAIL = 0 ] && echo "ALL DONE: $ID" || { echo "INCOMPLETE: $ID (re-run the same command; finished parts are skipped)"; exit 1; }
