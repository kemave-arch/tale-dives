import { useEffect, useRef, useState } from 'react'
import { Cpu, SlidersHorizontal, Database, Info, X, Save, Download, Upload, RotateCcw, FolderOpen, FolderX } from 'lucide-react'
import { PROSE_DEPTHS } from '../api/turnContract.ts'
import { allProviders, getProvider } from '../api/providers/index.ts'
import { forgetSaveFolder, loadSaveFolder, pickSaveFolder, supportsFileSystemAccess } from '../lib/fsAccess.ts'
import type { ApiSettings, Campaign, CombatMode, Skin, UiPrefs } from '../types.ts'

const TABS = [
  { id: 'model', label: 'AI Model', icon: Cpu },
  { id: 'gameplay', label: 'Gameplay', icon: SlidersHorizontal },
  { id: 'backup', label: 'Backup', icon: Database },
  { id: 'about', label: 'About', icon: Info },
] as const

export interface SettingsSavePayload {
  apiSettings: ApiSettings
  uiPrefs: UiPrefs
  proseDepthKey: keyof typeof PROSE_DEPTHS
  combatMode: CombatMode
}

interface SettingsProps {
  apiSettings: ApiSettings
  uiPrefs: UiPrefs
  game: Campaign | null
  onBack: () => void
  onSave: (payload: SettingsSavePayload) => void
  onExportActive: () => void
  onBackupAll: () => void
  onImportJson: (file: File) => void
  onResetDefaults: () => void
}

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
}: SettingsProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('model')
  const [provider, setProvider] = useState(apiSettings.provider)
  const [model, setModel] = useState(apiSettings.model)
  const [apiKey, setApiKey] = useState(apiSettings.apiKey)
  const [temperature, setTemperature] = useState(apiSettings.temperature)
  const [skin, setSkin] = useState<Skin>(uiPrefs.skin)
  const [chromeOpacity, setChromeOpacity] = useState(uiPrefs.chromeOpacity)
  const [proseDepthKey, setProseDepthKey] = useState<keyof typeof PROSE_DEPTHS>(
    (game?.proseDepth?.label as keyof typeof PROSE_DEPTHS) ?? 'BALANCED',
  )
  const [combatMode, setCombatMode] = useState<CombatMode>(game?.combatMode ?? 'NARRATIVE')
  const [folderLinked, setFolderLinked] = useState<boolean | null>(null) // null = still checking
  const importRef = useRef<HTMLInputElement>(null)

  // §6.4B Local Save status — re-checked on mount since a granted folder
  // handle's permission doesn't survive a page reload.
  useEffect(() => {
    let cancelled = false
    loadSaveFolder().then((handle) => {
      if (!cancelled) setFolderLinked(!!handle)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function linkFolder() {
    const handle = await pickSaveFolder()
    setFolderLinked(!!handle)
  }

  async function unlinkFolder() {
    await forgetSaveFolder()
    setFolderLinked(false)
  }

  function save() {
    onSave({
      apiSettings: { provider, model, apiKey, temperature },
      uiPrefs: { skin, chromeOpacity },
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
                Provider
                <select
                  value={provider}
                  onChange={(e) => {
                    const nextProvider = e.target.value
                    setProvider(nextProvider)
                    const models = getProvider(nextProvider).models
                    if (!models.some((m) => m.id === model)) setModel(models[0]?.id ?? '')
                  }}
                  className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-mono text-sm"
                >
                  {allProviders().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="text-sm font-display">
                Model ID
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-mono text-sm"
                >
                  {!getProvider(provider).models.some((m) => m.id === model) && model && (
                    <option value={model}>{model} (custom)</option>
                  )}
                  {getProvider(provider).models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="text-sm font-display">
                API Key
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Paste your ${getProvider(provider).label} API key`}
                  className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-surface-raised px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>
            <div>
              <label className="text-sm font-display">
                Narrative Variance
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
              <p className="mt-1 text-[11px] text-ink-muted">
                How unpredictable the prose gets. Low (0–0.5) keeps the Narrator steady and consistent; high (1.5–2)
                adds more surprise and flourish but risks losing coherence.
              </p>
            </div>
          </div>
        )}

        {tab === 'gameplay' && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-display mb-1">Prose Depth</p>
              <div className="flex gap-2">
                {(Object.keys(PROSE_DEPTHS) as (keyof typeof PROSE_DEPTHS)[]).map((key) => (
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
                {(['TACTICAL', 'NARRATIVE'] as const).map((m) => (
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
                {(
                  [
                    { id: 'parchment', label: 'Parchment' },
                    { id: 'obsidian', label: 'Obsidian' },
                  ] as const
                ).map((s) => (
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

            <div>
              <p className="text-sm font-display mb-1">
                Chronicle HUD Opacity <span className="opacity-50 font-mono text-xs">{Math.round(chromeOpacity * 100)}%</span>
              </p>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={chromeOpacity}
                onChange={(e) => setChromeOpacity(Number(e.target.value))}
                className="w-full accent-gold-action"
              />
              <p className="text-[11px] opacity-50 mt-1">
                How solid the header, HUD, and input bar glass look over the ambient background. Lower is more see-through.
              </p>
            </div>
          </div>
        )}

        {tab === 'backup' && (
          <div className="flex flex-col gap-3">
            {/* §6.4B Local Save status — a status indicator, not a freely
                reversible toggle: On-Device Folder writes Export/Backup
                directly to a chosen folder; Browser Only (the fallback
                everywhere without File System Access API support) keeps
                using the plain download flow below. */}
            <div className="rounded-lg border border-gold-accent/30 px-3 py-2.5 flex items-center gap-2.5">
              {folderLinked ? <FolderOpen size={16} className="text-gold-primary shrink-0" /> : <FolderX size={16} className="text-ink-muted shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-display">
                  {!supportsFileSystemAccess()
                    ? 'Browser Only'
                    : folderLinked
                      ? 'On-Device Folder'
                      : 'Browser Only'}
                </p>
                <p className="text-[11px] opacity-50">
                  {!supportsFileSystemAccess()
                    ? 'This browser has no folder-save support — Export writes a normal download.'
                    : folderLinked
                      ? 'Export & Backup write directly into your chosen folder.'
                      : 'Saves live in this browser only — clearing site data erases them. Link a folder, or use Export for backup.'}
                </p>
              </div>
              {supportsFileSystemAccess() && (
                <button
                  onClick={folderLinked ? unlinkFolder : linkFolder}
                  className="shrink-0 rounded-full border border-gold-accent/40 px-3 py-1.5 font-display text-[11px]"
                >
                  {folderLinked ? 'Unlink' : 'Choose Folder'}
                </button>
              )}
            </div>

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
