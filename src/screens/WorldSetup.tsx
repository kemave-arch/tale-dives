import { useState } from 'react'
import { ArrowRight, Globe, Save, Plus } from 'lucide-react'
import { DEFAULT_NARRATION_STYLE } from '../api/turnContract.ts'
import type { WorldData } from '../types.ts'

interface WorldSetupProps {
  worldTemplates?: WorldData[]
  initial?: WorldData | null
  onBack: () => void
  onContinue: (world: WorldData) => void
  onSavePreset?: (world: WorldData) => void
  onSaveAsNewPreset?: (world: WorldData) => void
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

// Blueprint §Phase A.1 — Original Mode world setup, now also usable as the
// World Library's create/edit form (§6.4B) since both need the same fields.
// Inspired Mode (§Phase A.2, title/author -> grounded world-fabrication call)
// isn't built yet — it needs Gemini's search-grounding tool alongside
// structured JSON output in the same call, which needs its own verification.
// A pre-authored Inspired-mode template (Appendix A's Fourth Wing example)
// can still be picked here and edited by hand — sourceTitle/sourceAuthor are
// attribution metadata only, never sent to the model.
export default function WorldSetup({
  worldTemplates = [],
  initial,
  onBack,
  onContinue,
  onSavePreset,
  onSaveAsNewPreset,
}: WorldSetupProps) {
  const [templateId, setTemplateId] = useState<string | null | undefined>(initial?.id ?? null)
  const [mode, setMode] = useState(initial?.mode ?? 'original')
  const [name, setName] = useState(initial?.name ?? '')
  const [sourceTitle, setSourceTitle] = useState(initial?.sourceTitle ?? '')
  const [sourceAuthor, setSourceAuthor] = useState(initial?.sourceAuthor ?? '')
  const [genreTone, setGenreTone] = useState(initial?.genreTone ?? '')
  const [conflict, setConflict] = useState(initial?.conflict ?? '')
  const [background, setBackground] = useState(initial?.background ?? '')
  const [narrationStyle, setNarrationStyle] = useState(initial?.narrationStyle ?? DEFAULT_NARRATION_STYLE)

  function applyTemplate(t: WorldData) {
    setTemplateId(t.id)
    setMode(t.mode ?? 'original')
    setName(t.name)
    setSourceTitle(t.sourceTitle ?? '')
    setSourceAuthor(t.sourceAuthor ?? '')
    setGenreTone(t.genreTone ?? '')
    setConflict(t.conflict ?? '')
    setBackground(t.background ?? '')
    setNarrationStyle(t.narrationStyle ?? DEFAULT_NARRATION_STYLE)
  }

  function currentData(): WorldData {
    return {
      id: templateId,
      name: name.trim() || 'Untitled World',
      mode,
      sourceTitle: sourceTitle.trim() || undefined,
      sourceAuthor: sourceAuthor.trim() || undefined,
      genreTone,
      conflict,
      background,
      narrationStyle,
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-canvas text-ink">
      <header
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gold-accent/20"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <h2 className="font-display font-bold text-lg text-gold-primary">Build a World</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          {worldTemplates.length > 0 && (
            <div>
              <p className="text-xs font-display text-ink-muted mb-1.5">Start from a saved World</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {worldTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-display transition-colors ${
                      templateId === t.id
                        ? 'bg-gold-accent/20 border border-gold-accent/60 text-gold-primary'
                        : 'glass-panel text-gold-primary/80'
                    }`}
                  >
                    <Globe size={13} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="World Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navarre" className={inputClass} />
          </Field>

          <div>
            <p className="text-sm font-display mb-1">
              Adapted From <span className="opacity-50 font-normal">(optional — attribution only, not sent to the Narrator)</span>
            </p>
            <div className="flex gap-2">
              <input
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="Novel/Series title"
                className={inputClass}
              />
              <input
                value={sourceAuthor}
                onChange={(e) => setSourceAuthor(e.target.value)}
                placeholder="Author"
                className={inputClass}
              />
            </div>
          </div>

          <Field label="Genre & Tone" hint="(optional)">
            <input
              value={genreTone}
              onChange={(e) => setGenreTone(e.target.value)}
              placeholder="Dark fantasy, morally grey"
              className={inputClass}
            />
          </Field>

          <Field label="Core Regional Conflict" hint="(optional)">
            <input
              value={conflict}
              onChange={(e) => setConflict(e.target.value)}
              placeholder="A border war between two rival holds"
              className={inputClass}
            />
          </Field>

          <Field label="World Background">
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="The setting's key backdrop, e.g. the continent of Navarre"
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field label="Narration Style">
            <textarea
              value={narrationStyle}
              onChange={(e) => setNarrationStyle(e.target.value)}
              rows={4}
              className={`${inputClass} text-xs`}
            />
          </Field>

          {(onSavePreset || onSaveAsNewPreset) && (
            <div className="flex gap-2">
              {templateId && onSavePreset && (
                <button
                  onClick={() => onSavePreset(currentData())}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gold-accent/40 py-2 font-display text-xs text-gold-primary"
                >
                  <Save size={13} /> Save Preset
                </button>
              )}
              {onSaveAsNewPreset && (
                <button
                  onClick={() => onSaveAsNewPreset({ ...currentData(), id: null })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gold-accent/40 py-2 font-display text-xs text-gold-primary"
                >
                  <Plus size={13} /> Save as New Preset
                </button>
              )}
            </div>
          )}
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
          onClick={() => onContinue(currentData())}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-action px-6 py-2.5 font-display text-sm font-semibold text-ink"
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
