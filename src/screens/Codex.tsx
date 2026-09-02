import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft, ChevronRight, Globe, BookOpen, Users, ShieldCheck, Map, ScrollText, Target, Skull, Backpack,
} from 'lucide-react'
import type { BestiaryEntry, FactionEntry, LocationEntry, LogEntry, LoreEntry, NpcEntry, QuestEntry, WorldData } from '../types.ts'

export type CategoryId = 'realm' | 'chapters' | 'npcs' | 'factions' | 'locations' | 'lore' | 'quests' | 'bestiary' | 'items'

interface CodexProps {
  world: WorldData
  log: LogEntry[]
  npcs: Record<string, NpcEntry>
  factions: Record<string, FactionEntry>
  locations: Record<string, LocationEntry>
  lore: Record<string, LoreEntry>
  quests: Record<string, QuestEntry>
  bestiary: Record<string, BestiaryEntry>
  flags: string[]
  inventory: Record<string, number>
  initialCategory?: CategoryId | null
  initialEntryId?: string | null
  onBack: () => void
}

function AutoBadge({ shown }: { shown?: boolean }) {
  if (!shown) return null
  return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#e8ca8a]/15 text-[#e8ca8a]/80">auto</span>
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 font-display text-white/50">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-[#e8ca8a]" style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono w-8 text-right text-white/80">{value}</span>
    </div>
  )
}

function EntryCard({ title, subtitle, badge, onClick }: { title: string; subtitle?: string; badge?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 text-left flex flex-col gap-1 w-full border border-[#e8ca8a]/15 bg-[#141622]"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-sm text-[#e8ca8a]">{title}</h3>
        {badge}
      </div>
      {subtitle && <p className="font-narrative text-xs text-white/50 line-clamp-2">{subtitle}</p>}
    </button>
  )
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-display text-white/40 uppercase tracking-wide">{label}</p>
      <div className="font-narrative text-sm text-white/85">{value}</div>
    </div>
  )
}

function DetailPanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl p-5 flex flex-col gap-4 border border-[#e8ca8a]/15 bg-[#141622]">{children}</div>
}

