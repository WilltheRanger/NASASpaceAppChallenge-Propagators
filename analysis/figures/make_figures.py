"""Slide figures from the pipeline outputs, light and dark, 16:9. Every value is read from data/out or analysis/*/out.

Usage: python3 analysis/figures/make_figures.py data/out analysis/brazil-data/out analysis/figures/out
"""
import sys, os, json
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

dst, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
J = lambda p: json.load(open(os.path.join(dst, p)))
# validated default palette, slots 1-3 (blue, orange, aqua); text and surface tokens per mode
THEME = {"light": dict(bg="#fcfcfb", text="#0b0b0b", text2="#52514e", grid="#e6e5e1", muted="#a3a29c",
                       s=["#2a78d6", "#eb6834", "#1baf7a"]),
         "dark": dict(bg="#1a1a19", text="#f0efec", text2="#c3c2b7", grid="#33332f", muted="#6f6e69",
                      s=["#3987e5", "#d95926", "#199e70"])}
plt.rcParams.update({"font.family": ["Segoe UI", "DejaVu Sans"], "font.size": 15, "axes.titlesize": 22,
                     "axes.titleweight": "semibold", "axes.titlelocation": "left", "svg.fonttype": "none"})

def hm(h):
    m = int(round(h * 60)); return f"{m // 60:02d}:{m % 60:02d}"

def frame(t, title, sub, source, left=0.08, right=0.86):
    fig, ax = plt.subplots(figsize=(16, 9), dpi=120)
    fig.patch.set_facecolor(t["bg"]); ax.set_facecolor(t["bg"])
    fig.subplots_adjust(left=left, right=right, top=0.80, bottom=0.13)
    fig.text(0.08, 0.92, title, fontsize=26, weight="semibold", color=t["text"])
    fig.text(0.08, 0.865, sub, fontsize=16, color=t["text2"])
    fig.text(0.08, 0.035, source, fontsize=11.5, color=t["text2"])
    for k in ("top", "right", "left"): ax.spines[k].set_visible(False)
    ax.spines["bottom"].set_color(t["muted"])
    ax.tick_params(colors=t["text2"], length=0, labelsize=14)
    ax.grid(axis="y", color=t["grid"], linewidth=1); ax.set_axisbelow(True)
    return fig, ax

def save(fig, name, mode):
    fig.savefig(os.path.join(out, f"{name}-{mode}.png"), facecolor=fig.get_facecolor())
    plt.close(fig)

