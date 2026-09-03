import { useEffect, useState } from 'react'

// Each slot ships as a pair: public/img/m_<stem>.webp (phone-composed) and
// public/img/pc_<stem>.webp (tablet/desktop-composed, also the guaranteed
// fallback if a slot's m_ file doesn't exist yet). Shared by Title and
// MainMenu so both cycle through the same backdrop. Add a stem here once its
// pair does.
export const BACKGROUND_SLOTS = ['title-bg1', 'title-bg2']
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
// second image takes over.
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

// Crossfades through `stems`: every layer sits stacked (inset-0), only the
// active one is opacity-100, and both the outgoing and incoming layers
// animate on the same `transition`, which is what makes it read as one
// dissolve rather than a fade-to-black-then-in. A no-op with a single slot
// — the interval never starts, so there's just one static, correctly-picked
// background. `fixed` pins the art to the viewport regardless of the page's
// own scroll (for a scrollable screen like MainMenu); Title, which never
// scrolls, uses the cheaper `absolute`.
export function CyclingBackground({ stems, fixed = false }: { stems: string[]; fixed?: boolean }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (stems.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setActive((i) => (i + 1) % stems.length), BG_HOLD_MS + BG_FADE_MS)
    return () => clearInterval(id)
  }, [stems.length])

  return (
    <div className={fixed ? 'fixed inset-0 z-0' : 'contents'}>
      {stems.map((stem, i) => (
        <BackgroundLayer key={stem} stem={stem} active={i === active} />
      ))}
    </div>
  )
}
