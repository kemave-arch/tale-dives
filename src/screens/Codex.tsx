import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft, ChevronRight, Globe, BookOpen, Users, ShieldCheck, Map, ScrollText, Target, Skull, Backpack,
  Pencil, Save, X, Trash2, Plus, Lock, User, Hammer, Clock,
} from 'lucide-react'
import { slugify } from '../lib/slug.ts'
import { isHidden } from '../lib/discovery.ts'
import { PRESET_CLASSES } from '../data/classes.ts'
import { RECIPES } from '../data/recipes.ts'
import { canAffordRecipe } from '../lib/crafting.ts'
import { hoursRemaining } from '../lib/gameTime.ts'
import type { BestiaryEntry, CraftingJob, Discovery, FactionEntry, LocationEntry, LogEntry, LoreEntry, NpcEntry, Player, QuestEntry, RevealTrigger, WorldData } from '../types.ts'

export type CategoryId = 'realm' | 'character' | 'crafting' | 'chapters' | 'npcs' | 'factions' | 'locations' | 'lore' | 'quests' | 'bestiary' | 'items'

interface CodexProps {
  world: WorldData
  player: Player
  log: LogEntry[]
  npcs: Record<string, NpcEntry>
  factions: Record<string, FactionEntry>
  locations: Record<string, LocationEntry>
  lore: Record<string, LoreEntry>
  quests: Record<string, QuestEntry>
  bestiary: Record<string, BestiaryEntry>
  flags: string[]
  inventory: Record<string, number>
  crafting: CraftingJob[]
  onUpdateNpc: (id: string, patch: Partial<NpcEntry> | null) => void
  onUpdateFaction: (id: string, patch: Partial<FactionEntry> | null) => void
  onUpdateLocation: (id: string, patch: Partial<LocationEntry> | null) => void
  onUpdateLore: (id: string, patch: Partial<LoreEntry> | null) => void
  onUpdateQuest: (id: string, patch: Partial<QuestEntry> | null) => void
  onUpdateBestiary: (id: string, patch: Partial<BestiaryEntry> | null) => void
  onUpdateItem: (id: string, qty: number | null) => void
  onUpdateWorld: (patch: Partial<WorldData>) => void
  onEvolveClass: (classId: string) => void
  onStartCraft: (recipeId: string) => void
  initialCategory?: CategoryId | null
  initialEntryId?: string | null
  onBack: () => void
}

// §9 Codex CRUD — a new, not-yet-saved entry lives under this sentinel id
// until Save assigns it a real slug.
const NEW_ID = '__new__'

// §5.12 — "A condition that can't be validated fails open to state: 'known'
// rather than shipping an entry the player can never unlock." Only checks
// triggers with a real dict to check against; `flag` conditions are freeform
// strings the model may not have produced yet, so those are trusted as-is.
function validateDiscovery(
  discovery: Discovery | undefined,
  dicts: { locations: Record<string, unknown>; npcs: Record<string, unknown>; quests: Record<string, unknown> },
): Discovery | undefined {
  if (!discovery || discovery.state !== 'hidden' || !discovery.revealCondition) return discovery
  const dict =
    discovery.revealTrigger === 'location_visit' ? dicts.locations :
    discovery.revealTrigger === 'npc_met' ? dicts.npcs :
    discovery.revealTrigger === 'quest_complete' ? dicts.quests :
    null
  if (!dict || dict[discovery.revealCondition]) return discovery
  return { ...discovery, state: 'known' }
}

function genId(name: string, existing: Record<string, unknown>): string {
  const base = slugify(name) || 'entry'
  if (!existing[base]) return base
  let i = 2
  while (existing[`${base}_${i}`]) i++
  return `${base}_${i}`
}

function AutoBadge({ shown }: { shown?: boolean }) {
  if (!shown) return null
  return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#e8ca8a]/15 text-[#e8ca8a]/80">auto</span>
}

// §5.12 Codex Discovery — a masked card badge; the entry grid otherwise shows AutoBadge.
function LockBadge() {
  return (
    <span className="text-[#e8ca8a]/50 shrink-0">
      <Lock size={13} />
    </span>
  )
}

// §5.12 — masked read view for a hidden entry outside CRUD Edit Mode. No field
// beyond the teaser is exposed here; the full record only ever shows up top
// once `discovery.state` is flipped to `known` (by a matching reveal check, or
// hand-edited back to Known in the CRUD form below).
function MaskedDetail({ teaser }: { teaser?: string }) {
  return (
    <DetailPanel>
      <p className="font-narrative text-sm text-white/50 flex items-center gap-1.5">
        <Lock size={13} /> ??? — Not yet discovered
      </p>
      {teaser && <p className="font-narrative text-xs italic text-white/40">{teaser}</p>}
    </DetailPanel>
  )
}

