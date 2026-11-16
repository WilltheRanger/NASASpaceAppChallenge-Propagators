// SI: the Explore page's question-and-answer panel. Every answer is assembled from data the page already holds (the
// team's drift, audit and daylight files, and one saved day of NASA FIRMS detections) by fixed rules: a question is
// matched to one of a few kinds, and the answer's sentences carry the sources their numbers come from. Nothing is
// generated, so nothing is invented; a question outside these kinds gets the list of what SI can answer.
import { REGIONS, daylightHeadline, fireSeason, fmtHM, fmtInt, hm, isValidation, regionData, sunTimes, verdictHeadline } from './data'
import { GROUP_NAME, SAT_NAMES, TOTALS, WINDOW, dayText, groupOf, heatShare, lstOf, sightings, strongest, summary, utcOf, FRP, LAT, LON, SAT, type Box } from './fires'
import { nameNear, regionNamed, searchPlaces, type Place } from './places'

export type SiSource = { id: string; title: string; domain: string; url?: string }
export type SiSentence = { text: string; cite?: string[] }
export type SiAction =
  | { kind: 'fly'; label: string; place: Place }
  | { kind: 'filter'; label: string; group: 'terra' | 'aqua' | 'viirs' | 'all' }
  | { kind: 'fire'; label: string; i: number }
  | { kind: 'day'; label: string }
/** `select`: a detection the page should select and show as the answer arrives */
/** `locate`: a point whose name the page may look up online; it replaces `label` in the sentences when it arrives */
export type SiAnswer = { sentences: SiSentence[]; sources: SiSource[]; actions?: SiAction[]; followUps?: string[]; select?: number; locate?: { lon: number; lat: number; label: string } }
export type SiContext = { region: string | null; place: Place | null; view: Box | null; fire: number | null }

/** The saved fire data's dates, written out ("14–15 Nov 2026"): the data is a fixed snapshot, never "the past day". */
const SPAN = (() => {
  const a = dayText(WINDOW.start), b = dayText(WINDOW.end)
  if (a === b) return a
  const [ad, am, ay] = a.split(' '), [bd, bm, by] = b.split(' ')
  return am === bm && ay === by ? `${ad}–${bd} ${bm} ${by}` : `${a} – ${b}`
})()

const SRC = {
  firms: { id: 'firms', title: `NASA FIRMS active fires, ${SPAN} (UTC): MODIS (Terra, Aqua), VIIRS (NOAA-20, NOAA-21)`, domain: 'firms.modaps.eosdis.nasa.gov', url: 'https://firms.modaps.eosdis.nasa.gov' },
  drift: (id: string) => ({ id: `drift-${id}`, title: `Look times by year, ${regionData(id).name}`, domain: `data/out/drift/${id}.json` }),
  audit: (id: string) => ({ id: `audit-${id}`, title: `Aqua’s count vs what we’d expect, ${regionData(id).name}`, domain: `data/out/audit/${id}.json` }),
  daylight: (id: string) => ({ id: `daylight-${id}`, title: `Daylight after the alert, ${regionData(id).name}`, domain: `data/out/daylight/${id}.json` }),
  method: { id: 'method', title: 'How the audit reads a fire count', domain: 'Anchor method notes' },
  attrs: { id: 'attrs', title: 'NASA FIRMS: active fire data attributes (MODIS and VIIRS)', domain: 'earthdata.nasa.gov', url: 'https://earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs' },
  amazonFire: { id: 'amazon-fire', title: 'NASA Earth Observatory: From forest to field, how fire is transforming the Amazon', domain: 'earthobservatory.nasa.gov', url: 'https://earthobservatory.nasa.gov/features/AmazonFire' },
} as const

/** The audit question, in plain words (it used to read "What is the fix?", which nobody understood). */
const OLD_TIME = 'What is the benchmark?'
export const STARTERS = ['What am I looking at?', 'Which satellite saw this fire?', 'When does Aqua pass here?', OLD_TIME]

