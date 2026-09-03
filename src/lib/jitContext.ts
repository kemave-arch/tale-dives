import { describeKnownLocation, territoryHostileLine } from './locations.ts'
import { describePresentNpc, presentNpcs } from './npcs.ts'
import type { Campaign, Dict, EquipSlot, ItemEntry, Player } from '../types.ts'

const RECENT_CHAPTER_DIGEST_COUNT = 3
const MAX_FLAGS_SHOWN = 20
const MAX_KNOWN_NAMES = 25 // per category — hard cap so this line's token cost stays flat regardless of how long the campaign runs
const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory']

function describeEquipped(equipped: Player['equipped'], items: Dict<ItemEntry> | undefined): string | null {
  if (!equipped) return null
  const parts: string[] = []
  for (const slot of EQUIP_SLOTS) {
    const id = equipped[slot]
    const item = id ? items?.[id] : undefined
    if (!item) continue
    const bonus = item.statBonus
      ? Object.entries(item.statBonus)
          .filter(([, v]) => v)
          .map(([k, v]) => `${v! > 0 ? '+' : ''}${v} ${k}`)
          .join(' ')
      : ''
    parts.push(`${item.name}${bonus ? ` (${bonus})` : ''}`)
  }
  return parts.length ? `Equipped: ${parts.join(' | ')}` : null
}

// Just-In-Time Context Slicing — Blueprint §3.1.
// Builds the compact per-turn header re-sent alongside the player's action;
// this (not model memory) is what keeps state consistent turn to turn.
export function buildContextSlice(state: Campaign, combatResultLine?: string | null, craftReadyLine?: string | null): string {
  const { player, combatMode, proseDepth, narrationStyle, locations, npcs, factions, lore, world, flags, quests, log, items } = state

  const playerIdentity = [player.gender && `Gender: ${player.gender}`, player.age !== undefined && `Age: ${player.age}`]
    .filter(Boolean)
    .join(' | ')

  const lines = [
    '[ACTIVE CONTEXT SLICE]',
    `Player: ${player.name} (${player.className})${playerIdentity ? ` | ${playerIdentity}` : ''} | Level: ${player.level} | HP: ${player.hp}/${player.hpMax} | MP: ${player.mp}/${player.mpMax} | ST: ${player.st}/${player.stMax}`,
    `Location Node: ${player.locId} | Time: Day ${player.time.d} ${player.time.h}`,
  ]

  // §5.9 — always-on, not gated behind a bang command: an equipped weapon
  // only actually shapes how combat/description reads if the narrator is
  // reminded of it every turn, not just when the player asks. 0 tokens with
  // nothing equipped.
  const equippedLine = describeEquipped(player.equipped, items)
  if (equippedLine) lines.push(equippedLine)

  // §3.1 — only re-told once a Codex entry exists; first visit to a place omits it.
  const known = locations?.[player.locId]
  if (known) {
    lines.push(describeKnownLocation(known, factions))
    const hostileLine = territoryHostileLine(known, factions)
    if (hostileLine) lines.push(hostileLine)
  }

  // §5.5 Proximity Slicing — an NPC not currently here costs 0 context tokens.
  for (const npc of presentNpcs(npcs, player.locId)) {
    lines.push(describePresentNpc(npc))
  }

  // Memory retention — everything below this point exists because the
  // sliding conversation window gets wiped at chapter boundaries (§2 Phase
  // E) and the model has no memory beyond it. Cheap, compact, re-told every
  // turn rather than relying on a full replay.

  // Known Entities — names only, capped per category (MAX_KNOWN_NAMES) so
  // this line's cost stays flat no matter how long the campaign runs. Exists
  // so the model checks this list before inventing a new NPC/location/faction
  // that duplicates one it just can't see in the sliced-down context above —
  // without this, "not currently present/visited" reads to the model as
  // "doesn't exist yet."
  const otherLocationNames = Object.entries(locations ?? {})
    .filter(([id]) => id !== player.locId)
    .map(([, l]) => l.name)
    .slice(-MAX_KNOWN_NAMES)
  const elsewhereNpcNames = Object.values(npcs ?? {})
    .filter((n) => n.lastSeenLocId !== player.locId)
    .map((n) => n.name)
    .slice(-MAX_KNOWN_NAMES)
  const factionNames = Object.values(factions ?? {}).map((f) => f.name).slice(-MAX_KNOWN_NAMES)
  const loreNames = Object.values(lore ?? {}).map((l) => l.name).slice(-MAX_KNOWN_NAMES)

  const knownSegments = [
    otherLocationNames.length && `Locations: ${otherLocationNames.join(', ')}`,
    elsewhereNpcNames.length && `NPCs: ${elsewhereNpcNames.join(', ')}`,
    factionNames.length && `Factions: ${factionNames.join(', ')}`,
    loreNames.length && `Lore: ${loreNames.join(', ')}`,
  ].filter(Boolean)
  if (knownSegments.length > 0) {
    lines.push(`Known Entities (already exist — do not reintroduce under a new name) — ${knownSegments.join(' | ')}`)
  }

  if (world?.background?.trim()) {
    lines.push(`World Premise: ${world.background.trim()}`)
  }

  const recentChapters = (log ?? []).filter((e) => e.chapterSummary).slice(-RECENT_CHAPTER_DIGEST_COUNT)
  if (recentChapters.length > 0) {
    const digest = recentChapters.map((c) => `[Ch${c.chapterNumber}] ${c.chapterSummary}`).join(' ')
    lines.push(`Story So Far: ${digest}`)
  }

  const activeObjectives = Object.values(quests ?? {})
    .filter((q) => q.status === 'advanced')
    .map((q) => q.name)
  if (activeObjectives.length > 0) {
    lines.push(`Active Objectives: ${activeObjectives.join(', ')}`)
  }

  if (flags && flags.length > 0) {
    lines.push(`World Flags: [${flags.slice(-MAX_FLAGS_SHOWN).join(', ')}]`)
  }

  lines.push(`Combat Resolution Mode: ${combatMode}`)

  // §3.1 example line — only present on a Tactical attack turn (§2 Phase D.2).
  if (combatResultLine) lines.push(combatResultLine)

  // §5.8 — only present when a queued crafting job finished at this exact
  // location; the narration hook, not the completion itself (that already
  // happened client-side regardless of where the player is).
  if (craftReadyLine) lines.push(craftReadyLine)

  lines.push(
    `Target Prose Depth: ${proseDepth.label} (${proseDepth.targetTokens})`,
    `Narration Style: ${narrationStyle}`,
    `Base Copper Wealth: ${player.copper}`,
  )

  return lines.join('\n')
}
