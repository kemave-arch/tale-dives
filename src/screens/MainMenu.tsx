import { useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen, Globe, UserCircle, Plus, Upload, Download, Trash2, Play, Sparkles, Star, Settings as SettingsIcon, Pencil,
} from 'lucide-react'
import type { Campaign, Dict, ProtagonistData, WorldData } from '../types.ts'
import { CyclingBackground } from '../lib/cyclingBackground.tsx'
import { GLASS_SURFACE, GlassIconButton } from '../lib/glassChrome.tsx'

const DASHED_ROW_CLASS =
  'flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#e8ca8a]/35 text-[#e8ca8a]/80 py-2.5 font-display text-sm bg-transparent backdrop-blur-sm transition-colors duration-150 hover:border-[#e8ca8a] hover:text-[#f5dfa0]'

const TABS = [
  { id: 'tales', label: 'Tales', icon: BookOpen },
  { id: 'worlds', label: 'Worlds', icon: Globe },
  { id: 'protagonists', label: 'Protagonists', icon: UserCircle },
] as const

interface DashedCardProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  children?: ReactNode
}

function DashedCard({ icon: Icon, label, onClick, children }: DashedCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e8ca8a]/35 text-[#e8ca8a]/80 py-10 bg-transparent backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e8ca8a] hover:text-[#f5dfa0] hover:shadow-[0_0_18px_2px_rgba(240,202,101,0.2)]"
    >
      <span className="w-12 h-12 rounded-full border border-[#e8ca8a]/50 flex items-center justify-center transition-all duration-200 group-hover:border-[#f0ca65] group-hover:scale-110">
        <Icon size={22} />
      </span>
      <span className="font-display text-sm">{label}</span>
      {children}
    </button>
  )
}

interface MainMenuProps {
  worlds: Dict<WorldData>
  protagonists: Dict<ProtagonistData>
  campaigns: Dict<Campaign>
  onResume: (id: string) => void
  onNewSession: (worldId?: string, protagonistId?: string) => void
  onDeleteCampaign: (id: string) => void
  onExportCampaign: (id: string) => void
  onImportCampaign: (file: File) => void
  onNewWorld: () => void
  onEditWorld: (id: string) => void
  onSetDefaultWorld: (id: string) => void
  onDeleteWorld: (id: string) => void
  onNewProtagonist: () => void
  onEditProtagonist: (id: string) => void
  onSetDefaultProtagonist: (id: string) => void
  onDeleteProtagonist: (id: string) => void
  onOpenSettings: () => void
}

