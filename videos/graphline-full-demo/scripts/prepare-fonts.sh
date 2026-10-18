#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p assets
if [ -f '/System/Library/Fonts/Supplemental/Arial.ttf' ] && [ -f '/System/Library/Fonts/Supplemental/Arial Bold.ttf' ]; then
  cp '/System/Library/Fonts/Supplemental/Arial.ttf' assets/Arial.ttf
  cp '/System/Library/Fonts/Supplemental/Arial Bold.ttf' assets/Arial-Bold.ttf
  echo 'Prepared installed system fonts locally.'
else
  # Arimo is a metrically compatible open font. Keep its license next to it.
  curl -fL 'https://raw.githubusercontent.com/google/fonts/main/ofl/arimo/Arimo%5Bwght%5D.ttf' -o assets/Arial.ttf
  cp assets/Arial.ttf assets/Arial-Bold.ttf
  curl -fL 'https://raw.githubusercontent.com/google/fonts/main/ofl/arimo/OFL.txt' -o assets/Arimo-OFL.txt
  echo 'Prepared open Arimo font alternative. Typography may vary slightly.'
fi
