#!/bin/bash
# Renders the static share images with headless Chrome at exact pixel size, then
# palette-compresses them with Pillow. Needs: Google Chrome, python3 + Pillow,
# and the site served at http://localhost:3000 (python3 -m http.server 3000).
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot(){ # url out w h
  local prof; prof=$(mktemp -d); rm -f "$2"
  "$CHROME" --headless=new --hide-scrollbars --no-first-run --user-data-dir="$prof" --virtual-time-budget=5000 \
    --window-size="$3,$4" --screenshot="$2" "$1" >/dev/null 2>&1 &
  local pid=$!; for _ in $(seq 60); do [ -s "$2" ] && break; sleep 0.5; done
  sleep 0.5; kill $pid 2>/dev/null || true; pkill -f "$prof" 2>/dev/null || true; sleep 0.3; rm -rf "$prof" 2>/dev/null || true
}
for t in Explorer Trailblazer Visionary; do   # the three types the quiz produces (TYPE_BY_STYLE)
  shot "http://localhost:3000/tools/share-card.html?type=$t" "share/$(echo $t | tr A-Z a-z).png" 1080 1920
done
shot "http://localhost:3000/tools/og.html" og.png 1200 630
python3 - <<'PY'
from PIL import Image
import glob, os
for f in glob.glob('share/*.png') + ['og.png']:
    if not os.path.exists(f): continue
    Image.open(f).convert('RGB').quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(f, optimize=True)
    print(f, Image.open(f).size, os.path.getsize(f) // 1024, 'KB')
PY
