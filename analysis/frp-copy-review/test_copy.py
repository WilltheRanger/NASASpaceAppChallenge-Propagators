import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class CopyTests(unittest.TestCase):
 def test_metric_and_population_are_explicit(self):
  text=(ROOT/'frontend/src/directions/r2/Simulator.tsx').read_text()
  self.assertIn('Higher FRP than {frpPercentile}% of snapshot detections',text)
  self.assertIn('Mixed sensors and observation times; not temperature or a ranking of unique fires.',text)
  self.assertIn('>fire radiative power</span>',text)
  self.assertNotIn('Hotter than',text)
if __name__=='__main__':unittest.main()
