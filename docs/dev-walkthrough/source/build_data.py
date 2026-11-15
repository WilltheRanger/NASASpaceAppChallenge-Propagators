"""AI-generated (Claude Code) for Team Propagators' developer walkthrough video; see ../README.md (AI disclosure).

Bundle narration timing, captions, cues and the team's MOCK data files into data.js for the page.
Usage: python3 build_data.py <video_dir> <repo_checkout_with_data_mock>
"""
import json, sys

D, REPO = sys.argv[1], sys.argv[2]
M = f"{REPO}/data/mock"
load = lambda p: json.load(open(p))
bundle = {
    "timing": load(f"{D}/timing.json"),
    "captions": load(f"{D}/captions.json"),
    "cues": load(f"{D}/cues.json"),
    "mock": {
        "regions": load(f"{M}/regions.json"),
        "calendar": load(f"{M}/calendar/br-amazon.json"),
        "audit": load(f"{M}/audit/br-amazon.json"),
        "audit_ca": load(f"{M}/audit/us-california.json"),
        "drift": load(f"{M}/drift/br-amazon.json"),
        "twoclocks": load(f"{M}/twoclocks/br-amazon.json"),
        "limits": load(f"{M}/detection_limits_california.json"),
        "socal": load(f"{M}/socal_seen_missed.json"),
        "checks": load(f"{M}/checks.json"),
    },
}
for k, v in bundle["mock"].items():
    assert v.get("mock") is True, f"{k} is not flagged mock"
with open(f"{D}/data.js", "w") as f:
    f.write("window.DATA = " + json.dumps(bundle, separators=(",", ":")) + ";\n")
print("data.js written,", sum(len(json.dumps(v)) for v in bundle["mock"].values()), "bytes of mock data")
