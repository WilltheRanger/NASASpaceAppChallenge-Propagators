/* Developer walkthrough video tooling; see ../README.md. */
/* Propagators developer walkthrough: scene builder + deterministic timeline.
   Everything visible is a pure function of time t (seconds): window.__seek(t) renders one frame. */
(function () {
  const D = window.DATA, TM = D.timing, CUE = D.cues, MK = D.mock;
  const tl = gsap.timeline({ paused: true });
  const updaters = [];
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const E = (tag, attrs = {}, parent = null, html = null) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (html !== null) el.innerHTML = html;
    if (parent) parent.appendChild(el);
    return el;
  };
  const S = (tag, attrs = {}, parent = null) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  };
  const scene = id => TM.scenes.find(s => s.id === id);
  const line = (id, i) => TM.lines.find(l => l.scene === id && l.i === i);
  const cue = n => { if (!(n in CUE)) throw new Error('missing cue ' + n); return CUE[n]; };
  const EASE = {
    inOut: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out: p => 1 - Math.pow(1 - p, 3),
    lin: p => p,
  };
  const prog = (t, t0, dur, e = 'inOut') => EASE[e](clamp((t - t0) / dur, 0, 1));
  const bump = (t, t0, dur) => { const x = (t - t0) / dur; return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x); };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lerpC = (a, b, x) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * x)).join(',')})`; };
  const fmtInt = n => n.toLocaleString('en-US');

  // ---- generic animation helpers (first appearance uses fromTo; later changes use to) ----
  const fadeUp = (target, t, dur = 0.6, dy = 22) =>
    tl.fromTo(target, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: dur, ease: 'power3.out' }, t);
  const fadeIn = (target, t, dur = 0.45) =>
    tl.fromTo(target, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'power1.out' }, t);
  const drawIn = (path, t, dur = 1.0) => {
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len + 4} ${len + 40}`;
    tl.fromTo(path, { strokeDashoffset: len + 8 }, { strokeDashoffset: 0, duration: dur, ease: 'power2.inOut' }, t);
  };
  const pathFrom = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const STAR = '<svg width="16" height="16" viewBox="0 0 24 24" style="flex:none"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor"/></svg>';

  /* =================== scene visibility, chapters, captions, background =================== */
  const ORDER = ['intro', 'problem', 'method', 'app', 'data', 'rules', 'outro'];
  const SEL = { intro: '#intro', problem: '#problem', method: '#method', app: '#app-scene', data: '#data', rules: '#rules', outro: '#outro' };
  ORDER.forEach((id, k) => {
    const s = scene(id), next = ORDER[k + 1] ? scene(ORDER[k + 1]) : null;
    tl.fromTo(SEL[id], { opacity: 0 }, { opacity: 1, duration: k ? 0.42 : 0.35, ease: 'power1.out' }, k ? s.start - 0.34 : 0);
    if (next) tl.to(SEL[id], { opacity: 0, duration: 0.3, ease: 'power1.in' }, next.start - 0.62);
  });
  tl.to('#fade', { opacity: 1, duration: 0.5, ease: 'power1.in' }, TM.total - 0.55);

  const CH = [['problem', 'Why'], ['method', 'Method'], ['app', 'The app'], ['data', 'Data flow'], ['rules', 'Rules'], ['outro', 'Start']];
  const chWrap = $('#chapters');
  const chEls = CH.map(([id, name]) => {
    const el = E('div', { class: 'ch' }, chWrap, `${name}<div class="bar"><div class="fill"></div></div>`);
    return { id, el, fill: $('.fill', el) };
  });
  updaters.push(t => {
    chEls.forEach((c, i) => {
      const s0 = scene(c.id).start - 0.4, s1 = i + 1 < chEls.length ? scene(chEls[i + 1].id).start - 0.4 : TM.total;
      const on = t >= s0 && t < s1, done = t >= s1;
      c.el.classList.toggle('on', on); c.el.classList.toggle('done', done);
      c.fill.style.width = (done ? 100 : on ? clamp((t - s0) / (s1 - s0), 0, 1) * 100 : 0) + '%';
    });
  });

  const capEl = $('#cap');
  let capText = null;
  updaters.push(t => {
    const caps = D.captions;
    const i = caps.findIndex(c => t >= c.start && t < c.end);
    if (i < 0) { capEl.style.opacity = 0; return; }
    const c = caps[i];
    if (c.text !== capText) { capEl.textContent = c.text; capText = c.text; }
    const prevJoined = i > 0 && Math.abs(caps[i - 1].end - c.start) < 0.01;
    const nextJoined = i < caps.length - 1 && Math.abs(caps[i + 1].start - c.end) < 0.01;
    const fi = prevJoined ? 1 : clamp((t - c.start) / 0.14, 0, 1);
    const fo = nextJoined ? 1 : clamp((c.end - t) / 0.14, 0, 1);
    capEl.style.opacity = Math.min(fi, fo);
  });

  const g1 = $('#bg .g1'), g2 = $('#bg .g2');
  updaters.push(t => {
    g1.style.transform = `translate(${Math.sin(t * 0.11) * 60}px, ${Math.cos(t * 0.09) * 40}px)`;
    g2.style.transform = `translate(${Math.cos(t * 0.1) * 60}px, ${Math.sin(t * 0.08) * 40}px)`;
  });

  /* =================== 1. INTRO =================== */
  (function intro() {
    const dial = $('#dial'), R = 250, HR = R - 62, C = { x: 1150 + 310, y: 210 + 310 };
    const ring = S('circle', { cx: 0, cy: 0, r: R, fill: 'none', stroke: 'rgba(255,255,255,.18)', 'stroke-width': 2 }, dial);
    S('circle', { cx: 0, cy: 0, r: R - 52, fill: 'rgba(255,255,255,.018)', stroke: 'rgba(255,255,255,.06)' }, dial);
    const ticks = S('g', {}, dial);
    for (let h = 0; h < 12; h++) {
      const a = (h * 30 * Math.PI) / 180, major = h % 3 === 0, r1 = major ? R - 30 : R - 17;
      S('line', { x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * (R - 5), y2: -Math.cos(a) * (R - 5),
        stroke: major ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.28)', 'stroke-width': major ? 3 : 2, 'stroke-linecap': 'round' }, ticks);
    }
    [['12', 0], ['3', 90], ['6', 180], ['9', 270]].forEach(([txt, deg]) => {
      const a = (deg * Math.PI) / 180;
      const el = S('text', { x: Math.sin(a) * (R + 32), y: -Math.cos(a) * (R + 32) + 8, 'text-anchor': 'middle', fill: '#6b768f',
        'font-size': 22, 'font-weight': 600, 'font-family': 'InterW, Inter, sans-serif' }, ticks);
      el.textContent = txt;
    });
    const arcA = S('path', { fill: 'none', stroke: '#ffb547', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: 0.32 }, dial);
    const arcT = S('path', { fill: 'none', stroke: '#a78bfa', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: 0.32 }, dial);
    const hand = color => {
      const g = S('g', {}, dial);
      S('line', { x1: 0, y1: 0, x2: 0, y2: -HR, stroke: color, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
      S('circle', { cx: 0, cy: -HR, r: 11, fill: color }, g);
      return g;
    };
    const hT = hand('#a78bfa'), hV = hand('#2dd4bf'), hA = hand('#ffb547');
    S('circle', { cx: 0, cy: 0, r: 10, fill: '#eaf0fa' }, dial);
    const host = $('#intro');
    const lV = E('div', { class: 'dlabel c-viirs' }, host, 'VIIRS <small>1:30 PM, steady</small>');
    const lA = E('div', { class: 'dlabel c-aqua' }, host, 'Aqua <small></small>');
    const lT = E('div', { class: 'dlabel c-terra' }, host, 'Terra <small></small>');
    const tip = (deg, r) => { const a = (deg * Math.PI) / 180; return [C.x + Math.sin(a) * r, C.y - Math.cos(a) * r]; };
    const fmt = h => { let hh = Math.floor(h + 1e-9), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; }
      return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`; };
    const arc = (d0, d1, r) => {
      const a0 = (d0 * Math.PI) / 180, a1 = (d1 * Math.PI) / 180;
      return `M${Math.sin(a0) * r},${-Math.cos(a0) * r} A${r},${r} 0 ${Math.abs(d1 - d0) > 180 ? 1 : 0} ${d1 > d0 ? 1 : 0} ${Math.sin(a1) * r},${-Math.cos(a1) * r}`;
    };
    const AQ1 = 15 + 50 / 60, TE1 = 8 + 55 / 60;
    updaters.push(t => {
      const p = prog(t, 2.1, 3.2);
      const hA_ = 13.5 + (AQ1 - 13.5) * p, hT_ = 10.5 - (10.5 - TE1) * p;
      const dA = (hA_ % 12) * 30, dT = (hT_ % 12) * 30;
      hA.setAttribute('transform', `rotate(${dA})`); hT.setAttribute('transform', `rotate(${dT})`); hV.setAttribute('transform', 'rotate(45)');
      arcA.setAttribute('d', p > 0.002 ? arc(45, dA, R - 30) : 'M0,0');
      arcT.setAttribute('d', p > 0.002 ? arc(315, dT, R - 30) : 'M0,0');
      const [ax, ay] = tip(dA, HR); lA.style.left = ax + 112 + 'px'; lA.style.top = ay + 14 + 'px';
      $('small', lA).textContent = fmt(hA_);
      const [tx, ty] = tip(dT, HR); lT.style.left = tx - 118 + 'px'; lT.style.top = ty - 8 + 'px';
      $('small', lT).textContent = fmt(hT_);
      const [vx, vy] = tip(45, HR); lV.style.left = vx - 40 + 'px'; lV.style.top = vy - 58 + 'px';
    });
    fadeUp('#i-kick', 0.15, 0.6); fadeUp('#i-t1', 0.3, 0.7, 30); fadeUp('#i-t2', 0.45, 0.7, 30);
    fadeUp('#i-plus', 0.75, 0.6); fadeUp('#i-sub', 1.05, 0.7);
    drawIn(ring, 0.4, 1.1);
    fadeIn(ticks, 0.8, 0.6);
    fadeIn([hT, hV, hA], 1.2, 0.5);
    fadeIn([lV, lA, lT], 1.5, 0.5);
    fadeIn('#i-dnote', 2.4, 0.6);
  })();

  /* =================== 2. PROBLEM =================== */
  (function problem() {
    const svg = $('#p-svg'), panel = $('#p-panel');
    const PX = h => 90 + ((h - 7) / 11) * 1520, f = h => 0.06 + 0.94 * Math.exp(-0.5 * Math.pow((h - 15.5) / 1.8, 2)), PY = v => 470 - v * 330;
    const axis = S('g', {}, svg);
    S('line', { x1: 70, y1: 470, x2: 1630, y2: 470, stroke: 'rgba(255,255,255,.3)', 'stroke-width': 2 }, axis);
    for (let h = 7; h <= 18; h++) {
      S('line', { x1: PX(h), y1: 470, x2: PX(h), y2: 478, stroke: 'rgba(255,255,255,.3)', 'stroke-width': 2 }, axis);
      if (h % 2 === 0) {
        const tx = S('text', { x: PX(h), y: 506, 'text-anchor': 'middle', fill: '#9ba6bd', 'font-size': 19, 'font-family': 'InterW, Inter', 'font-weight': 500 }, axis);
        tx.textContent = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
      }
    }
    const axl = S('text', { x: 1630, y: 448, 'text-anchor': 'end', fill: '#6b768f', 'font-size': 16, 'font-family': 'InterW, Inter', 'font-weight': 600, 'letter-spacing': '0.12em' }, axis);
    axl.textContent = 'LOCAL TIME OF DAY';
    // fire-activity curve (illustrative)
    const defs = S('defs', {}, svg);
    const grad = S('linearGradient', { id: 'fireg', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    S('stop', { offset: '0', 'stop-color': '#ff5a36', 'stop-opacity': 0.34 }, grad);
    S('stop', { offset: '1', 'stop-color': '#ff5a36', 'stop-opacity': 0 }, grad);
    const pts = []; for (let h = 7; h <= 18.0001; h += 0.05) pts.push([PX(h), PY(f(h))]);
    const area = S('path', { d: pathFrom(pts) + ` L${PX(18)},470 L${PX(7)},470 Z`, fill: 'url(#fireg)' }, svg);
    const curve = S('path', { d: pathFrom(pts), fill: 'none', stroke: '#ff5a36', 'stroke-width': 3.5 }, svg);
    const curveLab = E('div', { class: 'ann' }, panel, '<b style="color:#ff8a6a">Fire activity through the day</b><br>illustrative: the shape varies by region');
    Object.assign(curveLab.style, { left: '470px', top: '300px' });
    // markers
    const mk = (color, h0, pillTop, name, sub) => {
      const g = S('g', {}, svg);
      const ln = S('line', { x1: 0, y1: 470, x2: 0, y2: pillTop + 30, stroke: color, 'stroke-width': 3 }, g);
      const ring = S('circle', { cx: 0, cy: 470, r: 10, fill: 'none', stroke: color, 'stroke-width': 3, opacity: 0 }, g);
      S('circle', { cx: 0, cy: 470, r: 7, fill: color }, g);
      const pill = E('div', { class: 'mpill' }, panel, `${name}<span class="t"></span><span class="s">${sub}</span>`);
      pill.style.color = color; pill.style.top = pillTop + 'px';
      return { g, ln, ring, pill, set(h) { g.setAttribute('transform', `translate(${PX(h)},0)`); pill.style.left = PX(h) + 'px'; } };
    };
    const mT = mk('#a78bfa', 10.5, 22, 'TERRA', 'design time');
    const mV = mk('#2dd4bf', 13.5, 112, 'VIIRS', 'steady: the fixed clock');
    const mA = mk('#ffb547', 13.5, 22, 'AQUA', 'design time');
    const trail = S('line', { x1: PX(13.5), y1: 470, x2: PX(13.5), y2: 470, stroke: '#ffb547', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.45 }, svg);
    const trailT = S('line', { x1: PX(10.5), y1: 470, x2: PX(10.5), y2: 470, stroke: '#a78bfa', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.45 }, svg);
    const shiftLab = E('div', { class: 'ann' }, panel, '<b style="color:#ffb547">+2 h 20 min</b> later than designed');
    Object.assign(shiftLab.style, { left: PX(13.75) + 'px', top: '424px' });
    // dots + bracket (count shift)
    const hOld = 13.5, hNew = 15 + 50 / 60, yOld = PY(f(hOld)), yNew = PY(f(hNew)), bx = PX(16.75);
    const dotsG = S('g', {}, svg);
    S('line', { x1: PX(hOld), y1: yOld, x2: bx, y2: yOld, stroke: 'rgba(255,255,255,.45)', 'stroke-width': 1.5, 'stroke-dasharray': '5 6' }, dotsG);
    S('line', { x1: PX(hNew), y1: yNew, x2: bx, y2: yNew, stroke: 'rgba(255,255,255,.45)', 'stroke-width': 1.5, 'stroke-dasharray': '5 6' }, dotsG);
    S('path', { d: `M${bx - 8},${yOld} H${bx} V${yNew} H${bx - 8}`, fill: 'none', stroke: '#eaf0fa', 'stroke-width': 2.5 }, dotsG);
    S('circle', { cx: PX(hOld), cy: yOld, r: 9, fill: '#0b1120', stroke: '#ffb547', 'stroke-width': 3 }, dotsG);
    S('circle', { cx: PX(hNew), cy: yNew, r: 9, fill: '#ffb547' }, dotsG);
    const dotsLab = E('div', { class: 'ann' }, panel, '<b>same fires,</b><br><b>different count</b>');
    Object.assign(dotsLab.style, { left: bx + 14 + 'px', top: (yOld + yNew) / 2 - 30 + 'px', fontSize: '20px', background: 'rgba(14,21,37,.94)', padding: '6px 10px', borderRadius: '8px' });
    const src = E('div', { class: 'note' }, panel, 'Look times: team analysis of NASA FIRMS hotspots, Nov 2026 (Aqua over the Amazon; Terra at 25&ndash;50&deg;N). The fire curve is illustrative.');
    Object.assign(src.style, { position: 'absolute', left: '28px', top: '524px', fontSize: '16px' });

    const fmt = h => { let hh = Math.floor(h + 1e-9), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; }
      return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`; };
    const aStart = cue('p_130') + 0.55, aDur = 2.7, tStart = cue('p_terra') + 0.1, tDur = 1.5;
    updaters.push(t => {
      const pa = prog(t, aStart, aDur), pt = prog(t, tStart, tDur);
      const hA = 13.5 + (hNew - 13.5) * pa, hT = 10.5 - (10.5 - (8 + 55 / 60)) * pt;
      mA.set(hA); mT.set(hT); mV.set(13.5);
      $('.t', mA.pill).textContent = fmt(hA); $('.t', mT.pill).textContent = fmt(hT); $('.t', mV.pill).textContent = '1:30 PM';
      $('.s', mA.pill).textContent = pa > 0.98 ? 'Nov 2026, over the Amazon' : 'design time';
      $('.s', mT.pill).textContent = pt > 0.98 ? 'Nov 2026, 25–50°N' : 'design time';
      trail.setAttribute('x2', PX(hA)); trailT.setAttribute('x2', PX(hT));
      // snapshot pulse rings
      const sp = clamp((t - cue('p_snapshot')) / 0.9, 0, 1);
      [mT, mV, mA].forEach((m, k) => {
        const q = clamp((t - cue('p_snapshot') - k * 0.12) / 0.9, 0, 1);
        m.ring.setAttribute('r', 8 + q * 34); m.ring.setAttribute('opacity', q > 0 && q < 1 ? (1 - q) * 0.9 : 0);
      });
      void sp;
    });
    const s = scene('problem');
    fadeUp('#problem .head', s.start - 0.3, 0.6);
    fadeIn('#p-panel', s.start - 0.2, 0.5);
    fadeIn(axis, s.start + 0.1, 0.6);
    fadeIn([mT.pill, mV.pill, mA.pill], s.start + 0.35, 0.5);
    fadeIn([mT.g, mV.g, mA.g], s.start + 0.35, 0.5);
    fadeIn(shiftLab, aStart + aDur - 0.3, 0.5);
    drawIn(curve, cue('p_fire') + 0.05, 1.2);
    fadeIn(area, cue('p_fire') + 0.5, 0.8);
    fadeIn(curveLab, cue('p_fire') + 0.9, 0.5);
    fadeIn(dotsG, cue('p_counts') - 0.1, 0.5);
    fadeIn(dotsLab, cue('p_counts') + 0.3, 0.5);
    fadeIn(src, s.start + 1.0, 0.6);
    fadeUp('#p-callout', cue('p_brazil') - 0.15, 0.6, 26);
  })();

  /* =================== 3. METHOD =================== */
  (function method() {
    const svg = $('#m-svg'), chart = $('#m-chart');
    const YRS = []; for (let y = 2012; y <= 2025; y++) YRS.push(y);
    const V = [118, 135, 104, 142, 126, 158, 112, 121, 163, 134, 148, 139, 127, 116];
    const R = 0.5, M = [1.01, 0.99, 1.02, 0.98, 1.0, 1.01, 0.99, 1.0, 1.01, 1.03, 1.08, 1.15, 1.22, 1.3];
    const X = y => 80 + (y - 2012) * 60, Y = v => 530 - v * 2.6;
    const fixed = V.map(v => v * R), aqua = fixed.map((v, i) => v * M[i]);
    const band = S('rect', { x: X(2012) - 22, y: 70, width: X(2020) - X(2012) + 44, height: 460, fill: 'rgba(255,255,255,.04)', rx: 10 }, svg);
    const bandLab = S('text', { x: X(2016), y: 98, 'text-anchor': 'middle', fill: '#9ba6bd', 'font-size': 17, 'font-family': 'InterW, Inter', 'font-weight': 600, 'letter-spacing': '0.1em' }, svg);
    bandLab.textContent = 'BASELINE 2012–2020';
    const dband = S('rect', { x: X(2020) + 30, y: 70, width: X(2025) - X(2020) - 8, height: 460, fill: 'rgba(255,181,71,.05)', rx: 10 }, svg);
    const dbandLab = S('text', { x: X(2023), y: 98, 'text-anchor': 'middle', fill: '#ffb547', 'font-size': 17, 'font-family': 'InterW, Inter', 'font-weight': 600, 'letter-spacing': '0.1em' }, svg);
    dbandLab.textContent = 'DRIFT YEARS';
    const ax = S('g', {}, svg);
    S('line', { x1: 50, y1: 530, x2: 880, y2: 530, stroke: 'rgba(255,255,255,.3)', 'stroke-width': 2 }, ax);
    [2012, 2014, 2016, 2018, 2020, 2022, 2024].forEach(y => {
      const tx = S('text', { x: X(y), y: 558, 'text-anchor': 'middle', fill: '#9ba6bd', 'font-size': 17, 'font-family': 'InterW, Inter' }, ax);
      tx.textContent = y;
    });
    const yl = S('text', { x: 28, y: 300, 'text-anchor': 'middle', fill: '#6b768f', 'font-size': 15, 'font-family': 'InterW, Inter', 'font-weight': 600, transform: 'rotate(-90 28 300)', 'letter-spacing': '0.1em' }, ax);
    yl.textContent = 'HOTSPOT COUNT';
    const vLine = S('path', { d: pathFrom(YRS.map((y, i) => [X(y), Y(V[i])])), fill: 'none', stroke: '#2dd4bf', 'stroke-width': 3.5 }, svg);
    const vLab = S('text', { x: X(2025) + 10, y: Y(V[13]) + 6, fill: '#2dd4bf', 'font-size': 19, 'font-weight': 700, 'font-family': 'InterW, Inter' }, svg);
    vLab.textContent = 'VIIRS';
    const aBase = S('path', { d: pathFrom(YRS.slice(0, 9).map((y, i) => [X(y), Y(aqua[i])])), fill: 'none', stroke: '#ffb547', 'stroke-width': 3.5 }, svg);
    const aDrift = S('path', { d: pathFrom(YRS.slice(8).map((y, i) => [X(y), Y(aqua[i + 8])])), fill: 'none', stroke: '#ffb547', 'stroke-width': 3.5 }, svg);
    const aLab = S('text', { x: X(2025) + 10, y: Y(aqua[13]) - 2, fill: '#ffb547', 'font-size': 19, 'font-weight': 700, 'font-family': 'InterW, Inter' }, svg);
    aLab.textContent = 'Aqua';
    // ratio marker at 2016
    const rG = S('g', {}, svg);
    const yv = Y(V[4]), ya = Y(aqua[4]);
    S('line', { x1: X(2016), y1: yv + 10, x2: X(2016), y2: ya - 10, stroke: '#eaf0fa', 'stroke-width': 2, 'stroke-dasharray': '4 5' }, rG);
    S('circle', { cx: X(2016), cy: (yv + ya) / 2, r: 19, fill: '#121a2d', stroke: '#eaf0fa', 'stroke-width': 2 }, rG);
    const rT = S('text', { x: X(2016), y: (yv + ya) / 2 + 7, 'text-anchor': 'middle', fill: '#eaf0fa', 'font-size': 20, 'font-weight': 700, 'font-family': 'MonoW, monospace' }, rG);
    rT.textContent = 'R';
    // fixed line: morph from VIIRS down to VIIRS x R
    const fLine = S('path', { fill: 'none', stroke: '#7ee8da', 'stroke-width': 3, 'stroke-dasharray': '9 7' }, svg);
    const fLab = S('text', { x: X(2025) + 10, y: Y(fixed[13]) + 20, fill: '#7ee8da', 'font-size': 19, 'font-weight': 700, 'font-family': 'InterW, Inter', opacity: 0 }, svg);
    fLab.textContent = 'fixed';
    const gap = S('path', { d: pathFrom(YRS.slice(8).map((y, i) => [X(y), Y(aqua[i + 8])]).concat(YRS.slice(8).reverse().map((y, i) => [X(y), Y(fixed[13 - i])]))) + ' Z', fill: 'rgba(255,181,71,.25)' }, svg);
    const gapLab = E('div', { class: 'ann' }, chart, '<b style="color:#ffb547;font-size:22px">gap = L &minus; 1</b>');
    Object.assign(gapLab.style, { left: X(2022) - 30 + 'px', top: Y(aqua[11]) - 70 + 'px' });
    const foot = E('div', { class: 'note' }, chart, 'S-NPP and NOAA-20 are linked on their 2018&ndash;2025 overlap, so the fixed clock keeps running after S-NPP\'s shutdown (Nov 2, 2026).');
    Object.assign(foot.style, { position: 'absolute', left: '28px', top: '584px', width: '860px', fontSize: '16px' });
    const mStart = cue('m_times') + 0.1, mDur = 1.5;
    updaters.push(t => {
      const p = prog(t, mStart, mDur);
      fLine.setAttribute('d', pathFrom(YRS.map((y, i) => [X(y), Y(V[i] * (1 - (1 - R) * p))])));
      fLine.setAttribute('opacity', t < mStart ? 0 : Math.min(1, (t - mStart) / 0.2));
      fLab.setAttribute('opacity', clamp((t - mStart - mDur + 0.2) / 0.4, 0, 1));
    });
    const s = scene('method');
    fadeUp('#method .head', s.start - 0.3, 0.6);
    fadeIn('#m-chart', s.start - 0.2, 0.5);
    fadeIn(ax, s.start, 0.5);
    drawIn(vLine, cue('m_viirs') + 0.1, 1.1); fadeIn(vLab, cue('m_viirs') + 0.9, 0.4);
    fadeUp('#m-c1', cue('m_ratio') - 0.5, 0.6);
    fadeIn([band, bandLab], cue('m_2012') - 0.2, 0.6);
    drawIn(aBase, cue('m_ratio') - 0.3, 1.0); fadeIn(aLab, cue('m_ratio') + 0.5, 0.4);
    fadeIn(rG, cue('m_ratio') + 0.5, 0.5);
    fadeUp('#m-c2', cue('m_times') - 0.4, 0.6);
    fadeUp('#m-c3', cue('m_gap') - 0.3, 0.6);
    fadeIn([dband, dbandLab], cue('m_gap'), 0.6);
    drawIn(aDrift, cue('m_gap') + 0.2, 1.4);
    fadeIn(gap, cue('m_number') - 0.2, 0.7);
    fadeIn(gapLab, cue('m_number') + 0.2, 0.5);
    fadeIn(foot, cue('m_units'), 0.6);
  })();

  /* =================== 4. THE APP (built from data/mock) =================== */
  (function appScene() {
    const app = $('#app');
    E('div', { class: 'winbar' }, app, '<i></i><i></i><i></i><span class="wt">Illustrative preview &middot; the layout is up to the app team &middot; every number below comes from data/mock</span>');
    const head = E('div', { class: 'apphead' }, app);
    E('div', { class: 'name' }, head, 'Fixed-clock fire calendar <span class="tag-mock" style="font-size:14px">MOCK</span>');
    E('div', { class: 'right' }, head, '<span class="mono c-dim" style="font-size:14px">regions.json</span>');
    const chips = E('div', { class: 'chips' }, head);
    const chipEls = MK.regions.regions.map(r => E('div', { class: 'chip' + (r.featured ? ' sel' : '') }, chips, (r.featured ? STAR : '') + r.name));
    const card = (id, x, y, w, h, title, file) => {
      const c = E('div', { class: 'card', id }, app);
      Object.assign(c.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      E('div', { class: 'ch-h' }, c, `<span class="ttl">${title}</span><span class="tag-mock">MOCK</span><span class="file">${file}</span>`);
      return c;
    };

    // ---------- calendar ----------
    const cal = card('c-cal', 20, 182, 1040, 700, 'Burning-activity calendar &middot; Amazon (Brazil)', 'calendar/br-amazon.json');
    E('div', { class: 'sub' }, cal, 'unit: fixed-clock, Aqua-equivalent hotspots per month');
    const ctl = E('div', {}, cal); Object.assign(ctl.style, { position: 'absolute', right: '20px', top: '58px', display: 'flex', gap: '10px', alignItems: 'center' });
    const tog = E('div', { class: 'toggle' }, ctl, '<span class="on">Count</span><span>Anomaly vs. median</span>');
    const csv = E('div', { class: 'btn' }, ctl, 'CSV &darr;');
    const months = MK.calendar.months;
    const X0 = 84, Y0 = 124, CW = 64, CHh = 19, GX = 3, GY = 3;
    const cx = m => X0 + m * (CW + GX), cy = r => Y0 + r * (CHh + GY);
    'JFMAMJJASOND'.split('').forEach((l, m) => { const e = E('div', { class: 'mono c-dim' }, cal, l); Object.assign(e.style, { position: 'absolute', left: cx(m) + CW / 2 - 4 + 'px', top: Y0 - 24 + 'px', fontSize: '13px' }); });
    const years = []; for (let y = 2002; y <= 2026; y++) years.push(y);
    years.forEach((y, r) => { const e = E('div', { class: 'mono' }, cal, y); Object.assign(e.style, { position: 'absolute', left: '22px', top: cy(r) + 1 + 'px', fontSize: '12.5px', color: y % 2 ? '#4b556b' : '#7c879e' }); });
    const vmax = Math.max(...months.map(m => m.fixed));
    const SEQ = ['#1a2133', '#2c2150', '#5b2863', '#9a3159', '#d24d40', '#f5843a', '#fdc35e'];
    const seq = v => { const x = Math.sqrt(clamp(v / vmax, 0, 1)) * (SEQ.length - 1), k = Math.min(Math.floor(x), SEQ.length - 2); return lerpC(SEQ[k], SEQ[k + 1], x - k); };
    const div = a => { const x = clamp(a / 60, -1, 1), mid = '#1d2436'; return x >= 0 ? lerpC(mid, '#ff7a3c', Math.pow(x, 0.75)) : lerpC(mid, '#4c8dff', Math.pow(-x, 0.75)); };
    const layer = (cls) => { const L = E('div', { class: cls }, cal); Object.assign(L.style, { position: 'absolute', left: 0, top: 0 }); return L; };
    const skel = layer('l-skel'), Lc = layer('l-count'), La = layer('l-anom'), Lf = layer('l-flags');
    const rowsC = [], rowsA = [];
    years.forEach((y, r) => { rowsC.push(E('div', {}, Lc)); rowsA.push(E('div', {}, La)); });
    months.forEach(m => {
      const [yy, mm] = m.ym.split('-').map(Number), r = yy - 2002, c = mm - 1;
      const pos = { left: cx(c) + 'px', top: cy(r) + 'px', width: CW + 'px', height: CHh + 'px' };
      Object.assign(E('div', { class: 'cell' }, skel).style, pos, { background: '#151c2c' });
      Object.assign(E('div', { class: 'cell' }, rowsC[r]).style, pos, { background: seq(m.fixed) });
      Object.assign(E('div', { class: 'cell' }, rowsA[r]).style, pos, { background: div(m.anomaly_pct) });
      if (m.flags.includes('provisional')) Object.assign(E('div', { class: 'cell' }, Lf).style, pos, { background: 'repeating-linear-gradient(135deg, rgba(0,0,0,.45) 0 4px, transparent 4px 8px)' });
      if (m.flags.includes('outage')) Object.assign(E('div', { class: 'cell' }, Lf).style, pos, { outline: '2px dashed #eaf0fa', outlineOffset: '-3px' });
    });
    // legends
    const legend = (title, stops, labels) => {
      const L = E('div', {}, cal); Object.assign(L.style, { position: 'absolute', left: '930px', top: '150px', width: '100px' });
      E('div', { class: 'c-dim' }, L, title).style.cssText = 'font-size:12px;font-weight:700;letter-spacing:.08em;margin-bottom:10px';
      const bar = E('div', {}, L); bar.style.cssText = `width:18px;height:300px;border-radius:5px;background:linear-gradient(0deg,${stops.join(',')})`;
      labels.forEach(([txt, frac]) => { const e = E('div', { class: 'mono' }, L, txt); e.style.cssText = `position:absolute;left:26px;top:${28 + (1 - frac) * 300 - 8}px;font-size:12.5px;color:#9ba6bd`; });
      return L;
    };
    const legC = legend('COUNT', SEQ, [[Math.round(vmax / 1000) + 'k', 1], [Math.round(vmax / 4000) + 'k', 0.5], ['0', 0]]);
    const legA = legend('ANOMALY', [div(-60), div(-30), div(0), div(30), div(60)], [['+60%', 1], ['0', 0.5], ['−60%', 0]]);
    const flagKey = E('div', {}, cal, '<span style="display:inline-block;width:14px;height:10px;margin-right:6px;background:repeating-linear-gradient(135deg,#9ba6bd 0 2px,transparent 2px 4px)"></span>provisional (2026)<br><span style="display:inline-block;width:12px;height:8px;margin-right:6px;outline:1.5px dashed #eaf0fa"></span>outage');
    flagKey.style.cssText = 'position:absolute;left:930px;top:500px;font-size:12.5px;line-height:1.9;color:#9ba6bd';
    // year sweep highlight ("every month since 2002")
    const sweep = E('div', {}, cal);
    sweep.style.cssText = `position:absolute;left:${X0 - 66}px;width:${12 * (CW + GX) + 66}px;height:${CHh + 4}px;border-radius:5px;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.55);opacity:0`;
    updaters.push(t => {
      const t0 = cue('a_calendar') + 0.55, p = clamp((t - t0) / 1.4, 0, 1);
      sweep.style.top = cy(0) - 2 + p * (cy(24) - cy(0)) + 'px';
      sweep.style.opacity = t < t0 - 0.1 || t > t0 + 1.7 ? 0 : clamp(Math.min((t - t0 + 0.1) / 0.15, (t0 + 1.7 - t) / 0.2), 0, 1);
    });
    // tooltip on Sep 2022
    const tm = months.find(m => m.ym === '2022-09');
    const tr = 2022 - 2002, tc = 8;
    const hl = E('div', {}, cal); hl.style.cssText = `position:absolute;left:${cx(tc) - 3}px;top:${cy(tr) - 3}px;width:${CW + 6}px;height:${CHh + 6}px;border:2.5px solid #fff;border-radius:5px`;
    const tip = E('div', { class: 'tip' }, cal,
      `<div style="font-weight:700;font-size:15px;margin-bottom:6px">Sep 2022 <span class="tag-mock" style="font-size:10px;margin-left:6px">MOCK</span></div>` +
      `<div><span class="k">fixed</span><span class="v">${fmtInt(tm.fixed)}</span></div>` +
      `<div><span class="k">lo &ndash; hi</span><span class="v">${fmtInt(tm.lo)}&ndash;${fmtInt(tm.hi)}</span></div>` +
      `<div><span class="k">median_ref</span><span class="v">${fmtInt(tm.median_ref)}</span></div>` +
      `<div><span class="k">anomaly_pct</span><span class="v" style="color:#ff9a66">+${tm.anomaly_pct}%</span></div>` +
      `<div><span class="k">aqua / snpp / noaa20</span></div><div class="v" style="float:none;text-align:right">${fmtInt(tm.aqua)} / ${fmtInt(tm.snpp)} / ${fmtInt(tm.noaa20)}</div>`);
    Object.assign(tip.style, { left: cx(tc) - 270 - 16 + 'px', top: cy(tr) - 170 + 'px' });

    // ---------- audit ----------
    const au = card('c-audit', 1080, 182, 620, 700, 'Clock audit &middot; Amazon', 'audit/br-amazon.json');
    const B = MK.audit.baseline;
    E('div', { class: 'sub' }, au, `baseline ${B.years} &middot; R = ${B.ratio} &middot; noise floor &plusmn;${Math.round(B.noise_floor * 100)}%`);
    const asvg = S('svg', { width: 620, height: 440, style: 'position:absolute;left:0;top:0;overflow:visible' }, au);
    const AY = g => 420 - ((g + 10) / 45) * 300, AX = i => 130 + i * 105;
    S('rect', { x: 70, y: AY(B.noise_floor * 100), width: 520, height: AY(-B.noise_floor * 100) - AY(B.noise_floor * 100), fill: 'rgba(255,255,255,.06)' }, asvg);
    const nfl = S('text', { x: 584, y: AY(-B.noise_floor * 100) - 8, 'text-anchor': 'end', fill: '#6b768f', 'font-size': 12, 'font-family': 'InterW, Inter' }, asvg); nfl.textContent = 'noise floor';
    [-10, 0, 10, 20, 30].forEach(g => {
      S('line', { x1: 70, y1: AY(g), x2: 590, y2: AY(g), stroke: g === 0 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.06)', 'stroke-width': g === 0 ? 1.5 : 1 }, asvg);
      const tx = S('text', { x: 60, y: AY(g) + 4, 'text-anchor': 'end', fill: '#6b768f', 'font-size': 12, 'font-family': 'MonoW, monospace' }, asvg); tx.textContent = (g > 0 ? '+' : g < 0 ? '−' : '') + Math.abs(g) + '%';
    });
    const aPts = MK.audit.years.map((y, i) => {
      const yr = S('text', { x: AX(i), y: 440, 'text-anchor': 'middle', fill: '#9ba6bd', 'font-size': 13, 'font-family': 'MonoW, monospace' }, asvg); yr.textContent = y.year;
      const g = S('g', {}, asvg);
      const lo = (y.L_lo - 1) * 100, hi = (y.L_hi - 1) * 100;
      const eb = S('g', {}, g);
      S('line', { x1: AX(i), y1: AY(lo), x2: AX(i), y2: AY(hi), stroke: '#ffb547', 'stroke-width': 2.5 }, eb);
      S('line', { x1: AX(i) - 8, y1: AY(lo), x2: AX(i) + 8, y2: AY(lo), stroke: '#ffb547', 'stroke-width': 2.5 }, eb);
      S('line', { x1: AX(i) - 8, y1: AY(hi), x2: AX(i) + 8, y2: AY(hi), stroke: '#ffb547', 'stroke-width': 2.5 }, eb);
      S('circle', { cx: AX(i), cy: AY(y.gap_pct), r: 8, fill: '#ffb547' }, g);
      const lb = S('text', { x: AX(i) + 14, y: AY(y.gap_pct) + 5, fill: '#eaf0fa', 'font-size': 14, 'font-weight': 700, 'font-family': 'MonoW, monospace' }, g);
      lb.textContent = (y.gap_pct > 0 ? '+' : '') + y.gap_pct + '%';
      return { g, eb };
    });
    const tbl = E('div', { class: 'ctable' }, au); tbl.style.top = '462px';
    E('div', { class: 'r h' }, tbl, '<span>year</span><span>aqua_count</span><span>fixed_count</span><span>gap_pct</span><span>L_strat</span>');
    const tRows = MK.audit.years.map(y => E('div', { class: 'r' }, tbl, `<span>${y.year}</span><span>${fmtInt(y.aqua_count)}</span><span>${fmtInt(y.fixed_count)}</span><span style="color:#ffb547">${y.gap_pct > 0 ? '+' : ''}${y.gap_pct}%</span><span>${y.L_strat}</span>`));

    // ---------- drift ----------
    const dr = card('c-drift', 20, 902, 640, 320, 'Drift chart', 'drift/br-amazon.json');
    E('div', { class: 'sub' }, dr, 'local solar time each satellite looked, by year');
    const dsvg = S('svg', { width: 640, height: 320, style: 'position:absolute;left:0;top:0;overflow:visible' }, dr);
    const hm = s => { const [h, m] = s.split(':').map(Number); return h + m / 60; };
    const DX = y => 70 + (y - 2012) * 34, DY = h => 290 - ((h - 9.5) / 5) * 196;
    [10, 12, 14].forEach(h => {
      S('line', { x1: 70, y1: DY(h), x2: 590, y2: DY(h), stroke: 'rgba(255,255,255,.07)' }, dsvg);
      const tx = S('text', { x: 60, y: DY(h) + 4, 'text-anchor': 'end', fill: '#6b768f', 'font-size': 12, 'font-family': 'MonoW, monospace' }, dsvg); tx.textContent = h + ':00';
    });
    [2012, 2016, 2020, 2024].forEach(y => { const tx = S('text', { x: DX(y), y: 310, 'text-anchor': 'middle', fill: '#6b768f', 'font-size': 12, 'font-family': 'MonoW, monospace' }, dsvg); tx.textContent = y; });
    const dyrs = MK.drift.years;
    const dl = (key, color) => S('path', { d: pathFrom(dyrs.map(y => [DX(y.year), DY(hm(y[key]))])), fill: 'none', stroke: color, 'stroke-width': 3 }, dsvg);
    const dV = dl('viirs_lst', '#2dd4bf'), dA = dl('aqua_lst', '#ffb547'), dT = dl('terra_lst', '#a78bfa');
    const dlab = (txt, key, color, dy) => { const e = S('text', { x: DX(2026) + 8, y: DY(hm(dyrs[dyrs.length - 1][key])) + dy, fill: color, 'font-size': 13, 'font-weight': 700, 'font-family': 'InterW, Inter' }, dsvg); e.textContent = txt; return e; };
    const dLabs = [dlab('Aqua', 'aqua_lst', '#ffb547', -6), dlab('VIIRS', 'viirs_lst', '#2dd4bf', 12), dlab('Terra', 'terra_lst', '#a78bfa', 5)];

    // ---------- two clocks ----------
    const tc2 = card('c-two', 680, 902, 1020, 320, `<span style="display:inline-flex;align-items:center;gap:8px">Two-clocks test <span style="color:#ffd43b;display:inline-flex;align-items:center;gap:4px;font-size:14px">${STAR} centerpiece</span></span>`, 'twoclocks/br-amazon.json');
    E('div', { class: 'sub' }, tc2, 'A = Aqua &divide; VIIRS, T = Terra &divide; VIIRS, each vs. 2012&ndash;2020 (1 = no change)');
    const tsvg = S('svg', { width: 1020, height: 320, style: 'position:absolute;left:0;top:0;overflow:visible' }, tc2);
    const TY = r => 290 - ((r - 0.78) / 0.48) * 196, TX = y => 70 + (y - 2012) * 41;
    const tyrs = MK.twoclocks.years;
    [0.8, 1.0, 1.2].forEach(r => {
      S('line', { x1: 70, y1: TY(r), x2: 610, y2: TY(r), stroke: r === 1 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.07)', 'stroke-dasharray': r === 1 ? '5 5' : '' }, tsvg);
      const tx = S('text', { x: 60, y: TY(r) + 4, 'text-anchor': 'end', fill: '#6b768f', 'font-size': 12, 'font-family': 'MonoW, monospace' }, tsvg); tx.textContent = r.toFixed(1);
    });
    [2012, 2016, 2020, 2024].forEach(y => { const tx = S('text', { x: TX(y), y: 310, 'text-anchor': 'middle', fill: '#6b768f', 'font-size': 12, 'font-family': 'MonoW, monospace' }, tsvg); tx.textContent = y; });
    const bandP = (lo, hi) => pathFrom(tyrs.map(y => [TX(y.year), TY(y[hi])]).concat(tyrs.slice().reverse().map(y => [TX(y.year), TY(y[lo])]))) + ' Z';
    const bA = S('path', { d: bandP('A_lo', 'A_hi'), fill: 'rgba(255,181,71,.16)' }, tsvg);
    const bT = S('path', { d: bandP('T_lo', 'T_hi'), fill: 'rgba(167,139,250,.18)' }, tsvg);
    const lA = S('path', { d: pathFrom(tyrs.map(y => [TX(y.year), TY(y.A)])), fill: 'none', stroke: '#ffb547', 'stroke-width': 3 }, tsvg);
    const lT = S('path', { d: pathFrom(tyrs.map(y => [TX(y.year), TY(y.T)])), fill: 'none', stroke: '#a78bfa', 'stroke-width': 3 }, tsvg);
    const last = tyrs[tyrs.length - 1];
    const arrowsG = S('g', {}, tsvg);
    const arw = (x, y, up, color) => S('path', { d: up ? `M${x},${y + 16} V${y - 10} M${x - 7},${y - 3} L${x},${y - 11} L${x + 7},${y - 3}` : `M${x},${y - 16} V${y + 10} M${x - 7},${y + 3} L${x},${y + 11} L${x + 7},${y + 3}`, stroke: color, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, arrowsG);
    arw(TX(2025) + 22, TY(last.A) - 6, true, '#ffb547'); arw(TX(2025) + 22, TY(last.T) + 6, false, '#a78bfa');
    const tl1 = S('text', { x: TX(2025) + 36, y: TY(last.A) - 2, fill: '#ffb547', 'font-size': 14, 'font-weight': 700, 'font-family': 'InterW, Inter' }, arrowsG); tl1.textContent = 'A (Aqua, later)';
    const tl2 = S('text', { x: TX(2025) + 36, y: TY(last.T) + 10, fill: '#a78bfa', 'font-size': 14, 'font-weight': 700, 'font-family': 'InterW, Inter' }, arrowsG); tl2.textContent = 'T (Terra, earlier)';
    // clock effect mini chart
    const KX = y => 790 + (y - 2012) * 15.5, KY = v => 290 - ((v + 0.12) / 0.6) * 150;
    const kG = S('g', {}, tsvg);
    const kt = S('text', { x: 780, y: 108, fill: '#eaf0fa', 'font-size': 15, 'font-weight': 700, 'font-family': 'MonoW, monospace' }, kG); kt.textContent = 'clock = log A − log T';
    const ks = S('text', { x: 780, y: 128, fill: '#9ba6bd', 'font-size': 13, 'font-family': 'InterW, Inter' }, kG); ks.textContent = 'shared orbit-sampling effect cancels';
    S('line', { x1: 780, y1: KY(0), x2: 1000, y2: KY(0), stroke: 'rgba(255,255,255,.35)', 'stroke-dasharray': '4 4' }, kG);
    S('path', { d: pathFrom(tyrs.map(y => [KX(y.year), KY(y.clock_hi)]).concat(tyrs.slice().reverse().map(y => [KX(y.year), KY(y.clock_lo)]))) + ' Z', fill: 'rgba(234,240,250,.12)' }, kG);
    const kL = S('path', { d: pathFrom(tyrs.map(y => [KX(y.year), KY(y.clock_diff)])), fill: 'none', stroke: '#eaf0fa', 'stroke-width': 3 }, kG);
    const k0 = S('text', { x: 1000, y: 304, 'text-anchor': 'end', fill: '#6b768f', 'font-size': 12, 'font-family': 'MonoW, monospace' }, kG); k0.textContent = 'dashed line: 0 = no clock effect';

    // ---------- California ----------
    const ca = card('c-ca', 20, 1242, 1180, 300, 'California check &middot; detection limits vs. recorded fires', 'detection_limits_california.json &middot; socal_seen_missed.json');
    const csvg = S('svg', { width: 1180, height: 300, style: 'position:absolute;left:0;top:0;overflow:visible' }, ca);
    const ct = S('text', { x: 22, y: 82, fill: '#9ba6bd', 'font-size': 14, 'font-family': 'InterW, Inter' }, csvg); ct.textContent = 'a50: the fire size each satellite catches half the time (acres, log scale)';
    const LX = a => 170 + (Math.log10(a / 100) / Math.log10(30)) * 440;
    [100, 300, 1000, 3000].forEach(a => {
      S('line', { x1: LX(a), y1: 100, x2: LX(a), y2: 262, stroke: 'rgba(255,255,255,.07)' }, csvg);
      const tx = S('text', { x: LX(a), y: 282, 'text-anchor': 'middle', fill: '#6b768f', 'font-size': 12, 'font-family': 'MonoW, monospace' }, csvg); tx.textContent = fmtInt(a);
    });
    const SAT = [['S-NPP', 'VIIRS (S-NPP)', '#2dd4bf'], ['Aqua', 'Aqua (MODIS)', '#ffb547'], ['Terra', 'Terra (MODIS)', '#a78bfa']];
    const bars = SAT.map(([key, name, color], i) => {
      const s = MK.limits.satellites[key], y = 118 + i * 50;
      const nm = S('text', { x: 22, y: y + 21, fill: color, 'font-size': 15, 'font-weight': 700, 'font-family': 'InterW, Inter' }, csvg); nm.textContent = name;
      const bar = S('rect', { x: 170, y, width: Math.max(2, LX(s.a50_acres) - 170), height: 30, rx: 6, fill: color, opacity: 0.85 }, csvg);
      const wk = S('g', { opacity: 0 }, csvg);
      S('line', { x1: LX(s.a50_ci95[0]), y1: y + 15, x2: LX(s.a50_ci95[1]), y2: y + 15, stroke: '#eaf0fa', 'stroke-width': 2 }, wk);
      [s.a50_ci95[0], s.a50_ci95[1]].forEach(v => S('line', { x1: LX(v), y1: y + 7, x2: LX(v), y2: y + 23, stroke: '#eaf0fa', 'stroke-width': 2 }, wk));
      const val = S('text', { x: LX(s.a50_ci95[1]) + 10, y: y + 21, fill: '#eaf0fa', 'font-size': 14, 'font-family': 'MonoW, monospace', opacity: 0 }, csvg); val.textContent = fmtInt(s.a50_acres);
      bar.style.transformBox = 'fill-box'; bar.style.transformOrigin = 'left center';
      return { bar, wk, val };
    });
    // seen vs missed map
    const sc = MK.socal, MC = { x: 900, y: 186 }, RK = 98 / sc.radius_km;
    S('circle', { cx: MC.x, cy: MC.y, r: 98, fill: 'rgba(255,255,255,.025)', stroke: 'rgba(255,255,255,.22)', 'stroke-dasharray': '4 5' }, csvg);
    S('path', { d: `M${MC.x - 7},${MC.y} H${MC.x + 7} M${MC.x},${MC.y - 7} V${MC.y + 7}`, stroke: '#eaf0fa', 'stroke-width': 2 }, csvg);
    const cl = S('text', { x: MC.x, y: MC.y + 22, 'text-anchor': 'middle', fill: '#eaf0fa', 'font-size': 12, 'font-weight': 700, 'font-family': 'InterW, Inter', 'paint-order': 'stroke', stroke: '#0e1525', 'stroke-width': 4 }, csvg); cl.textContent = 'Chino Hills';
    const rl = S('text', { x: 1036, y: 262, 'text-anchor': 'start', fill: '#6b768f', 'font-size': 12, 'font-family': 'InterW, Inter' }, csvg); rl.textContent = `fires within ${sc.radius_km} km`;
    const mt = S('text', { x: 760, y: 76, fill: '#9ba6bd', 'font-size': 14, 'font-family': 'InterW, Inter' }, csvg); mt.textContent = 'seen vs. missed: which satellites caught each recorded fire';
    const cosl = Math.cos((sc.center.lat * Math.PI) / 180);
    const dots = sc.fires.map(fz => {
      const dx = (fz.lon - sc.center.lon) * 111.32 * cosl * RK, dy = -(fz.lat - sc.center.lat) * 110.57 * RK;
      const viirs = !!fz.viirs, modis = !!(fz.aqua || fz.terra);
      const r = 3 + Math.min(6, Math.log10(Math.max(fz.acres, 1)) * 1.6);
      const color = viirs && modis ? '#eaf0fa' : viirs ? '#2dd4bf' : modis ? '#ffb547' : null;
      return S('circle', color ? { cx: MC.x + dx, cy: MC.y + dy, r, fill: color, opacity: 0 } : { cx: MC.x + dx, cy: MC.y + dy, r, fill: 'none', stroke: '#6b768f', 'stroke-width': 1.5, opacity: 0 }, csvg);
    });
    const leg = E('div', {}, ca, '<div><span style="color:#eaf0fa">&#9679;</span> both</div><div><span style="color:#2dd4bf">&#9679;</span> VIIRS only</div><div><span style="color:#ffb547">&#9679;</span> MODIS only</div><div><span style="color:#6b768f">&#9675;</span> seen by none</div>');
    leg.style.cssText = 'position:absolute;left:1036px;top:104px;font-size:13px;line-height:2;color:#9ba6bd';

    // ---------- checks ----------
    const ck = card('c-checks', 1220, 1242, 480, 300, 'How do we know?', 'checks.json');
    const ckRows = MK.checks.checks.map((c, i) => {
      const r = E('div', { class: 'chk' }, ck, `<span class="st">${c.status.toUpperCase()}</span><span class="id">${c.id}</span><span style="overflow:hidden;text-overflow:ellipsis">${c.name}</span>`);
      Object.assign(r.style, { position: 'absolute', left: '20px', right: '16px', top: 58 + i * 23.5 + 'px' });
      return r;
    });

    // ---------- camera (pure function of t) ----------
    const BOX = { x: 60, y: 168, w: 1800, h: 770 };
    const focus = (x, y, w, h, smax = 2) => {
      const s = Math.min(BOX.w / w, BOX.h / h, smax);
      let tx = BOX.x + BOX.w / 2 - (x + w / 2) * s, ty = BOX.y + BOX.h / 2 - (y + h / 2) * s;
      if (1720 * s >= BOX.w) tx = clamp(tx, BOX.x + BOX.w - 1720 * s, BOX.x);
      if (1562 * s >= BOX.h) ty = clamp(ty, BOX.y + BOX.h - 1562 * s, BOX.y);
      return { s, tx, ty };
    };
    const K = [
      { t: 0, cam: focus(0, 0, 1720, 882), on: ['c-cal', 'c-audit'], lbl: 'reads', files: 'regions.json' },
      { t: cue('a_calendar') - 0.25, cam: focus(20, 182, 1040, 700), on: ['c-cal'], lbl: 'reads', files: 'calendar/br-amazon.json' },
      { t: cue('a_audit') - 0.2, cam: focus(1080, 182, 620, 700), on: ['c-audit'], lbl: 'reads', files: 'audit/br-amazon.json' },
      { t: cue('a_drift') - 0.35, cam: focus(20, 902, 1680, 320), on: ['c-drift', 'c-two'], lbl: 'reads', files: 'drift/br-amazon.json · twoclocks/br-amazon.json' },
      { t: cue('a_terra') - 0.45, cam: focus(680, 902, 1020, 320), on: ['c-two'], lbl: 'reads', files: 'twoclocks/br-amazon.json' },
      { t: cue('a_california') - 0.3, cam: focus(20, 1242, 1680, 300), on: ['c-ca', 'c-checks'], lbl: 'reads', files: 'detection_limits_california.json · socal_seen_missed.json · checks.json' },
    ];
    const MOVE = 1.0;
    const cards = ['c-cal', 'c-audit', 'c-drift', 'c-two', 'c-ca', 'c-checks'].map(id => $('#' + id));
    const appEl = $('#app'), lbl = $('#a-lbl'), files = $('#a-files'), reads = $('#a-reads');
    updaters.push(t => {
      let k = 0; while (k + 1 < K.length && t >= K[k + 1].t) k++;
      const prev = K[Math.max(0, k - 1)], cur = K[k];
      const p = k === 0 ? 1 : prog(t, cur.t, MOVE);
      const cam = { s: prev.cam.s + (cur.cam.s - prev.cam.s) * p, tx: prev.cam.tx + (cur.cam.tx - prev.cam.tx) * p, ty: prev.cam.ty + (cur.cam.ty - prev.cam.ty) * p };
      appEl.style.transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`;
      cards.forEach(c => {
        const a = prev.on.includes(c.id) ? 1 : 0.32, b = cur.on.includes(c.id) ? 1 : 0.32;
        c.style.opacity = a + (b - a) * p;
      });
      // chip label swaps with a quick dip
      const sw = k > 0 ? clamp(Math.abs(t - cur.t - 0.1) / 0.18, 0, 1) : 1;
      if (lbl.textContent !== cur.lbl) lbl.textContent = cur.lbl;
      if (files.textContent !== cur.files) files.textContent = cur.files;
      reads.style.opacity = sw * 0.9 + 0.1;
      // region chips sweep
      chipEls.forEach((c, i) => {
        const g = bump(t, cue('a_six') - 0.2 + i * 0.17, 0.5);
        c.style.boxShadow = g > 0 ? `0 0 0 ${3 * g}px rgba(45,212,191,${0.75 * g})` : 'none';
      });
      // calendar toggle state + CSV pulse
      const anom = t >= cue('a_anomaly') - 0.1;
      tog.children[0].classList.toggle('on', !anom); tog.children[1].classList.toggle('on', anom);
      const cp = bump(t, cue('a_csv') - 0.1, 0.8);
      csv.style.boxShadow = cp > 0 ? `0 0 0 ${4 * cp}px rgba(255,212,59,${0.8 * cp})` : 'none';
      csv.style.borderColor = cp > 0.2 ? '#ffd43b' : '';
      // two-clocks card glow at "centerpiece"
      const gl = clamp((t - cue('a_centerpiece') + 0.1) / 0.4, 0, 1) * (t < cue('a_california') - 0.3 ? 1 : 0);
      tc2.style.borderColor = gl > 0 ? `rgba(255,212,59,${0.25 + 0.5 * gl})` : '';
      tc2.style.boxShadow = gl > 0 ? `0 0 0 ${2 * gl}px rgba(255,212,59,${0.25 * gl})` : 'none';
    });

    // ---------- element animations ----------
    const s = scene('app');
    rowsC.forEach((r, i) => tl.fromTo(r, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' }, cue('a_calendar0') - 0.3 + i * 0.045));
    tl.fromTo(La, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, cue('a_anomaly') - 0.1);
    tl.fromTo(Lf, { opacity: 0 }, { opacity: 1, duration: 0.4 }, cue('a_calendar0') + 1.0);
    tl.fromTo(legC, { opacity: 0 }, { opacity: 1, duration: 0.4 }, cue('a_calendar0') + 0.8);
    tl.to(legC, { opacity: 0, duration: 0.5 }, cue('a_anomaly') - 0.1);
    tl.fromTo(legA, { opacity: 0 }, { opacity: 1, duration: 0.5 }, cue('a_anomaly') - 0.1);
    fadeIn(flagKey, cue('a_calendar0') + 1.0, 0.4);
    tl.fromTo([tip, hl], { opacity: 0 }, { opacity: 1, duration: 0.35 }, cue('a_median') - 0.6);
    tl.to([tip, hl], { opacity: 0, duration: 0.3 }, cue('a_audit') - 0.3);
    aPts.forEach((p, i) => {
      tl.fromTo(p.g, { opacity: 0 }, { opacity: 1, duration: 0.3 }, cue('a_gap') - 0.3 + i * 0.28);
      tl.fromTo(tRows[i], { opacity: 0 }, { opacity: 1, duration: 0.3 }, cue('a_gap') - 0.3 + i * 0.28);
      tl.to(p.eb, { opacity: 0.35, duration: 0.18, yoyo: true, repeat: 1 }, cue('a_error') + i * 0.08);
    });
    [dV, dA, dT].forEach((p, i) => drawIn(p, cue('a_drift') + 0.4 + i * 0.12, 1.1));
    fadeIn(dLabs, cue('a_drift') + 1.3, 0.4);
    drawIn(lA, cue('a_terra') - 0.05, 1.2); drawIn(lT, cue('a_terra') + 0.1, 1.2);
    fadeIn([bA, bT], cue('a_terra') + 0.6, 0.6);
    fadeIn(arrowsG, cue('a_opposite') - 0.1, 0.5);
    fadeIn(kG, cue('a_isolates') - 0.4, 0.4); drawIn(kL, cue('a_isolates') - 0.2, 1.0);
    bars.forEach((b, i) => {
      tl.fromTo(b.bar, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.7, ease: 'power3.out' }, cue('a_california') + 0.5 + i * 0.18);
      tl.fromTo([b.wk, b.val], { opacity: 0 }, { opacity: 1, duration: 0.4 }, cue('a_california') + 1.1 + i * 0.18);
    });
    dots.forEach((d, i) => tl.fromTo(d, { opacity: 0 }, { opacity: 1, duration: 0.2 }, cue('a_recorded') - 0.6 + i * 0.022));
    ckRows.forEach((r, i) => tl.fromTo(r, { opacity: 0.0 }, { opacity: 1, duration: 0.25 }, cue('a_how') - 0.4 + i * 0.07));
  })();

  /* =================== 5. DATA FLOW =================== */
  (function dataFlow() {
    const tree = $('#d-tree');
    const FILES = ['regions.json', 'calendar/<id>.json', 'audit/<id>.json', 'drift/<id>.json', 'twoclocks/<id>.json',
      'detection_limits_california.json', 'proof_california.json', 'socal_seen_missed.json', 'checks.json'];
    const fEls = FILES.map(f => E('div', { class: 'f' }, tree, f.replace('<id>', '<span class="id">&lt;id&gt;</span>')));
    const svg = $('#d-svg');
    const conn = (x1, y1, x2, y2, color, dashed) => {
      const mx = (x1 + x2) / 2;
      return S('path', { d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-dasharray': dashed ? '10 9' : '3 9', 'stroke-linecap': 'round', opacity: 0 }, svg);
    };
    const c1 = conn(530, 380, 620, 440, '#9ba6bd'), c2 = conn(530, 594, 620, 560, '#9ba6bd');
    const c3 = conn(1050, 497, 1130, 474, '#2dd4bf'), c4 = conn(1570, 474, 1640, 488, '#2dd4bf'), c5 = conn(1570, 795, 1640, 580, '#ffd43b', true);
    const pendLab = E('div', { class: 'note' }, $('#d-out'), 'real files land here as the pipeline runs');
    Object.assign(pendLab.style, { position: 'absolute', left: '24px', bottom: '16px', color: '#ffb547', fontSize: '16px' });
    updaters.push(t => { [c1, c2, c3, c4, c5].forEach(c => c.setAttribute('stroke-dashoffset', -t * 34)); });
    const s = scene('data');
    fadeUp('#data .head', s.start - 0.3, 0.6);
    fadeUp('#d-src1', s.start - 0.05, 0.6); fadeUp('#d-src2', s.start + 0.25, 0.6);
    fadeUp('#d-pipe', cue('d_python') - 0.4, 0.6);
    fadeIn([c1, c2], cue('d_python') - 0.2, 0.5);
    ['#d-st1', '#d-st2', '#d-st3', '#d-st4'].forEach((id, i) => fadeUp(id, cue('d_python') + 0.3 + i * 0.42, 0.45, 12));
    fadeUp('#d-out', cue('d_json') - 0.45, 0.6);
    fadeIn(c3, cue('d_json') - 0.3, 0.5);
    fEls.forEach((e, i) => fadeUp(e, cue('d_json') - 0.1 + i * 0.12, 0.35, 8));
    tl.to('#d-tree .id', { color: '#ffe08a', textShadow: '0 0 12px rgba(255,181,71,.8)', duration: 0.3, yoyo: true, repeat: 1 }, cue('d_one'));
    tl.to('#d-st4', { color: '#ffe08a', duration: 0.3, yoyo: true, repeat: 1 }, cue('d_one'));
    fadeUp('#d-app', cue('d_static') - 0.45, 0.6);
    fadeIn(c4, cue('d_static') - 0.2, 0.5);
    tl.to('#d-app', { borderColor: 'rgba(45,212,191,.8)', duration: 0.35, yoyo: true, repeat: 1 }, cue('d_reads'));
    tl.to('#d-out', { opacity: 0.55, duration: 0.5 }, cue('d_out') - 0.3);
    fadeIn(pendLab, cue('d_out') - 0.2, 0.5);
    tl.to(c4, { opacity: 0.25, duration: 0.5 }, cue('d_out') - 0.3);
    fadeUp('#d-mock', cue('d_build') - 0.5, 0.6);
    fadeIn(c5, cue('d_mock') - 0.2, 0.5);
    tl.to('#d-mock', { boxShadow: '0 0 0 3px rgba(255,212,59,.55)', duration: 0.4, yoyo: true, repeat: 1 }, cue('d_same'));
  })();

  /* =================== 6. RULES =================== */
  (function rules() {
    const s = scene('rules');
    fadeUp('#rules .head', s.start - 0.3, 0.6);
    const R = ['#r1', '#r2', '#r3', '#r4', '#r5'];
    R.forEach((id, i) => tl.fromTo(id, { opacity: 0, x: 30 }, { opacity: 0.3, x: 0, duration: 0.45, ease: 'power3.out' }, s.start + 0.05 + i * 0.07));
    R.forEach((id, i) => {
      const t0 = line('rules', i + 1).start - 0.15;
      tl.to(id, { opacity: 1, borderColor: 'rgba(45,212,191,.55)', duration: 0.35 }, t0);
      tl.to(id + ' .rn', { color: '#04201c', backgroundColor: '#2dd4bf', borderColor: '#2dd4bf', duration: 0.35 }, t0);
      const nxt = i + 2 <= 5 ? line('rules', i + 2).start - 0.15 : null;
      if (nxt) tl.to(id, { opacity: 0.72, borderColor: 'rgba(255,255,255,.08)', duration: 0.35 }, nxt);
    });
  })();

  /* =================== 7. OUTRO =================== */
  (function outro() {
    const s = scene('outro');
    fadeUp('#outro .head', s.start - 0.3, 0.6);
    ['#o1', '#o2', '#o3', '#o4'].forEach((id, i) => fadeUp(id, s.start - 0.1 + i * 0.22, 0.5, 14));
    fadeUp('#o-time', s.start + 0.4, 0.6);
    fadeIn('#o-credits', s.start + 0.9, 0.6);
  })();

  /* =================== seek API for the renderer =================== */
  window.__total = TM.total;
  window.__seek = t => { tl.seek(t, false); updaters.forEach(u => u(t)); };
  window.__ready = false;
  document.fonts.ready.then(() => { window.__seek(0); window.__ready = true; });
})();
