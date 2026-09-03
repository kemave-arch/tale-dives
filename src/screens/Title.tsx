import { useMemo } from 'react'
import { BookOpen, Settings as SettingsIcon } from 'lucide-react'

interface TitleProps {
  onEnter: () => void
  onSettings: () => void
}

// Rising gold embers over the artwork, echoing its own painted light-streaks.
// Pure CSS (see .title-sparks in index.css), positions randomized once
// per mount; negative delays stagger them so they don't all ignite at once.
function AmbientSparks({ count = 22 }: { count?: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const size = 2 + Math.random() * 2.5
        return {
          left: `${Math.random() * 100}%`,
          bottom: `${Math.random() * 25}%`,
          size,
          duration: `${9 + Math.random() * 8}s`,
          delay: `${-(Math.random() * 17)}s`,
        }
      }),
    [count],
  )
  return (
    <div className="title-sparks" aria-hidden="true">
      {sparks.map((s, i) => (
        <span
          key={i}
          style={{ left: s.left, bottom: s.bottom, width: `${s.size}px`, height: `${s.size}px`, animationDuration: s.duration, animationDelay: s.delay }}
        />
      ))}
    </div>
  )
}

// Blueprint §6.4A — Title/entry screen. The artwork itself (public/title-bg1.png
// — numbered so a future rotating/crossfading background can add title-bg2.png,
// title-bg3.png, etc. alongside it) already carries the wordmark, tagline and
// dedication, so this screen adds nothing on top of it but ambient sparks, a
// bottom scrim, and the buttons that lead somewhere real. No Worlds/Journal/
// Profile/Inventory/Achievements row — those aren't separate screens yet, so
// a button for them would just be decoration.
export default function Title({ onEnter, onSettings }: TitleProps) {
  return (
    <div
      className="min-h-dvh relative flex flex-col justify-end items-center text-center px-6 overflow-hidden bg-[#050308]"
      style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: 'url(/title-bg1.png)' }}
        role="img"
        aria-label="A protagonist and companion leap from the pages of an open book, surrounded by golden light and vignettes of the worlds within."
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(4,3,7,0.55) 40%, rgba(4,3,7,0.92) 85%)' }}
      />
      <AmbientSparks />

      <button
        onClick={onSettings}
        aria-label="Settings"
        className="absolute top-0 right-0 z-10 mt-[max(1rem,env(safe-area-inset-top))] mr-4 w-10 h-10 rounded-full inline-flex items-center justify-center text-[#e8ca8a]/80 bg-black/30 backdrop-blur-sm hover:text-[#e8ca8a]"
      >
        <SettingsIcon size={18} />
      </button>

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-3 mb-14">
        <button
          onClick={onEnter}
          className="relative w-full rounded-full border-2 border-[#e8ca8a] bg-black/20 backdrop-blur-sm py-3.5 font-display text-sm uppercase tracking-[0.2em] text-[#f5dfa0] flex items-center justify-center gap-2.5 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.85)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#f5dfa0] hover:shadow-[0_0_18px_2px_rgba(240,202,101,0.35)] active:scale-[0.98] active:border-[#fbe7ac] active:shadow-[0_0_34px_10px_rgba(240,202,101,0.7)]"
        >
          <span className="text-[#f0ca65]">◆</span>
          <BookOpen size={15} />
          Dive In
          <span className="text-[#f0ca65]">◆</span>
        </button>
      </div>
    </div>
  )
}
