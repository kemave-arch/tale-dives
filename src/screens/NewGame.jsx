import { useState } from 'react'
import { ArrowLeft, ArrowRight, UserCircle } from 'lucide-react'
import { PRESET_CLASSES } from '../data/classes.js'

// Stand-in for the full Phase A/B creation pipeline (§2) — just enough to get
// a protagonist onto the board and prove the turn loop. Grounded/free-form
// classes (§Phase B.2a) aren't built yet. Also doubles as the Protagonist
// Library's create/edit form (§6.4B).
export default function NewGame({ protagonistTemplates = [], initial, onBack, onBegin }) {
  const [templateId, setTemplateId] = useState(initial?.id ?? null)
  const [name, setName] = useState(initial?.name ?? '')
  const [classId, setClassId] = useState(initial?.classId ?? PRESET_CLASSES[0].id)
  const [opening, setOpening] = useState(initial?.opening ?? '')

  function applyTemplate(t) {
    setTemplateId(t.id)
    setName(t.name)
    setClassId(t.classId)
    setOpening(t.opening ?? '')
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center gap-4 px-6">
      <h2 className="font-display font-bold text-2xl text-gold-primary">New Protagonist</h2>

      {protagonistTemplates.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="text-xs font-display text-ink-muted mb-1.5">Start from a saved Protagonist</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {protagonistTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="shrink-0 flex items-center gap-1.5 rounded-full glass-panel px-3 py-1.5 text-xs font-display text-gold-primary"
              >
                <UserCircle size={13} />
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col gap-3">
        <label className="text-sm font-display">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wren of the Ashmark"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Class
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-sm"
          >
            {PRESET_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-display">
          Tale Dive Brief <span className="opacity-50">(optional)</span>
          <textarea
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="Describe the exact scene, location, and characters present where Turn 1 should open."
            rows={3}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-sm"
          />
        </label>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold-accent/50 px-5 py-2 font-display text-sm"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <button
          onClick={() => onBegin({ id: templateId, name: name || 'The Wanderer', classId, opening })}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold-action px-6 py-2 font-display text-sm font-semibold text-ink"
        >
          Begin <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