# data
dr = pd.read_csv(os.path.join(src, "firms_drift_by_biome.csv"))
am = dr[(dr.biome == "amazon") & dr.year.between(2012, 2025)].pivot(index="year", columns="satellite", values="lst_median")
audit = J("audit/br-amazon.json")
pl = {p["year"]: p["L"] for p in audit["baseline"]["placebo_years"]}
st = pd.read_csv(os.path.join(os.path.dirname(os.path.abspath(dst)), "..", "analysis", "statistics", "out", "placebo_by_biome.csv"))
st = st[st.biome == "amazon"].set_index("year")
inpe = pd.read_csv(os.path.join(src, "inpe_daily_by_biome.csv"))
iy = inpe[inpe.biome == "amazon"].groupby(inpe.date.str[:4].astype(int)).inpe_count.sum()
cal = pd.Series({int(m["ym"][:4]) * 100 + int(m["ym"][5:]): m["fixed"] for m in J("calendar/br-amazon.json")["months"]})
fy = cal.groupby(cal.index // 100).sum()
sim = J("sim/amazon-2024-09-02.json")
regions = [("br-amazon", "Amazon"), ("br-cerrado", "Cerrado"), ("br-pantanal", "Pantanal"),
           ("ar-argentina", "Argentina"), ("in-punjab-haryana", "Punjab + Haryana"), ("us-california", "California")]

for mode, t in THEME.items():
    # 1 look times
    fig, ax = frame(t, "Aqua now looks at the Amazon 80 minutes later",
                    "Median local solar time of near-nadir daytime fire detections, Brazilian Amazon",
                    "Source: NASA FIRMS (MODIS C6.1, VIIRS 375 m); analysis/brazil-data/out/firms_drift_by_biome.csv", right=0.80)
    yrs = am.index.values
    for s, col, lab in [("Aqua", t["s"][0], "Aqua (INPE reference)"), ("S-NPP", t["s"][2], "VIIRS S-NPP"),
                        ("Terra", t["s"][1], "Terra")]:
        ax.plot(yrs, am[s], color=col, linewidth=2.5, marker="o", markersize=8,
                markeredgecolor=t["bg"], markeredgewidth=2)
        ax.annotate(f"{lab}  {hm(am[s].iloc[-1])}", (yrs[-1], am[s].iloc[-1]), xytext=(14, 0), textcoords="offset points",
                    va="center", color=t["text"], fontsize=15)
    ax.set_ylim(8.75, 15.4); ax.set_yticks(np.arange(9, 15.5, 1))
    ax.set_yticklabels([hm(v) for v in np.arange(9, 15.5, 1)]); ax.set_xticks(yrs[::1])
    ax.set_xticklabels([str(y) if y % 2 == 0 else "" for y in yrs])
    save(fig, "1-look-times", mode)

    # 2 audit L, Amazon
    a = {y["year"]: y for y in audit["years"]}
    fig, ax = frame(t, "In 2024–25, Aqua counted more than its old relationship with VIIRS predicts",
                    "Amazon: Aqua count ÷ count predicted from S-NPP and the 2012–2020 monthly ratio (1 = no change), 95% intervals",
                    "Source: data/out/audit/br-amazon.json (16-day block bootstrap). 2012–2020: each year scored against the other eight.", right=0.78)
    lo, hi = audit["baseline"]["placebo_min"], audit["baseline"]["placebo_max"]
    ax.axhspan(lo, hi, color=t["grid"], zorder=0)
    ax.annotate("range of the nine\npre-drift years", (2025.4, (lo + hi) / 2), xytext=(0, 0), textcoords="offset points",
                va="center", color=t["text2"], fontsize=13, annotation_clip=False)
    ax.axhline(1, color=t["muted"], linewidth=1)
    for y in range(2012, 2021):
        r = st.loc[y]; ax.plot([y, y], [r.L_lo, r.L_hi], color=t["muted"], linewidth=2)
        ax.plot(y, r.L, "o", color=t["muted"], markersize=9, markeredgecolor=t["bg"], markeredgewidth=2)
    for y in range(2021, 2026):
        r = a[y]; ax.plot([y, y], [r["L_lo"], r["L_hi"]], color=t["s"][0], linewidth=2.5)
        ax.plot(y, r["L"], "o", color=t["s"][0], markersize=10, markeredgecolor=t["bg"], markeredgewidth=2)
    r = a[2025]
    ax.annotate(f"2025: {r['aqua_count']:,} counted\nvs {r['fixed_count']:,} predicted (+{r['gap_pct']}%)",
                (2025, r["L"]), xytext=(18, 0), textcoords="offset points", va="center", color=t["text"], fontsize=15,
                annotation_clip=False)
    ax.set_xticks(range(2012, 2026)); ax.set_xticklabels([str(y) if y % 2 == 0 else "" for y in range(2012, 2026)])
    ax.set_ylim(0.8, 1.6)
    save(fig, "2-audit-amazon", mode)

    # 3 official vs fixed clock
    yrs = list(range(2012, 2026))
    fig, ax = frame(t, "Both series fell sharply in 2025; the fixed clock fell further",
                    "Amazon daytime fire detections per year: INPE's official reference-satellite count and our fixed-clock estimate",
                    "Source: INPE reference-satellite files; data/out/calendar/br-amazon.json (VIIRS-based Aqua-equivalent). Full calendar years.")
    for ser, col, lab in [(iy, t["s"][0], "INPE official (Aqua)"), (fy, t["s"][1], "Fixed clock")]:
        v = [ser.get(y, np.nan) / 1000 for y in yrs]
        ax.plot(yrs, v, color=col, linewidth=2.5, marker="o", markersize=8, markeredgecolor=t["bg"], markeredgewidth=2)
        ax.annotate(f"{lab}  {v[-1]:.0f}k", (yrs[-1], v[-1]), xytext=(14, 0), textcoords="offset points", va="center",
                    color=t["text"], fontsize=15)
    c24, c25 = (iy[2025] / iy[2024] - 1) * 100, (fy[2025] / fy[2024] - 1) * 100
    ax.text(2019.6, max(iy[2024], fy[2024]) / 1000 * 0.98, f"2024 → 2025\nofficial {c24:.1f}%\nfixed clock {c25:.1f}%",
            color=t["text"], fontsize=15, va="top")
    ax.set_xticks(yrs); ax.set_xticklabels([str(y) if y % 2 == 0 else "" for y in yrs])
    ax.set_ylabel("thousand detections", color=t["text2"]); ax.set_ylim(0, None)
    save(fig, "3-official-vs-fixed", mode)

    # 4 response simulation
    r3 = sim["runs"]["3"]; names = ["Terra", "VIIRS", "Aqua"]
    fig, ax = frame(t, "A late alert leaves no daylight to fly",
                    f"Helicopter sorties possible before sunset ({hm(sim['sunset_lst'])}), real fires in Pará on {sim['day']}, "
                    "with NASA's stated FIRMS delay of up to 3 h",
                    "Source: data/out/sim/amazon-2024-09-02.json. Real fires and pass times; fleet and bases are illustrative assumptions.")
    ax.grid(False); ax.spines["bottom"].set_visible(False); ax.set_yticks([])
    for i, nm in enumerate(names):
        s = r3[nm]["summary"]; v = s["helicopter_sorties"]
        if v > 0:
            ax.add_patch(FancyBboxPatch((i - 0.28, 0), 0.56, v, boxstyle="round,pad=0,rounding_size=0.06",
                                        mutation_aspect=8, color=t["s"][0], linewidth=0))
        ax.text(i, v + 0.15, str(v), ha="center", va="bottom", fontsize=30, weight="semibold", color=t["text"])
        ax.text(i, -0.35, f"{nm} pass", ha="center", va="top", fontsize=17, color=t["text"])
        ax.text(i, -0.85, f"alert {hm(s['first_alert'])} · {hm(max(0, s['daylight_left_at_first_alert_h']))} of light left",
                ha="center", va="top", fontsize=14, color=t["text2"])
    ax.set_xlim(-0.6, 2.6); ax.set_ylim(-1.5, 6.4); ax.set_xticks([])
    save(fig, "4-response", mode)

    # 5 regions 2025
    fig, ax = frame(t, "The excess appears in the Amazon, Cerrado and Argentina",
                    "2025 audit L by region with 95% interval (1 = no change from 2012–2020); shaded = range of the nine pre-drift years",
                    "Source: data/out/audit/<region>.json. Punjab + Haryana 2025 is flagged insufficient data.", left=0.15)
    ax.grid(axis="y", visible=False); ax.grid(axis="x", color=t["grid"], linewidth=1)
    for i, (rid, nm) in enumerate(regions):
        f = J(f"audit/{rid}.json"); y = next(v for v in f["years"] if v["year"] == 2025); yy = len(regions) - 1 - i
        ax.add_patch(plt.Rectangle((f["baseline"]["placebo_min"], yy - 0.3), f["baseline"]["placebo_max"] - f["baseline"]["placebo_min"],
                                   0.6, color=t["grid"], linewidth=0, zorder=0))
        if y["status"] == "ok":
            ax.plot([y["L_lo"], y["L_hi"]], [yy, yy], color=t["s"][0], linewidth=2.5)
            ax.plot(y["L"], yy, "o", color=t["s"][0], markersize=11, markeredgecolor=t["bg"], markeredgewidth=2)
            ax.text(1.62, yy, f"{y['L']:.2f}", va="center", color=t["text"], fontsize=15)
        else:
            ax.text(1.62, yy, "insufficient data", va="center", color=t["text2"], fontsize=14)
    ax.axvline(1, color=t["muted"], linewidth=1)
    ax.set_yticks(range(len(regions))); ax.set_yticklabels([nm for _, nm in regions][::-1], color=t["text"], fontsize=16)
    ax.set_xlim(0.7, 1.6); ax.spines["bottom"].set_visible(False)
    save(fig, "5-regions-2025", mode)
print("wrote", len(os.listdir(out)), "files to", out)