export default function MainMenu({
  worlds,
  protagonists,
  campaigns,
  onResume,
  onNewSession,
  onDeleteCampaign,
  onExportCampaign,
  onImportCampaign,
  onNewWorld,
  onEditWorld,
  onSetDefaultWorld,
  onDeleteWorld,
  onNewProtagonist,
  onEditProtagonist,
  onSetDefaultProtagonist,
  onDeleteProtagonist,
  onOpenSettings,
}: MainMenuProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('tales')
  const importRef = useRef<HTMLInputElement>(null)

  const taleList = Object.values(campaigns).sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
  const worldList = Object.values(worlds)
  const protagonistList = Object.values(protagonists)

  return (
    <div className="relative min-h-dvh text-[#f5dfa0]">
      <CyclingBackground fixed />
      {/* The art carries its own wordmark/logo already (see Title), so this
          screen's chrome is just the tab nav, lists, and a Settings icon —
          no repeated "TALE DIVES" heading. A uniform scrim (rather than
          Title's bottom-only gradient) keeps the whole scrollable list
          legible, not just the last screenful. */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(4,3,7,0.62), rgba(4,3,7,0.72) 30%, rgba(4,3,7,0.8))' }} />

      <div
        className="relative z-10 px-4 pb-16"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <header className="flex items-center justify-between mb-5">
          <p className="font-narrative italic text-sm text-[#e8ca8a]/80">Choose a tale, or begin a new one</p>
          <GlassIconButton icon={SettingsIcon} label="Settings" onClick={onOpenSettings} />
        </header>

        <nav className={`${GLASS_SURFACE} rounded-2xl p-1 flex gap-1 mb-5`}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 border font-display text-xs transition-colors duration-150 ${
                tab === id ? 'border-[#f0ca65]/70 text-[#f5dfa0]' : 'border-transparent text-[#e8ca8a]/60 hover:text-[#e8ca8a]'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        {tab === 'tales' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {taleList.map((tale) => (
              <div key={tale.id} className={`${GLASS_SURFACE} rounded-2xl p-4 flex flex-col gap-2`}>
                <h3 className="font-display font-bold text-base text-[#f0ca65]">{tale.title}</h3>
                {tale.synopsis && <p className="font-narrative text-xs text-[#e8ca8a]/70 line-clamp-2">{tale.synopsis}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[10px] text-[#e8ca8a]/50">
                    {tale.lastPlayed ? new Date(tale.lastPlayed).toLocaleDateString() : ''}
                  </span>
                  <div className="flex gap-1">
                    <GlassIconButton icon={Play} label="Resume" tone="action" onClick={() => onResume(tale.id)} />
                    <GlassIconButton icon={Sparkles} label="New Session" onClick={() => onNewSession(tale.worldId, tale.protagonistId)} />
                    <GlassIconButton icon={Download} label="Export" onClick={() => onExportCampaign(tale.id)} />
                    <GlassIconButton icon={Trash2} label="Delete" tone="danger" onClick={() => onDeleteCampaign(tale.id)} />
                  </div>
                </div>
              </div>
            ))}

            <DashedCard icon={Plus} label="New Story" onClick={() => onNewSession()} />
            <DashedCard icon={Upload} label="Import Tale" onClick={() => importRef.current?.click()}>
              <span className="font-mono text-[10px] text-[#e8ca8a]/50">.json</span>
            </DashedCard>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportCampaign(file)
                e.target.value = ''
              }}
            />
          </div>
        )}

        {tab === 'worlds' && (
          <div className="flex flex-col gap-2">
            {worldList.map((world) => (
              <div key={world.id} className={`${GLASS_SURFACE} rounded-xl px-3 py-2 flex items-center gap-2.5`}>
                <Globe size={16} className="text-[#e8ca8a]/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-sm text-[#f0ca65] truncate">{world.name}</h3>
                  {world.background && <p className="font-narrative text-xs text-[#e8ca8a]/70 truncate">{world.background}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <GlassIconButton
                    compact
                    icon={Star}
                    label={world.isDefault ? 'Default world' : 'Set as default'}
                    tone={world.isDefault ? 'action' : 'default'}
                    onClick={() => onSetDefaultWorld(world.id!)}
                  />
                  <GlassIconButton compact icon={Pencil} label="Edit" onClick={() => onEditWorld(world.id!)} />
                  <GlassIconButton compact icon={Trash2} label="Delete" tone="danger" onClick={() => onDeleteWorld(world.id!)} />
                </div>
              </div>
            ))}
            <button onClick={onNewWorld} className={DASHED_ROW_CLASS}>
              <Plus size={14} /> New World
            </button>
          </div>
        )}

        {tab === 'protagonists' && (
          <div className="flex flex-col gap-2">
            {protagonistList.map((p) => (
              <div key={p.id} className={`${GLASS_SURFACE} rounded-xl px-3 py-2 flex items-center gap-2.5`}>
                <UserCircle size={16} className="text-[#e8ca8a]/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-sm text-[#f0ca65] truncate">{p.name}</h3>
                  <p className="font-narrative text-xs text-[#e8ca8a]/70 truncate">{p.className}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <GlassIconButton
                    compact
                    icon={Star}
                    label={p.isDefault ? 'Default protagonist' : 'Set as default'}
                    tone={p.isDefault ? 'action' : 'default'}
                    onClick={() => onSetDefaultProtagonist(p.id!)}
                  />
                  <GlassIconButton compact icon={Pencil} label="Edit" onClick={() => onEditProtagonist(p.id!)} />
                  <GlassIconButton compact icon={Trash2} label="Delete" tone="danger" onClick={() => onDeleteProtagonist(p.id!)} />
                </div>
              </div>
            ))}
            <button onClick={onNewProtagonist} className={DASHED_ROW_CLASS}>
              <Plus size={14} /> New Protagonist
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
