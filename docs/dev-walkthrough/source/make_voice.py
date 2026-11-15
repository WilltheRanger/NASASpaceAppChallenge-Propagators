"""AI-generated (Claude Code) for Team Propagators' developer walkthrough video; see ../README.md (AI disclosure).

Narration with Kokoro-82M text-to-speech (kokoro-onnx), one clip per script line, joined with fixed pauses.
Usage: python make_voice.py script.json <models_dir> <out_dir>
  models_dir holds model.onnx and voices.npz (see build.sh)
  writes <out_dir>/narration_raw.wav and <out_dir>/timing.json (exact start/end of every line and scene)
"""
import json, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

SCRIPT, MODELS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
script = json.load(open(SCRIPT))
k = Kokoro(f"{MODELS}/model.onnx", f"{MODELS}/voices.npz")
SR = 24000
LEAD_IN, LINE_GAP, SCENE_GAP, TAIL = 0.7, 0.26, 0.62, 2.2  # seconds


def trim(a, thr_db=-42.0, pad=0.03):
    """Trim leading/trailing silence, keeping a small pad."""
    win = int(0.01 * SR)
    n = len(a) // win
    rms = np.sqrt(np.mean(a[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    loud = np.where(20 * np.log10(rms + 1e-12) > thr_db)[0]
    if len(loud) == 0:
        return a
    return a[max(0, loud[0] * win - int(pad * SR)): min(len(a), (loud[-1] + 1) * win + int(pad * SR))]


speed, voice = float(script.get("speed", 1.0)), script.get("voice", "af_heart")
pieces, t = [np.zeros(int(LEAD_IN * SR), np.float32)], LEAD_IN
timing = {"scenes": [], "lines": []}
for si, sc in enumerate(script["scenes"]):
    if si:
        pieces.append(np.zeros(int(SCENE_GAP * SR), np.float32)); t += SCENE_GAP
    sc_start = t
    for li, ln in enumerate(sc["lines"]):
        if li:
            pieces.append(np.zeros(int(LINE_GAP * SR), np.float32)); t += LINE_GAP
        audio, sr = k.create(ln["s"], voice=voice, speed=speed, lang="en-us")  # "s" = spoken (phonetic) text
        assert sr == SR
        audio = trim(audio.astype(np.float32))
        dur = len(audio) / SR
        timing["lines"].append({"scene": sc["id"], "i": li, "start": round(t, 3), "end": round(t + dur, 3), "d": ln["d"], "s": ln["s"]})
        pieces.append(audio); t += dur
    timing["scenes"].append({"id": sc["id"], "chapter": sc["chapter"], "start": round(sc_start, 3), "end": round(t, 3)})
pieces.append(np.zeros(int(TAIL * SR), np.float32)); t += TAIL
timing["total"] = round(t, 3)
full = np.concatenate(pieces)
sf.write(f"{OUT}/narration_raw.wav", full / np.max(np.abs(full)) * 0.89, SR)
json.dump(timing, open(f"{OUT}/timing.json", "w"), indent=1)
for s in timing["scenes"]:
    print(f'{s["id"]:8s} {s["start"]:7.2f} -> {s["end"]:7.2f}')
print("total", timing["total"], "s")
