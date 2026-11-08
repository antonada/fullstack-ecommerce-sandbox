#!/usr/bin/env bash
# Joins the videos from the demo run into docs/media/demo.mp4 and a lighter demo.gif for the README.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR=../docs/media
mkdir -p "$OUT_DIR"

# Clip order, matched against the test result folder names
ORDER=(
  "shows-the-user-name"
  "lands-in-the-history"
  "blocks-the-order"
  "login-with-a-message"
)

clips=()
for pattern in "${ORDER[@]}"; do
  file=$(find demo-results -path "*${pattern}*" -name '*.webm' | head -n 1)
  if [[ -z "$file" ]]; then
    echo "No video found for '${pattern}'. Run the demo tests first." >&2
    exit 1
  fi
  clips+=("$file")
done

inputs=()
filter=""
for i in "${!clips[@]}"; do
  inputs+=(-i "${clips[$i]}")
  # hold the last frame so each scene doesn't cut off
  filter+="[${i}:v]tpad=stop_mode=clone:stop_duration=1.2[c${i}];"
done
for i in "${!clips[@]}"; do filter+="[c${i}]"; done
filter+="concat=n=${#clips[@]}:v=1:a=0[v]"

ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$filter" -map "[v]" \
  -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p -movflags +faststart "$OUT_DIR/demo.mp4"

ffmpeg -y -loglevel error -i "$OUT_DIR/demo.mp4" \
  -vf "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
  -loop 0 "$OUT_DIR/demo.gif"

echo "Saved $OUT_DIR/demo.mp4 and $OUT_DIR/demo.gif"
