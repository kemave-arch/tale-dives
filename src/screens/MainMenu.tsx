import { useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen, Globe, UserCircle, Plus, Upload, Download, Trash2, Play, Sparkles, Star, Settings as SettingsIcon,
} from 'lucide-react'
import type { Campaign, Dict, ProtagonistData, WorldData } from '../types.ts'

const TABS = [
  { id: 'tales', label: 'Tales', icon: BookOpen },
  { id: 'worlds', label: 'Worlds', icon: Globe },
  { id: 'protagonists', label: 'Protagonists', icon: UserCircle },
] as const

type Tone = 'default' | 'action' | 'danger'

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  tone?: Tone
}

function IconButton({ icon: Icon, label, onClick, tone = 'default' }: IconButtonProps) {
  const toneClass =
    tone === 'danger'
      ? 'text-rose hover:bg-rose-bg'
      : tone === 'action'
        ? 'text-ink bg-gold-action hover:brightness-105'
        : 'text-gold-primary hover:bg-gold-accent/15'
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${toneClass}`}
    >
      <Icon size={18} />
    </button>
  )
}

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
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold-accent/40 text-gold-primary/80 py-10 hover:border-gold-accent/70 hover:text-gold-primary transition-colors"
    >
      <span className="w-12 h-12 rounded-full border border-gold-accent/50 flex items-center justify-center">
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
  onSetDefaultWorld: (id: string) => void
  onDeleteWorld: (id: string) => void
  onNewProtagonist: () => void
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
  onSetDefaultWorld,
  onDeleteWorld,
  onNewProtagonist,
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
    <div className="min-h-screen bg-canvas text-ink px-4 py-6 pb-16">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display font-black text-2xl text-gold-primary tracking-wide">TALE DIVES</h1>
          <p className="font-narrative italic text-xs opacity-70">Choose a tale, or begin a new one</p>
        </div>
        <IconButton icon={SettingsIcon} label="Settings" onClick={onOpenSettings} />
      </header>

      <nav className="glass-panel rounded-2xl p-1 flex gap-1 mb-5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 font-display text-xs transition-colors ${
              tab === id ? 'bg-gold-accent/20 border border-gold-accent/50 text-gold-primary' : 'text-ink-muted'
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
            <div key={tale.id} className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
              <h3 className="font-display font-bold text-base text-gold-primary">{tale.title}</h3>
              {tale.synopsis && <p className="font-narrative text-xs opacity-70 line-clamp-2">{tale.synopsis}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[10px] opacity-50">
                  {tale.lastPlayed ? new Date(tale.lastPlayed).toLocaleDateString() : ''}
                </span>
                <div className="flex gap-1">
                  <IconButton icon={Play} label="Resume" tone="action" onClick={() => onResume(tale.id)} />
                  <IconButton icon={Sparkles} label="New Session" onClick={() => onNewSession(tale.worldId, tale.protagonistId)} />
                  <IconButton icon={Download} label="Export" onClick={() => onExportCampaign(tale.id)} />
                  <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => onDeleteCampaign(tale.id)} />
                </div>
              </div>
            </div>
          ))}

          <DashedCard icon={Plus} label="New Story" onClick={() => onNewSession()} />
          <DashedCard icon={Upload} label="Import Tale" onClick={() => importRef.current?.click()}>
            <span className="font-mono text-[10px] opacity-50">.json</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {worldList.map((world) => (
            <div key={world.id} className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
              <h3 className="font-display font-bold text-base text-gold-primary">{world.name}</h3>
              {world.background && <p className="font-narrative text-xs opacity-70 line-clamp-2">{world.background}</p>}
              <div className="flex items-center justify-end gap-1 mt-2">
                <IconButton
                  icon={Star}
                  label={world.isDefault ? 'Default world' : 'Set as default'}
                  tone={world.isDefault ? 'action' : 'default'}
                  onClick={() => onSetDefaultWorld(world.id!)}
                />
                <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => onDeleteWorld(world.id!)} />
              </div>
            </div>
          ))}
          <DashedCard icon={Plus} label="New World" onClick={onNewWorld} />
        </div>
      )}

      {tab === 'protagonists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {protagonistList.map((p) => (
            <div key={p.id} className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
              <h3 className="font-display font-bold text-base text-gold-primary">{p.name}</h3>
              <p className="font-narrative text-xs opacity-70">{p.className}</p>
              <div className="flex items-center justify-end gap-1 mt-2">
                <IconButton
                  icon={Star}
                  label={p.isDefault ? 'Default protagonist' : 'Set as default'}
                  tone={p.isDefault ? 'action' : 'default'}
                  onClick={() => onSetDefaultProtagonist(p.id!)}
                />
                <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => onDeleteProtagonist(p.id!)} />
              </div>
            </div>
          ))}
          <DashedCard icon={Plus} label="New Protagonist" onClick={onNewProtagonist} />
        </div>
      )}
    </div>
  )
}
