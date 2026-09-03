import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

// Shared "border-only glassmorphism" chrome for screens that sit directly on
// top of the cycling background art (Title, MainMenu) — transparent fill at
// rest, a thin gradient-gold border, a frosted white tint + blur that only
// appears on hover/press. Two things worth knowing before touching this:
// - The ring is built as its own clipped/masked shape so the gradient can
//   never bleed into the interior (a plain fill behind a "transparent"
//   inner layer just shows straight through — that was the original bug).
// - `backdrop-filter` is deliberately left OUT of any `transition-[...]`
//   list here. Tailwind's `backdrop-blur-none` compiles to `none`, not
//   `blur(0)` — `none` is a keyword, not a numeric function, so most
//   browser engines can't interpolate toward/from it and instead just
//   freeze on the last value that *did* render, leaving hover's blur stuck
//   on after the mouse leaves. Background-color and box-shadow animate
//   fine (real numeric values); backdrop-filter just switches instantly.

// A tapered-corner (chamfered) rectangle instead of a rounded pill.
export const TAPER_CLIP =
  'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)'

// Uniform 1.5px hollow perimeter for the tapered rectangle, covering all 8
// edges (4 straight, 4 diagonal taper cuts) via one evenodd cutout — traces
// the outer TAPER_CLIP outline plus an inner copy inset by 1.5px, so the
// fill between them is the ring. Replaces the mask-composite trick (which
// only produces a uniform ring for a plain rectangle/rounded-rect — the
// tapered case needed the ring built taper-aware from the start, not
// clipped after the fact, or the ring reads unevenly thick at the corners).
export const TAPER_BORDER_CLIP =
  'polygon(evenodd, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px, 10px 0, 10.62px 1.5px, calc(100% - 10.62px) 1.5px, calc(100% - 1.5px) 10.62px, calc(100% - 1.5px) calc(100% - 10.62px), calc(100% - 10.62px) calc(100% - 1.5px), 10.62px calc(100% - 1.5px), 1.5px calc(100% - 10.62px), 1.5px 10.62px, 10.62px 1.5px, 10px 0)'

const RING_GRADIENT = 'linear-gradient(135deg, rgba(245,223,160,0.75), rgba(240,202,101,0.95), rgba(168,127,44,0.65))'

function GradientRing({ tapered }: { tapered?: boolean }) {
  if (tapered) {
    return <span aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: RING_GRADIENT, clipPath: TAPER_BORDER_CLIP }} />
  }
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none rounded-[inherit]"
      style={{
        border: '1.5px solid transparent',
        background: `${RING_GRADIENT} border-box`,
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0) border-box',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      }}
    />
  )
}

interface GlassCTAButtonProps {
  onClick: () => void
  icon?: LucideIcon
  children: ReactNode
  className?: string
}

// Primary call-to-action — tapered rectangle, gradient ring, glass interior
// that's invisible at rest and blurs + glows on hover/press.
export function GlassCTAButton({ onClick, icon: Icon, children, className = '' }: GlassCTAButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex drop-shadow-[0_8px_14px_rgba(0,0,0,0.85)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] active:brightness-125 ${className}`}
      style={{ clipPath: TAPER_CLIP }}
    >
      {/* Fill sits BELOW the ring so the frosted tint never dulls the gold
          border on hover. bg/box-shadow animate; backdrop-filter deliberately
          doesn't (see the module comment) — it still changes instantly on
          hover/press, just without a transition riding along that can get
          stuck. focus-visible mirrors hover so keyboard users get the same
          affordance. */}
      <span
        className="absolute inset-0 bg-white/0 backdrop-blur-none transition-[background-color,box-shadow] duration-200 group-hover:bg-white/25 group-hover:backdrop-blur-md group-hover:shadow-[0_0_18px_2px_rgba(240,202,101,0.35)] group-focus-visible:bg-white/25 group-focus-visible:backdrop-blur-md group-active:bg-white/30 group-active:backdrop-blur-md group-active:shadow-[0_0_34px_10px_rgba(240,202,101,0.7)]"
        style={{ clipPath: TAPER_CLIP }}
      />
      <GradientRing tapered />
      <span className="relative z-10 flex items-center justify-center gap-2 px-6 py-2.5 font-display text-sm uppercase tracking-[0.2em] text-[#f5dfa0]">
        <span className="text-[#f0ca65]">◆</span>
        {Icon && <Icon size={14} />}
        {children}
        <span className="text-[#f0ca65]">◆</span>
      </span>
    </button>
  )
}

type IconTone = 'default' | 'action' | 'danger'

const ICON_TONE_CLASS: Record<IconTone, string> = {
  default: 'border-[#e8ca8a]/35 text-[#e8ca8a]/85 hover:border-[#e8ca8a] hover:text-[#f5dfa0]',
  action: 'border-[#f0ca65] text-[#f5dfa0] hover:shadow-[0_0_12px_1px_rgba(240,202,101,0.5)]',
  danger: 'border-rose-400/40 text-rose-300/85 hover:border-rose-400 hover:text-rose-200',
}

interface GlassIconButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  tone?: IconTone
  compact?: boolean
}

// Small circular border-only glass button — the cycling-background
// equivalent of MainMenu's old skin-token IconButton.
export function GlassIconButton({ icon: Icon, label, onClick, tone = 'default', compact = false }: GlassIconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center shrink-0 rounded-full border bg-transparent backdrop-blur-sm transition-colors duration-150 ${compact ? 'w-8 h-8' : 'w-10 h-10'} ${ICON_TONE_CLASS[tone]}`}
    >
      <Icon size={compact ? 15 : 18} />
    </button>
  )
}

// Plain rounded-corner glass surface for cards/rows/panels — no gradient
// ring, just a thin solid border, transparent fill, blur. className string
// (not a component) so it composes freely with layout classes per call site.
export const GLASS_SURFACE = 'border border-[#e8ca8a]/25 bg-transparent backdrop-blur-sm'
export const GLASS_SURFACE_HOVER = 'transition-colors duration-150 hover:border-[#e8ca8a]/60'
