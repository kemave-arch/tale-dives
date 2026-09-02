import { useState, useRef, useEffect } from 'react'
import { Menu, Settings as SettingsIcon, Send, Swords } from 'lucide-react'
import { renderNarrative } from '../lib/richText.tsx'
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
}

// Blueprint §6.4C — v1 scaffold: no parchment pagination/radial menu/quick-slots
// yet, just enough surface to prove the turn loop (§2 Phase D) actually works.
export default function Chronicle({ player, combat, log, busy, error, onSend, onOpenSettings, onOpenMenu }: ChronicleProps) {
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
        {log.map((entry, i) => (
          <div key={i} className="space-y-1">
            {entry.action && (
              <p className="font-mono text-xs text-gold-primary">&gt; {entry.action}</p>
            )}
            <p className="font-narrative text-sm leading-relaxed whitespace-pre-wrap">{renderNarrative(entry.nar)}</p>
          </div>
        ))}
        {busy && <p className="font-narrative italic text-sm opacity-50">The thread of fate is being woven...</p>}
        {error && <p className="font-mono text-xs text-rose">{error}</p>}
      </div>

      {combat?.active && (
        <div className="bg-rose-bg border-t border-rose/30 px-4 py-1.5 font-mono text-xs flex items-center gap-2 text-rose">
          <Swords size={13} />
          {combat.enemyName}: {combat.enemyHp}/{combat.enemyHpMax}
        </div>
      )}

      <footer className="bg-surface-raised border-t border-gold-accent/30 px-4 py-2 font-mono text-xs flex gap-4">
        <span>HP {player.hp}/{player.hpMax}</span>
        <span>MP {player.mp}/{player.mpMax}</span>
        <span>ST {player.st}/{player.stMax}</span>
        <span className="ml-auto">{player.copper}c</span>
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
