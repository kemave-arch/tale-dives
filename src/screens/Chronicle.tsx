import { useState, useRef, useEffect } from 'react'
import { Menu, Settings as SettingsIcon, Send, Star, BookOpen, Library, Sparkle } from 'lucide-react'
import { renderNarrative } from '../lib/richText.tsx'
import { TURN_STATE_META } from '../lib/turnStates.ts'
import { formatCurrency } from '../lib/currency.ts'
import type { CombatState, LogEntry, Player } from '../types.ts'

interface ChronicleProps {
  player: Player
  combat?: CombatState
  log: LogEntry[]
  busy: boolean
  error: string | null
  onSend: (action: string) => void
  onOpenSettings: () => void
  onOpenMenu: () => void
  onOpenCodex: () => void
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

// Blueprint §6.4C — v1 scaffold: no parchment pagination/radial menu/quick-slots
// yet, just enough surface to prove the turn loop (§2 Phase D) actually works.
export default function Chronicle({ player, combat, log, busy, error, onSend, onOpenSettings, onOpenMenu, onOpenCodex }: ChronicleProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  function send() {
    if (!input.trim() || busy) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-parchment px-4 py-4 space-y-4">
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
              <p className="font-narrative text-sm leading-relaxed whitespace-pre-wrap">{renderNarrative(entry.nar)}</p>
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
    </div>
  )
}
