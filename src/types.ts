// Shared type definitions for Tale Dives' game state. Kept in one place so
// every lib/screen module agrees on the same shapes — this is the concrete
// payoff of the TypeScript conversion: several real bugs earlier in this
// build (a missing `time` field, a missing `locations` field after a schema
// change) were exactly the class of mistake these types now catch at
// compile time instead of requiring a browser round-trip to discover.

export type Dict<T> = Record<string, T>

export interface Attributes {
  STR: number
  INT: number
  AGI: number
}

export interface ClassWeights extends Attributes {}

export interface ClassDef {
  id: string
  name: string
  weights: ClassWeights
}

export interface GameTime {
  d: number
  h: string
}

export interface Player {
  name: string
  classId: string
  className: string
  level: number
  attrs: Attributes
  hp: number
  hpMax: number
  mp: number
  mpMax: number
  st: number
  stMax: number
  copper: number
  locId: string
  locDisp: string
  time: GameTime
}

// §5.10 Locations Codex entry.
export interface LocationEntry {
  name: string
  region: string
  description: string
  dangerLevel: string
  factionOwner: string | null
  standing: string
  autoLogged?: boolean
}

// §5.5/§5.14 NPC Codex entry.
export interface NpcEntry {
  name: string
  affection: number
  trust: number
  stage: string
  deeds: string[]
  memSummary: string
  lastSeenLocId: string | null
  autoLogged?: boolean
}

export interface FactionEntry {
  name: string
  repTier: number
  autoLogged?: boolean
}

export interface LoreEntry {
  name: string
  category: string
  autoLogged?: boolean
}

export interface QuestEntry {
  name: string
  autoLogged?: boolean
}

// §5.13 Bestiary entry — hpMax/dmgBase are only present once a beast has
// actually entered Tactical combat (§2 Phase D.2); a passing {{Name|beast}}
// mention alone only registers name/threatTier.
export interface BestiaryEntry {
  name: string
  threatTier: string
  hpMax?: number
  dmgBase?: number
  autoLogged?: boolean
}

// §2 Phase D.2 — ephemeral per-encounter state, reset each fight (not part
// of the persistent Bestiary, which tracks per-species knowledge instead).
export interface CombatState {
  active: boolean
  enemyId?: string
  enemyName?: string
  enemyHp?: number
  enemyHpMax?: number
  enemyDmgBase?: number
}

export interface ProseDepthConfig {
  label: string
  targetTokens: string
  maxOutputTokens: number
}

export type CombatMode = 'TACTICAL' | 'NARRATIVE'
export type Skin = 'parchment' | 'obsidian'

// §Phase A World Setup — also the World Library's stored shape (§6.4B).
export interface WorldData {
  id?: string | null
  name: string
  mode: string
  genreTone: string
  conflict: string
  background: string
  narrationStyle: string
  isDefault?: boolean
}

// §Phase B Protagonist Creation — also the Protagonist Library's stored shape.
export interface ProtagonistData {
  id?: string | null
  name: string
  classId: string
  className?: string
  opening: string
  isDefault?: boolean
}

export interface LogEntry {
  action?: string
  nar: string
  turnState?: string
  defeated?: boolean
  levelUp?: number // §5.1a — set when this turn triggered a Milestone Level-up
  chapterSummary?: string // §2 Phase E — a synthetic entry marking a chapter boundary
  chapterNumber?: number
}

// A Tale — the full persisted campaign shape (§6.4B Tales library).
export interface Campaign {
  id: string
  title: string
  synopsis: string
  worldId?: string
  protagonistId?: string
  world: WorldData
  player: Player
  combatMode: CombatMode
  proseDepth: ProseDepthConfig
  narrationStyle: string
  locations: Dict<LocationEntry>
  npcs: Dict<NpcEntry>
  factions: Dict<FactionEntry>
  lore: Dict<LoreEntry>
  quests: Dict<QuestEntry>
  bestiary: Dict<BestiaryEntry>
  combat: CombatState
  log: LogEntry[]
  lastPlayed: number
  turnCount: number // real narrated turns only — decoupled from log.length, which also holds synthetic chapter-recap entries
}

export interface ApiSettings {
  provider: string
  model: string
  apiKey: string
  temperature: number
}

export interface UiPrefs {
  skin: Skin
}

// §7.3 JSON Schema — the shape of a single turn response from the model.
export interface TurnDelta {
  hp?: number
  mp?: number
  st?: number
  c?: number
}

export interface InventoryChange {
  id: string
  qty: number
}

export interface StatGrant {
  attr?: 'STR' | 'INT' | 'AGI'
  pool?: 'hp' | 'mp' | 'st'
  amount: number
}

export interface QuestUpdate {
  quest_id: string
  status: 'advanced' | 'completed' | 'failed'
  note?: string
}

export interface NpcMemoryUpdate {
  npc_id: string
  aff_delta?: number
  trust_delta?: number
  deed?: string
  mem_summary?: string
}

export type TurnState =
  | 'PEACE'
  | 'COMBAT'
  | 'STEALTH'
  | 'DESPAIR'
  | 'EXPLORE'
  | 'INSIGHT'
  | 'SOCIAL'
  | 'INTIMACY'
  | 'PAUSE'

export interface TurnResponse {
  nar: string
  turn_state: TurnState
  time: GameTime
  loc_disp: string
  loc_id: string
  dist?: 'c' | 'm' | 'f' | 'none'
  deltas?: TurnDelta
  inv_add?: InventoryChange[]
  inv_rem?: InventoryChange[]
  corpse_add?: string[]
  stat_grant?: StatGrant
  act: string[]
  flag_add?: string[]
  quest_update?: QuestUpdate
  npc_mem_up?: NpcMemoryUpdate[]
}

// Gemini `contents` sliding window (§3.1).
export interface HistoryPart {
  text: string
}
export interface HistoryTurn {
  role: 'user' | 'model'
  parts: HistoryPart[]
}

export interface RunTurnResult {
  ok: boolean
  turn?: TurnResponse
  fallbackText?: string
  finishReason?: string
  raw: string
}

export interface KeywordLink {
  term: string
  category: 'npc' | 'loc' | 'faction' | 'lore' | 'quest' | 'beast'
}

export interface EnsureResult<T> {
  dict: Dict<T>
  entry: T | null
  created: boolean
}