// §5.12 Codex Discovery CRUD — hand-author or fix reveal logic for any entry,
// exactly like any other Codex field (the "steer state directly" philosophy
// already established for auto-logged entries, §5.10).
function DiscoveryEditor({ discovery, onChange }: { discovery: Discovery | undefined; onChange: (d: Discovery | undefined) => void }) {
  const hidden = discovery?.state === 'hidden'
  return (
    <div className="rounded-lg border border-[#e8ca8a]/15 p-3 flex flex-col gap-2.5">
      <span className="text-[11px] font-display text-white/40 uppercase tracking-wide flex items-center gap-1">
        <Lock size={11} /> Discovery (Fog of Lore)
      </span>
      <label className="flex items-center gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { state: 'hidden', revealTrigger: discovery?.revealTrigger ?? 'manual', revealCondition: discovery?.revealCondition ?? '', teaser: discovery?.teaser ?? '' }
                : undefined,
            )
          }
          className="accent-[#e8ca8a]"
        />
        Hidden until discovered
      </label>
      {hidden && (
        <>
          <label className="block">
            <span className="text-[11px] font-display text-white/40 uppercase tracking-wide">Reveal Trigger</span>
            <select
              value={discovery?.revealTrigger ?? 'manual'}
              onChange={(e) => onChange({ ...discovery!, state: 'hidden', revealTrigger: e.target.value as RevealTrigger })}
              className="mt-1 w-full rounded-lg border border-[#e8ca8a]/25 bg-[#0f111a] px-3 py-2 font-mono text-xs text-white/90"
            >
              <option value="manual">Manual (CRUD only)</option>
              <option value="flag">World Flag</option>
              <option value="location_visit">Visit Location (id)</option>
              <option value="npc_met">Meet NPC (id)</option>
              <option value="quest_complete">Complete Quest (id)</option>
            </select>
          </label>
          {discovery?.revealTrigger !== 'manual' && (
            <TextField
              label="Reveal Condition"
              value={discovery?.revealCondition ?? ''}
              onChange={(v) => onChange({ ...discovery!, state: 'hidden', revealCondition: v })}
              placeholder="flag text, loc_id, npc_id, or quest_id"
            />
          )}
          <TextField
            label="Teaser"
            value={discovery?.teaser ?? ''}
            onChange={(v) => onChange({ ...discovery!, state: 'hidden', teaser: v })}
            placeholder="A name spoken with unease…"
          />
        </>
      )}
    </div>
  )
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

