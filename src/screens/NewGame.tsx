import { useState } from 'react'
import { ArrowRight, UserCircle } from 'lucide-react'
import { PRESET_CLASSES } from '../data/classes.ts'
import type { ProtagonistData } from '../types.ts'

interface NewGameProps {
  protagonistTemplates?: ProtagonistData[]
  initial?: ProtagonistData | null
  onBack: () => void
  onBegin: (protagonist: ProtagonistData) => void
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="text-sm font-display block">
      {label} {hint && <span className="opacity-50 font-normal">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2.5 font-narrative text-sm'

// Stand-in for the full Phase A/B creation pipeline (§2) — just enough to get
// a protagonist onto the board and prove the turn loop. Grounded/free-form
// classes (§Phase B.2a) aren't built yet. Also doubles as the Protagonist
// Library's create/edit form (§6.4B).
export default function NewGame({ protagonistTemplates = [], initial, onBack, onBegin }: NewGameProps) {
  const [templateId, setTemplateId] = useState<string | null | undefined>(initial?.id ?? null)
  const [name, setName] = useState(initial?.name ?? '')
  const [classId, setClassId] = useState(initial?.classId ?? PRESET_CLASSES[0].id)
  const [background, setBackground] = useState(initial?.background ?? '')
  const [opening, setOpening] = useState(initial?.opening ?? '')

  function applyTemplate(t: ProtagonistData) {
    setTemplateId(t.id)
    setName(t.name)
    setClassId(t.classId)
    setBackground(t.background ?? '')
    setOpening(t.opening ?? '')
  }

  return (
    <div className="h-dvh flex flex-col bg-canvas text-ink">
      <header
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gold-accent/20"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <h2 className="font-display font-bold text-lg text-gold-primary">New Protagonist</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          {protagonistTemplates.length > 0 && (
            <div>
              <p className="text-xs font-display text-ink-muted mb-1.5">Start from a saved Protagonist</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {protagonistTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-display transition-colors ${
                      templateId === t.id
                        ? 'bg-gold-accent/20 border border-gold-accent/60 text-gold-primary'
                        : 'glass-panel text-gold-primary/80'
                    }`}
                  >
                    <UserCircle size={13} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wren of the Ashmark"
              className={inputClass}
            />
          </Field>

          <Field label="Class">
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
              {PRESET_CLASSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Background" hint="(optional)">
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="Origin, family, and history the Narrator should know from Turn 1."
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field label="Tale Dive Brief" hint="(optional)">
            <textarea
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="Describe the exact scene, location, and characters present where Turn 1 should open."
              rows={4}
              className={inputClass}
            />
          </Field>
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
          onClick={() => onBegin({ id: templateId, name: name || 'The Wanderer', classId, background, opening })}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-action px-6 py-2.5 font-display text-sm font-semibold text-ink"
        >
          Begin <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
