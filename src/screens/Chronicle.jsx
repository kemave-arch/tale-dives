import { useState, useRef, useEffect } from 'react'

// Blueprint §6.4C — v1 scaffold: no parchment/radial menu/quick-slots yet,
// just enough surface to prove the turn loop (§2 Phase D) actually works.
export default function Chronicle({ player, log, busy, error, onSend, onOpenSettings }) {
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  function send() {
    if (!input.trim() || busy) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-ink">
      <header className="flex items-center justify-between px-4 py-3 bg-parchment-header border-b border-gold-accent/30">
        <div className="font-mono text-xs">
          Day {player.time.d} • {player.time.h} — {player.locDisp}
        </div>
        <button onClick={onOpenSettings} className="text-xs font-display underline">
          Settings
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
            <p className="font-narrative text-sm leading-relaxed whitespace-pre-wrap">{entry.nar}</p>
          </div>
        ))}
        {busy && <p className="font-narrative italic text-sm opacity-50">The thread of fate is being woven...</p>}
        {error && <p className="font-mono text-xs text-rose-700">{error}</p>}
      </div>

      <footer className="bg-card border-t border-gold-accent/30 px-4 py-2 font-mono text-xs flex gap-4">
        <span>HP {player.hp}/{player.hpMax}</span>
        <span>MP {player.mp}/{player.mpMax}</span>
        <span>ST {player.st}/{player.stMax}</span>
        <span className="ml-auto">{player.copper}c</span>
      </footer>

      <div className="bg-card border-t border-gold-accent/50 px-4 py-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="What do you do?"
          disabled={busy}
          className="flex-1 rounded-full border border-gold-accent/40 bg-ivory px-4 py-2 font-narrative text-sm"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-full bg-gold-action px-5 py-2 font-display text-sm font-semibold text-ink disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}
