import { describeKnownLocation } from './locations.ts'
import { describePresentNpc, presentNpcs } from './npcs.ts'
import type { Campaign } from '../types.ts'

const RECENT_CHAPTER_DIGEST_COUNT = 3
const MAX_FLAGS_SHOWN = 20

// Just-In-Time Context Slicing — Blueprint §3.1.
// Builds the compact per-turn header re-sent alongside the player's action;
// this (not model memory) is what keeps state consistent turn to turn.
export function buildContextSlice(state: Campaign, combatResultLine?: string | null): string {
  const { player, combatMode, proseDepth, narrationStyle, locations, npcs, world, flags, quests, log } = state

  const lines = [
    '[ACTIVE CONTEXT SLICE]',
    `Player: ${player.name} (${player.className}) | Level: ${player.level} | HP: ${player.hp}/${player.hpMax} | MP: ${player.mp}/${player.mpMax} | ST: ${player.st}/${player.stMax}`,
    `Location Node: ${player.locId} | Time: Day ${player.time.d} ${player.time.h}`,
  ]

  // §3.1 — only re-told once a Codex entry exists; first visit to a place omits it.
  const known = locations?.[player.locId]
  if (known) lines.push(describeKnownLocation(known))

  // §5.5 Proximity Slicing — an NPC not currently here costs 0 context tokens.
  for (const npc of presentNpcs(npcs, player.locId)) {
    lines.push(describePresentNpc(npc))
  }

  // Memory retention — everything below this point exists because the
  // sliding conversation window gets wiped at chapter boundaries (§2 Phase
  // E) and the model has no memory beyond it. Cheap, compact, re-told every
  // turn rather than relying on a full replay.
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

  lines.push(
    `Target Prose Depth: ${proseDepth.label} (${proseDepth.targetTokens})`,
    `Narration Style: ${narrationStyle}`,
    `Base Copper Wealth: ${player.copper}`,
  )

  return lines.join('\n')
}
