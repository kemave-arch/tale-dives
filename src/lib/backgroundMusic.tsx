import { useEffect, useRef, useState } from 'react'

// Soundtrack lives in public/tracks/ as ost_1.mp3, ost_2.mp3, ... — the same
// numbered-and-auto-discovered convention the background art uses (see
// cyclingBackground.tsx). Dropping ost_3.mp3 into that folder is enough on
// its own to add it to the rotation; no code change needed.
const TRACK_PREFIX = 'tracks/ost_'
const TRACK_EXT = '.mp3'
const MAX_TRACK_PROBE = 20 // sanity cap, not an expected real count
const FADE_MS = 2500
const FADE_STEP_MS = 50

// An <audio> probe rather than a fetch: a genuinely missing file still gets a
// 200 serving index.html from the dev server's SPA fallback, so status codes
// lie — but HTML can't be decoded as audio, so `error` fires and `onerror`
// remains a truthful existence check. Same reasoning as the image probe.
function probeTrackExists(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Audio()
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => resolve(true)
    probe.onerror = () => resolve(false)
    probe.src = src
  })
}

async function discoverTracks(base: string): Promise<string[]> {
  const found: string[] = []
  for (let i = 1; i <= MAX_TRACK_PROBE; i++) {
    const src = `${base}${TRACK_PREFIX}${i}${TRACK_EXT}`
    if (!(await probeTrackExists(src))) break
    found.push(src)
  }
  return found
}

/**
 * Background soundtrack: plays the discovered tracks in order, fading each one
 * in at its start and out before its end, then wrapping back to the first.
 *
 * Starts **muted and already playing** rather than waiting for a gesture —
 * every browser permits muted autoplay, so the sequence is genuinely running
 * from load and the toggle only flips `.muted`. That makes unmuting instant
 * (the click is itself the user gesture browsers require for audible
 * playback) and sidesteps the autoplay-blocked/out-of-sync-icon problem
 * entirely. `.muted` is deliberately kept separate from the `.volume` ramps,
 * so a deliberate user toggle is immediate while track changes stay gradual.
 */
export function useBackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeTimerRef = useRef<number | null>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Attached to the DOM rather than a bare `new Audio()` purely so the
    // player is inspectable in devtools; it's hidden and control-less, so
    // it behaves identically otherwise.
    const audio = document.createElement('audio')
    audio.id = 'td-soundtrack'
    audio.hidden = true
    audio.loop = false
    audio.muted = true
    audio.volume = 0
    document.body.appendChild(audio)
    audioRef.current = audio

    let tracks: string[] = []
    let index = 0
    let fadingOut = false

    // Interval rather than requestAnimationFrame on purpose: rAF does not
    // fire at all while the document is hidden, so a backgrounded tab would
    // freeze a fade partway and leave the volume stranded (verified — the
    // preview pane runs hidden and pinned the volume at 0). Timers are only
    // throttled, not stopped, and since each tick recomputes progress from
    // elapsed wall-clock time rather than counting steps, a throttled fade
    // still lands exactly on target, just in fewer/coarser jumps.
    function fadeTo(target: number) {
      if (fadeTimerRef.current !== null) clearInterval(fadeTimerRef.current)
      const from = audio.volume
      const started = performance.now()
      fadeTimerRef.current = window.setInterval(() => {
        const t = Math.min(1, (performance.now() - started) / FADE_MS)
        audio.volume = Math.max(0, Math.min(1, from + (target - from) * t))
        if (t >= 1 && fadeTimerRef.current !== null) {
          clearInterval(fadeTimerRef.current)
          fadeTimerRef.current = null
        }
      }, FADE_STEP_MS)
    }

    function playCurrent() {
      if (cancelled || tracks.length === 0) return
      fadingOut = false
      audio.src = tracks[index]
      audio.volume = 0
      // Rejected play() is not an error worth surfacing — muted autoplay is
      // permitted, and anything else self-corrects on the next track change.
      void audio.play().catch(() => {})
      fadeTo(1)
    }

    function handleTimeUpdate() {
      if (fadingOut || !Number.isFinite(audio.duration)) return
      // Guard the fade window against a track shorter than the fade itself,
      // which would otherwise start fading out the instant it began.
      const fadeOutAt = Math.max(audio.duration / 2, audio.duration - FADE_MS / 1000)
      if (audio.currentTime >= fadeOutAt) {
        fadingOut = true
        fadeTo(0)
      }
    }

    function handleEnded() {
      if (tracks.length === 0) return
      index = (index + 1) % tracks.length
      playCurrent()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    void discoverTracks(import.meta.env.BASE_URL).then((found) => {
      if (cancelled) return
      tracks = found
      playCurrent()
    })

    return () => {
      cancelled = true
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      if (fadeTimerRef.current !== null) clearInterval(fadeTimerRef.current)
      audio.pause()
      audio.src = ''
      audio.remove()
      audioRef.current = null
    }
  }, [])

  // Sync declaratively rather than inside the setMuted updater — updater
  // functions must stay pure, and React is free to call them more than once,
  // which would toggle `.muted` twice and leave the element out of step with
  // the icon.
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  function toggleMute() {
    setMuted((prev) => !prev)
  }

  return { muted, toggleMute }
}
