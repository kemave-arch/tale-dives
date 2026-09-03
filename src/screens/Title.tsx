import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Settings as SettingsIcon } from 'lucide-react'

interface TitleProps {
  onEnter: () => void
  onSettings: () => void
}

// Each slot below ships as a pair: public/img/m_<stem>.webp (phone-composed)
// and public/img/pc_<stem>.webp (tablet/desktop-composed) — see the note on
// public/img/ in PROJECT_REVISION_NOTES.md. Add a stem here once its pair does.
const BACKGROUND_SLOTS = ['title-bg1', 'title-bg2']
const MOBILE_QUERY = '(max-width: 767px)'
const BG_FADE_MS = 7000
const BG_HOLD_MS = 6000

// pc_ is the guaranteed default — a slot's m_ file is optional and can lag
// behind. On a phone-width viewport, try the m_ variant first and silently
// fall back to pc_ if it 404s; on anything wider, always use pc_ directly.
function useResponsiveBg(stem: string): string {
  const pcSrc = `/img/pc_${stem}.webp`
  const mobileSrc = `/img/m_${stem}.webp`
  const [src, setSrc] = useState(pcSrc)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    let cancelled = false

    function resolve() {
      if (!mq.matches) {
        setSrc(pcSrc)
        return
      }
      const probe = new Image()
      probe.onload = () => {
        if (!cancelled) setSrc(mobileSrc)
      }
      probe.onerror = () => {
        if (!cancelled) setSrc(pcSrc)
      }
      probe.src = mobileSrc
    }

    resolve()
    mq.addEventListener('change', resolve)
    return () => {
      cancelled = true
      mq.removeEventListener('change', resolve)
    }
  }, [pcSrc, mobileSrc])

  return src
}

// Decorative (aria-hidden) rather than described per-slot — with more than
// one slot cycling through, a single alt text would go stale the moment a
// second image takes over; the screen's own heading/tagline art already
// carries the real content.
function BackgroundLayer({ stem, active }: { stem: string; active: boolean }) {
  const src = useResponsiveBg(stem)
  return (
    <div
      className="absolute inset-0 bg-center bg-cover bg-no-repeat"
      style={{ backgroundImage: `url(${src})`, opacity: active ? 1 : 0, transition: `opacity ${BG_FADE_MS}ms ease-in-out` }}
      aria-hidden="true"
    />
  )
}

// Crossfades through BACKGROUND_SLOTS: every layer sits stacked (inset-0),
// only the active one is opacity-100, and both the outgoing and incoming
// layers animate on the same `transition`, which is what makes it read as
// one dissolve rather than a fade-to-black-then-in. A no-op with a single
// slot (today's default) — the interval never starts, so there's just one
// static, correctly-picked background.
function CyclingBackground({ stems }: { stems: string[] }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (stems.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setActive((i) => (i + 1) % stems.length), BG_HOLD_MS + BG_FADE_MS)
    return () => clearInterval(id)
  }, [stems.length])

  return (
    <>
      {stems.map((stem, i) => (
        <BackgroundLayer key={stem} stem={stem} active={i === active} />
      ))}
    </>
  )
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

// Blueprint §6.4A — Title/entry screen. The artwork (see BACKGROUND_SLOTS
// above) already carries the wordmark, tagline and dedication, so this
// screen adds nothing on top of it but a slow crossfade between images (once
// more than one slot exists), ambient sparks, a bottom scrim, and the
// buttons that lead somewhere real. No Worlds/Journal/Profile/Inventory/
// Achievements row — those aren't separate screens yet, so a button for them
// would just be decoration.
export default function Title({ onEnter, onSettings }: TitleProps) {
  return (
    <div
      className="min-h-dvh relative flex flex-col justify-end items-center text-center px-6 overflow-hidden bg-[#050308]"
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
        <button
          onClick={onEnter}
          className="group relative inline-flex rounded-full p-[1.5px] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.85)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] active:brightness-125"
          style={{ background: 'linear-gradient(135deg, rgba(245,223,160,0.55), rgba(240,202,101,0.95), rgba(168,127,44,0.5))' }}
        >
          <span className="flex items-center justify-center gap-2 rounded-full bg-transparent backdrop-blur-sm px-5 py-2 font-display text-sm uppercase tracking-[0.2em] text-[#f5dfa0] transition-shadow duration-150 group-hover:shadow-[0_0_18px_2px_rgba(240,202,101,0.35)] group-active:shadow-[0_0_34px_10px_rgba(240,202,101,0.7)]">
            <span className="text-[#f0ca65]">◆</span>
            <BookOpen size={14} />
            Dive In
            <span className="text-[#f0ca65]">◆</span>
          </span>
        </button>
      </div>
    </div>
  )
}
