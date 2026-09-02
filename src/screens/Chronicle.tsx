import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Menu, Settings as SettingsIcon, Send, Star, BookOpen, Library, Sparkle, X, ExternalLink,
  ChevronUp, ChevronDown, ChevronsDown, History, Pause, Users, Backpack, Map as MapIcon, ShieldCheck, Target, Skull, HelpCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { renderNarrative, type TapTermHandler } from '../lib/richText.tsx'
import { TURN_STATE_META } from '../lib/turnStates.ts'
import { formatCurrency } from '../lib/currency.ts'
import { slugify } from '../lib/slug.ts'
import { BANG_COMMANDS } from '../lib/bangCommands.ts'
import type {
  BestiaryEntry, CombatState, FactionEntry, GameTime, KeywordLink, LocationEntry, LogEntry, LoreEntry, NpcEntry, Player, QuestEntry,
  SlashCommand,
} from '../types.ts'

interface ChronicleProps {
  title: string
  player: Player
  combat?: CombatState
  log: LogEntry[]
  busy: boolean
  error: string | null
  chromeOpacity: number
  npcs: Record<string, NpcEntry>
  locations: Record<string, LocationEntry>
  factions: Record<string, FactionEntry>
  lore: Record<string, LoreEntry>
  quests: Record<string, QuestEntry>
  bestiary: Record<string, BestiaryEntry>
  onSend: (action: string, forcePause?: boolean) => void
  onBangCommand: (raw: string) => void
  slashCommands: SlashCommand[]
  onOpenSlashManager: () => void
  onOpenSettings: () => void
  onOpenMenu: () => void
  onOpenCodex: () => void
  onOpenCodexEntry: (category: KeywordLink['category'], id: string) => void
}

const WINDOW_SIZE = 20 // §9.2 — cap how many turns stay mounted; older ones load in on demand
const INPUT_MAX_HEIGHT = 88

function PoolBar({ label, value, max, colorVar }: { label: string; value: number; max: number; colorVar: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <span className="w-5 shrink-0 font-mono text-[10px] font-semibold" style={{ color: colorVar }}>
        {label}
      </span>
      {/* §mobile — numbers only, no bar; the bar returns at sm: and up. */}
      <div className="hidden sm:block flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden min-w-[24px]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colorVar }} />
      </div>
      <span className="shrink-0 font-mono text-[10px] font-semibold" style={{ color: colorVar }}>
        {value}/{max}
      </span>
    </div>
  )
}

function CurrencyBadge({ copper }: { copper: number }) {
  const { p, g, s, c } = formatCurrency(copper)
  const parts = [
    p > 0 && `${p}P`,
    g > 0 && `${g}G`,
    (s > 0 || (p === 0 && g === 0)) && `${s}S`,
    (c > 0 || (p === 0 && g === 0 && s === 0)) && `${c}C`,
  ].filter(Boolean)
  return <span className="font-mono text-[10px] text-[#e8ca8a] shrink-0">{parts.join(' ')}</span>
}

// §6.6 Bang Commands — in-game-styled framing per category (icon + a dossier
// title), no raw "!command" console text, so the paused-roleplay moment
// still reads as part of the game's own UI rather than a debug console.
const BANG_DISPLAY: Record<string, { icon: LucideIcon; label: string }> = {
  npc: { icon: Users, label: 'NPC Dossier' },
  items: { icon: Backpack, label: 'Inventory Ledger' },
  location: { icon: MapIcon, label: 'Known Locations' },
  faction: { icon: ShieldCheck, label: 'Faction Standings' },
  quests: { icon: Target, label: 'Active Quests' },
  bestiary: { icon: Skull, label: 'Bestiary Log' },
  recall: { icon: BookOpen, label: 'Codex Recall' },
}

function bangDisplay(command: string): { icon: LucideIcon; label: string } {
  return BANG_DISPLAY[command.toLowerCase()] ?? { icon: HelpCircle, label: 'Unclear Reference' }
}

