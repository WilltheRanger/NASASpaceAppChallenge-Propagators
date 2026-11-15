// SI: the Simulator's question-and-answer panel. Every answer is assembled from data the page already holds (the
// team's drift, audit and daylight files, and the past day's NASA FIRMS detections) by fixed rules: a question is matched
// to one of a few kinds, and the answer's sentences carry the sources their numbers come from. Nothing is generated, so
// nothing is invented; a question outside these kinds gets the list of what SI can answer.
import { REGIONS, daylightHeadline, fmtHM, fmtInt, hm, isValidation, regionData, verdictHeadline } from './data'
import { GROUP_NAME, SAT_NAMES, SENSOR, TOTALS, WINDOW, dayText, groupOf, lstOf, sightings, summary, utcOf, FRP, SAT, type Box } from './fires'
import { searchPlaces, type Place } from './places'

export type SiSource = { id: string; title: string; domain: string; url?: string }
export type SiSentence = { text: string; cite?: string[] }
export type SiAction =
  | { kind: 'fly'; label: string; place: Place }
  | { kind: 'filter'; label: string; group: 'terra' | 'aqua' | 'viirs' | 'all' }
  | { kind: 'clock'; label: string; clock: 'drifted' | 'fixed' }
export type SiAnswer = { sentences: SiSentence[]; sources: SiSource[]; actions?: SiAction[]; followUps?: string[] }
export type SiContext = { region: string | null; place: Place | null; view: Box | null; fire: number | null }

const SRC = {
  firms: { id: 'firms', title: 'NASA FIRMS active fires, past day: MODIS (Terra, Aqua), VIIRS (NOAA-20, NOAA-21)', domain: 'firms.modaps.eosdis.nasa.gov', url: 'https://firms.modaps.eosdis.nasa.gov' },
  drift: (id: string) => ({ id: `drift-${id}`, title: `Look times by year, ${regionData(id).name}`, domain: `data/out/drift/${id}.json` }),
  audit: (id: string) => ({ id: `audit-${id}`, title: `Audit against the fixed clock, ${regionData(id).name}`, domain: `data/out/audit/${id}.json` }),
  daylight: (id: string) => ({ id: `daylight-${id}`, title: `Daylight after the alert, ${regionData(id).name}`, domain: `data/out/daylight/${id}.json` }),
  method: { id: 'method', title: 'How the audit reads a fire count', domain: 'Anchor method notes' },
} as const

export const STARTERS = ['What am I looking at?', 'Which satellite saw this fire?', 'When does Aqua pass here?', 'What is the fix?']

const has = (q: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === 'string' ? q.includes(w) : w.test(q)))
const sat = (q: string): 'terra' | 'aqua' | 'viirs' | null => (has(q, 'aqua') ? 'aqua' : has(q, 'terra') ? 'terra' : has(q, 'viirs', 'noaa', 'suomi', 's-npp') ? 'viirs' : null)
const hours = (h: number | null) => (h == null ? 'no daytime detections here' : fmtHM(h))
const studiedIn = (q: string) => {
  const p = searchPlaces(q, 3).find((x) => x.kind === 'Studied region')
  return p?.region ?? null
}

function orientation(): SiAnswer {
  const s = summary(null)
  return {
    sentences: [
      { text: `The globe shows every daytime fire NASA’s satellites detected from ${dayText(WINDOW.start)} to ${dayText(WINDOW.end)}: ${fmtInt(TOTALS.reduce((a, b) => a + b, 0))} detections, coloured by the satellite that made them.`, cite: ['firms'] },
      { text: `Each satellite looks at a set local time: today VIIRS saw its fires around ${hours(s.viirs.lst)}, Aqua around ${hours(s.aqua.lst)} and Terra around ${hours(s.terra.lst)}.`, cite: ['firms'] },
      { text: 'Brazil’s official fire count follows Aqua alone, and Aqua used to look at about 13:30; the team audits what its later clock does to that count in six regions, framed in amber.', cite: ['method'] },
      { text: 'Click a fire to see which satellites saw it and when, search any place, or pick a region to compare Aqua’s two clocks.' },
    ],
    sources: [SRC.firms, SRC.method],
    followUps: ['Which satellite saw this fire?', 'What is the fix?', 'Show only Aqua'],
  }
}

