// SI: the Simulator's question-and-answer panel. Every answer is assembled from data the page already holds (the
// team's drift, audit and daylight files, and the past day's NASA FIRMS detections) by fixed rules: a question is matched
// to one of a few kinds, and the answer's sentences carry the sources their numbers come from. Nothing is generated, so
// nothing is invented; a question outside these kinds gets the list of what SI can answer.
import { REGIONS, daylightHeadline, fmtHM, fmtInt, hm, isValidation, regionData, verdictHeadline } from './data'
import { GROUP_NAME, SAT_NAMES, SENSOR, TOTALS, WINDOW, dayText, groupOf, lstOf, sightings, strongest, summary, utcOf, FRP, SAT, type Box } from './fires'
import { searchPlaces, type Place } from './places'

export type SiSource = { id: string; title: string; domain: string; url?: string }
export type SiSentence = { text: string; cite?: string[] }
export type SiAction =
  | { kind: 'fly'; label: string; place: Place }
  | { kind: 'filter'; label: string; group: 'terra' | 'aqua' | 'viirs' | 'all' }
  | { kind: 'fire'; label: string; i: number }
  | { kind: 'day'; label: string }
/** `select`: a detection the page should select and show as the answer arrives */
export type SiAnswer = { sentences: SiSentence[]; sources: SiSource[]; actions?: SiAction[]; followUps?: string[]; select?: number }
export type SiContext = { region: string | null; place: Place | null; view: Box | null; fire: number | null }

const SRC = {
  firms: { id: 'firms', title: 'NASA FIRMS active fires, past day: MODIS (Terra, Aqua), VIIRS (NOAA-20, NOAA-21)', domain: 'firms.modaps.eosdis.nasa.gov', url: 'https://firms.modaps.eosdis.nasa.gov' },
  drift: (id: string) => ({ id: `drift-${id}`, title: `Look times by year, ${regionData(id).name}`, domain: `data/out/drift/${id}.json` }),
  audit: (id: string) => ({ id: `audit-${id}`, title: `Aqua’s count vs what we’d expect, ${regionData(id).name}`, domain: `data/out/audit/${id}.json` }),
  daylight: (id: string) => ({ id: `daylight-${id}`, title: `Daylight after the alert, ${regionData(id).name}`, domain: `data/out/daylight/${id}.json` }),
  method: { id: 'method', title: 'How the audit reads a fire count', domain: 'Anchor method notes' },
} as const

export const STARTERS = ['What am I looking at?', 'Which satellite saw this fire?', 'When does Aqua pass here?', 'What is the fix?']

const has = (q: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === 'string' ? q.includes(w) : w.test(q)))
const sat = (q: string): 'terra' | 'aqua' | 'viirs' | null => (has(q, 'aqua') ? 'aqua' : has(q, 'terra') ? 'terra' : has(q, 'viirs', 'noaa', 'suomi', 's-npp') ? 'viirs' : null)
const hours = (h: number | null) => (h == null ? 'no daytime fires here' : fmtHM(h))
const short = (name: string) => name.replace(/ \(.*\)$/, '')
const studiedIn = (q: string) => searchPlaces(q, 3).find((x) => x.kind === 'Studied region')?.region ?? null
const boxOf = (id: string) => REGIONS.find((r) => r.id === id)!.bbox as unknown as Box
/** the Amazon's look times, first and last year in the team's drift file: the glossary's example */
const AMAZON = (() => { const d = regionData('br-amazon'); return { first: d.drift[0], last: d.lastDrift } })()

function orientation(): SiAnswer {
  const s = summary(null)
  return {
    sentences: [
      { text: `The map shows the daytime fires NASA’s satellites detected from ${dayText(WINDOW.start)} to ${dayText(WINDOW.end)}, ${fmtInt(TOTALS.reduce((a, b) => a + b, 0))} in all, coloured by satellite.`, cite: ['firms'] },
      { text: `Each satellite looks at its own time of day. Today: Terra about ${hours(s.terra.lst)}, VIIRS about ${hours(s.viirs.lst)}, Aqua about ${hours(s.aqua.lst)}, local solar time.`, cite: ['firms'] },
      { text: 'Brazil’s official fire count follows Aqua alone. Aqua now looks later in the day, so we compare its count with what we’d expect at its old time, in six places framed in white.', cite: ['method'] },
      { text: 'Click any fire to see which satellites saw it.' },
    ],
    sources: [SRC.firms, SRC.method],
    followUps: ['Which satellite saw this fire?', 'What is the fix?', 'Show only Aqua'],
  }
}

