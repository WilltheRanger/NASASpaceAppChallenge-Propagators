"""Self-contained animated map of the response simulation (Leaflet), for review and for the app to port.

Usage: python3 analysis/simulation/make_preview.py data/out/sim/amazon-2024-09-02.json analysis/simulation/preview.html
"""
import sys, json

src, dst = sys.argv[1], sys.argv[2]
data = json.load(open(src))

HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Response Window</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  :root { --bg:#0f1114; --panel:#16191e; --line:#2a2f37; --text:#e8e6e1; --muted:#9aa0a8;
          --fire:#ff7a1a; --seen:#8a8f98; --reached:#4cd97b; --heli:#5cc8ff; --ground:#ffd24a; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .wrap { display:grid; grid-template-columns: 1fr 380px; height:100vh; }
  #map { height:100%; }
  aside { background:var(--panel); border-left:1px solid var(--line); padding:20px; overflow:auto; }
  h1 { font-size:19px; line-height:1.25; margin:0 0 6px; font-weight:600; }
  .sub { color:var(--muted); margin:0 0 18px; }
  .row { display:flex; gap:6px; flex-wrap:wrap; margin:8px 0 14px; }
  .lbl { color:var(--muted); font-size:12px; margin-top:6px; }
  button { background:#1f242b; color:var(--text); border:1px solid var(--line); border-radius:6px; padding:6px 10px; cursor:pointer; font:inherit; }
  button[aria-pressed="true"] { background:var(--text); color:var(--bg); border-color:var(--text); }
  button:focus-visible { outline:2px solid var(--heli); outline-offset:2px; }
  .clock { font-size:34px; font-variant-numeric:tabular-nums; margin:4px 0 0; }
  .day { color:var(--muted); margin-bottom:8px; }
  input[type=range] { width:100%; accent-color:var(--fire); }
  table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; margin-top:6px; }
  th, td { text-align:right; padding:5px 4px; border-bottom:1px solid var(--line); }
  th:first-child, td:first-child { text-align:left; }
  th { color:var(--muted); font-weight:500; font-size:12px; }
  tr.sel td { color:var(--fire); }
  .key { display:grid; grid-template-columns:18px 1fr; gap:4px 8px; margin-top:16px; color:var(--muted); font-size:12px; align-items:center; }
  .dot { width:12px; height:12px; border-radius:50%; }
  .note { color:var(--muted); font-size:12px; margin-top:16px; }
  .unit { font:600 11px/1 system-ui; color:#0f1114; border-radius:3px; padding:3px 4px; text-align:center; }
  .base { font:600 11px/1 system-ui; color:var(--text); text-shadow:0 1px 2px #000; white-space:nowrap; }
  #night { position:absolute; inset:0; background:#050814; pointer-events:none; z-index:450; opacity:0; transition:opacity .2s; }
  @media (max-width: 860px) { .wrap { grid-template-columns:1fr; grid-template-rows:55vh auto; height:auto; } aside { border-left:0; border-top:1px solid var(--line); } }
  @media (prefers-reduced-motion: reduce) { #night { transition:none; } }
</style>
</head>
<body>
<div class="wrap">
  <div style="position:relative"><div id="map" aria-label="Map of fires and response units"></div><div id="night"></div></div>
  <aside>
    <h1>How much daylight each satellite pass leaves for a response</h1>
    <p class="sub">Pará, Brazil · 2 September 2024 · real NASA FIRMS detections</p>
    <div class="lbl">Alert source</div>
    <div class="row" id="src"></div>
    <div class="lbl">Data delay after the pass</div>
    <div class="row" id="lat"></div>
    <div class="clock" id="clock">06:00</div>
    <div class="day" id="daylight"></div>
    <input type="range" id="t" min="6" max="20" step="0.0167" value="6" aria-label="Time of day">
    <div class="row"><button id="play" aria-pressed="false">Play</button><button id="reset">Reset</button></div>
    <table aria-label="Summary by alert source">
      <thead><tr><th>Source</th><th>Alert</th><th>Light left</th><th>Fires seen</th><th>Heli sorties</th><th>Reached</th></tr></thead>
      <tbody id="sum"></tbody>
    </table>
    <div class="key">
      <span class="dot" style="background:var(--seen)"></span><span>Burning, detected by some satellite, not yet alerted</span>
      <span class="dot" style="background:var(--fire)"></span><span>Alerted to the dispatcher</span>
      <span class="dot" style="border:2px solid var(--reached)"></span><span>Unit on scene</span>
      <span class="unit" style="background:var(--heli)">H</span><span>Helicopter (daylight only)</span>
      <span class="unit" style="background:var(--ground)">G</span><span>Ground crew</span>
    </div>
    <p class="note" id="note"></p>
  </aside>
</div>
<script>
const D = __DATA__;
const hhmm = h => { const m = Math.round(h * 60); return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
const S = { src: "VIIRS", lat: "3", t: 6 };
const [w, s, e, n] = D.box;
const map = L.map("map", { zoomControl: true, attributionControl: true }).fitBounds([[s, w], [n, e]]);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Imagery © Esri · Fires: NASA FIRMS", maxZoom: 12 }).addTo(map);
const fireLayer = L.layerGroup().addTo(map), unitLayer = L.layerGroup().addTo(map), tripLayer = L.layerGroup().addTo(map);
D.assumptions.bases.forEach(b => {
  L.marker([b.lat, b.lon], { icon: L.divIcon({ className: "", html: '<div class="base">▪ ' + b.name + '</div>', iconAnchor: [4, 6] }) }).addTo(map);
});
const fires = D.fires.map(f => ({ f, c: L.circleMarker([f.lat, f.lon], { radius: Math.min(16, 3 + Math.sqrt(f.frp) / 8), weight: 0, fillOpacity: 0 }).addTo(fireLayer) }));
const units = {};
D.assumptions.units.forEach(u => {
  const b = D.assumptions.bases.find(x => x.name === u.base);
  const col = u.kind === "helicopter" ? "var(--heli)" : "var(--ground)";
  units[u.id] = { u, home: [b.lat, b.lon],
    m: L.marker([b.lat, b.lon], { icon: L.divIcon({ className: "", html: '<div class="unit" style="background:' + col + '">' + u.id + '</div>', iconAnchor: [10, 8] }), zIndexOffset: 1000 }).addTo(unitLayer) };
});
function run() { return D.runs[S.lat][S.src]; }
function lerp(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
function pos(id, t, trips) {
  let p = units[id].home;
  for (const tr of trips.filter(x => x.unit === id).sort((a, b) => a.depart - b.depart)) {
    const f = D.fires.find(x => x.id === tr.fire), fp = [f.lat, f.lon];
    if (t < tr.depart) return tr.from_;
    if (t < tr.arrive) return lerp(tr.from_, fp, (t - tr.depart) / (tr.arrive - tr.depart));
    if (t < tr.leave || tr.back === undefined) p = fp; else if (t < tr.back) return lerp(fp, units[id].home, (t - tr.leave) / (tr.back - tr.leave)); else p = units[id].home;
  }
  return p;
}
function draw() {
  const r = run(), t = S.t, lat = +S.lat, key = "t_" + S.src;
  const reached = {}; r.trips.forEach(tr => { reached[tr.fire] = tr.arrive; });
  fires.forEach(({ f, c }) => {
    const alertAt = f[key] === null ? null : f[key] + lat;
    if (t < f.first_seen) { c.setStyle({ fillOpacity: 0, weight: 0 }); return; }
    const alerted = alertAt !== null && t >= alertAt, on = reached[f.id] !== undefined && t >= reached[f.id];
    c.setStyle({ fillColor: alerted ? "#ff7a1a" : "#8a8f98", fillOpacity: alerted ? 0.85 : 0.45,
                 color: "#4cd97b", weight: on ? 3 : 0 });
  });
  Object.keys(units).forEach(id => units[id].m.setLatLng(pos(id, t, r.trips)));
  tripLayer.clearLayers();
  r.trips.forEach(tr => { if (t >= tr.depart) { const f = D.fires.find(x => x.id === tr.fire);
    L.polyline([tr.from_, [f.lat, f.lon]], { color: tr.unit[0] === "H" ? "#5cc8ff" : "#ffd24a", weight: 1, opacity: 0.6, dashArray: "4 4" }).addTo(tripLayer); } });
  document.getElementById("clock").textContent = hhmm(t);
  const left = D.sunset_lst - t;
  document.getElementById("daylight").textContent = left > 0 ? "Daylight left: " + hhmm(left) + " (sunset " + hhmm(D.sunset_lst) + ")" : "After sunset: helicopters grounded";
  document.getElementById("night").style.opacity = t < D.sunset_lst - 0.5 ? 0 : Math.min(0.55, (t - (D.sunset_lst - 0.5)) * 0.55);
  document.getElementById("t").value = t;
}
function table() {
  const rows = Object.entries(D.runs[S.lat]).map(([name, v]) => {
    const s = v.summary;
    return '<tr class="' + (name === S.src ? "sel" : "") + '"><td>' + name + '</td><td>' + (s.first_alert ? hhmm(s.first_alert) : "–") +
      '</td><td>' + (s.daylight_left_at_first_alert_h !== null ? hhmm(Math.max(0, s.daylight_left_at_first_alert_h)) : "–") +
      '</td><td>' + s.fires_alerted + '</td><td>' + s.helicopter_sorties + '</td><td>' + s.fires_reached + '</td></tr>';
  });
  document.getElementById("sum").innerHTML = rows.join("");
}
function buttons(id, opts, k, label) {
  const el = document.getElementById(id);
  el.innerHTML = opts.map(o => '<button aria-pressed="' + (S[k] === o) + '" data-v="' + o + '">' + label(o) + '</button>').join("");
  el.querySelectorAll("button").forEach(b => b.onclick = () => { S[k] = b.dataset.v; buttons(id, opts, k, label); table(); draw(); });
}
buttons("src", Object.keys(D.runs["0"]), "src", o => o);
buttons("lat", Object.keys(D.runs), "lat", o => o === "0" ? "Instant" : o + " h (FIRMS bound)");
let timer = null;
document.getElementById("t").oninput = e => { S.t = +e.target.value; draw(); };
document.getElementById("play").onclick = ev => {
  if (timer) { clearInterval(timer); timer = null; ev.target.textContent = "Play"; ev.target.setAttribute("aria-pressed", "false"); return; }
  ev.target.textContent = "Pause"; ev.target.setAttribute("aria-pressed", "true");
  timer = setInterval(() => { S.t = Math.min(20, S.t + 0.05); draw(); if (S.t >= 20) document.getElementById("play").click(); }, 50);
};
document.getElementById("reset").onclick = () => { S.t = 6; draw(); };
document.getElementById("note").textContent = D.note + " " + D.latency_note + " Passes over the area (median): " +
  Object.entries(D.passes_lst).map(([k, v]) => k + " " + hhmm(v)).join(", ") + ".";
table(); draw();
</script>
</body>
</html>
"""
open(dst, "w", encoding="utf-8").write(HTML.replace("__DATA__", json.dumps(data)))
print("wrote", dst)
