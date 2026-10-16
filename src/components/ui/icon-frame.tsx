import { cn } from '@/lib/utils'

interface IconFrameProps {
  src: string
  /** Outer box, e.g. "size-5". */
  className?: string
  /** Inset of the vector inside the box (Figma's inner frame). */
  inner?: string
  /** Negative inset that lets the stroke bleed outside the vector bounds. */
  bleed?: string
}

/** Reproduces the nested icon frames exported from Figma so each SVG keeps its exact geometry. */
export function IconFrame({ src, className, inner, bleed }: IconFrameProps) {
  const image = <img src={src} alt="" className="absolute inset-0 block size-full max-w-none" />
  const bled = bleed ? <span className={cn('absolute', bleed)}>{image}</span> : image
  return (
    <span aria-hidden className={cn('relative block shrink-0', className)}>
      {inner ? <span className={cn('absolute', inner)}>{bled}</span> : bled}
    </span>
  )
}
