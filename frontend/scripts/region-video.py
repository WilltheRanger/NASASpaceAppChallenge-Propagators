#!/usr/bin/env python3
"""Make a region's landing video: one continuous shot, slowed to a shared camera pace, graded to a shared look.

Usage:
  python3 scripts/region-video.py measure SRC --start S --dur D
  python3 scripts/region-video.py make SRC OUT.mp4 --start S --dur D [--pace PX_PER_S] [--max-out SECONDS]

measure  prints the shot's camera speed (median motion of the picture, in pixels per second at 1280 px wide) and its
         level, contrast and colour, so every clip can be brought to the same pace and look.
make     slows the shot so its camera speed matches --pace (it never speeds a shot up), interpolating frames when the
         source frame rate would fall below 30 fps; grades it to the shared look (one mean level, one contrast, one
         saturation, colour casts pulled halfway to neutral); writes a silent 1280-wide H.264 at 30 fps and a poster
         (OUT minus .mp4, plus -poster.jpg) from its first frame.

Needs ffmpeg with vidstab. Run it on one continuous shot only: check the span for cuts first.
"""
import argparse
import json
import math
import os
import re
import statistics
import subprocess
import sys
import tempfile

WIDTH = 1280
# the shared look, on 0-255 luma and chroma: mean level, the spread between the 10th and 90th percentiles, mean
# saturation; casts are pulled only a little toward neutral, since forest and wetland are green by nature
TARGET_LEVEL = 96.0
TARGET_SPREAD = 96.0
TARGET_SAT = 16.0
CAST_PULL = 0.2


def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kw)


def probe_fps(src):
    out = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', src]).stdout.strip()
    n, d = out.split('/')
    return float(n) / float(d)


def measure(src, start, dur):
    fps = probe_fps(src)
    step = max(1, round(fps / 6))
    with tempfile.TemporaryDirectory() as tmp:
        trf = os.path.join(tmp, 'motion.trf')
        stats = os.path.join(tmp, 'stats.txt')
        cut = ['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur), '-i', src]
        # slow drone shots move under a pixel a frame, below vidstab's whole-pixel steps: measure every few frames
        run(cut + ['-vf', f"select='not(mod(n\\,{step}))',scale={WIDTH}:-2,vidstabdetect=shakiness=5:accuracy=15:result={trf}", '-f', 'null', '-'])
        run(cut + ['-vf', f'scale={WIDTH}:-2,signalstats,metadata=print:file={stats}', '-f', 'null', '-'])
        per_frame = []
        for line in open(trf):
            vecs = re.findall(r'\(LM (-?\d+) (-?\d+) ', line)
            if vecs:
                per_frame.append(statistics.median(math.hypot(int(x), int(y)) for x, y in vecs))
        keys = {'YAVG': [], 'YLOW': [], 'YHIGH': [], 'SATAVG': [], 'UAVG': [], 'VAVG': []}
        for line in open(stats):
            m = re.match(r'lavfi\.signalstats\.(\w+)=([\d.]+)', line.strip())
            if m and m.group(1) in keys:
                keys[m.group(1)].append(float(m.group(2)))
    mean = {k: statistics.fmean(v) for k, v in keys.items() if v}
    speed = (statistics.median(per_frame) if per_frame else 0.0) * fps / step
    return {'fps': fps, 'speed_px_s': round(speed, 2), **{k.lower(): round(v, 2) for k, v in mean.items()}}


def grade(m):
    """eq and chroma shifts that bring a shot to the shared look: contrast to the shared spread (flat camera profiles
    get stretched), brightness to the shared mean level, saturation to the shared mean."""
    spread = max(8.0, m.get('yhigh', 180) - m.get('ylow', 60))
    contrast = max(0.8, min(2.4, TARGET_SPREAD / spread))
    mean = (m['yavg'] - 16) / 219
    after = (mean - 0.5) * contrast + 0.5
    brightness = max(-0.3, min(0.3, (TARGET_LEVEL - 16) / 219 - after))
    sat = max(0.6, min(2.6, TARGET_SAT / m['satavg'])) if m.get('satavg') else 1.0
    du = (m.get('uavg', 128) - 128) * CAST_PULL
    dv = (m.get('vavg', 128) - 128) * CAST_PULL
    return (f"eq=contrast={contrast:.3f}:brightness={brightness:.3f}:saturation={sat:.3f},"
            f"lutyuv=u='clip(val-({du:.2f}),16,240)':v='clip(val-({dv:.2f}),16,240)'")


def make(src, out, start, dur, pace, max_out):
    m = measure(src, start, dur)
    factor = 1.0 if m['speed_px_s'] <= pace or m['speed_px_s'] == 0 else pace / m['speed_px_s']
    factor = max(0.25, factor)
    length = min(dur / factor, max_out)
    used = length * factor
    chain = [f'scale={WIDTH}:-2:flags=lanczos', f'setpts=PTS/{factor:.4f}']
    if m['fps'] * factor < 29.5:
        chain.append('minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1')
    chain += ['fps=30', grade(m), 'format=yuv420p']
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', f'{used:.3f}', '-i', src, '-an', '-vf', ','.join(chain),
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-maxrate', '2M', '-bufsize', '4M', '-movflags', '+faststart', out])
    poster = re.sub(r'\.mp4$', '', out) + '-poster.jpg'
    run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-frames:v', '1', '-q:v', '3', poster])
    return {**m, 'factor': round(factor, 3), 'out_seconds': round(length, 2), 'source_seconds_used': round(used, 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['measure', 'make'])
    ap.add_argument('src')
    ap.add_argument('out', nargs='?')
    ap.add_argument('--start', type=float, default=0)
    ap.add_argument('--dur', type=float, required=True)
    ap.add_argument('--pace', type=float, default=11.0, help='camera speed to match, pixels per second at 1280 wide')
    ap.add_argument('--max-out', type=float, default=12.0, help='longest output, seconds')
    a = ap.parse_args()
    if a.mode == 'measure':
        print(json.dumps(measure(a.src, a.start, a.dur)))
    else:
        if not a.out:
            sys.exit('make needs OUT.mp4')
        print(json.dumps(make(a.src, a.out, a.start, a.dur, a.pace, a.max_out)))


if __name__ == '__main__':
    main()
