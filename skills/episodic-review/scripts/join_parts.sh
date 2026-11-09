#!/bin/bash
# Join rendered parts and add the sound mix.
#   bash join_parts.sh <成片 folder with pNN.mp4> <narration.wav> <out final.mp4>
# Prints the joined length; check it against the film length (a missing part only shows up here).
set -euo pipefail
D=$(cd "$1" && pwd); WAV=$2; OUTF=$3
# Parts pushed as byte chunks (pNN.mp4.part00, …; see farm.sh) are put back together first.
for c in "$D"/p[0-9][0-9]*.mp4.part00; do
  [ -e "$c" ] || continue; f=${c%.part00}
  [ -s "$f" ] || cat "$f".part?? > "$f"
  [ -e "$f.sha256" ] && (cd "$D" && sha256sum -c --quiet "$(basename "$f").sha256")
done
# A part re-rendered as smaller sub-parts (p08a.mp4, p08b.mp4, …) is used when p08.mp4 itself is missing;
# names sort in film order (p07 < p08a < p08b < p09).
L=$(mktemp); for f in "$D"/p[0-9][0-9]*.mp4; do
  b=$(basename "$f" .mp4); [ ${#b} -gt 3 ] && [ -e "$D/${b:0:3}.mp4" ] && continue
  echo "file '$f'" >> "$L"; done
ffmpeg -v error -y -f concat -safe 0 -i "$L" -i "$WAV" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUTF"
rm -f "$L"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTF"
