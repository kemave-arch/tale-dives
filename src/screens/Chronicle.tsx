import { useState, useRef, useEffect } from 'react'
import { Menu, Settings as SettingsIcon, Send, Star, BookOpen, Library, Sparkle, X, ExternalLink } from 'lucide-react'
import { renderNarrative } from '../lib/richText.tsx'
import { TURN_STATE_META } from '../lib/turnStates.ts'
import { formatCurrency } from '../lib/currency.ts'
import { slugify } from '../lib/slug.ts'
import type {
  BestiaryEntry, CombatState, FactionEntry, KeywordLink, LocationEntry, LogEntry, LoreEntry, NpcEntry, Player, QuestEntry,
} from '../types.ts'

interface ChronicleProps {
  player: Player
  combat?: CombatState
  log: LogEntry[]
  busy: boolean
  error: string | null
  npcs: Record<string, NpcEntry>
  locations: Record<string, LocationEntry>
  factions: Record<string, FactionEntry>
  lore: Record<string, LoreEntry>
  quests: Record<string, QuestEntry>
  bestiary: Record<string, BestiaryEntry>
  onSend: (action: string) => void
  onOpenSettings: () => void
  onOpenMenu: () => void
  onOpenCodex: () => void
  onOpenCodexEntry: (category: KeywordLink['category'], id: string) => void
}

function PoolBar({ label, value, max, colorVar }: { label: string; value: number; max: number; colorVar: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <span className="w-5 shrink-0 font-mono text-[10px] opacity-70">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gold-accent/15 overflow-hidden min-w-[24px]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colorVar }} />
      </div>
      <span className="shrink-0 font-mono text-[10px] opacity-70">{value}/{max}</span>
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
  return <span className="font-mono text-[10px] text-gold-primary shrink-0">{parts.join(' ')}</span>
}

interface PopupTarget {
  category: KeywordLink['category']
  id: string
}

// Blueprint §6.4C — v1 scaffold: no parchment pagination/radial menu/quick-slots
// yet, just enough surface to prove the turn loop (§2 Phase D) actually works.
export default function Chronicle({
  player,
  combat,
  log,
  busy,
  error,
  npcs,
  locations,
  factions,
  lore,
  quests,
  bestiary,
  onSend,
  onOpenSettings,
  onOpenMenu,
  onOpenCodex,
  onOpenCodexEntry,
}: ChronicleProps) {
  const [input, setInput] = useState('')
  const [popup, setPopup] = useState<PopupTarget | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  function send() {
    if (!input.trim() || busy) return
    onSend(input.trim())
    setInput('')
  }

  // §6.4C Codex Popup Card — tapping a {{Term|category}} keyword link opens
  // this instead of a full-screen navigation. A miss (the model tagged
  // something not yet auto-registered, or a category with no entry) just
  // does nothing rather than showing an empty/broken card.
  function onTapTerm(term: string, category: KeywordLink['category']) {
    const id = slugify(term)
    const dict = { npc: npcs, loc: locations, faction: factions, lore, quest: quests, beast: bestiary }[category]
    if (dict[id]) setPopup({ category, id })
  }

  const popupEntry = popup && ({ npc: npcs, loc: locations, faction: factions, lore, quest: quests, beast: bestiary }[popup.category][popup.id] as
    | NpcEntry
    | LocationEntry
    | FactionEntry
    | LoreEntry
    | QuestEntry
    | BestiaryEntry
    | undefined)

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink relative">
      <header className="flex items-center justify-between px-4 py-3 bg-parchment-header border-b border-gold-accent/30">
        <button onClick={onOpenMenu} aria-label="Menu" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-gold-primary">
          <Menu size={18} />
        </button>
        <div className="font-mono text-xs text-center flex-1">
          Day {player.time.d} • {player.time.h} — {player.locDisp}
        </div>
        <button onClick={onOpenCodex} aria-label="Codex" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-gold-primary">
          <Library size={18} />
        </button>
        <button onClick={onOpenSettings} aria-label="Settings" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-gold-primary">
          <SettingsIcon size={18} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-parchment parchment-texture px-4 py-4 space-y-4">
        {log.length === 0 && (
          <p className="font-narrative italic text-sm opacity-60">
            The tale hasn't begun. Type an action below to dive in.
          </p>
        )}
        {log.map((entry, i) => {
          if (entry.chapterSummary) {
            return (
              <div key={i} className="flex flex-col items-center gap-2 py-3">
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
            <div key={i} className="space-y-1 border-l-2 pl-3" style={{ borderColor: stateMeta ? `${stateMeta.accent}55` : 'transparent' }}>
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
        })}
        {busy && <p className="font-narrative italic text-sm opacity-50">The thread of fate is being woven...</p>}
        {error && <p className="font-mono text-xs text-rose">{error}</p>}
      </div>

      {combat?.active && (
        <div className="bg-surface-raised border-t border-rose/30 px-4 py-1.5">
          <PoolBar label={combat.enemyName?.slice(0, 3).toUpperCase() ?? 'ENM'} value={combat.enemyHp ?? 0} max={combat.enemyHpMax ?? 1} colorVar="#e11d48" />
        </div>
      )}

      <footer className="bg-surface-raised border-t border-gold-accent/30 px-4 py-2 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <PoolBar label="HP" value={player.hp} max={player.hpMax} colorVar="#e11d48" />
          <PoolBar label="MP" value={player.mp} max={player.mpMax} colorVar="#0891b2" />
          <PoolBar label="ST" value={player.st} max={player.stMax} colorVar="#059669" />
          <CurrencyBadge copper={player.copper} />
        </div>
      </footer>

      <div className="bg-surface-raised border-t border-gold-accent/50 px-4 py-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="What do you do?"
          disabled={busy}
          className="flex-1 rounded-full border border-gold-accent/40 bg-canvas px-4 py-2 font-narrative text-sm"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="w-10 h-10 rounded-full bg-gold-action inline-flex items-center justify-center text-ink disabled:opacity-40"
        >
          <Send size={16} />
        </button>
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
