#!/bin/sh
# Jämför två bildrutor (PNG) och skriver PSNR – används för att kontrollera klipp mellan scener.
# Användning: FFMPEG=/sökväg tools/reel-diff.sh a.png b.png   (PSNR > 45 dB ≈ omärkbart, inf = identiska)
FF="${FFMPEG:-ffmpeg}"
"$FF" -hide_banner -loglevel info -i "$1" -i "$2" -filter_complex "[0:v][1:v]psnr" -f null - 2>&1 | grep -o "average:[^ ]*" | head -1