function fireAnswer(i: number): SiAnswer {
  const who = sightings(i)
  const seen = who.filter((w) => w.i != null)
  const missed = who.filter((w) => w.i == null).map((w) => SAT_NAMES[w.sat])
  const t = utcOf(i)
  const first = [...seen].sort((a, b) => lstOf(a.i!) - lstOf(b.i!))[0]
  return {
    sentences: [
      { text: `This fire was detected by ${SAT_NAMES[SAT[i]]} (${SENSOR[SAT[i]]}) at ${fmtHM(lstOf(i))} local solar time, ${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} UTC on ${t.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getUTCMonth()]}, with a fire radiative power of ${fmtInt(FRP[i])} MW.`, cite: ['firms'] },
      { text: `Within 3 km that day: ${seen.map((w) => `${SAT_NAMES[w.sat]} at ${fmtHM(lstOf(w.i!))}`).join(', ')}.`, cite: ['firms'] },
      ...(missed.length ? [{ text: `${missed.join(' and ')} ${missed.length === 1 ? 'has' : 'have'} no daytime detection here in this window: ${missed.length === 1 ? 'it' : 'they'} may have passed at another time, at the edge of a swath, or under cloud.`, cite: ['firms'] }] : []),
      ...(first ? [{ text: `The earliest look was ${SAT_NAMES[first.sat]}’s, at ${fmtHM(lstOf(first.i!))}.` }] : []),
    ],
    sources: [SRC.firms],
    followUps: ['When does Aqua pass here?', 'What is the fix?'],
  }
}

function whenAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  const box = region ? (REGIONS.find((r) => r.id === region)!.bbox as unknown as Box) : ctx.view
  const s = summary(box)
  const where = region ? regionData(region).phrase.the : ctx.place?.name ?? (box ? 'the map’s view' : 'the world')
  const out: SiSentence[] = [
    { text: `In the past day over ${where}, the daytime detections put VIIRS at ${hours(s.viirs.lst)}, Aqua at ${hours(s.aqua.lst)} and Terra at ${hours(s.terra.lst)} local solar time (medians).`, cite: ['firms'] },
  ]
  const sources: SiSource[] = [SRC.firms]
  if (region) {
    const d = regionData(region)
    const first = d.drift[0], last = d.lastDrift
    if (first && last) {
      out.push({ text: `In the team’s files, Aqua’s look over ${d.phrase.the} moved from ${first.aqua_lst} in ${first.year} to ${last.aqua_lst} in ${last.year}, while VIIRS stayed near ${last.viirs_lst}.`, cite: [`drift-${region}`] })
      sources.push(SRC.drift(region))
    }
  } else if (s.aqua.lst != null && s.viirs.lst != null) {
    out.push({ text: `That is ${Math.round((s.aqua.lst - s.viirs.lst) * 60)} minutes between the two afternoon clocks here.`, cite: ['firms'] })
  }
  return { sentences: out, sources, followUps: region ? ['What is the fix?', 'How much daylight is left?'] : ['What is the fix?', 'Show only Aqua'] }
}

function fixAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  if (!region) {
    return {
      sentences: [
        { text: 'The fix puts Aqua back on the clock it kept from 2012 to 2020, about 13:30 local solar time, which the VIIRS satellites still keep.', cite: ['method'] },
        { text: 'The team turns VIIRS’s count into a benchmark of what Aqua would have counted on that clock, then compares it with what Aqua counted as it drifted.', cite: ['method'] },
        { text: 'Pick one of the six studied regions to see the two side by side.' },
      ],
      sources: [SRC.method],
      actions: REGIONS.slice(0, 3).map((r) => ({ kind: 'fly' as const, label: `Fly to ${r.name.replace(/ \(.*\)$/, '')}`, place: searchPlaces(r.name, 1)[0] })).filter((a) => a.place),
    }
  }
  const d = regionData(region)
  const y = d.latestOk
  const out: SiSentence[] = [{ text: `${verdictHeadline(d)}.`, cite: [`audit-${region}`] }]
  if (y && y.fixed != null && y.verdict !== 'na') {
    out.push({ text: `On the days both satellites returned data in ${y.year}, Aqua counted ${fmtInt(y.aqua)} daytime hotspots; the fixed-clock benchmark from VIIRS is ${fmtInt(y.fixed)}.`, cite: [`audit-${region}`] })
    if (y.verdict === 'outside') out.push({ text: 'The gap and the clock change appear together; this doesn’t isolate how much of the gap the clock caused.' })
  } else if (isValidation(region)) {
    out.push({ text: 'Punjab and Haryana are the team’s validation case: the audit years have too few hotspots to read.', cite: [`audit-${region}`] })
  }
  return { sentences: out, sources: [SRC.audit(region)], actions: [{ kind: 'clock', label: 'Switch to the fixed clock', clock: 'fixed' }], followUps: ['How much daylight is left?', 'When does Aqua pass here?'] }
}

function daylightAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  if (!region) return { sentences: [{ text: 'Daylight after the alert is measured for the six studied regions. Pick one, and SI will give the hours left after Aqua’s alert on both clocks.' }], sources: [], followUps: ['What am I looking at?'] }
  const h = daylightHeadline(region)
  const d = regionData(region)
  const lvl2 = h?.quote === 'level2a'
  const now = lvl2 ? h?.level2a_aqua_D15_2025 : h?.aqua_D15_2025
  const fixed = lvl2 ? h?.level2a_aqua_D15_2012_2020_mean : h?.aqua_D15_2012_2020_mean
  const dur = (v: number | null | undefined) => (v == null ? '—' : `${Math.floor(v)} h ${String(Math.round((v % 1) * 60)).padStart(2, '0')} min`)
  return {
    sentences: [
      { text: `With an alert 1.5 hours after Aqua’s pass, ${d.phrase.the} had ${dur(now)} of daylight left in 2025, against ${dur(fixed)} on Aqua’s 2012–2020 clock${lvl2 ? ' (medians over the year’s real fires)' : ' (on the fire season’s middle day)'}.`, cite: [`daylight-${region}`] },
      ...(h?.aqua_look_change_min != null ? [{ text: `The pass moved ${Math.round(h.aqua_look_change_min)} minutes later over those years.`, cite: [`daylight-${region}`] }] : []),
    ],
    sources: [SRC.daylight(region)],
    followUps: ['What is the fix?', 'When does Aqua pass here?'],
  }
}

function countAnswer(ctx: SiContext): SiAnswer {
  const box = ctx.region ? (REGIONS.find((r) => r.id === ctx.region)!.bbox as unknown as Box) : ctx.view
  const s = summary(box)
  const where = ctx.region ? regionData(ctx.region).phrase.the : box ? 'the map’s view' : 'the world'
  return {
    sentences: [
      { text: `In the past day, ${where} has ${fmtInt(s.total)} daytime detections on the map: VIIRS ${fmtInt(s.viirs.n)}, Aqua ${fmtInt(s.aqua.n)}, Terra ${fmtInt(s.terra.n)}.`, cite: ['firms'] },
      { text: 'The map keeps one detection per satellite in each 2 km cell, so these are thinned counts, not the official tallies.', cite: ['firms'] },
    ],
    sources: [SRC.firms],
    followUps: ['When does Aqua pass here?', 'Show only Aqua'],
  }
}

function regionsAnswer(): SiAnswer {
  const rows = REGIONS.map((r) => {
    const d = regionData(r.id)
    const y = d.latestOk
    if (isValidation(r.id) || !y || y.gap == null) return `${r.name.replace(/ \(.*\)$/, '')}: validation case`
    return `${r.name.replace(/ \(.*\)$/, '')}: ${y.gap >= 0 ? '+' : '−'}${Math.abs(Math.round(y.gap))}% in ${y.year}, ${y.verdict === 'outside' ? 'outside' : 'within'} the 2012–2020 placebo range`
  })
  return {
    sentences: [
      { text: 'Aqua’s count against its fixed-clock benchmark, region by region:' },
      ...rows.map((t, k) => ({ text: `${t}.`, cite: [`audit-${REGIONS[k].id}`] })),
    ],
    sources: REGIONS.map((r) => SRC.audit(r.id)),
    followUps: ['What is the fix?'],
  }
}

