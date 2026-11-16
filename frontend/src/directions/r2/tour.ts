// The Explore page's first-visit guide: four short steps, shown once, replayed from the header's Guide button.
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
  const steps: DriveStep[] = [
    {
      element: '[data-tour="intro"]',
      popover: {
        title: 'What this page shows',
        description: `NASA’s Aqua satellite now passes ${shift} later in the day. Fires burn more in the afternoon, so its fire count can change even when the fires don’t.`,
        side: 'right', align: 'start',
      },
    },
    {
      element: '[data-tour="places"]',
      popover: {
        title: 'Six places, one number each',
        description: 'Aqua’s 2025 count against what a fixed clock predicts. “Unusual” means outside the 2012–2020 range. Click a place to fly there.',
        side: 'right', align: 'start',
      },
    },
    {
      element: '[data-tour="map"]',
      popover: {
        title: 'The same test, worldwide',
        description: 'Each square is one 2° area. Search or zoom in, then click a fire to see which satellites saw it, and when.',
        side: 'left', align: 'center',
      },
    },
    {
      element: '[data-tour="chart"]',
      popover: {
        title: 'When each satellite looked',
        description: 'One hump per satellite, by local time. Aqua (amber) now looks later than its 2012–2020 time, marked on the chart.',
        side: 'top', align: 'center',
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
    doneBtnText: 'Start exploring',
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 6,
    popoverClass: 'anchor-guide',
    onDestroyed: () => { try { window.localStorage.setItem(KEY, 'seen') } catch { /* storage can be blocked */ } },
  })
  d.drive()
}
