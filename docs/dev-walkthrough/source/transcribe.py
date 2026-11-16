"""Developer walkthrough video tooling; see ../README.md.

QA + timing: transcribe the synthetic narration back with faster-whisper (small.en) and
1) print script-vs-heard for every line, so a person can confirm the voice says the right words;
2) save word timestamps, used by make_captions.py for caption breaks and animation cues.
Usage: python transcribe.py <out_dir>    (reads <out_dir>/narration_raw.wav and timing.json)
"""
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

OUT = sys.argv[1]
# 16 kHz mono 16-bit PCM, scaled to float: the exact input the published video's timings were made from
pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f"{OUT}/narration_raw.wav", "-ar", "16000", "-ac", "1", "-f", "s16le", "-"],
                     check=True, capture_output=True).stdout
audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
model = WhisperModel("small.en", device="cpu", compute_type="int8")
segments, _ = model.transcribe(audio, word_timestamps=True, beam_size=5)
words = [{"start": round(w.start, 3), "end": round(w.end, 3), "w": w.word.strip()} for s in segments for w in s.words]
json.dump(words, open(f"{OUT}/whisper_words.json", "w"))
timing = json.load(open(f"{OUT}/timing.json"))
for ln in timing["lines"]:
    heard = " ".join(w["w"] for w in words if ln["start"] - 0.15 <= w["start"] < ln["end"])
    print(f'[{ln["start"]:6.2f}] SCRIPT: {ln["d"]}\n         HEARD : {heard}')
