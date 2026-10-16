import sliderThumb from '@/assets/home/slider-thumb.svg'
import sliderTrack from '@/assets/home/slider-track-active.svg'
import { cn } from '@/lib/utils'
import type { PriceRange } from '../types'

interface PriceRangeSliderProps {
  bounds: PriceRange
  value: PriceRange
  step?: number
  onChange: (value: PriceRange) => void
  className?: string
}

const THUMB_SIZE = 15

const rangeInputClass = cn(
  'pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent opacity-0',
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-[15px] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none',
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-[15px] [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:border-0',
)

export function PriceRangeSlider({
  bounds,
  value,
  step = 0.01,
  onChange,
  className,
}: PriceRangeSliderProps) {
  const span = bounds.max - bounds.min || 1
  const toRatio = (price: number) => (price - bounds.min) / span
  const thumbLeft = (price: number) =>
    `calc(${toRatio(price)} * (100% - ${THUMB_SIZE}px))`

  return (
    <div className={cn('relative h-[15px] w-full', className)}>
      <img
        src={sliderTrack}
        alt=""
        className="absolute top-1/2 left-0 h-1 w-full max-w-none -translate-y-1/2"
      />
      {[value.min, value.max].map((price, index) => (
        <span
          key={index}
          className="pointer-events-none absolute top-0 size-[15px]"
          style={{ left: thumbLeft(price) }}
        >
          <img src={sliderThumb} alt="" className="absolute -inset-[3px] size-[21px] max-w-none" />
        </span>
      ))}
      <input
        type="range"
        aria-label="Preço mínimo"
        min={bounds.min}
        max={bounds.max}
        step={step}
        value={value.min}
        onChange={(event) =>
          onChange({ min: Math.min(Number(event.target.value), value.max), max: value.max })
        }
        className={rangeInputClass}
      />
      <input
        type="range"
        aria-label="Preço máximo"
        min={bounds.min}
        max={bounds.max}
        step={step}
        value={value.max}
        onChange={(event) =>
          onChange({ min: value.min, max: Math.max(Number(event.target.value), value.min) })
        }
        className={rangeInputClass}
      />
    </div>
  )
}
