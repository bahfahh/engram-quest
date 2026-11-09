#!/bin/sh
# 重新產生 demo/ 裡的試聽：每個 mood 一段 60–75 秒，warm / curious 各多一個 seed，另外加主題段（bed）、回想（dissolve）、揭曉一聲（chime）。
# 用法：sh make_demos.sh        （全部 nice -n 10，背景算圖不受影響）
set -e
cd "$(dirname "$0")"
mkdir -p demo/wav
g() { name=$1; shift; nice -n 10 python3 -I music_gen.py "$@" --out demo/wav/$name.wav; \
      nice -n 10 ffmpeg -v error -y -i demo/wav/$name.wav -c:a libmp3lame -b:a 192k demo/$name.mp3; }
g 01_warm_s11          --mood warm       --seed 11 --dur 70
g 02_warm_s23          --mood warm       --seed 23 --dur 70
g 03_curious_s11       --mood curious    --seed 11 --dur 70
g 04_curious_s23       --mood curious    --seed 23 --dur 70
g 05_reflective_s11    --mood reflective --seed 11 --dur 72
g 06_bright_s11        --mood bright     --seed 11 --dur 66
g 07_thinking_s11      --mood thinking   --seed 11 --dur 60
g 08_recall_dissolve_s12 --mood thinking --seed 12 --dur 8
g 09_topic_bed_warm_s31  --mood warm     --seed 31 --dur 35 --density bed
g 10_topic_bed_curious_s31 --mood curious --seed 31 --dur 35 --density bed
g 11_topic_bed_reflective_s31 --mood reflective --seed 31 --dur 35 --density bed
g 12_reveal_chime_s11  --mood chime      --seed 11 --key Eb
nice -n 10 python3 -I qa_music.py demo/wav/*.wav
mv demo/wav/*.png demo/ 2>/dev/null || true
mv demo/wav/qa_report.md demo/wav/qa_report.json demo/
# 整支片範例（examples/cues_rooms.json，約 6 分鐘、29 段）：每段 wav ＋ score.wav ＋ cues.json；不寫 used.json
nice -n 10 python3 -I pick_music.py --cues examples/cues_rooms.json --render demo/film_example_rooms --deterministic --dry-run > /dev/null
nice -n 10 ffmpeg -v error -y -i demo/film_example_rooms/score.wav -c:a libmp3lame -b:a 192k demo/13_film_example_rooms_score.mp3
nice -n 10 python3 -I qa_music.py demo/film_example_rooms/score.wav demo/film_example_rooms/[0-2]*.wav