function fireAnswer(i: number): SiAnswer {
  const who = sightings(i)
  const seen = who.filter((w) => w.i != null).sort((a, b) => lstOf(a.i!) - lstOf(b.i!))
  const missed = who.filter((w) => w.i == null).map((w) => SAT_NAMES[w.sat])
  const t = utcOf(i)
  const utc = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} UTC`
  return {
    sentences: [
      { text: `${SAT_NAMES[SAT[i]]} saw this fire at ${fmtHM(lstOf(i))}, local sun time (${utc}). Its heat: ${fmtInt(FRP[i])} megawatts.`, cite: ['firms'] },
      { text: `Within 3 km that day: ${seen.map((w) => `${SAT_NAMES[w.sat]} ${fmtHM(lstOf(w.i!))}`).join(', ')}.`, cite: ['firms'] },
      ...(missed.length ? [{ text: `No daytime detection here from ${missed.join(' or ')}: passed at another time, at a swath edge, or under cloud.`, cite: ['firms'] }] : []),
    ],
    sources: [SRC.firms],
    select: i,
    followUps: ['When does Aqua pass here?', 'What is the fix?'],
  }
}

function whenAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  const box = region ? boxOf(region) : ctx.view
  const s = summary(box)
  const where = region ? regionData(region).phrase.the : ctx.place?.name ?? (box ? 'the map’s view' : 'the world')
  const out: SiSentence[] = [
    { text: `Past day over ${where}, median local solar time: VIIRS ${hours(s.viirs.lst)}, Aqua ${hours(s.aqua.lst)}, Terra ${hours(s.terra.lst)}.`, cite: ['firms'] },
  ]
  const sources: SiSource[] = [SRC.firms]
  if (region) {
    const d = regionData(region)
    const first = d.drift[0], last = d.lastDrift
    if (first && last) {
      out.push({ text: `In the team’s files, Aqua looked at ${first.aqua_lst} in ${first.year} and ${last.aqua_lst} in ${last.year}; VIIRS stayed near ${last.viirs_lst}.`, cite: [`drift-${region}`] })
      sources.push(SRC.drift(region))
    }
  } else if (s.aqua.lst != null && s.viirs.lst != null) {
    out.push({ text: `Aqua looked ${Math.round((s.aqua.lst - s.viirs.lst) * 60)} minutes after VIIRS here.`, cite: ['firms'] })
  }
  return { sentences: out, sources, followUps: region ? ['What is the fix?', 'How much daylight is left?'] : ['What is the fix?', 'Show only Aqua'] }
}

function fixAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  if (!region) {
    return {
      sentences: [
        { text: 'Aqua now looks later in the day. The VIIRS satellites kept their time, so they tell us what Aqua would have counted at its old time: what we’d expect.', cite: ['method'] },
        { text: 'We compare what Aqua counted with what we’d expect. A gap bigger than any from 2012 to 2020 is unusual.', cite: ['method'] },
        { text: 'Pick a place to see both.' },
      ],
      sources: [SRC.method],
      actions: REGIONS.filter((r) => !isValidation(r.id)).slice(0, 3).map((r) => ({ kind: 'fly' as const, label: short(r.name), place: searchPlaces(r.name, 1)[0] })).filter((a) => a.place),
    }
  }
  const d = regionData(region)
  const y = d.latestOk
  const out: SiSentence[] = []
  if (y && y.fixed != null && y.verdict !== 'na' && y.gap != null && !isValidation(region)) {
    out.push({ text: `In ${y.year}, Aqua counted ${fmtInt(y.aqua)} daytime fires in ${d.phrase.the}; we’d expect ${fmtInt(y.fixed)} at its old time. That’s ${Math.abs(Math.round(y.gap))}% ${y.gap >= 0 ? 'more' : 'fewer'}${y.lo != null && y.hi != null ? ` (how sure we are: ${Math.round(y.lo)}% to ${Math.round(y.hi)}%)` : ''}, ${y.verdict === 'outside' ? 'which is unusual' : 'which is not unusual'}.`, cite: [`audit-${region}`] })
    out.push({ text: 'The timing and the count changed together, but we can’t say how much of the difference the timing caused.' })
  } else if (isValidation(region)) {
    out.push({ text: `${verdictHeadline(d)}.`, cite: [`audit-${region}`] })
    out.push({ text: 'Punjab and Haryana are our test case; 2023–2025 have too few fires to read.', cite: [`audit-${region}`] })
  } else {
    out.push({ text: `${verdictHeadline(d)}.`, cite: [`audit-${region}`] })
  }
  return { sentences: out, sources: [SRC.audit(region)], actions: [{ kind: 'filter', label: 'Show only Aqua', group: 'aqua' }], followUps: ['How much daylight is left?', 'When does Aqua pass here?'] }
}

function daylightAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  if (!region) return { sentences: [{ text: 'Daylight after the alert is measured for the six places. Pick one, or play one real fire day in the Amazon with made-up helicopters.' }], sources: [], actions: [{ kind: 'day', label: 'Play one fire day' }], followUps: ['What am I looking at?'] }
  const h = daylightHeadline(region)
  const d = regionData(region)
  const lvl2 = h?.quote === 'level2a'
  const now = lvl2 ? h?.level2a_aqua_D15_2025 : h?.aqua_D15_2025
  const fixed = lvl2 ? h?.level2a_aqua_D15_2012_2020_mean : h?.aqua_D15_2012_2020_mean
  const dur = (v: number | null | undefined) => (v == null ? '—' : `${Math.floor(v)} h ${String(Math.round((v % 1) * 60)).padStart(2, '0')} min`)
  return {
    sentences: [
      { text: `Example: if the alert comes 1.5 hours after Aqua’s pass, ${d.phrase.the} had ${dur(now)} of daylight left in 2025, against ${dur(fixed)} at Aqua’s old time${lvl2 ? ' (middle value over the year’s fires)' : ' (middle day of the fire season)'}.`, cite: [`daylight-${region}`] },
      ...(h?.aqua_look_change_min != null ? [{ text: `The pass moved ${Math.round(h.aqua_look_change_min)} minutes later.`, cite: [`daylight-${region}`] }] : []),
    ],
    sources: [SRC.daylight(region)],
    actions: [{ kind: 'day', label: 'Play one fire day' }],
    followUps: ['What is the fix?', 'When does Aqua pass here?'],
  }
}

function countAnswer(ctx: SiContext): SiAnswer {
  const box = ctx.region ? boxOf(ctx.region) : ctx.view
  const s = summary(box)
  const where = ctx.region ? regionData(ctx.region).phrase.the : box ? 'the map’s view' : 'the world'
  return {
    sentences: [
      { text: `Past day, ${where}: ${fmtInt(s.total)} daytime fires on the map. VIIRS ${fmtInt(s.viirs.n)}, Aqua ${fmtInt(s.aqua.n)}, Terra ${fmtInt(s.terra.n)}.`, cite: ['firms'] },
      { text: 'The map keeps one detection per satellite per 2 km cell, so these aren’t official tallies.', cite: ['firms'] },
    ],
    sources: [SRC.firms],
    followUps: ['When does Aqua pass here?', 'Show only Aqua'],
  }
}

function regionsAnswer(): SiAnswer {
  const rows = REGIONS.map((r) => {
    const d = regionData(r.id)
    const y = d.latestOk
    if (isValidation(r.id) || !y || y.gap == null) return `${short(r.name)}: our test case`
    return `${short(r.name)}: ${y.gap >= 0 ? '+' : '−'}${Math.abs(Math.round(y.gap))}% in ${y.year}, ${y.verdict === 'outside' ? 'unusual' : 'not unusual'}`
  })
  return {
    sentences: [
      { text: 'Aqua’s 2025 count against what we’d expect:' },
      ...rows.map((t, k) => ({ text: `${t}.`, cite: [`audit-${REGIONS[k].id}`] })),
    ],
    sources: REGIONS.map((r) => SRC.audit(r.id)),
    followUps: ['What is the fix?'],
  }
}

function glossary(q: string): SiAnswer | null {
  if (has(q, 'firms')) return { sentences: [{ text: 'NASA FIRMS publishes active-fire detections from MODIS and VIIRS within hours of each pass.', cite: ['firms'] }], sources: [SRC.firms] }
  if (has(q, 'inpe', 'official')) return { sentences: [{ text: 'INPE’s Programa Queimadas is Brazil’s official fire count. It counts one reference satellite, Aqua, so year-to-year comparisons assume Aqua looks at the same time of day.', cite: ['method'] }], sources: [SRC.method] }
  const s = sat(q)
  const { first, last } = AMAZON
  if (s === 'aqua') return { sentences: [{ text: `Aqua carries a MODIS sensor and looks in the afternoon. Over the Amazon it looked at ${first.aqua_lst} in ${first.year} and ${last.aqua_lst} in ${last.year}.`, cite: ['drift-br-amazon'] }], sources: [SRC.drift('br-amazon')], actions: [{ kind: 'filter', label: 'Show only Aqua', group: 'aqua' }] }
  if (s === 'terra') return { sentences: [{ text: `Terra carries the other MODIS sensor and looks in the morning. Over the Amazon it looked at ${first.terra_lst} in ${first.year} and ${last.terra_lst} in ${last.year}.`, cite: ['drift-br-amazon'] }], sources: [SRC.drift('br-amazon')], actions: [{ kind: 'filter', label: 'Show only Terra', group: 'terra' }] }
  if (s === 'viirs') return { sentences: [{ text: `VIIRS flies on S-NPP, NOAA-20 and NOAA-21 and sees smaller fires than MODIS. Over the Amazon it stayed near ${last.viirs_lst}, so it tells us what Aqua would have counted at its old time.`, cite: ['drift-br-amazon'] }], sources: [SRC.drift('br-amazon')], actions: [{ kind: 'filter', label: 'Show only VIIRS', group: 'viirs' }] }
  return null
}

/** Answer a question from the page's data. */
export function ask(question: string, ctx: SiContext): SiAnswer {
  const q = question.toLowerCase().trim()
  // map actions first: "show only Aqua", "fly to Kenya"
  const only = /\b(show|only|just|filter)\b/.test(q) ? sat(q) : null
  if (only) return { sentences: [{ text: `Showing only ${GROUP_NAME[only]}: ${fmtInt(summary(ctx.view)[only].n)} fires in view.`, cite: ['firms'] }], sources: [SRC.firms], actions: [{ kind: 'filter', label: `Only ${GROUP_NAME[only]}`, group: only }, { kind: 'filter', label: 'All satellites', group: 'all' }] }
  if (/\b(all satellites|show all|every satellite)\b/.test(q)) return { sentences: [{ text: 'Showing every satellite again.' }], sources: [], actions: [{ kind: 'filter', label: 'All satellites', group: 'all' }] }
  const fly = /^(fly|go|take me|zoom|show me|where is)\b/.exec(q)
  if (fly) {
    const target = q.replace(/^(fly to|go to|take me to|zoom to|zoom in on|show me|where is)\s*/, '').replace(/[?.!]+$/, '')
    const p = target ? searchPlaces(target, 1)[0] : null
    if (p) return { sentences: [{ text: `Flying to ${p.name}.` }], sources: [], actions: [{ kind: 'fly', label: `Fly to ${p.name}`, place: p }] }
  }
  if (has(q, 'what am i', 'how do i', 'how to', 'help', 'what is this', 'explain', 'start')) return orientation()
  if (has(q, 'which satellite', 'who saw', 'who spotted', 'spotted', 'detected', 'this fire', 'strongest', 'biggest')) {
    if (ctx.fire != null && !has(q, 'strongest', 'biggest')) return fireAnswer(ctx.fire)
    // nothing picked yet: show the strongest fire in view
    const box = ctx.region ? boxOf(ctx.region) : ctx.view
    const i = strongest(box)
    if (i == null) return { sentences: [{ text: 'No fires in view. Zoom out or pick a region.' }], sources: [] }
    const a = fireAnswer(i)
    return { ...a, sentences: [{ text: 'The strongest fire in view:' }, ...a.sentences] }
  }
  if (has(q, 'fix', 'fixed clock', 'old clock', 'benchmark', 'counterfactual')) return fixAnswer(ctx, q)
  if (has(q, 'daylight', 'dark', 'sunset', 'alert')) return daylightAnswer(ctx, q)
  if (has(q, 'when', 'what time', 'pass', 'clock', 'drift', 'later')) return whenAnswer(ctx, q)
  if (has(q, 'how many', 'count', 'number of')) return countAnswer(ctx)
  if (has(q, 'regions', 'compare', 'which region', 'record', 'trend', 'wrong')) return regionsAnswer()
  const g = glossary(q)
  if (g) return g
  return {
    sentences: [{ text: 'SI answers from this page’s data: which satellite saw a fire, when each satellite passes, the audit for the six regions, daylight after the alert, and fires in view. It can also fly the map or show one satellite.' }],
    sources: [],
    followUps: STARTERS,
  }
}

export const firstRun = orientation
export const fireDetail = fireAnswer
export { groupOf }
export const lstHours = (h: string) => hm(h)
