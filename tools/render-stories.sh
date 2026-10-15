#!/bin/bash
# Renders the 12 quiz Story cards (3 tiers x 4 groups, handoff A10) with headless Chrome.
# Needs Google Chrome and the site served at http://127.0.0.1:8137 (python3 -m http.server 8137).
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for t in Explorer Trailblazer Visionary; do for g in solo couple friends family; do
  out="share/$(echo $t | tr A-Z a-z)-$g.png"
  "$CHROME" --headless=new --hide-scrollbars --disable-gpu --virtual-time-budget=6000 --window-size=1080,1920 \
    --screenshot="$out" "http://127.0.0.1:8137/tools/story-card.html?tier=$t&group=$g" >/dev/null 2>&1
  echo "$out $(($(stat -f%z "$out") / 1024)) KB"
done; done
