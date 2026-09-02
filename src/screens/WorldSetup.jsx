import { useState } from 'react'
import { DEFAULT_NARRATION_STYLE } from '../api/turnContract.js'

// Blueprint §Phase A.1 — Original Mode world setup. Inspired Mode (§Phase A.2,
// title/author -> grounded world-fabrication call) isn't built yet since it
// needs Gemini's search-grounding tool alongside structured JSON output in
// the same call, which needs its own verification pass first.
export default function WorldSetup({ onBack, onContinue }) {
  const [genreTone, setGenreTone] = useState('')
  const [conflict, setConflict] = useState('')
  const [background, setBackground] = useState('')
  const [narrationStyle, setNarrationStyle] = useState(DEFAULT_NARRATION_STYLE)

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col items-center justify-center gap-4 px-6 py-10">
      <h2 className="font-display font-bold text-2xl text-gold-primary">Build a World</h2>

      <div className="w-full max-w-sm flex gap-2 mb-2">
        <div className="flex-1 rounded-xl border-2 border-gold-accent bg-card px-3 py-2 text-center font-display text-sm">
          Original Mode
        </div>
        <div className="flex-1 rounded-xl border border-gold-accent/20 bg-card/50 px-3 py-2 text-center font-display text-sm opacity-40">
          Inspired Mode
          <div className="text-[10px] font-narrative italic">Coming soon</div>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <label className="text-sm font-display">
          Genre &amp; Tone <span className="opacity-50">(optional)</span>
          <input
            value={genreTone}
            onChange={(e) => setGenreTone(e.target.value)}
            placeholder="Dark fantasy, morally grey"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Core Regional Conflict <span className="opacity-50">(optional)</span>
          <input
            value={conflict}
            onChange={(e) => setConflict(e.target.value)}
            placeholder="A border war between two rival holds"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          World Background
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="The setting's key backdrop, e.g. the continent of Navarre"
            rows={3}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-narrative text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Narration Style
          <textarea
            value={narrationStyle}
            onChange={(e) => setNarrationStyle(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-narrative text-xs"
          />
        </label>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="rounded-full border border-gold-accent/50 px-6 py-2 font-display text-sm">
          Back
        </button>
        <button
          onClick={() => onContinue({ mode: 'original', genreTone, conflict, background, narrationStyle })}
          className="rounded-full bg-gold-action px-6 py-2 font-display text-sm font-semibold text-ink"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
