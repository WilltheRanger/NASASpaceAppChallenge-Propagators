// The Explore page's first-visit guide: five short steps, shown once on the first visit, replayed from "How it works".
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import './tour.css'

const KEY = 'anchor-explore-guide'

export function guideSeen() {
  try { return window.localStorage.getItem(KEY) === 'seen' } catch { return false }
}

const visible = (sel: string) => {
  const el = document.querySelector(sel)
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

export function startGuide(shift: string, motion: boolean) {
  // wide screens: the card beside the left panel; phones: above or below what it points at
  const wide = window.matchMedia('(min-width: 1024px)').matches
  const side = (w: 'right' | 'left') => (wide ? w : 'top') as 'right' | 'left' | 'top'
  const steps: DriveStep[] = [
    {
      element: '#alert-h',
      popover: {
        title: 'What this page is for',
        description: 'A what-if for responders: when each satellite could alert you to a fire here, and how much daylight would be left. Typical pass times and an assumed delay, not measured alert performance.',
        side: side('right'), align: 'start',
      },
    },
    {
      element: '[data-tour="inputs"]',
      popover: {
        title: '1. Set it up',
        description: 'Pick or search a place, then set the alert delay: the time from a satellite’s pass to its alert. NASA FIRMS delivers within 3 hours.',
        side: side('right'), align: 'start',
      },
    },
    {
      element: '[data-tour="answer"]',
      popover: {
        title: '2. Read the answer',
        description: 'One row per satellite: when it passes, when its alert arrives, and the daylight left until sunset. The highlighted row alerts first.',
        side: side('right'), align: 'start',
      },
    },
    {
      element: '[data-tour="then-now"]',
      popover: {
        title: '3. What changed',
        description: `Aqua, the satellite behind Brazil’s official fire count, now passes ${shift} later than in 2012–2020. Switch to 2012–20 to compare its alert in this scenario.`,
        side: side('right'), align: 'start',
      },
    },
    {
      element: '[data-tour="ask"]',
      popover: {
        title: 'Ask Anchor',
        description: 'Ask about the map in plain words, for example “When does Aqua pass here?” Answers come from our data, with sources.',
        side: 'left', align: 'start',
      },
    },
    {
      element: '[data-tour="map"]',
      popover: {
        title: 'The fires on the map',
        description: 'Real fires from a saved snapshot, dated in the corner. Tap a fire to see which satellite saw it, and when. Replay this guide from “How it works”.',
        side: wide ? 'left' : 'bottom', align: 'center',
      },
    },
  ].filter((s) => visible(s.element as string)) as DriveStep[]
  if (!steps.length) return
  const d = driver({
    steps,
    animate: motion,
    smoothScroll: false,
    allowClose: true,
    allowKeyboardControl: true,
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 6,
    popoverClass: 'anchor-guide',
    onDestroyed: () => { try { window.localStorage.setItem(KEY, 'seen') } catch { /* storage can be blocked */ } },
  })
  d.drive()
}
