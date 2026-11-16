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
      element: '#alert-h',
      popover: {
        title: 'The question this page answers',
        description: 'If a fire starts here today: when does each satellite pass, when would its alert reach you, and how much daylight is left to act. Pass times and sunset are real; the alert delay is your choice.',
        side: 'right', align: 'start',
      },
    },
    {
      element: '[data-tour="then-now"]',
      popover: {
        title: 'What Aqua’s drift changed',
        description: `Aqua now passes ${shift} later than in 2012–2020. Switch between then and now to see its alert and daylight change.`,
        side: 'right', align: 'start',
      },
    },
    {
      element: '[data-tour="places"]',
      popover: {
        title: 'Six studied places',
        description: 'Pick one to see its own pass times and sunset. Or search any place at the top.',
        side: 'right', align: 'start',
      },
    },
    {
      element: '[data-tour="map"]',
      popover: {
        title: 'The fires on the map',
        description: 'Real fires from the saved file, with their dates in the corner. Click one to see which satellite saw it, and when.',
        side: 'left', align: 'center',
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
