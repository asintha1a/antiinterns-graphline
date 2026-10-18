#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 tools/add-video-captions.py

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 25 -t 3.5 -i tools/.video-frames/01.png \
  -loop 1 -framerate 25 -t 3.5 -i tools/.video-frames/02.png \
  -loop 1 -framerate 25 -t 3.5 -i tools/.video-frames/03.png \
  -loop 1 -framerate 25 -t 3.5 -i tools/.video-frames/04.png \
  -filter_complex "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0,fps=25,format=yuv420p[out]" \
  -map '[out]' -an -c:v libx264 -preset veryfast -crf 24 -movflags +faststart \
  demo.mp4

echo "Wrote demo.mp4"
