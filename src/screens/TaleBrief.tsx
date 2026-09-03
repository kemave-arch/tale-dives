import { useState } from 'react'
import { ArrowRight, Info, X } from 'lucide-react'
import type { CombatMode } from '../types.ts'

interface TaleBriefPayload {
  opening: string
  narrationStyle: string
  temperature: number
  combatMode: CombatMode
}

interface TaleBriefProps {
  initialOpening?: string
  initialNarrationStyle: string
  initialTemperature: number
  initialCombatMode?: CombatMode
  onBack: () => void
  onBegin: (payload: TaleBriefPayload) => void
}

const inputClass = 'w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2.5 font-narrative text-sm'

const COMBAT_MODE_INFO: Record<CombatMode, string> = {
  NARRATIVE: 'The Narrator resolves fights from context — your exact move, footwork, and cleverness matter, the same way SOCIAL or EXPLORE turns are judged. No hidden math.',
  TACTICAL: 'Damage is computed client-side from your stats before the Narrator ever sees it — deterministic and precise, but the Narrator just describes the given result rather than judging your approach.',
}

// Tap-to-reveal, not hover-only — this app is mobile-first, so a tooltip that
// only works on :hover would be invisible on touch devices.
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block align-middle ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More info"
        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-gold-primary/70 hover:text-gold-primary"
      >
        <Info size={13} />
      </button>
      {open && (
        <span className="absolute z-10 left-1/2 -translate-x-1/2 top-6 w-56 rounded-lg glass-panel glow-ring p-2.5 text-left">
          <span className="flex items-start justify-between gap-2">
            <span className="font-narrative text-xs text-ink leading-snug">{text}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="shrink-0 text-ink-muted hover:text-ink">
              <X size={12} />
            </button>
          </span>
        </span>
      )}
    </span>
  )
}

// Blueprint Appendix A.3 — the free-text brief entered right before the world
// is fabricated, now its own final creation step. Narration Style/Creativity
// Randomness/Combat Mode are surfaced here too as a last check before diving
// in, even though they're not unique to this screen (Narration Style lives on
// the World, Creativity Randomness is the same global apiSettings.temperature
// Settings edits, Combat Mode is the new campaign's own field).
export default function TaleBrief({
  initialOpening = '',
  initialNarrationStyle,
  initialTemperature,
  initialCombatMode = 'NARRATIVE',
  onBack,
  onBegin,
}: TaleBriefProps) {
  const [opening, setOpening] = useState(initialOpening)
  const [narrationStyle, setNarrationStyle] = useState(initialNarrationStyle)
  const [temperature, setTemperature] = useState(initialTemperature)
  const [combatMode, setCombatMode] = useState<CombatMode>(initialCombatMode)

  return (
    <div className="h-dvh flex flex-col bg-canvas text-ink">
      <header
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gold-accent/20"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <h2 className="font-display font-bold text-lg text-gold-primary">Tale Dive Brief</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <label className="text-sm font-display block">
            Where do you dive in? <span className="opacity-50 font-normal">(optional)</span>
            <textarea
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="Describe the exact scene, location, and characters present where Turn 1 should open — or leave blank and let the Narrator decide."
              rows={10}
              className={`mt-1 ${inputClass} resize-y`}
            />
          </label>

          <label className="text-sm font-display block">
            Narration Style
            <textarea
              value={narrationStyle}
              onChange={(e) => setNarrationStyle(e.target.value)}
              rows={6}
              className={`mt-1 ${inputClass} text-xs resize-y`}
            />
          </label>

          <div>
            <p className="text-sm font-display mb-1">
              Creativity Randomness <span className="opacity-50 font-mono text-xs">{temperature.toFixed(1)}</span>
            </p>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-gold-action"
            />
            <p className="text-[11px] opacity-50 mt-1">
              How unpredictable the prose gets. Low keeps the Narrator steady and consistent; high adds more surprise and flourish.
            </p>
          </div>

          <div>
            <p className="text-sm font-display mb-1">Combat Resolution Mode</p>
            <div className="flex gap-2">
              {(['NARRATIVE', 'TACTICAL'] as const).map((m) => (
                <div
                  key={m}
                  className={`flex-1 rounded-lg border px-2 py-2 flex items-center justify-center gap-1 ${
                    combatMode === m ? 'border-gold-accent bg-gold-accent/15 text-gold-primary' : 'border-gold-accent/30 text-ink-muted'
                  }`}
                >
                  <button onClick={() => setCombatMode(m)} className="font-display text-xs">
                    {m === 'NARRATIVE' ? 'Narrative' : 'Tactical'}
                  </button>
                  <InfoTooltip text={COMBAT_MODE_INFO[m]} />
                </div>
              ))}
            </div>
            <p className="text-[11px] opacity-50 mt-1">Changeable anytime later from Settings.</p>
          </div>
        </div>
      </div>

      <div
        className="shrink-0 border-t border-gold-accent/20 px-4 py-3 flex justify-end gap-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button onClick={onBack} className="rounded-full border border-gold-accent/50 px-5 py-2.5 font-display text-sm">
          Back
        </button>
        <button
          onClick={() => onBegin({ opening, narrationStyle, temperature, combatMode })}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-action px-6 py-2.5 font-display text-sm font-semibold text-ink"
        >
          Start <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