function glossary(q: string): SiAnswer | null {
  if (has(q, 'firms')) return { sentences: [{ text: 'NASA FIRMS (Fire Information for Resource Management System) publishes active-fire detections from MODIS and VIIRS within hours of each pass.', cite: ['firms'] }], sources: [SRC.firms] }
  if (has(q, 'inpe', 'official')) return { sentences: [{ text: 'INPE’s Programa Queimadas is Brazil’s official fire statistic; it counts the hotspots of one reference satellite, Aqua, so its year-to-year comparisons assume Aqua looks at the same time of day.', cite: ['method'] }], sources: [SRC.method] }
  const s = sat(q)
  if (s === 'aqua') return { sentences: [{ text: 'Aqua carries a MODIS sensor and crossed the equator at about 13:30; since 2021 its orbit has drifted, so it now looks later in the afternoon.', cite: ['method'] }], sources: [SRC.method], actions: [{ kind: 'filter', label: 'Show only Aqua', group: 'aqua' }] }
  if (s === 'terra') return { sentences: [{ text: 'Terra carries the other MODIS sensor and crossed at about 10:30 in the morning; its orbit has drifted earlier.', cite: ['method'] }], sources: [SRC.method], actions: [{ kind: 'filter', label: 'Show only Terra', group: 'terra' }] }
  if (s === 'viirs') return { sentences: [{ text: 'VIIRS flies on NOAA-20 and NOAA-21 (and on S-NPP until November 2026). It keeps about 13:30 and sees smaller fires than MODIS, so the team uses it as the fixed clock.', cite: ['method'] }], sources: [SRC.method], actions: [{ kind: 'filter', label: 'Show only VIIRS', group: 'viirs' }] }
  return null
}

/** Answer a question from the page's data. */
export function ask(question: string, ctx: SiContext): SiAnswer {
  const q = question.toLowerCase().trim()
  // map actions first: "show only Aqua", "fly to Kenya"
  const only = /\b(show|only|just|filter)\b/.test(q) ? sat(q) : null
  if (only) return { sentences: [{ text: `Showing only ${GROUP_NAME[only]}’s detections. ${GROUP_NAME[only]} saw ${fmtInt(summary(ctx.view)[only].n)} in the map’s view in the past day.`, cite: ['firms'] }], sources: [SRC.firms], actions: [{ kind: 'filter', label: `Only ${GROUP_NAME[only]}`, group: only }, { kind: 'filter', label: 'Show all satellites', group: 'all' }] }
  if (/\b(all satellites|show all|every satellite)\b/.test(q)) return { sentences: [{ text: 'Showing every satellite’s detections again.' }], sources: [], actions: [{ kind: 'filter', label: 'Show all satellites', group: 'all' }] }
  const fly = /^(fly|go|take me|zoom|show me|where is)\b/.exec(q)
  if (fly) {
    const target = q.replace(/^(fly to|go to|take me to|zoom to|zoom in on|show me|where is)\s*/, '').replace(/[?.!]+$/, '')
    const p = target ? searchPlaces(target, 1)[0] : null
    if (p) return { sentences: [{ text: `Flying to ${p.name}.` }], sources: [], actions: [{ kind: 'fly', label: `Fly to ${p.name}`, place: p }] }
  }
  if (has(q, 'what am i', 'how do i', 'how to', 'help', 'what is this', 'explain', 'start')) return orientation()
  if (has(q, 'which satellite', 'who saw', 'who spotted', 'spotted', 'detected', 'this fire')) {
    return ctx.fire != null ? fireAnswer(ctx.fire) : { sentences: [{ text: 'Click any fire on the map, and SI will say which satellites saw it, at what local time, and which did not.' }], sources: [], followUps: ['What am I looking at?'] }
  }
  if (has(q, 'fix', 'fixed clock', 'benchmark', 'counterfactual')) return fixAnswer(ctx, q)
  if (has(q, 'daylight', 'dark', 'sunset', 'alert')) return daylightAnswer(ctx, q)
  if (has(q, 'when', 'what time', 'pass', 'clock', 'drift', 'later')) return whenAnswer(ctx, q)
  if (has(q, 'how many', 'count', 'number of')) return countAnswer(ctx)
  if (has(q, 'regions', 'compare', 'which region', 'record', 'trend', 'wrong')) return regionsAnswer()
  const g = glossary(q)
  if (g) return g
  return {
    sentences: [{ text: 'SI answers from the data on this page: which satellite saw a fire and when, when each satellite passes here, the fixed-clock audit for the six regions, daylight after the alert, and fire counts in view. It can also fly the map or show one satellite at a time.' }],
    sources: [],
    followUps: STARTERS,
  }
}

export const firstRun = orientation
export const fireDetail = fireAnswer
export { groupOf }
export const lstHours = (h: string) => hm(h)
