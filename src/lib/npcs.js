import { ensureEntry } from './autoRegister.js'

// §5.5 Romance & Key Contact Memory Engine + §5.14 auto-registration.
// npc_mem_up only ever carries an id, never a display name — until the
// {{Term|npc}} keyword-link parser exists (§4.2/§5.14) to capture real names
// from prose, a title-cased id is a reasonable stand-in ("mira_sorrengail"
// -> "Mira Sorrengail").
function titleCaseId(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const STAGES = [
  { max: 20, label: 'Stranger' },
  { max: 40, label: 'Acquaintance' },
  { max: 60, label: 'Friend' },
  { max: 80, label: 'Confidant' },
  { max: Infinity, label: 'Beloved' },
]

function stageFor(affection) {
  return STAGES.find((s) => affection <= s.max).label
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// Applies one turn's npc_mem_up entries. `locId` tags who was present where,
// standing in for real proximity tracking (§5.5) until presence is a schema
// field of its own rather than inferred from "who got a memory update."
export function applyNpcUpdates(npcs, updates = [], locId) {
  let dict = npcs ?? {}

  for (const u of updates) {
    if (!u.npc_id) continue

    const { dict: withEntry } = ensureEntry(dict, u.npc_id, () => ({
      name: titleCaseId(u.npc_id),
      affection: 0,
      trust: 0,
      stage: 'Stranger',
      deeds: [],
      memSummary: '',
      lastSeenLocId: null,
    }))
    dict = withEntry

    const prev = dict[u.npc_id]
    const affection = clamp(prev.affection + (u.aff_delta ?? 0), 0, 100)
    const trust = clamp(prev.trust + (u.trust_delta ?? 0), 0, 100)

    dict = {
      ...dict,
      [u.npc_id]: {
        ...prev,
        affection,
        trust,
        stage: stageFor(affection),
        deeds: u.deed ? [...prev.deeds, u.deed] : prev.deeds,
        memSummary: u.mem_summary || prev.memSummary,
        lastSeenLocId: locId ?? prev.lastSeenLocId,
      },
    }
  }

  return dict
}

// §3.1 "Present NPCs" line — only for NPCs last seen at the active location,
// so an absent NPC costs 0 context tokens (§5.5 Proximity Slicing).
export function describePresentNpc(entry) {
  return `NPC: ${entry.name} | Stage: ${entry.stage} | Trust: ${entry.trust} | Mem: "${entry.memSummary}"`
}

export function presentNpcs(npcs, locId) {
  return Object.values(npcs ?? {}).filter((n) => n.lastSeenLocId === locId)
}
