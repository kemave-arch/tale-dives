import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

// Shared "border-only glassmorphism" chrome for screens that sit directly on
// top of the cycling background art (Title, MainMenu) — transparent fill,
// a thin gradient-gold border, blur that only appears on hover/press. See
// Title.tsx's original Dive In button for how this was worked out (mask-
// composite for the ring so the gradient can't bleed into the interior, and
// a transition scoped to box-shadow only so backdrop-filter doesn't get
// stuck interpolating toward Tailwind's empty "none" value).

// A tapered-corner (chamfered) rectangle instead of a rounded pill.
export const TAPER_CLIP =
  'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)'

const RING_GRADIENT = 'linear-gradient(135deg, rgba(245,223,160,0.75), rgba(240,202,101,0.95), rgba(168,127,44,0.65)) border-box'

function GradientRing({ tapered }: { tapered?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none ${tapered ? '' : 'rounded-[inherit]'}`}
      style={{
        clipPath: tapered ? TAPER_CLIP : undefined,
        border: '1.5px solid transparent',
        background: RING_GRADIENT,
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
      <GradientRing tapered />
      <span
        className="absolute inset-0 backdrop-blur-none transition-[box-shadow] duration-150 group-hover:backdrop-blur-sm group-hover:shadow-[0_0_18px_2px_rgba(240,202,101,0.35)] group-active:backdrop-blur-sm group-active:shadow-[0_0_34px_10px_rgba(240,202,101,0.7)]"
        style={{ clipPath: TAPER_CLIP }}
      />
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
