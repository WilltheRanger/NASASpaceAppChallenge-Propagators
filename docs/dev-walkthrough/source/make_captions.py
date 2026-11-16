"""Developer walkthrough video tooling; see ../README.md.

Build caption chunks (burned-in + .srt) and animation cue times from the narration timing.

Inputs : timing.json (exact line start/end from make_voice.py), whisper_words.json (word timestamps)
Outputs: captions.json, captions.srt, cues.json
"""
import json, re, sys

D = sys.argv[1]
timing = json.load(open(f"{D}/timing.json"))
words = json.load(open(f"{D}/whisper_words.json"))
MAX = 68  # characters per caption chunk (one line on screen)


FUNC = re.compile(r"^(for|with|and|or|so|in|on|to|from|against|by|of|over|into|which|then|when|before|after|until|instead|checked)\b", re.I)


def split_text(text):
    """Split a line into caption chunks of <= MAX chars:
    1) a 2-way split at punctuation, 2) punctuation near the middle + recurse,
    3) a 2-way split at a space, preferring breaks before function words, 4) recurse at a space."""
    text = text.strip()
    if len(text) <= MAX:
        return [text]
    mid = len(text) / 2
    cands = []
    for m in re.finditer(r"\s", text):
        cut = m.end()
        a, b = text[:cut].strip(), text[cut:].strip()
        cands.append((cut, a, b, bool(re.search(r"[,:;.?!\u2014]$", a))))
    fits = lambda c: len(c[1]) <= MAX and len(c[2]) <= MAX
    two_p = [c for c in cands if c[3] and fits(c)]
    if two_p:
        cut = min(two_p, key=lambda c: abs(c[0] - mid))[0]
        return [text[:cut].strip(), text[cut:].strip()]
    pun = [c for c in cands if c[3] and abs(c[0] - mid) < len(text) * 0.38]
    if pun:
        cut = min(pun, key=lambda c: abs(c[0] - mid))[0]
        return split_text(text[:cut]) + split_text(text[cut:])
    two_s = [c for c in cands if fits(c)]
    if two_s:
        cut = min(two_s, key=lambda c: abs(c[0] - mid) - (8 if FUNC.search(c[2]) else 0))[0]
        return [text[:cut].strip(), text[cut:].strip()]
    cut = min(cands, key=lambda c: abs(c[0] - mid))[0]
    return split_text(text[:cut]) + split_text(text[cut:])


def gaps_in(start, end):
    ws = [w for w in words if w["start"] >= start - 0.3 and w["start"] < end]
    return [((ws[i]["end"] + ws[i + 1]["start"]) / 2) for i in range(len(ws) - 1)]


caps = []
for ln in timing["lines"]:
    chunks = split_text(ln["d"])
    total = sum(len(c) for c in chunks)
    t0, t1 = ln["start"], ln["end"]
    gaps = gaps_in(t0, t1)
    bounds = [t0]
    acc = 0
    for c in chunks[:-1]:
        acc += len(c)
        tb = t0 + (t1 - t0) * acc / total
        near = [g for g in gaps if abs(g - tb) < 0.8 and g > bounds[-1] + 0.6]
        bounds.append(min(near, key=lambda g: abs(g - tb)) if near else tb)
    bounds.append(t1)
    for i, c in enumerate(chunks):
        caps.append({"start": round(bounds[i], 3), "end": round(bounds[i + 1], 3), "text": c, "scene": ln["scene"]})

# hold each caption until the next one if the gap is short (avoids flicker)
for a, b in zip(caps, caps[1:]):
    if b["start"] - a["end"] < 0.7:
        a["end"] = b["start"]
caps[-1]["end"] = round(caps[-1]["end"] + 0.6, 3)
json.dump(caps, open(f"{D}/captions.json", "w"), indent=1)


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


with open(f"{D}/captions.srt", "w") as f:
    for i, c in enumerate(caps, 1):
        f.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}\n\n")

# ---- animation cues: (scene, line index, regex on whisper token) -> start time
CUES = {
    "p_snapshot": ("problem", 0, r"snapshot"), "p_drifted": ("problem", 1, r"drifted"),
    "p_130": ("problem", 1, r"^1$"), "p_350": ("problem", 1, r"^3$"), "p_amazon": ("problem", 1, r"Amazon"),
    "p_terra": ("problem", 1, r"Terra"), "p_fire": ("problem", 2, r"^Fire"), "p_counts": ("problem", 2, r"counts"),
    "p_dont": ("problem", 2, r"don't"), "p_brazil": ("problem", 3, r"Brazil"),
    "m_viirs": ("method", 0, r"VIIRS"), "m_clock": ("method", 0, r"clock"), "m_ratio": ("method", 1, r"ratio"),
    "m_2012": ("method", 1, r"2012"), "m_times": ("method", 2, r"times"), "m_units": ("method", 2, r"units"),
    "m_gap": ("method", 3, r"gap"), "m_number": ("method", 3, r"number"), "m_drifted": ("method", 3, r"drifted"),
    "a_calendar0": ("app", 0, r"calendar"), "a_six": ("app", 0, r"six"), "a_calendar": ("app", 1, r"calendar"),
    "a_2002": ("app", 1, r"2002"), "a_count": ("app", 1, r"count"), "a_anomaly": ("app", 1, r"anomaly"),
    "a_median": ("app", 1, r"median"), "a_csv": ("app", 1, r"CSV"), "a_audit": ("app", 2, r"audit"),
    "a_gap": ("app", 2, r"gap"), "a_error": ("app", 2, r"error"), "a_drift": ("app", 3, r"drift"),
    "a_centerpiece": ("app", 3, r"centerpiece"), "a_terra": ("app", 3, r"Terra"), "a_opposite": ("app", 3, r"opposite"),
    "a_isolates": ("app", 3, r"isolates"), "a_california": ("app", 4, r"California"), "a_recorded": ("app", 4, r"recorded"),
    "a_how": ("app", 4, r"^how"), "d_python": ("data", 0, r"Python"), "d_nasa": ("data", 0, r"NASA"),
    "d_json": ("data", 0, r"JSON"), "d_one": ("data", 0, r"^one$"), "d_static": ("data", 1, r"static"),
    "d_reads": ("data", 1, r"reads"), "d_out": ("data", 2, r"out"), "d_build": ("data", 2, r"build"),
    "d_mock": ("data", 2, r"mock"), "d_same": ("data", 2, r"Same"), "o_start": ("outro", 0, r"Start"),
}
lines = {(l["scene"], l["i"]): l for l in timing["lines"]}
cues = {}
for name, (sc, i, pat) in CUES.items():
    ln = lines[(sc, i)]
    hit = [w for w in words if ln["start"] - 0.3 <= w["start"] < ln["end"] and re.search(pat, w["w"], re.I)]
    if hit:
        cues[name] = hit[0]["start"]
    else:  # whisper misheard the word: estimate from its position in the line's text
        m = re.search(pat.strip("^$"), ln["d"], re.I)
        frac = m.start() / len(ln["d"]) if m else 0.0
        cues[name] = round(ln["start"] + (ln["end"] - ln["start"]) * frac, 3)
        print(f"WARN cue {name} not heard; estimated from text position ({frac:.2f})")
json.dump(cues, open(f"{D}/cues.json", "w"), indent=1)
print(len(caps), "caption chunks;", len(cues), "cues")
for c in caps:
    print(f'{c["start"]:7.2f} {c["end"]:7.2f}  {c["text"]}')
