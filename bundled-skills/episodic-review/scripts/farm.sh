#!/bin/bash
# Render a whole film in ONE cloud session, several parts at a time; each finished part is committed and pushed
# on its own so the host can collect parts while the rest are still rendering.
#   [FARM_WIDTH=1280] bash farm.sh <project-dir-in-repo> <parts.json> [fps]     (FARM_WIDTH: draft size for the short length tier)
# <project-dir-in-repo>: the film's files committed in the repo (scene.html, *.js, assets…), e.g. 研究/…/各片/ep-aug/製作檔
# Output: <project-dir>/../成片/pNN.mp4 (video only; the host joins the parts and adds the sound mix).
set -uo pipefail
PROJ=$(cd "$1" && pwd); PARTS=$(cd "$(dirname "$2")" && pwd)/$(basename "$2"); FPS=${3:-24}
HERE="$(cd "$(dirname "$0")" && pwd)"
ST=${FARM_STUDIO:-/tmp/studio}; PAR=${FARM_PAR:-$(nproc)}
OUT="$(dirname "$PROJ")/成片"; mkdir -p "$OUT"
REPO="$(git -C "$PROJ" rev-parse --show-toplevel)"; LOCK=/tmp/farm-git.lock
mkdir -p $ST/projects && cp -r "$HERE"/studio/. $ST/
[ -d $ST/node_modules/three ] || (cd $ST && npm install --no-audit --no-fund >/dev/null 2>&1) || { echo "npm install failed"; exit 1; }
node -e "require('playwright')" 2>/dev/null || (cd $ST && npm install --no-audit --no-fund playwright >/dev/null 2>&1)

push() {  # serialized commit + push of one part, retry on network errors
  # GitHub refuses files over 100 MB, and one refused commit blocks every later push.
  # Parts over 90 MB are split into 45 MB byte chunks (pNN.mp4.part00, …) plus a .sha256;
  # join_parts.sh puts them back together with cat, so the film is unchanged.
  ( flock 9
    cd "$REPO" || exit 1
    F="$1"; ADD=("$F")
    if [ "$(stat -c %s "$F")" -gt $((90*1024*1024)) ]; then
      ( cd "$(dirname "$F")" && sha256sum "$(basename "$F")" > "$(basename "$F").sha256" \
        && split -b 45M -d -a 2 "$(basename "$F")" "$(basename "$F").part" ) || exit 1
      rm -f "$F"; ADD=("$F".part?? "$F.sha256")
    fi
    git add "${ADD[@]}" && git commit -q -m "$2" || exit 1
    for w in 2 4 8 16 0; do git push -q -u origin HEAD && { touch "$ST/.pushed_$(basename "${F%.mp4}")"; exit 0; }; [ $w -gt 0 ] && sleep $w; done
    echo "push failed: $F (fix it, then re-run; the unpushed commit is still local)"; exit 1 ) 9>$LOCK
}
have() { [ -s "$OUT/$1.mp4" ] || [ -s "$OUT/$1.mp4.part00" ]; }
one() {
  P=$1; A=$2; B=$3; W=$ST/projects/part__$P
  have $P && { echo "skip $P"; return 0; }
  rm -rf "$W"; cp -r "$PROJ" "$W"
  ( cd $ST && RENDER_GPU=1 RENDER_SLOTS=$PAR node render.cjs projects/part__$P --from $A --to $B --fps $FPS --noaudio ${FARM_WIDTH:+--width $FARM_WIDTH} --out part.mp4 ) \
    > $ST/$P.log 2>&1 || { echo "FAILED $P (log: $ST/$P.log)"; return 1; }
  mv "$W/part.mp4" "$OUT/$P.mp4" && rm -rf "$W"
  push "$OUT/$P.mp4" "render: $(basename "$(dirname "$PROJ")") $P" || { echo "PUSH FAILED $P"; return 1; }
  echo "done $P"
}
export -f one push have; export ST OUT PROJ REPO LOCK PAR FPS FARM_WIDTH
python3 -c "import json,sys;[print(p['part'],p['from'],p['to']) for p in json.load(open(sys.argv[1]))]" "$PARTS" \
  | xargs -P "$PAR" -L 1 bash -c 'one "$@"' _
FAIL=0
for P in $(python3 -c "import json,sys;print(' '.join(p['part'] for p in json.load(open(sys.argv[1]))))" "$PARTS"); do
  have $P || { echo "missing $P"; FAIL=1; continue; }
  [ -e "$ST/.pushed_$P" ] || git -C "$REPO" log -1 --format=%h "@{u}" -- "$OUT/$P.mp4" "$OUT/$P.mp4.part00" 2>/dev/null | grep -q . \
    || { echo "not pushed $P"; FAIL=1; }
done
[ $FAIL = 0 ] && echo "ALL DONE" || { echo "INCOMPLETE (re-run the same command; finished parts are skipped)"; exit 1; }