const has = (q: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === 'string' ? q.includes(w) : w.test(q)))
const sat = (q: string): 'terra' | 'aqua' | 'viirs' | null => (has(q, 'aqua') ? 'aqua' : has(q, 'terra') ? 'terra' : has(q, 'viirs', 'noaa', 'suomi', 's-npp') ? 'viirs' : null)
const hours = (h: number | null) => (h == null ? 'no daytime fires here' : fmtHM(h))
const short = (name: string) => name.replace(/ \(.*\)$/, '')
const studiedIn = (q: string) => regionNamed(q) ?? searchPlaces(q, 3).find((x) => x.kind === 'Studied region')?.region ?? null
const boxOf = (id: string) => REGIONS.find((r) => r.id === id)!.bbox as unknown as Box
/** the Amazon's look times, first and last year in the team's drift file: the glossary's example */
const AMAZON = (() => { const d = regionData('br-amazon'); return { first: d.drift[0], last: d.lastDrift } })()

function orientation(): SiAnswer {
  const s = summary(null)
  return {
    sentences: [
      { text: `The map shows the daytime fires NASA’s satellites detected from ${dayText(WINDOW.start)} to ${dayText(WINDOW.end)}, ${fmtInt(TOTALS.reduce((a, b) => a + b, 0))} in all, coloured by satellite.`, cite: ['firms'] },
      { text: `Each satellite looks at its own time of day. On those days: Terra about ${hours(s.terra.lst)}, VIIRS about ${hours(s.viirs.lst)}, Aqua about ${hours(s.aqua.lst)}, local solar time.`, cite: ['firms'] },
      { text: 'INPE’s official fire count for Brazil follows Aqua alone. Aqua now looks later in the day, so we compare its count with a steady VIIRS-based benchmark (VIIRS’s count scaled by the 2012–2020 Aqua-to-VIIRS rate), in six places framed in white.', cite: ['method'] },
      { text: 'Click any fire to see which satellites saw it.' },
    ],
    sources: [SRC.firms, SRC.method],
    followUps: ['Which satellite saw this fire?', OLD_TIME, 'Show only Aqua'],
  }
}

