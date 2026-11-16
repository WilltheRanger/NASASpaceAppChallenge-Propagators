"""Static navigation contracts; complement the documented real-browser landing check."""
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
class CalendarNavigation(unittest.TestCase):
    def test_overview_direct_link(self):
        s = (ROOT/'frontend/src/directions/r2/Overview.tsx').read_text()
        self.assertIn('href={`${links.regions()}#calendar`}', s)
        self.assertIn('Open the fire calendar', s)
    def test_region_preserves_selection(self):
        s = (ROOT/'frontend/src/directions/r2/FieldFilm.tsx').read_text()
        # the calendar is the Regions page's first section, ahead of the audit result, so no extra shortcut button is needed
        self.assertLess(s.index('<Calendar d={d}'), s.index('<Result d={d}'))
        self.assertIn("window.location.hash !== '#calendar'", s)
        self.assertIn("if (el) glideTo(el, false)", s)
    def test_heading_and_limits(self):
        s = (ROOT/'frontend/src/directions/r2/FieldFilm.tsx').read_text()
        self.assertIn('id="calendar-h" className={title}>Harmonized fire calendar', s)
        self.assertIn('Typical = the median for that calendar month, 2002–2025.', s)
        self.assertNotIn('Each square is a month: the fires we’d expect Aqua to count at its old time.', s)
if __name__ == '__main__': unittest.main()
