import { useState } from 'react'
import { ArrowLeft, ArrowRight, Globe } from 'lucide-react'
import { DEFAULT_NARRATION_STYLE } from '../api/turnContract.js'

// Blueprint §Phase A.1 — Original Mode world setup, now also usable as the
// World Library's create/edit form (§6.4B) since both need the same fields.
// Inspired Mode (§Phase A.2, title/author -> grounded world-fabrication call)
// isn't built yet — it needs Gemini's search-grounding tool alongside
// structured JSON output in the same call, which needs its own verification.
export default function WorldSetup({ worldTemplates = [], initial, onBack, onContinue }) {
  const [templateId, setTemplateId] = useState(initial?.id ?? null)
  const [name, setName] = useState(initial?.name ?? '')
  const [genreTone, setGenreTone] = useState(initial?.genreTone ?? '')
  const [conflict, setConflict] = useState(initial?.conflict ?? '')
  const [background, setBackground] = useState(initial?.background ?? '')
  const [narrationStyle, setNarrationStyle] = useState(initial?.narrationStyle ?? DEFAULT_NARRATION_STYLE)

  function applyTemplate(t) {
    setTemplateId(t.id)
    setName(t.name)
    setGenreTone(t.genreTone ?? '')
    setConflict(t.conflict ?? '')
    setBackground(t.background ?? '')
    setNarrationStyle(t.narrationStyle ?? DEFAULT_NARRATION_STYLE)
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col items-center px-6 py-10">
      <h2 className="font-display font-bold text-2xl text-gold-primary mb-4">Build a World</h2>

      {worldTemplates.length > 0 && (
        <div className="w-full max-w-sm mb-4">
          <p className="text-xs font-display text-ink-muted mb-1.5">Start from a saved World</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {worldTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="shrink-0 flex items-center gap-1.5 rounded-full glass-panel px-3 py-1.5 text-xs font-display text-gold-primary"
              >
                <Globe size={13} />
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm flex gap-2 mb-2">
        <div className="flex-1 rounded-xl border-2 border-gold-accent bg-surface-raised px-3 py-2 text-center font-display text-sm">
          Original Mode
        </div>
        <div className="flex-1 rounded-xl border border-gold-accent/20 bg-surface-raised/50 px-3 py-2 text-center font-display text-sm opacity-40">
          Inspired Mode
          <div className="text-[10px] font-narrative italic">Coming soon</div>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <label className="text-sm font-display">
          World Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Navarre"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Genre &amp; Tone <span className="opacity-50">(optional)</span>
          <input
            value={genreTone}
            onChange={(e) => setGenreTone(e.target.value)}
            placeholder="Dark fantasy, morally grey"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Core Regional Conflict <span className="opacity-50">(optional)</span>
          <input
            value={conflict}
            onChange={(e) => setConflict(e.target.value)}
            placeholder="A border war between two rival holds"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          World Background
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="The setting's key backdrop, e.g. the continent of Navarre"
            rows={3}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Narration Style
          <textarea
            value={narrationStyle}
            onChange={(e) => setNarrationStyle(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-narrative text-xs"
          />
        </label>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold-accent/50 px-5 py-2 font-display text-sm"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <button
          onClick={() =>
            onContinue({
              id: templateId,
              name: name.trim() || 'Untitled World',
              mode: 'original',
              genreTone,
              conflict,
              background,
              narrationStyle,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-gold-action px-6 py-2 font-display text-sm font-semibold text-ink"
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
