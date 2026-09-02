import { useRef, useState } from 'react'
import { Cpu, SlidersHorizontal, Database, Info, X, Save, Download, Upload, RotateCcw } from 'lucide-react'
import { PROSE_DEPTHS } from '../api/turnContract.js'

const TABS = [
  { id: 'model', label: 'AI Model', icon: Cpu },
  { id: 'gameplay', label: 'Gameplay', icon: SlidersHorizontal },
  { id: 'backup', label: 'Backup', icon: Database },
  { id: 'about', label: 'About', icon: Info },
]

// Blueprint §6.4E — one drawer, reused pre-campaign and in-story. Gameplay
// controls (Prose Depth/Combat Mode) only apply once a Tale is active.
export default function Settings({
  apiSettings,
  uiPrefs,
  game,
  onBack,
  onSave,
  onExportActive,
  onBackupAll,
  onImportJson,
  onResetDefaults,
}) {
  const [tab, setTab] = useState('model')
  const [model, setModel] = useState(apiSettings.model)
  const [apiKey, setApiKey] = useState(apiSettings.apiKey)
  const [temperature, setTemperature] = useState(apiSettings.temperature)
  const [skin, setSkin] = useState(uiPrefs.skin)
  const [proseDepthKey, setProseDepthKey] = useState(game?.proseDepth?.label ?? 'BALANCED')
  const [combatMode, setCombatMode] = useState(game?.combatMode ?? 'NARRATIVE')
  const importRef = useRef(null)

  function save() {
    onSave({
      apiSettings: { provider: 'gemini', model, apiKey, temperature },
      uiPrefs: { skin },
      proseDepthKey,
      combatMode,
    })
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-start justify-center px-4 py-8">
      <div className="glass-panel glow-ring rounded-3xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gold-primary">Chronicle &amp; Narrator Settings</h2>
          <button onClick={onBack} aria-label="Close" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <nav className="flex gap-1 mb-4 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 font-display text-xs transition-colors ${
                tab === id ? 'bg-gold-accent/20 border border-gold-accent/50 text-gold-primary' : 'text-ink-muted'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>

        {tab === 'model' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-display">
                Model ID
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gemini-2.5-flash"
                  className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>
            <div>
              <label className="text-sm font-display">
                API Key
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key"
                  className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>
            <div>
              <label className="text-sm font-display">
                Temperature
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'gameplay' && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-display mb-1">Prose Depth</p>
              <div className="flex gap-2">
                {Object.keys(PROSE_DEPTHS).map((key) => (
                  <button
                    key={key}
                    onClick={() => setProseDepthKey(key)}
                    className={`flex-1 rounded-lg border px-2 py-2 font-display text-xs ${
                      proseDepthKey === key
                        ? 'border-gold-accent bg-gold-accent/15 text-gold-primary'
                        : 'border-gold-accent/30 text-ink-muted'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-display mb-1">Combat Resolution Mode</p>
              <div className="flex gap-2">
                {['TACTICAL', 'NARRATIVE'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setCombatMode(m)}
                    className={`flex-1 rounded-lg border px-2 py-2 font-display text-xs ${
                      combatMode === m ? 'border-gold-accent bg-gold-accent/15 text-gold-primary' : 'border-gold-accent/30 text-ink-muted'
                    }`}
                  >
                    {m === 'TACTICAL' ? 'Tactical' : 'Narrative'}
                  </button>
                ))}
              </div>
              {!game && <p className="text-[11px] opacity-50 mt-1">Applies once a Tale is active.</p>}
            </div>

            <div>
              <p className="text-sm font-display mb-1">Skin</p>
              <div className="flex gap-2">
                {[
                  { id: 'parchment', label: 'Parchment' },
                  { id: 'obsidian', label: 'Obsidian' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSkin(s.id)}
                    className={`flex-1 rounded-lg border px-2 py-2 font-display text-xs ${
                      skin === s.id ? 'border-gold-accent bg-gold-accent/15 text-gold-primary' : 'border-gold-accent/30 text-ink-muted'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'backup' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onExportActive}
              disabled={!game}
              className="flex items-center gap-1.5 justify-center rounded-lg border border-gold-accent/40 py-2.5 font-display text-xs disabled:opacity-40"
            >
              <Download size={14} /> Export Active
            </button>
            <button
              onClick={onBackupAll}
              className="flex items-center gap-1.5 justify-center rounded-lg border border-gold-accent/40 py-2.5 font-display text-xs"
            >
              <Database size={14} /> Backup All
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-1.5 justify-center rounded-lg border border-emerald/40 text-emerald py-2.5 font-display text-xs"
            >
              <Upload size={14} /> Import JSON
            </button>
            <button
              onClick={onResetDefaults}
              className="flex items-center gap-1.5 justify-center rounded-lg border border-rose/40 text-rose py-2.5 font-display text-xs"
            >
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportJson(file)
                e.target.value = ''
              }}
            />
          </div>
        )}

        {tab === 'about' && (
          <div className="text-center py-2">
            <p className="font-display font-bold text-gold-primary">TALE DIVES</p>
            <p className="font-narrative text-sm mt-2">App Developer: Kemuel Avenido</p>
            <p className="font-narrative text-sm italic">Dedicated to: Elisah Mirelle R. King (My Avid Bookworm)</p>
            <p className="font-narrative text-xs opacity-60 mt-3">
              An AI text-based fantasy RPG diving engine — local-first, provider-agnostic.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onBack} className="rounded-full border border-gold-accent/50 px-5 py-2 font-display text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!model || !apiKey}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-action px-5 py-2 font-display text-sm font-semibold text-ink disabled:opacity-40"
          >
            <Save size={15} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
