import { useState } from 'react'
import { PRESET_CLASSES } from '../data/classes.js'

// Stand-in for the full Phase A/B creation pipeline (§2) — just enough to get
// a protagonist onto the board and prove the turn loop. World setup, grounded
// classes, and the Tale Dive Brief come later.
export default function NewGame({ onBegin, onBack }) {
  const [name, setName] = useState('')
  const [classId, setClassId] = useState(PRESET_CLASSES[0].id)
  const [opening, setOpening] = useState('')

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col items-center justify-center gap-4 px-6">
      <h2 className="font-display font-bold text-2xl text-gold-primary">New Protagonist</h2>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <label className="text-sm font-display">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wren of the Ashmark"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Class
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-narrative text-sm"
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
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-narrative text-sm"
          />
        </label>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="rounded-full border border-gold-accent/50 px-6 py-2 font-display text-sm">
          Back
        </button>
        <button
          onClick={() => onBegin({ name: name || 'The Wanderer', classId, opening })}
          className="rounded-full bg-gold-action px-6 py-2 font-display text-sm font-semibold text-ink"
        >
          Begin
        </button>
      </div>
    </div>
  )
}