const pct = (v: number) => `${Math.round(v) < 0 ? '−' : ''}${Math.abs(Math.round(v))}%`
const coordText = (lon: number, lat: number) => `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const listText = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** Hours as "2 h 13 min" or "13 min". */
const dur = (h: number) => {
  const m = Math.round(h * 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}
/** How hot a detection was, against every detection on the map. */
const heatText = (i: number) => {
  const share = heatShare(i)
  return share >= 0.99 ? 'higher reported fire radiative power than 99% of detections in this snapshot (sensors differ, so compare loosely)' : `higher reported fire radiative power than ${Math.floor(share * 100)}% of detections in this snapshot (sensors differ, so compare loosely)`
}
/** NASA's stated bound for near-real-time fire data: within 3 hours of the satellite's pass. */
const DELIVERY_H = 3

/** One fire, answered for someone who has to respond to it: where, who saw it first and when, how much daylight was left,
 *  and, for each satellite that didn't see it, when it passed nearby, so "missed" has a reason you can check.
 *  `lead` replaces the opening when the fire wasn't picked by the reader. */
function fireAnswer(i: number, lead?: string): SiAnswer {
  const who = sightings(i)
  const seen = who.filter((w) => w.i != null).sort((a, b) => lstOf(a.i!) - lstOf(b.i!))
  const first = seen[0]?.i ?? i
  const later = seen.filter((w) => w.i !== first)
  const missed = who.filter((w) => w.i == null)
  const t = utcOf(first)
  const utc = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} UTC, ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`
  const coords = coordText(LON[i], LAT[i])
  const near = nameNear(LON[i], LAT[i])
  const label = near ? `${near} (${coords})` : coords
  const sunset = sunTimes(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), LAT[first]).set
  const seenAt = lstOf(first)
  const left = sunset - seenAt
  const alertBy = seenAt + DELIVERY_H

  // when each missing satellite passed near this fire: the typical look time of its detections within about 150 km
  const around: Box = [LON[i] - 1.5, LAT[i] - 1.5, LON[i] + 1.5, LAT[i] + 1.5]
  const s = summary(around)
  const passOf = (sat: number) => s[groupOf(sat)].lst
  const before: string[] = [], after: string[] = [], unknown: string[] = []
  for (const w of [...missed].sort((a, b) => (passOf(a.sat) ?? 99) - (passOf(b.sat) ?? 99))) {
    const p = passOf(w.sat)
    if (p == null) unknown.push(SAT_NAMES[w.sat])
    else (p < seenAt ? before : after).push(`${SAT_NAMES[w.sat]} (about ${fmtHM(p)})`)
  }

  const at = near ? 'in' : 'at'
  const opening = lead ? `${lead}: ${at} ${label}.` : `This fire is ${at} ${label}.`
  const out: SiSentence[] = [
    { text: `${opening} ${SAT_NAMES[SAT[first]]} saw it first, at ${fmtHM(seenAt)} local solar time (${utc}), ${left > 0 ? `${dur(left)} before sunset (${fmtHM(sunset)})` : 'after sunset'}. It gave off ${fmtInt(FRP[i])} MW, ${heatText(i)}.` },
  ]
  if (later.length) out.push({ text: `Also seen within 3 km by ${listText(later.map((w) => `${SAT_NAMES[w.sat]} at ${fmtHM(lstOf(w.i!))}`))}.` })
  if (before.length) out.push({ text: `${listText(before)} passed earlier and didn’t see it: it may not have been burning yet, or was too small or under cloud.` })
  if (after.length) out.push({ text: `${listText(after)} passed later and didn’t see it: it may have died down, or was under cloud or at the edge of the satellite’s view.` })
  if (unknown.length) out.push({ text: `${listText(unknown)} didn’t see it, and has no detections nearby to show when it passed.` })
  out.push({
    text: alertBy < sunset
      ? `Scenario: NASA delivers these alerts within ${DELIVERY_H} hours of the pass, so word could come as late as ${fmtHM(alertBy)}, with ${dur(sunset - alertBy)} of daylight left.`
      : `Scenario: NASA delivers these alerts within ${DELIVERY_H} hours of the pass, so word could come as late as ${fmtHM(alertBy)}, after sunset.`,
  })
  return {
    sentences: out,
    sources: [SRC.firms],
    select: i,
    locate: { lon: LON[i], lat: LAT[i], label },
    followUps: ['When does Aqua pass here?', OLD_TIME],
  }
}

function whenAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  const box = region ? boxOf(region) : ctx.view
  const s = summary(box)
  const where = region ? regionData(region).phrase.the : ctx.place?.name ?? (box ? 'the map’s view' : 'the whole world')
  const out: SiSentence[] = [
    { text: `Over ${where} on ${SPAN}, the satellites’ typical look times (local solar time): VIIRS ${hours(s.viirs.lst)}, Aqua ${hours(s.aqua.lst)}, Terra ${hours(s.terra.lst)}.`, cite: ['firms'] },
  ]
  const sources: SiSource[] = [SRC.firms]
  if (region) {
    const d = regionData(region)
    const first = d.drift[0], last = d.lastDrift
    if (first && last) {
      out.push({ text: `In the team’s files, Aqua looked at ${first.aqua_lst} in ${first.year} and ${last.aqua_lst} in ${last.year}; VIIRS stayed near ${last.viirs_lst}.`, cite: [`drift-${region}`] })
      const shift = Math.round((hm(last.aqua_lst) - hm(first.aqua_lst)) * 60)
      if (shift > 0) out.push({ text: `If the delay after the pass stayed the same, an alert from Aqua’s pass would come about ${shift} minutes later than in ${first.year}, leaving about ${shift} fewer minutes of daylight in this scenario.`, cite: [`drift-${region}`] })
      if (s.aqua.lst != null && s.aqua.lst > hm(last.aqua_lst)) out.push({ text: `On ${SPAN} Aqua looked even later here, about ${fmtHM(s.aqua.lst)}: it is still drifting.`, cite: ['firms'] })
      out.shift()
      sources.push(SRC.drift(region))
    }
  } else if (s.aqua.lst != null && s.viirs.lst != null) {
    out.push({ text: `Aqua looked about ${Math.round((s.aqua.lst - s.viirs.lst) * 60)} minutes after VIIRS${box ? ' here' : ''}.`, cite: ['firms'] })
  }
  return { sentences: out, sources, followUps: region ? [OLD_TIME, 'How much daylight is left?'] : [OLD_TIME, 'Show only Aqua'] }
}

function fixAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  if (!region) {
    return {
      sentences: [
        { text: 'Aqua now looks later in the day. The VIIRS satellites kept their time. The benchmark is VIIRS’s count scaled by the 2012–2020 Aqua-to-VIIRS rate: a steady reference to read Aqua’s count against.', cite: ['method'] },
        { text: 'We compare what Aqua counted with what we’d expect. A gap outside the 2012–2020 range is unusual only when its likely range does not overlap that range; otherwise it is a close call.', cite: ['method'] },
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
    out.push({ text: `In ${y.year}, Aqua counted ${fmtInt(y.aqua)} daytime fires in ${d.phrase.the}; the VIIRS-based benchmark is ${fmtInt(y.fixed)}. That’s ${Math.abs(Math.round(y.gap))}% ${y.gap >= 0 ? 'more' : 'fewer'}${y.lo != null && y.hi != null ? ` (likely range: ${pct(y.lo)} to ${pct(y.hi)})` : ''}, ${y.verdict === 'outside' ? `which is unusual: ${Math.round(y.pointsPast ?? 0)} points past the usual range` : y.verdict === 'close' ? `which is a close call: ${Math.round(y.pointsPast ?? 0)} points past the usual range, but its likely range overlaps it` : 'which is not unusual'}.`, cite: [`audit-${region}`] })
    out.push({ text: 'Our tests point to Aqua’s later look as the main cause: clouds and changes in viewing angle were checked and don’t explain the gap. A smaller share isn’t pinned down yet.' })
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
  if (!region) return { sentences: [{ text: 'Scenario: daylight after the alert is worked out for the six places. Pick one, or play one real fire day in the Amazon.' }], sources: [], actions: [{ kind: 'day', label: 'Play one fire day' }], followUps: ['What am I looking at?'] }
  const h = daylightHeadline(region)
  const d = regionData(region)
  const lvl2 = h?.quote === 'level2a'
  const now = lvl2 ? h?.level2a_aqua_D15_2025 : h?.aqua_D15_2025
  const fixed = lvl2 ? h?.level2a_aqua_D15_2012_2020_mean : h?.aqua_D15_2012_2020_mean
  const dur = (v: number | null | undefined) => (v == null ? '—' : `${Math.floor(v)} h ${String(Math.round((v % 1) * 60)).padStart(2, '0')} min`)
  return {
    sentences: [
      { text: `Scenario: if the alert comes 1.5 hours after Aqua’s pass, ${d.phrase.the} had ${dur(now)} of daylight left in 2025, against ${dur(fixed)} with Aqua’s 2012–2020 pass time${lvl2 ? ' (middle value over the year’s fires)' : ' (middle day of the fire season)'}.`, cite: [`daylight-${region}`] },
      ...(h?.aqua_look_change_min != null ? [{ text: `The pass moved ${Math.round(h.aqua_look_change_min)} minutes later.`, cite: [`daylight-${region}`] }] : []),
    ],
    sources: [SRC.daylight(region)],
    actions: [{ kind: 'day', label: 'Play one fire day' }],
    followUps: [OLD_TIME, 'When does Aqua pass here?'],
  }
}

function countAnswer(ctx: SiContext): SiAnswer {
  const box = ctx.region ? boxOf(ctx.region) : ctx.view
  const s = summary(box)
  const where = ctx.region ? regionData(ctx.region).phrase.the : box ? 'the map’s view' : 'the world'
  return {
    sentences: [
      { text: `${SPAN}, ${where}: ${fmtInt(s.total)} daytime fires on the map. VIIRS ${fmtInt(s.viirs.n)}, Aqua ${fmtInt(s.aqua.n)}, Terra ${fmtInt(s.terra.n)}.`, cite: ['firms'] },
      { text: 'The map keeps one detection per satellite per 2 km cell, so these aren’t full counts.', cite: ['firms'] },
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
    return `${short(r.name)}: ${y.gap >= 0 ? '+' : '−'}${Math.abs(Math.round(y.gap))}% in ${y.year}, ${y.verdict === 'outside' ? `unusual, ${Math.round(y.pointsPast ?? 0)} points past the usual range` : y.verdict === 'close' ? `close call, ${Math.round(y.pointsPast ?? 0)} points past the usual range` : 'not unusual'}`
  })
  const latest = REGIONS.filter((r) => !isValidation(r.id)).map((r) => ({ name: short(r.name), v: regionData(r.id).latestOk?.verdict }))
  const clear = latest.filter((x) => x.v === 'outside').map((x) => x.name)
  const close = latest.filter((x) => x.v === 'close').map((x) => x.name)
  const lead = `Aqua’s 2025 count was clearly unusual in ${clear.length === 1 ? 'one place' : `${clear.length} places`}${clear.length ? ` (${clear.join(', ')})` : ''}${close.length ? `; ${close.join(' and ')} ${close.length === 1 ? 'is a close call' : 'are close calls'}` : ''}.`
  return {
    sentences: [
      { text: lead },
      { text: 'Against the benchmark, place by place:' },
      ...rows.map((t, k) => ({ text: `${t}.`, cite: [`audit-${REGIONS[k].id}`] })),
    ],
    sources: REGIONS.map((r) => SRC.audit(r.id)),
    followUps: [OLD_TIME],
  }
}

function whyAnswer(): SiAnswer {
  const { first, last } = AMAZON
  return {
    sentences: [
      { text: 'Aqua and Terra are near the end of their missions and no longer spend fuel holding their orbits, so the time of day they cross each place slips a little every year: Aqua later, Terra earlier.' },
      { text: `In the team’s files the move shows from 2022. Over the Amazon, Aqua looked at ${first.aqua_lst} in ${first.year} and ${last.aqua_lst} in ${last.year}.`, cite: ['drift-br-amazon'] },
    ],
    sources: [SRC.drift('br-amazon')],
    followUps: ['When does Aqua pass here?', OLD_TIME],
  }
}

function seasonAnswer(ctx: SiContext, q: string): SiAnswer {
  const region = studiedIn(q) ?? ctx.region
  if (!region) return { sentences: [{ text: 'Fire seasons are worked out for the six places. Pick one to see its season.' }], sources: [] }
  const d = regionData(region)
  return {
    sentences: [
      { text: `Fire season in ${d.phrase.the}: ${fireSeason(d).label}, the three months in a row with the most fires from 2012 to 2020.`, cite: [`audit-${region}`] },
      { text: 'The Regions page shows every month since 2002 against normal, so you can see when a season started early or ran late.' },
    ],
    sources: [SRC.audit(region)],
    followUps: ['How much daylight is left?', OLD_TIME],
  }
}

const SAFETY: SiAnswer = {
  sentences: [
    { text: 'Ask Anchor can’t judge whether a fire is dangerous or give safety advice. For an active fire, follow your local fire service and emergency alerts.' },
    { text: 'It can tell you which satellites saw a fire, when, how hot it was, and how much daylight was left.' },
  ],
  sources: [],
  followUps: ['Which satellite saw this fire?', 'How much daylight is left?'],
}

/** Background questions a first-time visitor asks: what a hotspot is, why fires happen, what FRP is. */
function background(q: string): SiAnswer | null {
  if (/hot ?spot|active fire|what (is|are) (a |the |these |those )?(fire )?(dot|detection|point)s?\b|what counts as a fire/.test(q)) return {
    sentences: [
      { text: 'A hotspot is one satellite pixel where the sensor measured heat from at least one fire burning during the pass.' },
      { text: 'A MODIS hotspot (Terra, Aqua) marks a pixel about 1 km across; a VIIRS hotspot, 375 m. One large fire can light several pixels, so hotspots count detections, not separate fires.' },
    ],
    sources: [SRC.attrs],
    followUps: ['What is FRP?', 'How do these fires happen?'],
  }
  if (/(how|why) (do|did|are|does) .*(fire|burn)|what (causes|starts)|caus|who (sets|starts|lights)|start(ed)? (the |these )?fires|fires happen/.test(q)) return {
    sentences: [
      { text: 'Most fires on this map are set by people: to clear forest, renew pasture, or burn crop stubble after harvest (as in Punjab and Haryana).' },
      { text: 'In the Amazon, natural fires are rare because lightning usually comes with rain. Burning rises in the dry season, July to November, and peaks in September.' },
      { text: 'Lightning starts many boreal forest fires and some of California’s largest. The satellites record heat; they cannot tell how a fire started.' },
    ],
    sources: [SRC.amazonFire],
    followUps: ['What is a hotspot?', 'What am I looking at?'],
  }
  if (/\bfrp\b|megawatt|\bmw\b|radiative|how (hot|strong|intense)/.test(q)) return {
    sentences: [
      { text: 'FRP, fire radiative power, is the heat a fire gives off as radiation during the pass, summed over the pixel and given in megawatts (MW).' },
      { text: 'Higher FRP means more fuel burning at that moment. It is a snapshot: the same fire can read higher or lower at another hour.' },
    ],
    sources: [SRC.attrs],
    followUps: ['What is the strongest fire in the world?'],
  }
  if (/(why|does).*(time of day|hour|afternoon).*(matter|count)|daily cycle|diurnal/.test(q)) return {
    sentences: [
      { text: 'Fire follows a daily cycle: in the tropics, burning builds through the morning and peaks in the afternoon.' },
      { text: 'A satellite that looks at a different hour therefore counts a different number of fires, even when nothing changed on the ground.' },
    ],
    sources: [SRC.method],
    followUps: ['When does Aqua pass here?', OLD_TIME],
  }
  if (/solar time|sun time|local time/.test(q)) return {
    sentences: [{ text: 'Local solar time is clock time set by the sun at that longitude: 12:00 is when the sun is highest. It lets passes over different places be compared, whatever their time zone.' }],
    sources: [SRC.method],
  }
  if (/swath|why (wasn.t|isn.t|not) (it )?(seen|detected)|missed/.test(q)) return {
    sentences: [{ text: 'A satellite can miss a fire that was burning: it passed at another hour, the fire sat at the edge of its swath where pixels are coarse, or cloud or smoke hid it.' }],
    sources: [SRC.attrs],
  }
  if (/how (fast|quickly|soon)|delay|latency|real.?time/.test(q)) return {
    sentences: [{ text: 'NASA FIRMS publishes near-real-time detections within about 3 hours of a satellite pass, and faster over the US and Canada.' }],
    sources: [SRC.firms],
  }
  return null
}

function glossary(q: string): SiAnswer | null {
  if (has(q, 'firms')) return { sentences: [{ text: 'NASA FIRMS publishes active-fire detections from MODIS and VIIRS within hours of each pass.', cite: ['firms'] }], sources: [SRC.firms] }
  if (has(q, 'inpe', 'official')) return { sentences: [{ text: 'INPE’s Programa Queimadas is Brazil’s official fire count. It counts one reference satellite, Aqua, so year-to-year comparisons assume Aqua looks at the same time of day.', cite: ['method'] }], sources: [SRC.method] }
  const s = sat(q)
  const { first, last } = AMAZON
  if (s === 'aqua') return { sentences: [{ text: `Aqua carries a MODIS sensor and looks in the afternoon. Over the Amazon it looked at ${first.aqua_lst} in ${first.year} and ${last.aqua_lst} in ${last.year}.`, cite: ['drift-br-amazon'] }], sources: [SRC.drift('br-amazon')], actions: [{ kind: 'filter', label: 'Show only Aqua', group: 'aqua' }] }
  if (s === 'terra') return { sentences: [{ text: `Terra carries the other MODIS sensor and looks in the morning. Over the Amazon it looked at ${first.terra_lst} in ${first.year} and ${last.terra_lst} in ${last.year}.`, cite: ['drift-br-amazon'] }], sources: [SRC.drift('br-amazon')], actions: [{ kind: 'filter', label: 'Show only Terra', group: 'terra' }] }
  if (s === 'viirs') return { sentences: [{ text: `VIIRS flies on S-NPP, NOAA-20 and NOAA-21 and sees smaller fires than MODIS. Over the Amazon it stayed near ${last.viirs_lst}, so its count, scaled by the 2012–2020 Aqua-to-VIIRS rate, is our steady benchmark.`, cite: ['drift-br-amazon'] }], sources: [SRC.drift('br-amazon')], actions: [{ kind: 'filter', label: 'Show only VIIRS', group: 'viirs' }] }
  return null
}

/** Answer a question from the page's data. With one source, it is marked once, at the end, rather than on every sentence. */
export function ask(question: string, ctx: SiContext): SiAnswer {
  const a = answer(question, ctx)
  if (a.sources.length !== 1 || !a.sentences.length) return a
  const last = a.sentences.length - 1
  return { ...a, sentences: a.sentences.map((x, k) => ({ text: x.text, cite: k === last ? [a.sources[0].id] : undefined })) }
}

function answer(question: string, ctx: SiContext): SiAnswer {
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
  if (has(q, 'danger', 'safe', 'evacuat', 'should i', 'risk')) return SAFETY
  const b = background(q)
  if (b) return b
  if (has(q, 'what am i', 'how do i', 'how to', 'help', 'what is this', 'explain', 'start')) return orientation()
  if (has(q, 'why') && has(q, 'drift', 'later', 'move', 'chang')) return whyAnswer()
  if (has(q, 'season', 'which month', 'peak')) return seasonAnswer(ctx, q)
  if (has(q, 'unusual', 'normal', 'wrong', 'accurate', 'trust', 'reliable', 'this year')) return (studiedIn(q) ?? ctx.region) ? fixAnswer(ctx, q) : regionsAnswer()
  if (has(q, 'which satellite', 'who saw', 'who spotted', 'spotted', 'detected', 'this fire', 'strongest', 'biggest', 'hottest', 'largest')) {
    if (ctx.fire != null && !has(q, 'strongest', 'biggest', 'hottest', 'largest')) return fireAnswer(ctx.fire)
    // nothing picked yet: the strongest fire in the scope the question names (the world, a studied region, or the view)
    const world = has(q, 'world', 'earth', 'globe', 'anywhere', 'everywhere', 'planet')
    const named = world ? null : studiedIn(q)
    const scope = named ?? (world ? null : ctx.region)
    const box = scope ? boxOf(scope) : world ? null : ctx.view
    const i = strongest(box)
    if (i == null) return { sentences: [{ text: 'No fires in view. Zoom out or pick a region.' }], sources: [] }
    const where = scope ? `in ${regionData(scope).phrase.the}` : box ? 'in view' : 'in the world'
    const asked = has(q, 'strongest', 'biggest', 'hottest', 'largest')
    return fireAnswer(i, asked ? `The strongest fire ${where} on ${SPAN} is` : `You haven’t picked a fire yet (click one on the map), so here is the strongest ${where} on ${SPAN}`)
  }
  if (has(q, 'fix', 'fixed clock', 'old clock', 'old time', 'benchmark', 'counterfactual', 'would aqua count', 'expect')) return fixAnswer(ctx, q)
  if (has(q, 'daylight', 'dark', 'sunset', 'alert')) return daylightAnswer(ctx, q)
  if (has(q, 'when', 'what time', 'pass', 'clock', 'drift', 'later')) return whenAnswer(ctx, q)
  if (has(q, 'how many', 'count', 'number of')) return countAnswer(ctx)
  if (has(q, 'regions', 'compare', 'which region', 'record', 'trend', 'wrong')) return regionsAnswer()
  const g = glossary(q)
  if (g) return g
  return {
    sentences: [{ text: 'Ask Anchor answers from this page’s data: which satellite saw a fire, when each satellite passes and why Aqua drifted, whether a year was unusual, fire seasons, daylight after the alert, and fires in view. It can also fly the map or show one satellite.' }],
    sources: [],
    followUps: ['What is a hotspot?', 'How do these fires happen?', 'What is the strongest fire in the world?', OLD_TIME],
  }
}

export const firstRun = orientation
export const fireDetail = (i: number) => ask('which satellite saw this fire', { region: null, place: null, view: null, fire: i })
export { groupOf }
export const lstHours = (h: string) => hm(h)