// Blueprint §6.4D — Category List -> Entry Grid -> Entry Detail. Discovery
// masking (§5.12) isn't implemented — nothing here is actually hidden yet,
// since the grounding/seeding system it depends on doesn't exist.
export default function Codex({
  world,
  log,
  npcs,
  factions,
  locations,
  lore,
  quests,
  bestiary,
  flags,
  inventory,
  initialCategory,
  initialEntryId,
  onBack,
}: CodexProps) {
  const [category, setCategory] = useState<CategoryId | null>(initialCategory ?? null)
  const [entryId, setEntryId] = useState<string | null>(initialEntryId ?? null)

  const chapters = log.filter((e) => e.chapterSummary)

  // Ordered by how often a player actually opens each category during play —
  // quests/NPCs/items/locations/bestiary are live-reference lookups made mid-turn,
  // faction/lore are occasional check-ins, chapters/realm are read once and rarely revisited.
  const categories: { id: CategoryId; label: string; description: string; icon: LucideIcon; count: number }[] = [
    { id: 'quests', label: 'Quests', description: 'Active, completed & tracked objectives', icon: Target, count: Object.keys(quests).length },
    { id: 'npcs', label: 'NPCs', description: 'Companions, allies & trust ratings', icon: Users, count: Object.keys(npcs).length },
    { id: 'items', label: 'Items', description: 'Equipment, relics & carried goods', icon: Backpack, count: Object.keys(inventory).length },
    { id: 'locations', label: 'Locations', description: 'Regions, danger levels & standing', icon: Map, count: Object.keys(locations).length },
    { id: 'bestiary', label: 'Bestiary', description: 'Adversaries encountered in the field', icon: Skull, count: Object.keys(bestiary).length },
    { id: 'factions', label: 'Faction', description: 'Political groups, guilds & reputation', icon: ShieldCheck, count: Object.keys(factions).length },
    { id: 'lore', label: 'Lore', description: 'Legends, myths & discovered secrets', icon: ScrollText, count: Object.keys(lore).length },
    { id: 'chapters', label: 'Chapters', description: 'Chronological recap of the tale so far', icon: BookOpen, count: chapters.length },
    { id: 'realm', label: 'Realm', description: 'Cosmology, setting, tone & core conflict', icon: Globe, count: 1 },
  ]

  function back() {
    if (entryId) return setEntryId(null)
    if (category) return setCategory(null)
    onBack()
  }

  const title =
    entryId && category === 'npcs' ? npcs[entryId]?.name :
    entryId && category === 'factions' ? factions[entryId]?.name :
    entryId && category === 'locations' ? locations[entryId]?.name :
    entryId && category === 'lore' ? lore[entryId]?.name :
    entryId && category === 'quests' ? quests[entryId]?.name :
    entryId && category === 'bestiary' ? bestiary[entryId]?.name :
    categories.find((c) => c.id === category)?.label ?? 'Codex'

  return (
    <div className="min-h-screen text-white/90 px-4 py-6 pb-16" style={{ background: '#0b0d13' }}>
      <header className="flex items-center gap-3 mb-5">
        <button onClick={back} aria-label="Back" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#e8ca8a] hover:bg-white/10">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display font-bold text-xl text-[#e8ca8a]">{title}</h1>
      </header>

      {/* Level 1 — Category List */}
      {!category && (
        <div className="flex flex-col gap-3">
          {categories.map(({ id, label, description, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className="rounded-xl px-4 py-3 flex items-center gap-3 text-left border border-[#e8ca8a]/15 bg-[#141622] hover:border-[#e8ca8a]/50 transition-colors"
            >
              <span className="w-10 h-10 shrink-0 rounded-full bg-[#e8ca8a]/10 inline-flex items-center justify-center text-[#e8ca8a]">
                <Icon size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-sm text-white/95">{label}</span>
                <span className="block font-narrative text-xs text-white/45 truncate">{description}</span>
              </span>
              <span
                className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                  count > 0 ? 'bg-[#e8ca8a]/20 text-[#e8ca8a]' : 'bg-white/5 text-white/30'
                }`}
              >
                {count}
              </span>
              <ChevronRight size={16} className="text-[#e8ca8a]/60 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Realm — single record, no grid */}
      {category === 'realm' && (
        <DetailPanel>
          <DetailField label="World" value={world.name} />
          {world.genreTone && <DetailField label="Genre & Tone" value={world.genreTone} />}
          {world.conflict && <DetailField label="Core Regional Conflict" value={world.conflict} />}
          {world.background && <DetailField label="World Background" value={world.background} />}
          <DetailField label="Narration Style" value={<span className="text-xs text-white/70">{world.narrationStyle}</span>} />
          {flags.length > 0 && (
            <DetailField
              label="World Flags"
              value={
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {flags.map((f) => (
                    <span key={f} className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#e8ca8a]/15 text-[#e8ca8a]">
                      {f}
                    </span>
                  ))}
                </div>
              }
            />
          )}
        </DetailPanel>
      )}

      {/* Chapters — short enough that the grid IS the detail */}
      {category === 'chapters' && (
        <div className="flex flex-col gap-3">
          {chapters.length === 0 && <p className="font-narrative italic text-sm text-white/40">No chapters recorded yet.</p>}
          {chapters.map((c, i) => (
            <div key={i} className="rounded-2xl p-4 border border-[#e8ca8a]/15 bg-[#141622]">
              <h3 className="font-display font-bold text-sm text-[#e8ca8a] mb-1">Chapter {c.chapterNumber}</h3>
              <p className="font-narrative text-sm italic text-white/70">{c.chapterSummary}</p>
            </div>
          ))}
        </div>
      )}

      {/* NPCs */}
      {category === 'npcs' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(npcs).map(([id, n]) => (
            <EntryCard
              key={id}
              title={n.name}
              subtitle={`${n.stage} · Trust ${n.trust}`}
              badge={<AutoBadge shown={n.autoLogged} />}
              onClick={() => setEntryId(id)}
            />
          ))}
          {Object.keys(npcs).length === 0 && <p className="font-narrative italic text-sm text-white/40">No NPCs met yet.</p>}
        </div>
      )}
      {category === 'npcs' && entryId && npcs[entryId] && (
        <DetailPanel>
          <DetailField label="Stage" value={npcs[entryId].stage} />
          <StatBar label="Trust" value={npcs[entryId].trust} />
          <StatBar label="Affection" value={npcs[entryId].affection} />
          <DetailField label="Memory" value={npcs[entryId].memSummary || '—'} />
          {npcs[entryId].deeds.length > 0 && <DetailField label="Deeds" value={npcs[entryId].deeds.join(', ')} />}
        </DetailPanel>
      )}

      {/* Faction */}
      {category === 'factions' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(factions).map(([id, f]) => (
            <EntryCard key={id} title={f.name} subtitle={`Reputation ${f.repTier > 0 ? '+' : ''}${f.repTier}`} badge={<AutoBadge shown={f.autoLogged} />} onClick={() => setEntryId(id)} />
          ))}
          {Object.keys(factions).length === 0 && <p className="font-narrative italic text-sm text-white/40">No factions encountered yet.</p>}
        </div>
      )}
      {category === 'factions' && entryId && factions[entryId] && (
        <DetailPanel>
          <DetailField label="Reputation Tier" value={`${factions[entryId].repTier > 0 ? '+' : ''}${factions[entryId].repTier} (of -2 to +2)`} />
        </DetailPanel>
      )}

      {/* Locations */}
      {category === 'locations' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(locations).map(([id, l]) => (
            <EntryCard key={id} title={l.name} subtitle={`${l.region} · Danger: ${l.dangerLevel}`} badge={<AutoBadge shown={l.autoLogged} />} onClick={() => setEntryId(id)} />
          ))}
          {Object.keys(locations).length === 0 && <p className="font-narrative italic text-sm text-white/40">No locations visited yet.</p>}
        </div>
      )}
      {category === 'locations' && entryId && locations[entryId] && (
        <DetailPanel>
          <DetailField label="Region" value={locations[entryId].region} />
          <DetailField label="Danger Level" value={locations[entryId].dangerLevel} />
          <DetailField label="Standing" value={locations[entryId].standing} />
          {locations[entryId].factionOwner && <DetailField label="Faction Owner" value={locations[entryId].factionOwner!} />}
          <DetailField label="Description" value={locations[entryId].description} />
        </DetailPanel>
      )}

      {/* Lore */}
      {category === 'lore' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(lore).map(([id, l]) => (
            <EntryCard key={id} title={l.name} subtitle={l.category} badge={<AutoBadge shown={l.autoLogged} />} onClick={() => setEntryId(id)} />
          ))}
          {Object.keys(lore).length === 0 && <p className="font-narrative italic text-sm text-white/40">No lore uncovered yet.</p>}
        </div>
      )}
      {category === 'lore' && entryId && lore[entryId] && (
        <DetailPanel>
          <DetailField label="Category" value={lore[entryId].category} />
        </DetailPanel>
      )}

      {/* Quests */}
      {category === 'quests' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(quests).map(([id, q]) => (
            <EntryCard key={id} title={q.name} subtitle={q.status ?? 'active'} badge={<AutoBadge shown={q.autoLogged} />} onClick={() => setEntryId(id)} />
          ))}
          {Object.keys(quests).length === 0 && <p className="font-narrative italic text-sm text-white/40">No quests tracked yet.</p>}
        </div>
      )}
      {category === 'quests' && entryId && quests[entryId] && (
        <DetailPanel>
          <DetailField label="Status" value={quests[entryId].status ?? 'active'} />
          {quests[entryId].note && <DetailField label="Note" value={quests[entryId].note!} />}
        </DetailPanel>
      )}

      {/* Bestiary */}
      {category === 'bestiary' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(bestiary).map(([id, b]) => (
            <EntryCard key={id} title={b.name} subtitle={b.threatTier} badge={<AutoBadge shown={b.autoLogged} />} onClick={() => setEntryId(id)} />
          ))}
          {Object.keys(bestiary).length === 0 && <p className="font-narrative italic text-sm text-white/40">No adversaries encountered yet.</p>}
        </div>
      )}
      {category === 'bestiary' && entryId && bestiary[entryId] && (
        <DetailPanel>
          <DetailField label="Threat Tier" value={bestiary[entryId].threatTier} />
          {bestiary[entryId].hpMax !== undefined && <DetailField label="HP" value={String(bestiary[entryId].hpMax)} />}
          {bestiary[entryId].dmgBase !== undefined && <DetailField label="Base Damage" value={String(bestiary[entryId].dmgBase)} />}
        </DetailPanel>
      )}

      {/* Items — id + qty is the whole record, grid IS the detail */}
      {category === 'items' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(inventory).map(([id, qty]) => (
            <div key={id} className="rounded-2xl p-4 flex items-center justify-between border border-[#e8ca8a]/15 bg-[#141622]">
              <h3 className="font-display font-bold text-sm text-[#e8ca8a]">{id.replace(/_/g, ' ')}</h3>
              <span className="font-mono text-xs text-white/60">×{qty}</span>
            </div>
          ))}
          {Object.keys(inventory).length === 0 && <p className="font-narrative italic text-sm text-white/40">Nothing carried yet.</p>}
        </div>
      )}
    </div>
  )
}