function TextField({
  label, value, onChange, textarea, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  textarea?: boolean
  placeholder?: string
}) {
  const cls = 'mt-1 w-full rounded-lg border border-[#e8ca8a]/25 bg-[#0f111a] px-3 py-2 font-narrative text-sm text-white/90 placeholder:text-white/25'
  return (
    <label className="block">
      <span className="text-[11px] font-display text-white/40 uppercase tracking-wide">{label}</span>
      {textarea ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-display text-white/40 uppercase tracking-wide">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-[#e8ca8a]/25 bg-[#0f111a] px-3 py-2 font-mono text-sm text-white/90"
      />
    </label>
  )
}

// §9 CRUD toolbar — swaps between "view" (Edit/Delete) and "edit" (Save/Cancel)
// affordances, shown next to the header title on any editable detail view.
function CrudToolbar({
  editing, canDelete, onEdit, onSave, onCancel, onDelete,
}: {
  editing: boolean
  canDelete: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={onCancel} aria-label="Cancel" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-white/50 hover:bg-white/10">
          <X size={17} />
        </button>
        <button onClick={onSave} aria-label="Save" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#0e1017] bg-[#e8ca8a]">
          <Save size={16} />
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 ml-auto">
      <button onClick={onEdit} aria-label="Edit" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#e8ca8a] hover:bg-white/10">
        <Pencil size={16} />
      </button>
      {canDelete && (
        <button onClick={onDelete} aria-label="Delete" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-rose-400 hover:bg-white/10">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-2.5 flex items-center justify-center gap-1.5 border border-dashed border-[#e8ca8a]/30 text-[#e8ca8a]/80 font-display text-xs hover:border-[#e8ca8a]/60 hover:text-[#e8ca8a]"
    >
      <Plus size={14} /> {label}
    </button>
  )
}

// Blueprint §6.4D — Category List -> Entry Grid -> Entry Detail. Discovery
// masking (§5.12) is implemented (see isHidden/MaskedDetail/DiscoveryEditor
// above) — an entry only ever becomes hidden via hand-authored CRUD, though,
// since there is still no seeding/grounding call that pre-populates masked
// lore on its own.
//
// §9 Codex CRUD — every category except Chapters (a generated recap) and
// Realm's identity fields (narration style stays owned by Settings) supports
// hand-authored add/edit/delete. `entryId === NEW_ID` is an unsaved draft.
export default function Codex({
  world,
  player,
  log,
  npcs,
  factions,
  locations,
  lore,
  quests,
  bestiary,
  flags,
  inventory,
  crafting,
  onUpdateNpc,
  onUpdateFaction,
  onUpdateLocation,
  onUpdateLore,
  onUpdateQuest,
  onUpdateBestiary,
  onUpdateItem,
  onUpdateWorld,
  onEvolveClass,
  onStartCraft,
  initialCategory,
  initialEntryId,
  onBack,
}: CodexProps) {
  const [category, setCategory] = useState<CategoryId | null>(initialCategory ?? null)
  const [entryId, setEntryId] = useState<string | null>(initialEntryId ?? null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, any>>({})
  const [addingItem, setAddingItem] = useState(false)
  const [itemDraft, setItemDraft] = useState({ name: '', qty: '1' })

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
    { id: 'character', label: 'Character', description: 'Attributes, class & derived pools', icon: User, count: 1 },
    { id: 'crafting', label: 'Workbenches & Recipes', description: 'Craft items from held materials', icon: Hammer, count: crafting.length },
    { id: 'realm', label: 'Realm', description: 'Cosmology, setting, tone & core conflict', icon: Globe, count: 1 },
  ]

  function back() {
    if (editing) return cancelEdit()
    if (entryId) return setEntryId(null)
    if (category) return setCategory(null)
    onBack()
  }

  function cancelEdit() {
    setEditing(false)
    setDraft({})
    if (entryId === NEW_ID) setEntryId(null)
  }

  function startCreate(defaults: Record<string, any>) {
    setEntryId(NEW_ID)
    setDraft(defaults)
    setEditing(true)
  }

  function startEdit(id: string, entry: Record<string, any>) {
    setEntryId(id)
    setDraft({ ...entry })
    setEditing(true)
  }

  function saveNpc() {
    const id = entryId === NEW_ID ? genId(draft.name, npcs) : entryId!
    onUpdateNpc(id, {
      name: draft.name,
      stage: draft.stage,
      trust: draft.trust,
      affection: draft.affection,
      memSummary: draft.memSummary,
      deeds: typeof draft.deeds === 'string' ? draft.deeds.split(',').map((s: string) => s.trim()).filter(Boolean) : draft.deeds,
      discovery: validateDiscovery(draft.discovery, { locations, npcs, quests }),
    })
    setEntryId(id)
    setEditing(false)
  }

  function saveFaction() {
    const id = entryId === NEW_ID ? genId(draft.name, factions) : entryId!
    onUpdateFaction(id, { name: draft.name, repTier: draft.repTier, discovery: validateDiscovery(draft.discovery, { locations, npcs, quests }) })
    setEntryId(id)
    setEditing(false)
  }

  function saveLocation() {
    const id = entryId === NEW_ID ? genId(draft.name, locations) : entryId!
    onUpdateLocation(id, {
      name: draft.name,
      region: draft.region,
      description: draft.description,
      dangerLevel: draft.dangerLevel,
      factionOwner: draft.factionOwner || null,
      standing: draft.standing,
      discovery: validateDiscovery(draft.discovery, { locations, npcs, quests }),
    })
    setEntryId(id)
    setEditing(false)
  }

  function saveLore() {
    const id = entryId === NEW_ID ? genId(draft.name, lore) : entryId!
    onUpdateLore(id, { name: draft.name, category: draft.category, discovery: validateDiscovery(draft.discovery, { locations, npcs, quests }) })
    setEntryId(id)
    setEditing(false)
  }

  function saveQuest() {
    const id = entryId === NEW_ID ? genId(draft.name, quests) : entryId!
    onUpdateQuest(id, { name: draft.name, status: draft.status || undefined, note: draft.note, discovery: validateDiscovery(draft.discovery, { locations, npcs, quests }) })
    setEntryId(id)
    setEditing(false)
  }

  function saveBestiary() {
    const id = entryId === NEW_ID ? genId(draft.name, bestiary) : entryId!
    onUpdateBestiary(id, {
      name: draft.name,
      threatTier: draft.threatTier,
      hpMax: draft.hpMax === '' || draft.hpMax === undefined ? undefined : Number(draft.hpMax),
      dmgBase: draft.dmgBase === '' || draft.dmgBase === undefined ? undefined : Number(draft.dmgBase),
      discovery: validateDiscovery(draft.discovery, { locations, npcs, quests }),
    })
    setEntryId(id)
    setEditing(false)
  }

  function saveWorld() {
    onUpdateWorld({ name: draft.name, genreTone: draft.genreTone, conflict: draft.conflict, background: draft.background })
    setEditing(false)
  }

  function deleteEntry(kind: Exclude<CategoryId, 'chapters' | 'realm' | 'items'>) {
    if (!entryId || !window.confirm('Delete this entry? This cannot be undone.')) return
    if (kind === 'npcs') onUpdateNpc(entryId, null)
    else if (kind === 'factions') onUpdateFaction(entryId, null)
    else if (kind === 'locations') onUpdateLocation(entryId, null)
    else if (kind === 'lore') onUpdateLore(entryId, null)
    else if (kind === 'quests') onUpdateQuest(entryId, null)
    else if (kind === 'bestiary') onUpdateBestiary(entryId, null)
    setEntryId(null)
  }

  function saveNewItem() {
    const name = itemDraft.name.trim()
    const qty = Math.max(1, Math.round(Number(itemDraft.qty) || 1))
    if (!name) return
    onUpdateItem(genId(name, inventory), qty)
    setItemDraft({ name: '', qty: '1' })
    setAddingItem(false)
  }

  // §5.12 — a hidden entry's own title bar reads "???" too, not just its card/detail.
  const title =
    editing ? (entryId === NEW_ID ? 'New Entry' : 'Edit Entry') :
    entryId && category === 'npcs' ? (npcs[entryId] && isHidden(npcs[entryId]) ? '???' : npcs[entryId]?.name) :
    entryId && category === 'factions' ? (factions[entryId] && isHidden(factions[entryId]) ? '???' : factions[entryId]?.name) :
    entryId && category === 'locations' ? (locations[entryId] && isHidden(locations[entryId]) ? '???' : locations[entryId]?.name) :
    entryId && category === 'lore' ? (lore[entryId] && isHidden(lore[entryId]) ? '???' : lore[entryId]?.name) :
    entryId && category === 'quests' ? (quests[entryId] && isHidden(quests[entryId]) ? '???' : quests[entryId]?.name) :
    entryId && category === 'bestiary' ? (bestiary[entryId] && isHidden(bestiary[entryId]) ? '???' : bestiary[entryId]?.name) :
    categories.find((c) => c.id === category)?.label ?? 'Codex'

  return (
    <div className="min-h-screen text-white/90 px-4 py-6 pb-16" style={{ background: '#0b0d13' }}>
      <header className="flex items-center gap-3 mb-5">
        <button onClick={back} aria-label="Back" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#e8ca8a] hover:bg-white/10">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display font-bold text-xl text-[#e8ca8a] truncate">{title}</h1>
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

      {/* Character — single record, no grid. The only editable field is Class:
          §5.1b Class Evolution's manual/CRUD trigger path, same "steer state
          directly" philosophy as auto-logged entries and Discovery reveals. */}
      {category === 'character' && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar
              editing={editing}
              canDelete={false}
              onEdit={() => startEdit('__character__', { classId: player.classId })}
              onSave={() => {
                if (draft.classId && draft.classId !== player.classId) {
                  const target = PRESET_CLASSES.find((c) => c.id === draft.classId)
                  if (target && window.confirm(`Evolve into ${target.name}? Attribute points already earned keep their history — only points earned from here forward follow the new class.`)) {
                    onEvolveClass(draft.classId)
                  }
                }
                setEditing(false)
                setDraft({})
              }}
              onCancel={cancelEdit}
              onDelete={() => {}}
            />
          </div>
          {editing ? (
            <DetailPanel>
              <label className="block">
                <span className="text-[11px] font-display text-white/40 uppercase tracking-wide">Class</span>
                <select
                  value={draft.classId ?? player.classId}
                  onChange={(e) => setDraft((d) => ({ ...d, classId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#e8ca8a]/25 bg-[#0f111a] px-3 py-2 font-mono text-sm text-white/90"
                >
                  {PRESET_CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <p className="font-narrative text-xs italic text-white/40">
                §5.1b Class Evolution — the class slot is replaced outright, no blending. Attribute
                points already earned are never recalculated; only points earned from here forward
                follow the new class's growth.
              </p>
            </DetailPanel>
          ) : (
            <DetailPanel>
              <DetailField label="Class" value={player.className} />
              <DetailField label="Level" value={String(player.level)} />
              <DetailField label="Attributes" value={`STR ${player.attrs.STR} · INT ${player.attrs.INT} · AGI ${player.attrs.AGI}`} />
              <DetailField label="Pools" value={`HP ${player.hpMax} · MP ${player.mpMax} · ST ${player.stMax}`} />
            </DetailPanel>
          )}
        </>
      )}

      {/* Workbenches & Recipes — §5.8 Crafting, its own category (v1.7) rather
          than an eighth Relics & Vault filter. Station requirements are shown
          as flavor text only — there's no location-station-type data model
          yet, so any recipe can currently be queued from wherever the player
          is standing (see the scope note in lib/crafting.ts). */}
      {category === 'crafting' && (
        <div className="flex flex-col gap-4">
          {crafting.length > 0 && (
            <div>
              <p className="text-[11px] font-display text-white/40 uppercase tracking-wide mb-1.5">In Progress</p>
              <div className="flex flex-col gap-2">
                {crafting.map((job) => {
                  const recipe = RECIPES.find((r) => r.id === job.recipeId)
                  const remaining = hoursRemaining(player.time, job.completeTime)
                  return (
                    <div key={job.jobId} className="rounded-xl border border-[#e8ca8a]/15 bg-[#141622] px-3 py-2.5 flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-sm text-[#e8ca8a]">{recipe?.name ?? job.recipeId}</span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-white/60">
                        <Clock size={12} /> {remaining > 0 ? `${remaining}h remaining` : 'Ready'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-display text-white/40 uppercase tracking-wide mb-1.5">Recipes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RECIPES.map((recipe) => {
                const affordable = canAffordRecipe(inventory, recipe)
                return (
                  <div key={recipe.id} className="rounded-2xl p-4 flex flex-col gap-2 border border-[#e8ca8a]/15 bg-[#141622]">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-sm text-[#e8ca8a]">{recipe.name}</h3>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-white/40">
                        <Clock size={11} /> {recipe.craftHours}h
                      </span>
                    </div>
                    {recipe.stationRequired && <p className="font-narrative text-[11px] text-white/40">Station: {recipe.stationRequired}</p>}
                    <p className="font-narrative text-xs text-white/60">
                      {recipe.ingredients.map((i) => `${i.qty}x ${i.id.replace(/_/g, ' ')} (${inventory[i.id] ?? 0} held)`).join(', ')}
                    </p>
                    <button
                      onClick={() => onStartCraft(recipe.id)}
                      disabled={!affordable}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#e8ca8a] px-4 py-1.5 font-display text-xs font-semibold text-[#0e1017] disabled:opacity-30"
                    >
                      <Hammer size={13} /> Craft
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Realm — single record, no grid; identity fields editable, narration style stays owned by Settings */}
      {category === 'realm' && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar
              editing={editing}
              canDelete={false}
              onEdit={() => startEdit('__world__', { name: world.name, genreTone: world.genreTone, conflict: world.conflict, background: world.background })}
              onSave={saveWorld}
              onCancel={cancelEdit}
              onDelete={() => {}}
            />
          </div>
          {editing ? (
            <DetailPanel>
              <TextField label="World Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              <TextField label="Genre & Tone" value={draft.genreTone ?? ''} onChange={(v) => setDraft((d) => ({ ...d, genreTone: v }))} textarea />
              <TextField label="Core Regional Conflict" value={draft.conflict ?? ''} onChange={(v) => setDraft((d) => ({ ...d, conflict: v }))} textarea />
              <TextField label="World Background" value={draft.background ?? ''} onChange={(v) => setDraft((d) => ({ ...d, background: v }))} textarea />
            </DetailPanel>
          ) : (
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
        </>
      )}

      {/* Chapters — generated recap, read-only, no CRUD */}
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
          <AddButton label="Add NPC" onClick={() => startCreate({ name: '', stage: 'Stranger', trust: 0, affection: 0, memSummary: '', deeds: '' })} />
          {Object.entries(npcs).map(([id, n]) => (
            <EntryCard
              key={id}
              title={isHidden(n) ? '???' : n.name}
              subtitle={isHidden(n) ? (n.discovery?.teaser || 'Not yet discovered.') : `${n.stage} · Trust ${n.trust}`}
              badge={isHidden(n) ? <LockBadge /> : <AutoBadge shown={n.autoLogged} />}
              onClick={() => setEntryId(id)}
            />
          ))}
          {Object.keys(npcs).length === 0 && <p className="font-narrative italic text-sm text-white/40 col-span-full">No NPCs met yet.</p>}
        </div>
      )}
      {category === 'npcs' && entryId && (editing || npcs[entryId]) && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar editing={editing} canDelete={entryId !== NEW_ID} onEdit={() => startEdit(entryId, npcs[entryId])} onSave={saveNpc} onCancel={cancelEdit} onDelete={() => deleteEntry('npcs')} />
          </div>
          {editing ? (
            <DetailPanel>
              <TextField label="Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              <TextField label="Stage" value={draft.stage ?? ''} onChange={(v) => setDraft((d) => ({ ...d, stage: v }))} placeholder="Stranger, Acquaintance, Friend…" />
              <NumberField label="Trust" value={draft.trust ?? 0} onChange={(v) => setDraft((d) => ({ ...d, trust: v }))} />
              <NumberField label="Affection" value={draft.affection ?? 0} onChange={(v) => setDraft((d) => ({ ...d, affection: v }))} />
              <TextField label="Memory" value={draft.memSummary ?? ''} onChange={(v) => setDraft((d) => ({ ...d, memSummary: v }))} textarea />
              <TextField
                label="Deeds (comma-separated)"
                value={Array.isArray(draft.deeds) ? draft.deeds.join(', ') : (draft.deeds ?? '')}
                onChange={(v) => setDraft((d) => ({ ...d, deeds: v }))}
              />
              <DiscoveryEditor discovery={draft.discovery} onChange={(disc) => setDraft((d) => ({ ...d, discovery: disc }))} />
            </DetailPanel>
          ) : isHidden(npcs[entryId]) ? (
            <MaskedDetail teaser={npcs[entryId].discovery?.teaser} />
          ) : (
            <DetailPanel>
              <DetailField label="Stage" value={npcs[entryId].stage} />
              <StatBar label="Trust" value={npcs[entryId].trust} />
              <StatBar label="Affection" value={npcs[entryId].affection} />
              <DetailField label="Memory" value={npcs[entryId].memSummary || '—'} />
              {npcs[entryId].deeds.length > 0 && <DetailField label="Deeds" value={npcs[entryId].deeds.join(', ')} />}
            </DetailPanel>
          )}
        </>
      )}

      {/* Faction */}
      {category === 'factions' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AddButton label="Add Faction" onClick={() => startCreate({ name: '', repTier: 0 })} />
          {Object.entries(factions).map(([id, f]) => (
            <EntryCard
              key={id}
              title={isHidden(f) ? '???' : f.name}
              subtitle={isHidden(f) ? (f.discovery?.teaser || 'Not yet discovered.') : `Reputation ${f.repTier > 0 ? '+' : ''}${f.repTier}`}
              badge={isHidden(f) ? <LockBadge /> : <AutoBadge shown={f.autoLogged} />}
              onClick={() => setEntryId(id)}
            />
          ))}
          {Object.keys(factions).length === 0 && <p className="font-narrative italic text-sm text-white/40 col-span-full">No factions encountered yet.</p>}
        </div>
      )}
      {category === 'factions' && entryId && (editing || factions[entryId]) && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar editing={editing} canDelete={entryId !== NEW_ID} onEdit={() => startEdit(entryId, factions[entryId])} onSave={saveFaction} onCancel={cancelEdit} onDelete={() => deleteEntry('factions')} />
          </div>
          {editing ? (
            <DetailPanel>
              <TextField label="Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              <NumberField label="Reputation Tier (-2 to 2)" value={draft.repTier ?? 0} onChange={(v) => setDraft((d) => ({ ...d, repTier: v }))} />
              <DiscoveryEditor discovery={draft.discovery} onChange={(disc) => setDraft((d) => ({ ...d, discovery: disc }))} />
            </DetailPanel>
          ) : isHidden(factions[entryId]) ? (
            <MaskedDetail teaser={factions[entryId].discovery?.teaser} />
          ) : (
            <DetailPanel>
              <DetailField label="Reputation Tier" value={`${factions[entryId].repTier > 0 ? '+' : ''}${factions[entryId].repTier} (of -2 to +2)`} />
            </DetailPanel>
          )}
        </>
      )}

      {/* Locations */}
      {category === 'locations' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AddButton label="Add Location" onClick={() => startCreate({ name: '', region: '', description: '', dangerLevel: '', factionOwner: '', standing: '' })} />
          {Object.entries(locations).map(([id, l]) => (
            <EntryCard
              key={id}
              title={isHidden(l) ? '???' : l.name}
              subtitle={isHidden(l) ? (l.discovery?.teaser || 'Not yet discovered.') : `${l.region} · Danger: ${l.dangerLevel}`}
              badge={isHidden(l) ? <LockBadge /> : <AutoBadge shown={l.autoLogged} />}
              onClick={() => setEntryId(id)}
            />
          ))}
          {Object.keys(locations).length === 0 && <p className="font-narrative italic text-sm text-white/40 col-span-full">No locations visited yet.</p>}
        </div>
      )}
      {category === 'locations' && entryId && (editing || locations[entryId]) && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar editing={editing} canDelete={entryId !== NEW_ID} onEdit={() => startEdit(entryId, { ...locations[entryId], factionOwner: locations[entryId].factionOwner ?? '' })} onSave={saveLocation} onCancel={cancelEdit} onDelete={() => deleteEntry('locations')} />
          </div>
          {editing ? (
            <DetailPanel>
              <TextField label="Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              <TextField label="Region" value={draft.region ?? ''} onChange={(v) => setDraft((d) => ({ ...d, region: v }))} />
              <TextField label="Danger Level" value={draft.dangerLevel ?? ''} onChange={(v) => setDraft((d) => ({ ...d, dangerLevel: v }))} />
              <TextField label="Standing" value={draft.standing ?? ''} onChange={(v) => setDraft((d) => ({ ...d, standing: v }))} />
              <TextField label="Faction Owner" value={draft.factionOwner ?? ''} onChange={(v) => setDraft((d) => ({ ...d, factionOwner: v }))} placeholder="none" />
              <TextField label="Description" value={draft.description ?? ''} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} textarea />
              <DiscoveryEditor discovery={draft.discovery} onChange={(disc) => setDraft((d) => ({ ...d, discovery: disc }))} />
            </DetailPanel>
          ) : isHidden(locations[entryId]) ? (
            <MaskedDetail teaser={locations[entryId].discovery?.teaser} />
          ) : (
            <DetailPanel>
              <DetailField label="Region" value={locations[entryId].region} />
              <DetailField label="Danger Level" value={locations[entryId].dangerLevel} />
              <DetailField label="Standing" value={locations[entryId].standing} />
              {locations[entryId].factionOwner && <DetailField label="Faction Owner" value={locations[entryId].factionOwner!} />}
              <DetailField label="Description" value={locations[entryId].description} />
            </DetailPanel>
          )}
        </>
      )}

      {/* Lore */}
      {category === 'lore' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AddButton label="Add Lore" onClick={() => startCreate({ name: '', category: '' })} />
          {Object.entries(lore).map(([id, l]) => (
            <EntryCard
              key={id}
              title={isHidden(l) ? '???' : l.name}
              subtitle={isHidden(l) ? (l.discovery?.teaser || 'Not yet discovered.') : l.category}
              badge={isHidden(l) ? <LockBadge /> : <AutoBadge shown={l.autoLogged} />}
              onClick={() => setEntryId(id)}
            />
          ))}
          {Object.keys(lore).length === 0 && <p className="font-narrative italic text-sm text-white/40 col-span-full">No lore uncovered yet.</p>}
        </div>
      )}
      {category === 'lore' && entryId && (editing || lore[entryId]) && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar editing={editing} canDelete={entryId !== NEW_ID} onEdit={() => startEdit(entryId, lore[entryId])} onSave={saveLore} onCancel={cancelEdit} onDelete={() => deleteEntry('lore')} />
          </div>
          {editing ? (
            <DetailPanel>
              <TextField label="Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              <TextField label="Category" value={draft.category ?? ''} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} placeholder="Cosmology, Magic, History…" />
              <DiscoveryEditor discovery={draft.discovery} onChange={(disc) => setDraft((d) => ({ ...d, discovery: disc }))} />
            </DetailPanel>
          ) : isHidden(lore[entryId]) ? (
            <MaskedDetail teaser={lore[entryId].discovery?.teaser} />
          ) : (
            <DetailPanel>
              <DetailField label="Category" value={lore[entryId].category} />
            </DetailPanel>
          )}
        </>
      )}

      {/* Quests */}
      {category === 'quests' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AddButton label="Add Quest" onClick={() => startCreate({ name: '', status: '', note: '' })} />
          {Object.entries(quests).map(([id, q]) => (
            <EntryCard
              key={id}
              title={isHidden(q) ? '???' : q.name}
              subtitle={isHidden(q) ? (q.discovery?.teaser || 'Not yet discovered.') : (q.status ?? 'active')}
              badge={isHidden(q) ? <LockBadge /> : <AutoBadge shown={q.autoLogged} />}
              onClick={() => setEntryId(id)}
            />
          ))}
          {Object.keys(quests).length === 0 && <p className="font-narrative italic text-sm text-white/40 col-span-full">No quests tracked yet.</p>}
        </div>
      )}
      {category === 'quests' && entryId && (editing || quests[entryId]) && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar editing={editing} canDelete={entryId !== NEW_ID} onEdit={() => startEdit(entryId, { ...quests[entryId], status: quests[entryId].status ?? '' })} onSave={saveQuest} onCancel={cancelEdit} onDelete={() => deleteEntry('quests')} />
          </div>
          {editing ? (
            <DetailPanel>
              <TextField label="Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              <TextField label="Status" value={draft.status ?? ''} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} placeholder="advanced, completed, failed" />
              <TextField label="Note" value={draft.note ?? ''} onChange={(v) => setDraft((d) => ({ ...d, note: v }))} textarea />
              <DiscoveryEditor discovery={draft.discovery} onChange={(disc) => setDraft((d) => ({ ...d, discovery: disc }))} />
            </DetailPanel>
          ) : isHidden(quests[entryId]) ? (
            <MaskedDetail teaser={quests[entryId].discovery?.teaser} />
          ) : (
            <DetailPanel>
              <DetailField label="Status" value={quests[entryId].status ?? 'active'} />
              {quests[entryId].note && <DetailField label="Note" value={quests[entryId].note!} />}
            </DetailPanel>
          )}
        </>
      )}

      {/* Bestiary */}
      {category === 'bestiary' && !entryId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AddButton label="Add Adversary" onClick={() => startCreate({ name: '', threatTier: '', hpMax: '', dmgBase: '' })} />
          {Object.entries(bestiary).map(([id, b]) => (
            <EntryCard
              key={id}
              title={isHidden(b) ? '???' : b.name}
              subtitle={isHidden(b) ? (b.discovery?.teaser || 'Not yet discovered.') : b.threatTier}
              badge={isHidden(b) ? <LockBadge /> : <AutoBadge shown={b.autoLogged} />}
              onClick={() => setEntryId(id)}
            />
          ))}
          {Object.keys(bestiary).length === 0 && <p className="font-narrative italic text-sm text-white/40 col-span-full">No adversaries encountered yet.</p>}
        </div>
      )}
      {category === 'bestiary' && entryId && (editing || bestiary[entryId]) && (
        <>
          <div className="flex justify-end mb-3">
            <CrudToolbar
              editing={editing}
              canDelete={entryId !== NEW_ID}
              onEdit={() => startEdit(entryId, { ...bestiary[entryId], hpMax: bestiary[entryId].hpMax ?? '', dmgBase: bestiary[entryId].dmgBase ?? '' })}
              onSave={saveBestiary}
              onCancel={cancelEdit}
              onDelete={() => deleteEntry('bestiary')}
            />
          </div>
          {editing ? (
            <DetailPanel>
              <TextField label="Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              <TextField label="Threat Tier" value={draft.threatTier ?? ''} onChange={(v) => setDraft((d) => ({ ...d, threatTier: v }))} />
              <NumberField label="HP" value={draft.hpMax === '' ? 0 : (draft.hpMax ?? 0)} onChange={(v) => setDraft((d) => ({ ...d, hpMax: v }))} />
              <NumberField label="Base Damage" value={draft.dmgBase === '' ? 0 : (draft.dmgBase ?? 0)} onChange={(v) => setDraft((d) => ({ ...d, dmgBase: v }))} />
              <DiscoveryEditor discovery={draft.discovery} onChange={(disc) => setDraft((d) => ({ ...d, discovery: disc }))} />
            </DetailPanel>
          ) : isHidden(bestiary[entryId]) ? (
            <MaskedDetail teaser={bestiary[entryId].discovery?.teaser} />
          ) : (
            <DetailPanel>
              <DetailField label="Threat Tier" value={bestiary[entryId].threatTier} />
              {bestiary[entryId].hpMax !== undefined && <DetailField label="HP" value={String(bestiary[entryId].hpMax)} />}
              {bestiary[entryId].dmgBase !== undefined && <DetailField label="Base Damage" value={String(bestiary[entryId].dmgBase)} />}
            </DetailPanel>
          )}
        </>
      )}

      {/* Items — id + qty is the whole record; inline edit/delete, no separate detail page */}
      {category === 'items' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!addingItem && <AddButton label="Add Item" onClick={() => setAddingItem(true)} />}
          {addingItem && (
            <div className="rounded-2xl p-4 border border-[#e8ca8a]/25 bg-[#141622] flex flex-col gap-2">
              <TextField label="Name" value={itemDraft.name} onChange={(v) => setItemDraft((d) => ({ ...d, name: v }))} />
              <NumberField label="Quantity" value={Number(itemDraft.qty) || 1} onChange={(v) => setItemDraft((d) => ({ ...d, qty: String(v) }))} />
              <div className="flex justify-end gap-1 mt-1">
                <button onClick={() => setAddingItem(false)} aria-label="Cancel" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white/50 hover:bg-white/10">
                  <X size={15} />
                </button>
                <button onClick={saveNewItem} aria-label="Save" className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#0e1017] bg-[#e8ca8a]">
                  <Save size={14} />
                </button>
              </div>
            </div>
          )}
          {Object.entries(inventory).map(([id, qty]) => (
            <div key={id} className="rounded-2xl p-4 flex items-center justify-between gap-2 border border-[#e8ca8a]/15 bg-[#141622]">
              <h3 className="font-display font-bold text-sm text-[#e8ca8a] truncate">{id.replace(/_/g, ' ')}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  value={qty}
                  min={1}
                  onChange={(e) => onUpdateItem(id, Number(e.target.value))}
                  className="w-14 rounded-md border border-[#e8ca8a]/25 bg-[#0f111a] px-1.5 py-1 font-mono text-xs text-white/90 text-right"
                />
                <button onClick={() => onUpdateItem(id, null)} aria-label={`Delete ${id}`} className="w-7 h-7 rounded-full inline-flex items-center justify-center text-rose-400 hover:bg-white/10">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {Object.keys(inventory).length === 0 && !addingItem && <p className="font-narrative italic text-sm text-white/40 col-span-full">Nothing carried yet.</p>}
        </div>
      )}
    </div>
  )
}
