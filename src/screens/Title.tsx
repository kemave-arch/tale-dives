import { useMemo } from 'react'
import { BookOpen, Settings as SettingsIcon } from 'lucide-react'
import { BACKGROUND_SLOTS, CyclingBackground } from '../lib/cyclingBackground.tsx'
import { GlassCTAButton } from '../lib/glassChrome.tsx'

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

// Blueprint §6.4A — Title/entry screen. The artwork (see BACKGROUND_SLOTS in
// lib/cyclingBackground.tsx) already carries the wordmark, tagline and
// dedication, so this screen adds nothing on top of it but a slow crossfade
// between images (once more than one slot exists), ambient sparks, a bottom
// scrim, and the buttons that lead somewhere real. No Worlds/Journal/
// Profile/Inventory/Achievements row — those aren't separate screens yet, so
// a button for them would just be decoration.
export default function Title({ onEnter, onSettings }: TitleProps) {
  return (
    <div
      className="h-dvh relative flex flex-col justify-end items-center text-center px-6 overflow-hidden bg-[#050308]"
      style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      <CyclingBackground stems={BACKGROUND_SLOTS} />
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
        <GlassCTAButton onClick={onEnter} icon={BookOpen}>
          Dive In
        </GlassCTAButton>
      </div>
    </div>
  )
}
