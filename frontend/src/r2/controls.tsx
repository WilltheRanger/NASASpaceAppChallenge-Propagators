// Round 2 controls: Radix primitives (Select, Slider, Toggle Group) with no styling of their own.
// Each direction passes classes that read its CSS tokens. Drafted with AI assistance (Claude) for Team Propagators.
import * as Select from '@radix-ui/react-select'
import * as Slider from '@radix-ui/react-slider'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { REGIONS } from './data'

export interface RegionSelectClasses { trigger: string; content: string; item: string; icon?: string }

export function RegionSelect({ value, onChange, classes, swatch, label = 'Region' }: {
  value: string; onChange: (id: string) => void; classes: RegionSelectClasses; swatch?: (id: string) => ReactNode; label?: string
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger aria-label={label} className={classes.trigger}>
        {swatch ? swatch(value) : null}
        <Select.Value />
        <Select.Icon className={classes.icon}><ChevronDown size={16} strokeWidth={1.5} aria-hidden /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={6} align="end" className={classes.content}>
          <Select.Viewport>
            {REGIONS.map((r) => (
              <Select.Item key={r.id} value={r.id} className={classes.item}>
                {swatch ? swatch(r.id) : null}
                <Select.ItemText>{r.name}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto"><Check size={16} strokeWidth={1.5} aria-hidden /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export interface YearSliderClasses { root: string; track: string; range?: string; thumb: string }

export function YearSlider({ value, onChange, min, max, valueText, classes, label = 'Year' }: {
  value: number; onChange: (y: number) => void; min: number; max: number; valueText: (y: number) => string; classes: YearSliderClasses; label?: string
}) {
  return (
    <Slider.Root className={classes.root} value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} aria-label={label}>
      <Slider.Track className={classes.track}>{classes.range ? <Slider.Range className={classes.range} /> : null}</Slider.Track>
      <Slider.Thumb className={classes.thumb} aria-label={label} aria-valuetext={valueText(value)} />
    </Slider.Root>
  )
}

export function ModeToggle({ value, onChange, classes }: {
  value: 'anomaly' | 'count'; onChange: (m: 'anomaly' | 'count') => void; classes: { root: string; item: string }
}) {
  return (
    <ToggleGroup.Root type="single" value={value} onValueChange={(v) => v && onChange(v as 'anomaly' | 'count')} aria-label="Calendar values" className={classes.root}>
      <ToggleGroup.Item value="anomaly" className={classes.item}>Vs. median</ToggleGroup.Item>
      <ToggleGroup.Item value="count" className={classes.item}>Fixed-clock count</ToggleGroup.Item>
    </ToggleGroup.Root>
  )
}