function formatTimestamp(time: GameTime, locDisp: string): string {
  return `D-${String(time.d).padStart(2, '0')} ${time.h} | ${locDisp.toUpperCase()}`
}

// Ambient drifting motes behind the glass header/input bars — pure decoration
// (aria-hidden, pointer-events-none), skipped entirely under reduced-motion.
// `accent` tracks the current turn state's color (§3.2) via a ref so the
// mote color drifts live without restarting the particle system.
function AmbientBackground({ accent }: { accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const accentRef = useRef(accent)
  useEffect(() => {
    accentRef.current = accent
  }, [accent])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const particles = Array.from({ length: 44 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.8,
      speedX: (Math.random() - 0.5) * 0.12,
      speedY: (Math.random() - 0.5) * 0.12,
      opacity: Math.random() * 0.45 + 0.15,
    }))

    let animationId: number
    function animate() {
      const accent = accentRef.current
      ctx!.clearRect(0, 0, width, height)
      ctx!.fillStyle = accent
      for (const p of particles) {
        p.x += p.speedX
        p.y += p.speedY
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
        ctx!.globalAlpha = p.opacity
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.shadowBlur = 8
        ctx!.shadowColor = accent
        ctx!.fill()
      }
      animationId = requestAnimationFrame(animate)
    }

    function handleResize() {
      width = canvas!.width = window.innerWidth
      height = canvas!.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    animationId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />
}

interface PopupTarget {
  category: KeywordLink['category']
  id: string
}

interface TurnBlockProps {
  entry: LogEntry
  globalIndex: number
  onTapTerm: TapTermHandler
  registerRef: (index: number, el: HTMLDivElement | null) => void
}

// Isolated from `input` state (§9.2 perf fix) — memoized so a keystroke in the
// input bar doesn't re-render/re-parse rich text for every mounted turn block.
const TurnBlock = memo(function TurnBlock({ entry, globalIndex, onTapTerm, registerRef }: TurnBlockProps) {
  const setRef = useCallback((el: HTMLDivElement | null) => registerRef(globalIndex, el), [globalIndex, registerRef])

  if (entry.bang) {
    const { command, target, rows, note } = entry.bang
    const { icon: DossierIcon, label } = bangDisplay(command)
    return (
      <div ref={setRef} className="flex flex-col gap-2 py-1">
        {/* §6.6 — bang commands are out-of-fiction, so they're bracketed like a
            chapter boundary: a divider announcing the pause, the result, then
            a matching divider closing it and resuming the tale. Styled as an
            in-game dossier reveal, not a raw "!command" console dump. */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gold-accent/40" />
          <span className="flex items-center gap-1.5 font-display text-[10px] uppercase tracking-wide text-gold-primary/70 shrink-0">
            <Pause size={11} /> Roleplay Paused
          </span>
          <div className="flex-1 h-px bg-gold-accent/40" />
        </div>

        <div className="rounded-xl border border-gold-primary/25 bg-gold-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <DossierIcon size={13} className="text-gold-primary/80 shrink-0" />
            <span className="font-display text-xs font-bold uppercase tracking-wide text-gold-primary">
              {label}
              {target && <span className="text-ink-muted normal-case font-normal"> — {target}</span>}
            </span>
          </div>
          {rows.length > 0 && (
            <div className="space-y-1">
              {rows.map((row, i) => (
                <div key={row.id ?? i} className="flex items-baseline gap-2 text-xs">
                  {row.category ? (
                    <button
                      onClick={() => onTapTerm(row.name, row.category!)}
                      className="font-display font-semibold text-ink hover:text-gold-primary shrink-0 underline decoration-dotted decoration-gold-primary/40 underline-offset-2"
                    >
                      {row.name}
                    </button>
                  ) : (
                    <span className="font-display font-semibold text-ink shrink-0">{row.name}</span>
                  )}
                  <span className="text-ink-muted truncate">{row.fields.join(' · ')}</span>
                </div>
              ))}
            </div>
          )}
          {note && <p className="font-narrative italic text-[11px] text-ink-muted mt-1.5">{note}</p>}
        </div>

        <div className="w-full h-px bg-gold-accent/40" />
      </div>
    )
  }

  if (entry.chapterSummary) {
    return (
      <div ref={setRef} className="flex flex-col items-center gap-2 py-3">
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gold-accent/30" />
          <span className="flex items-center gap-1.5 font-display text-xs text-gold-primary shrink-0">
            <BookOpen size={13} /> Chapter {entry.chapterNumber}
          </span>
          <div className="flex-1 h-px bg-gold-accent/30" />
        </div>
        <p className="font-narrative italic text-xs text-ink-muted text-center max-w-md">{entry.chapterSummary}</p>
      </div>
    )
  }

  const stateMeta = entry.turnState ? TURN_STATE_META[entry.turnState] : null
  const StateIcon = stateMeta?.icon

  return (
    <div ref={setRef} className="space-y-1 border-l-2 pl-3" style={{ borderColor: stateMeta ? `${stateMeta.accent}55` : 'transparent' }}>
      {entry.time && entry.locDisp && (
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-gold-primary">
          {formatTimestamp(entry.time, entry.locDisp)}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {entry.action && <p className="font-mono text-xs text-gold-primary">&gt; {entry.action}</p>}
        {StateIcon && stateMeta && (
          <span className="inline-flex items-center gap-1 text-[10px] font-display" style={{ color: stateMeta.accent }}>
            <StateIcon size={11} /> {stateMeta.label}
          </span>
        )}
      </div>
      {entry.mood && (
        <p className="inline-flex items-center gap-1 text-[11px] italic text-ink-muted">
          <Sparkle size={10} /> {entry.mood}
        </p>
      )}
      <p className="font-narrative text-sm leading-relaxed whitespace-pre-wrap">{renderNarrative(entry.nar, onTapTerm)}</p>
      {entry.levelUp && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-gold-accent/15 border border-gold-accent/40 px-3 py-1 font-display text-xs text-gold-primary">
          <Star size={12} /> Level {entry.levelUp}
        </p>
      )}
    </div>
  )
})

// Blueprint §6.4C — v1 scaffold: no parchment pagination/radial menu/quick-slots
// yet, just enough surface to prove the turn loop (§2 Phase D) actually works.
export default function Chronicle({
  title,
  player,
  combat,
  log,
  busy,
  error,
  chromeOpacity,
  npcs,
  locations,
  factions,
  lore,
  quests,
  bestiary,
  onSend,
  onBangCommand,
  slashCommands,
  onOpenSlashManager,
  onOpenSettings,
  onOpenMenu,
  onOpenCodex,
  onOpenCodexEntry,
}: ChronicleProps) {
  const [input, setInput] = useState('')
  const [bangHighlight, setBangHighlight] = useState(0)
  const [bangDismissed, setBangDismissed] = useState(false)
  const [slashHighlight, setSlashHighlight] = useState(0)
  const [slashDismissed, setSlashDismissed] = useState(false)
  const [popup, setPopup] = useState<PopupTarget | null>(null)
  const [visibleCount, setVisibleCount] = useState(WINDOW_SIZE)
  const [currentBlock, setCurrentBlock] = useState<number | null>(null)
  const [bottomHeight, setBottomHeight] = useState(0)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [statsCollapsed, setStatsCollapsed] = useState(false)
  const [navDragPos, setNavDragPos] = useState<{ y: number } | null>(null)
  const [navDragging, setNavDragging] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const navDragOffset = useRef<{ dx: number; dy: number } | null>(null)
  const blockRefs = useRef(new Map<number, HTMLDivElement>())
  const pendingScrollTo = useRef<number | null>(null)

  const windowStart = Math.max(0, log.length - visibleCount)
  const visibleLog = log.slice(windowStart)
  const hasEarlierTurns = windowStart > 0

  // §6.0 — the chrome (header/frame/input/motes) uses a fixed gold accent; it
  // no longer retints per turn state. Per-entry turn-state badges in the log
  // (TurnBlock, below) are unrelated and keep their own per-entry coloring.
  const stateAccent = '#e8ca8a'

  // §Settings "Chronicle HUD Transparency" — chromeOpacity (0.1-0.9) scales how
  // solid the header/HUD/input glass reads. Flat obsidian, no color-wash gradient
  // — the gold accent lives only in the border/ring, matching the reference app.
  const chromeAlpha = chromeOpacity
  const inputIdleAlpha = +(chromeOpacity * 0.8).toFixed(2)
  const inputFocusAlpha = +Math.min(chromeOpacity + 0.25, 0.95).toFixed(2)

  // Non-chapter-summary entries only — those are what the navigator steps between.
  const narratedIndices = log.reduce<number[]>((acc, e, i) => {
    if (!e.chapterSummary) acc.push(i)
    return acc
  }, [])
  const navPosition = narratedIndices.length
    ? narratedIndices.indexOf(currentBlock ?? narratedIndices[narratedIndices.length - 1]) + 1
    : 0

  useEffect(() => {
    if (currentBlock === null) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [log])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`
  }, [input])

  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setBottomHeight(entries[0].contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setHeaderHeight(entries[0].contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // scrollIntoView() is unreliable on a `position: fixed` scroll container
  // in some environments — it silently no-ops instead of moving. Computing
  // the target's offset and driving the container's own scrollTo() directly
  // sidesteps that entirely and works everywhere.
  const scrollBlockIntoView = useCallback((el: HTMLDivElement) => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTo({ top: Math.max(0, el.offsetTop - 8), behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (pendingScrollTo.current !== null) {
      const idx = pendingScrollTo.current
      pendingScrollTo.current = null
      requestAnimationFrame(() => {
        const el = blockRefs.current.get(idx)
        if (el) scrollBlockIntoView(el)
      })
    }
  }, [visibleCount, scrollBlockIntoView])

  const registerRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) blockRefs.current.set(index, el)
    else blockRefs.current.delete(index)
  }, [])

  function send() {
    const text = input.trim()
    if (!text || busy) return
    // §6.6 Bang Commands — resolved entirely client-side (0 API tokens), so
    // they bypass the busy-gated turn pipeline and never touch onSend.
    if (text.startsWith('!')) {
      onBangCommand(text)
    } else if (text.startsWith('/')) {
      // A completed slash command sends its saved prompt instead of the raw
      // "/name" text; anything that doesn't match a known command just goes
      // through as normal typed prose — "/" isn't a reserved character here.
      const cmd = slashCommands.find((c) => c.name === text.slice(1).trim().toLowerCase())
      onSend(cmd ? cmd.prompt : text, cmd?.pauseRoleplay)
    } else {
      onSend(text)
    }
    setInput('')
  }

  // §6.6 Command Palette — suggestions only while the player is still typing
  // the command word itself ("!"/"/" or "!np"/"/me"); once a space appears
  // they've moved on to a target (bang) or finished (slash never takes one),
  // so the dropdown gets out of the way.
  const bangWordMatch = /^!(\w*)$/.exec(input)
  const bangSuggestions =
    !bangDismissed && bangWordMatch
      ? BANG_COMMANDS.filter((c) => c.name.startsWith(bangWordMatch[1].toLowerCase()))
      : []

  const slashWordMatch = /^\/(\w*)$/.exec(input)
  const slashSuggestions =
    !slashDismissed && slashWordMatch
      ? slashCommands.filter((c) => c.name.startsWith(slashWordMatch[1].toLowerCase()))
      : []

  function selectBangSuggestion(name: string) {
    setInput(`!${name} `)
    setBangHighlight(0)
    setBangDismissed(false)
    textareaRef.current?.focus()
  }

  // Slash commands never take a free-form target, so selecting one sends
  // immediately — matching the blueprint's "shorthand for typed prose" intent.
  function selectSlashSuggestion(cmd: SlashCommand) {
    onSend(cmd.prompt, cmd.pauseRoleplay)
    setInput('')
    setSlashHighlight(0)
    setSlashDismissed(false)
  }

  function loadEarlierTurns() {
    setVisibleCount((n) => Math.min(log.length, n + WINDOW_SIZE))
  }

  // §9.2 Block Navigator — `currentBlock` tracks a stable index into the full
  // `log`, not the windowed slice, since "Load Earlier Turns" shifts the
  // slice's own local indices out from under anything that isn't global.
  function scrollToBlock(globalIndex: number) {
    const needed = log.length - globalIndex
    if (needed > visibleCount) {
      pendingScrollTo.current = globalIndex
      setVisibleCount(needed)
    } else {
      const el = blockRefs.current.get(globalIndex)
      if (el) scrollBlockIntoView(el)
    }
    setCurrentBlock(globalIndex)
  }

  function goPrevious() {
    const base = currentBlock ?? log.length
    const idx = [...narratedIndices].reverse().find((i) => i < base)
    if (idx !== undefined) scrollToBlock(idx)
  }

  function goNext() {
    const base = currentBlock ?? -1
    const idx = narratedIndices.find((i) => i > base)
    if (idx !== undefined) scrollToBlock(idx)
  }

  function jumpToLatest() {
    setCurrentBlock(null)
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }

  // §9.2 Navigator drag — Y-axis only, grabbing the pill's own padding (not a
  // button); clamped strictly to the visible strip between the floating header
  // and footer, not the full (now header/footer-covered) parchment card.
  function onNavPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    const el = navRef.current
    if (!el) return
    const elRect = el.getBoundingClientRect()
    navDragOffset.current = { dx: e.clientX - elRect.left, dy: e.clientY - elRect.top }
    el.setPointerCapture(e.pointerId)
    setNavDragging(true)
  }

  function onNavPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const offset = navDragOffset.current
    const el = navRef.current
    if (!offset || !el) return
    // Live rects, not the headerHeight/bottomHeight state — those store the
    // ResizeObserver content-box height (excludes padding/border), which
    // undershoots the header/footer's actual visual (border-box) extent.
    const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0
    const footerTop = bottomRef.current?.getBoundingClientRect().top ?? window.innerHeight
    const minY = headerBottom + 6
    const maxY = footerTop - 6 - el.offsetHeight
    const y = Math.max(minY, Math.min(e.clientY - offset.dy, Math.max(minY, maxY)))
    setNavDragPos({ y })
  }

  function onNavPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    navDragOffset.current = null
    setNavDragging(false)
    navRef.current?.releasePointerCapture(e.pointerId)
  }

  // §6.4C Codex Popup Card — tapping a {{Term|category}} keyword link opens
  // this instead of a full-screen navigation. A miss (the model tagged
  // something not yet auto-registered, or a category with no entry) just
  // does nothing rather than showing an empty/broken card.
  const onTapTerm = useCallback<TapTermHandler>(
    (term, category) => {
      const id = slugify(term)
      const dict = { npc: npcs, loc: locations, faction: factions, lore, quest: quests, beast: bestiary }[category]
      if (dict[id]) setPopup({ category, id })
    },
    [npcs, locations, factions, lore, quests, bestiary],
  )

  const popupEntry = popup && ({ npc: npcs, loc: locations, faction: factions, lore, quest: quests, beast: bestiary }[popup.category][popup.id] as
    | NpcEntry
    | LocationEntry
    | FactionEntry
    | LoreEntry
    | QuestEntry
    | BestiaryEntry
    | undefined)

  return (
    <div className="min-h-screen text-ink relative" style={{ background: '#0b0d13' }}>
      <AmbientBackground accent={stateAccent} />

      {/* Full-bleed dark obsidian header — flat, no color-wash gradient; the
          gold accent lives only in the border. Transparent enough for the
          ambient motes to show through. */}
      <header
        ref={headerRef}
        className="fixed top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 border-b shadow-2xl transition-[background,border-color] duration-700 ease-out"
        style={{
          background: `rgba(11,13,20,${chromeAlpha})`,
          borderColor: `${stateAccent}45`,
        }}
      >
        <button onClick={onOpenMenu} aria-label="Menu" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#e8ca8a] hover:bg-white/10">
          <Menu size={18} />
        </button>
        <div className="font-display text-sm font-semibold tracking-wide text-center flex-1 truncate px-2 text-[#e8ca8a]">
          {title}
        </div>
        <button onClick={onOpenCodex} aria-label="Codex" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#e8ca8a] hover:bg-white/10">
          <Library size={18} />
        </button>
        <button onClick={onOpenSettings} aria-label="Settings" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#e8ca8a] hover:bg-white/10">
          <SettingsIcon size={18} />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="fixed overflow-y-auto bg-parchment parchment-texture rounded-xl pl-4 pr-6 space-y-4"
        style={{ top: 6, bottom: 6, left: 6, right: 6, paddingTop: headerHeight + 16, paddingBottom: bottomHeight + 16 }}
      >
        {log.length === 0 && (
          <p className="font-narrative italic text-sm opacity-60">
            The tale hasn't begun. Type an action below to dive in.
          </p>
        )}
        {hasEarlierTurns && (
          <button
            onClick={loadEarlierTurns}
            className="mx-auto flex items-center gap-1.5 rounded-full border border-gold-accent/40 px-3 py-1.5 font-display text-xs text-gold-primary"
          >
            <History size={12} /> Load Earlier Turns
          </button>
        )}
        {visibleLog.map((entry, i) => (
          <TurnBlock key={windowStart + i} entry={entry} globalIndex={windowStart + i} onTapTerm={onTapTerm} registerRef={registerRef} />
        ))}
        {busy && <p className="font-narrative italic text-sm opacity-50">The thread of fate is being woven...</p>}
        {error && <p className="font-mono text-xs text-rose">{error}</p>}
      </div>

      {/* §9.2 Block Navigator — idle: nearly invisible; hover/focus: lights up
          solid, matching the reference's idle-transparent/active-solid chrome. */}
      {log.length > 0 && (
        <div
          ref={navRef}
          onPointerDown={onNavPointerDown}
          onPointerMove={onNavPointerMove}
          onPointerUp={onNavPointerUp}
          onPointerCancel={onNavPointerUp}
          className="turn-nav group fixed z-10 flex flex-col items-center gap-0.5 rounded-xl backdrop-blur-sm px-1 py-1.5 cursor-grab active:cursor-grabbing touch-none"
          style={{
            right: 10,
            ...(navDragPos ? { top: navDragPos.y } : { bottom: bottomHeight + 10 }),
            ['--turn-accent' as string]: stateAccent,
            ...(navDragging ? { background: 'rgba(20,22,34,0.88)' } : {}),
          }}
        >
          <button
            onClick={goPrevious}
            aria-label="Previous turn"
            className="w-6 h-6 rounded-full inline-flex items-center justify-center text-white/40 hover:!text-[#e8ca8a] group-hover:text-white/70 hover:bg-white/10 transition-colors"
          >
            <ChevronUp size={13} />
          </button>
          <span className="font-mono text-[10px] tabular-nums text-white/40 group-hover:text-white/80 transition-colors">
            {navPosition || ''}
          </span>
          <button
            onClick={goNext}
            aria-label="Next turn"
            className="w-6 h-6 rounded-full inline-flex items-center justify-center text-white/40 hover:!text-[#e8ca8a] group-hover:text-white/70 hover:bg-white/10 transition-colors"
          >
            <ChevronDown size={13} />
          </button>
          <div className="w-3 h-px my-0.5 bg-white/10 group-hover:bg-white/20 transition-colors" />
          <button
            onClick={jumpToLatest}
            aria-label="Jump to latest"
            className="w-6 h-6 rounded-full inline-flex items-center justify-center text-white/40 hover:!text-[#e8ca8a] group-hover:text-white/70 hover:bg-white/10 transition-colors"
          >
            <ChevronsDown size={13} />
          </button>
        </div>
      )}

      <div
        ref={bottomRef}
        className="fixed bottom-0 inset-x-0 z-10 flex flex-col border-t shadow-2xl transition-[background,border-color] duration-700 ease-out"
        style={{
          background: `rgba(11,13,20,${chromeAlpha})`,
          borderColor: `${stateAccent}45`,
        }}
      >
        {combat?.active && (
          <div className="border-b border-rose/30 px-4 py-1 text-white/80">
            <PoolBar label={combat.enemyName?.slice(0, 3).toUpperCase() ?? 'ENM'} value={combat.enemyHp ?? 0} max={combat.enemyHpMax ?? 1} colorVar="#e11d48" />
          </div>
        )}

        <div className="px-3">
          <button
            onClick={() => setStatsCollapsed((v) => !v)}
            aria-label={statsCollapsed ? 'Expand stats' : 'Collapse stats'}
            className="w-full flex items-center justify-center leading-none text-white/40 hover:text-[#e8ca8a]"
          >
            {statsCollapsed ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: statsCollapsed ? '0fr' : '1fr' }}
          >
            <div className="overflow-hidden">
              <div className="px-1 pb-0.5 flex items-center gap-3 text-white/80">
                <PoolBar label="HP" value={player.hp} max={player.hpMax} colorVar="#fb3552" />
                <PoolBar label="MP" value={player.mp} max={player.mpMax} colorVar="#22d3ee" />
                <PoolBar label="ST" value={player.st} max={player.stMax} colorVar="#34d399" />
                <CurrencyBadge copper={player.copper} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative px-3 pt-0.5 pb-1.5 flex gap-2 items-end">
          {/* §6.6 Command Palette — pops up above the input while the "!word"
              itself is being typed; arrow keys/Enter navigate it, matching
              regular typed text once a target follows the space. */}
          {bangSuggestions.length > 0 && (
            <div className="absolute left-3 right-3 bottom-full mb-1.5 rounded-xl border border-[#e8ca8a]/25 bg-[#141622]/60 backdrop-blur-sm shadow-2xl overflow-hidden">
              {bangSuggestions.map((cmd, i) => (
                <button
                  key={cmd.name}
                  onClick={() => selectBangSuggestion(cmd.name)}
                  onMouseEnter={() => setBangHighlight(i)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors ${
                    i === bangHighlight ? 'bg-[#e8ca8a]/15' : ''
                  }`}
                >
                  <span className="font-mono text-xs font-semibold text-[#e8ca8a] shrink-0">{cmd.usage}</span>
                  <span className="text-[11px] text-white/50 truncate">{cmd.description}</span>
                </button>
              ))}
            </div>
          )}
          {slashSuggestions.length > 0 && (
            <div className="absolute left-3 right-3 bottom-full mb-1.5 rounded-xl border border-[#e8ca8a]/25 bg-[#141622]/60 backdrop-blur-sm shadow-2xl overflow-hidden">
              {slashSuggestions.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => selectSlashSuggestion(cmd)}
                  onMouseEnter={() => setSlashHighlight(i)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors ${
                    i === slashHighlight ? 'bg-[#e8ca8a]/15' : ''
                  }`}
                >
                  <span className="font-mono text-xs font-semibold text-[#e8ca8a] shrink-0">/{cmd.name}</span>
                  <span className="text-[11px] text-white/50 truncate">{cmd.prompt}</span>
                </button>
              ))}
              {slashCommands.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-white/40 italic">No slash commands yet — tap /  below to create one.</p>
              )}
            </div>
          )}
          <button
            onClick={onOpenSlashManager}
            aria-label="Slash commands"
            className="shrink-0 w-8 h-8 rounded-full inline-flex items-center justify-center text-[#e8ca8a]/70 hover:bg-white/10 hover:text-[#e8ca8a] font-mono text-sm font-bold"
          >
            /
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setBangHighlight(0)
              setBangDismissed(false)
              setSlashHighlight(0)
              setSlashDismissed(false)
            }}
            onKeyDown={(e) => {
              if (bangSuggestions.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setBangHighlight((h) => (h + 1) % bangSuggestions.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setBangHighlight((h) => (h - 1 + bangSuggestions.length) % bangSuggestions.length)
                  return
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  selectBangSuggestion(bangSuggestions[bangHighlight].name)
                  return
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setBangDismissed(true)
                  return
                }
              }
              if (slashSuggestions.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSlashHighlight((h) => (h + 1) % slashSuggestions.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSlashHighlight((h) => (h - 1 + slashSuggestions.length) % slashSuggestions.length)
                  return
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  selectSlashSuggestion(slashSuggestions[slashHighlight])
                  return
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setSlashDismissed(true)
                  return
                }
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="What do you do?"
            disabled={busy}
            className="turn-glow flex-1 resize-none rounded-xl border backdrop-blur-sm px-3 py-1 font-narrative text-sm leading-snug text-white/90 placeholder:text-white/35"
            style={{
              maxHeight: INPUT_MAX_HEIGHT,
              ['--turn-accent' as string]: stateAccent,
              ['--chrome-alpha-idle' as string]: inputIdleAlpha,
              ['--chrome-alpha-focus' as string]: inputFocusAlpha,
            }}
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="turn-glow-btn w-8 h-8 shrink-0 rounded-full inline-flex items-center justify-center transition-colors bg-[#e8ca8a] text-[#0e1017] disabled:bg-white/10 disabled:text-white/25"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {popup && popupEntry && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-6"
          onClick={() => setPopup(null)}
        >
          <div className="glass-panel glow-ring rounded-2xl p-4 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-sm text-gold-primary">{popupEntry.name}</h3>
              <button onClick={() => setPopup(null)} aria-label="Close" className="text-ink-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="font-narrative text-xs space-y-1 text-ink-muted">
              {popup.category === 'npc' && 'stage' in popupEntry && (
                <>
                  <p>{popupEntry.stage} · Trust {popupEntry.trust} · Affection {popupEntry.affection}</p>
                  {popupEntry.memSummary && <p className="italic">"{popupEntry.memSummary}"</p>}
                </>
              )}
              {popup.category === 'loc' && 'region' in popupEntry && (
                <p>{popupEntry.region} · Danger: {popupEntry.dangerLevel} · {popupEntry.standing}</p>
              )}
              {popup.category === 'faction' && 'repTier' in popupEntry && (
                <p>Reputation {popupEntry.repTier > 0 ? '+' : ''}{popupEntry.repTier}</p>
              )}
              {popup.category === 'lore' && 'category' in popupEntry && <p>{popupEntry.category}</p>}
              {popup.category === 'quest' && 'status' in popupEntry && <p>{popupEntry.status ?? 'active'}</p>}
              {popup.category === 'beast' && 'threatTier' in popupEntry && (
                <p>
                  {popupEntry.threatTier}
                  {popupEntry.hpMax !== undefined && ` · HP ${popupEntry.hpMax}`}
                  {popupEntry.dmgBase !== undefined && ` · DMG ${popupEntry.dmgBase}`}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                onOpenCodexEntry(popup.category, popup.id)
                setPopup(null)
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold-accent/40 px-3 py-1.5 font-display text-xs text-gold-primary"
            >
              Open in Codex <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
