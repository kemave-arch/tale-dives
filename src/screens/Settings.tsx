import { useEffect, useRef, useState } from 'react'
import { Cpu, SlidersHorizontal, Database, Info, X, Save, Download, Upload, RotateCcw, FolderOpen, FolderX } from 'lucide-react'
import { PROSE_DEPTHS } from '../api/turnContract.ts'
import { allProviders, getProvider } from '../api/providers/index.ts'
import { forgetSaveFolder, loadSaveFolder, pickSaveFolder, supportsFileSystemAccess } from '../lib/fsAccess.ts'
import {
  FIELD_CLASS, GlassButton, GlassField, GlassIconButton, GlassScreen, GlassSegmented, GlassTabs, LABEL_CLASS, SELECT_CLASS,
} from '../lib/glassChrome.tsx'
import type { ApiSettings, Campaign, CombatMode, UiPrefs } from '../types.ts'

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
      uiPrefs: { chromeOpacity },
      proseDepthKey,
      combatMode,
    })
  }

  return (
    <GlassScreen ground="dark" className="flex items-start justify-center px-4 py-8">
      <div className="glass-panel rounded-3xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gold-primary">App Settings</h2>
          <GlassIconButton icon={X} label="Close" compact onClick={onBack} />
        </div>

        {/* Labelled tabs (they used to be icon-only with the active label
            repeated underneath) — same strip as MainMenu/Codex now. */}
        <GlassTabs tabs={TABS} value={tab} onChange={setTab} className="mb-4" />

        {tab === 'model' && (
          <div className="flex flex-col gap-4">
            <GlassField label="Provider">
              <select
                value={provider}
                onChange={(e) => {
                  const nextProvider = e.target.value
                  setProvider(nextProvider)
                  const models = getProvider(nextProvider).models
                  if (!models.some((m) => m.id === model)) setModel(models[0]?.id ?? '')
                }}
                className={SELECT_CLASS}
              >
                {allProviders().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </GlassField>

            <GlassField label="Model ID">
              <select value={model} onChange={(e) => setModel(e.target.value)} className={SELECT_CLASS}>
                {!getProvider(provider).models.some((m) => m.id === model) && model && (
                  <option value={model}>{model} (custom)</option>
                )}
                {getProvider(provider).models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </GlassField>

            <GlassField label="API Key">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Paste your ${getProvider(provider).label} API key`}
                className={`${FIELD_CLASS} font-mono`}
              />
            </GlassField>

            <div>
              <p className={LABEL_CLASS}>
                Creativity Randomness <span className="opacity-60 font-mono normal-case tracking-normal">{temperature.toFixed(1)}</span>
              </p>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full mt-2 accent-gold-action"
              />
              <p className="font-narrative text-[11px] text-ink-muted mt-1">
                How unpredictable the prose gets. Low (0–0.5) keeps the Narrator steady and consistent; high (1.5–2)
                adds more surprise and flourish but risks losing coherence.
              </p>
            </div>
          </div>
        )}

        {tab === 'gameplay' && (
          <div className="flex flex-col gap-5">
            {/* The Skin picker (Parchment/Obsidian) used to sit here. It was
                retired with the move to a single dark-glass theme — the light
                Parchment skin was the default, and was why this screen and the
                Codex read as a different app from Title/MainMenu. The reading
                surface in Chronicle is still warm paper; that's now a scoped
                override in index.css rather than a whole-app skin. */}
            <div>
              <p className={LABEL_CLASS}>Prose Depth</p>
              <GlassSegmented
                className="mt-2"
                options={(Object.keys(PROSE_DEPTHS) as (keyof typeof PROSE_DEPTHS)[]).map((key) => ({ id: key, label: key }))}
                value={proseDepthKey}
                onChange={setProseDepthKey}
              />
            </div>

            <div>
              <p className={LABEL_CLASS}>Combat Resolution Mode</p>
              <GlassSegmented
                className="mt-2"
                options={[
                  { id: 'TACTICAL', label: 'Tactical' },
                  { id: 'NARRATIVE', label: 'Narrative' },
                ] as const}
                value={combatMode}
                onChange={setCombatMode}
              />
              {!game && <p className="font-narrative text-[11px] text-ink-muted mt-1.5">Applies once a Tale is active.</p>}
            </div>

            <div>
              <p className={LABEL_CLASS}>
                HUD Opacity <span className="opacity-60 font-mono normal-case tracking-normal">{Math.round(chromeOpacity * 100)}%</span>
              </p>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={chromeOpacity}
                onChange={(e) => setChromeOpacity(Number(e.target.value))}
                className="w-full mt-2 accent-gold-action"
              />
              <p className="font-narrative text-[11px] text-ink-muted mt-1">
                How solid the header, HUD, and input bar glass look over the ambient background. Lower is more see-through; 100% is fully solid.
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
            <div className="rounded-xl border border-gold-accent/25 bg-gold-accent/[0.04] backdrop-blur-sm px-3 py-2.5 flex items-center gap-2.5">
              {folderLinked ? <FolderOpen size={16} className="text-gold-primary shrink-0" /> : <FolderX size={16} className="text-ink-muted shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-display">
                  {!supportsFileSystemAccess()
                    ? 'Browser Only'
                    : folderLinked
                      ? 'On-Device Folder'
                      : 'Browser Only'}
                </p>
                <p className="font-narrative text-[11px] text-ink-muted">
                  {!supportsFileSystemAccess()
                    ? 'This browser has no folder-save support — Export writes a normal download.'
                    : folderLinked
                      ? 'Export & Backup write directly into your chosen folder.'
                      : 'Saves live in this browser only — clearing site data erases them. Link a folder, or use Export for backup.'}
                </p>
              </div>
              {supportsFileSystemAccess() && (
                <GlassButton onClick={folderLinked ? unlinkFolder : linkFolder} className="shrink-0 !py-1.5 !text-[11px]">
                  {folderLinked ? 'Unlink' : 'Choose Folder'}
                </GlassButton>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <GlassButton onClick={onExportActive} disabled={!game} icon={Download}>
                Export Active
              </GlassButton>
              <GlassButton onClick={onBackupAll} icon={Database}>
                Backup All
              </GlassButton>
              <GlassButton onClick={() => importRef.current?.click()} tone="positive" icon={Upload}>
                Import JSON
              </GlassButton>
              <GlassButton onClick={onResetDefaults} tone="danger" icon={RotateCcw}>
                Reset Defaults
              </GlassButton>
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
            <p className="font-display font-bold text-gold-primary tracking-[0.2em]">TALE DIVES</p>
            <p className="font-narrative text-sm mt-2">App Developer: Kemuel Avenido</p>
            <p className="font-narrative text-sm italic">Dedicated to: Elisah Mirelle R. King (My Avid Bookworm)</p>
            <p className="font-narrative text-xs text-ink-muted mt-3">
              An AI text-based fantasy RPG diving engine — local-first, provider-agnostic.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <GlassIconButton icon={X} label="Cancel" onClick={onBack} />
          <GlassIconButton icon={Save} label="Save Settings" tone="action" onClick={save} disabled={!model || !apiKey} />
        </div>
      </div>
    </GlassScreen>
  )
}
