// Round 1 direction comps for Anchor (?d=a|b|c). Drafted with AI assistance (Claude) for Team Propagators.
import DirectionA from './directions/DirectionA'
import DirectionB from './directions/DirectionB'
import DirectionC from './directions/DirectionC'
import DirectionD from './directions/DirectionD'
import DirectionE from './directions/DirectionE'

export default function App() {
  const d = new URLSearchParams(window.location.search).get('d') ?? 'a'
  if (d === 'b') return <DirectionB />
  if (d === 'c') return <DirectionC />
  if (d === 'd') return <DirectionD />
  if (d === 'e') return <DirectionE />
  return <DirectionA />
}
