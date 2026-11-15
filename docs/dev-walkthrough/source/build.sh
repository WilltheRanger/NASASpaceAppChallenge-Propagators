#!/usr/bin/env bash
# AI-generated (Claude Code) for Team Propagators' developer walkthrough video; see ../README.md (AI disclosure).
#
# Rebuilds ../propagators-dev-walkthrough.mp4 and ../captions.srt from script.json (narration) and scenes.js (visuals).
# Needs Python 3.10+, Node 18+, ffmpeg and about 2 GB of free disk. The first run downloads Kokoro-82M (~330 MB)
# and faster-whisper small.en (~250 MB) from Hugging Face, the npm packages, and Chromium for Playwright.
#
#   ./build.sh [repo_root]           repo_root must contain data/mock/ (default: ../../.., the repo root)
#   ./build.sh [repo_root] encode    re-encode only, from an existing frames/ and build/
set -euo pipefail
cd "$(dirname "$0")"
REPO="${1:-../../..}"
STAGE="${2:-all}"
VENV="${VENV:-build/venv}"
MODELS="${MODELS:-build/models}"
mkdir -p build "$MODELS"

if [ "$STAGE" = all ]; then
  # 1. Python tools and the Kokoro model
  if [ ! -x "$VENV/bin/python" ]; then
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install -q kokoro-onnx soundfile faster-whisper
  fi
  HF=https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main
  [ -f "$MODELS/model.onnx" ] || curl -fL -o "$MODELS/model.onnx" "$HF/onnx/model.onnx"
  [ -f "$MODELS/af_heart.bin" ] || curl -fL -o "$MODELS/af_heart.bin" "$HF/voices/af_heart.bin"
  "$VENV/bin/python" -c 'import numpy as np, sys; m = sys.argv[1]; np.savez(m + "/voices.npz", af_heart=np.fromfile(m + "/af_heart.bin", dtype=np.float32).reshape(-1, 1, 256))' "$MODELS"

  # 2. narration -> word timings (and a script-vs-heard check) -> captions + animation cues -> page data
  "$VENV/bin/python" make_voice.py script.json "$MODELS" build
  "$VENV/bin/python" transcribe.py build
  python3 make_captions.py build
  python3 build_data.py build "$REPO"
  cp build/data.js data.js
  cp build/captions.srt ../captions.srt

  # 3. page assets, then one screenshot per frame
  npm install --no-audit --no-fund --silent
  mkdir -p fonts
  for f in inter/files/inter-latin-{400,500,600,700} space-grotesk/files/space-grotesk-latin-{500,600,700} jetbrains-mono/files/jetbrains-mono-latin-{400,500,700}; do
    cp "node_modules/@fontsource/$f-normal.woff2" fonts/
  done
  node -e "require('playwright')" 2>/dev/null || { npm install --no-save --no-audit --no-fund playwright && npx playwright install chromium; }
  rm -rf frames
  node render.mjs --fps 30 --workers 4 --out frames
fi

# 4. master the narration (-16 LUFS, two-pass loudnorm), then encode with the AI disclosure in the metadata
LN="highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11"
M=$(ffmpeg -hide_banner -nostats -i build/narration_raw.wav -af "$LN:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p' |
  python3 -c 'import json, sys; d = json.load(sys.stdin); print("measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s" % (d["input_i"], d["input_tp"], d["input_lra"], d["input_thresh"], d["target_offset"]))')
ffmpeg -hide_banner -loglevel error -y -i build/narration_raw.wav -af "$LN:$M:linear=true,aresample=48000" -ac 2 build/narration_master.wav
DISCLOSURE="AI-generated video. Script, visuals, animation code and the synthetic voice were generated with AI (Claude Code; Kokoro-82M text-to-speech). App previews use synthetic data from data/mock. Data sources named: NASA FIRMS (MODIS C6.1, VIIRS 375 m), USFS FPA-FOD 7th ed. No NASA logos or branding."
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i frames/f_%05d.jpg -i build/narration_master.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -x264-params aq-mode=3 \
  -c:a aac -b:a 192k -shortest -movflags +faststart \
  -metadata title="Propagators developer walkthrough: fixed-clock fire calendar" \
  -metadata artist="Team Propagators (AI-generated)" \
  -metadata comment="$DISCLOSURE" -metadata description="$DISCLOSURE" \
  -metadata:s:a:0 language=eng \
  ../propagators-dev-walkthrough.mp4
echo "wrote $(cd .. && pwd)/propagators-dev-walkthrough.mp4"
