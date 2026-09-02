import { describeKnownLocation } from './locations.js'

// Just-In-Time Context Slicing — Blueprint §3.1.
// Builds the compact per-turn header re-sent alongside the player's action;
// this (not model memory) is what keeps state consistent turn to turn.
export function buildContextSlice(state) {
  const { player, combatMode, proseDepth, narrationStyle, locations } = state

  const lines = [
    '[ACTIVE CONTEXT SLICE]',
    `Player: ${player.name} (${player.className}) | Level: ${player.level} | HP: ${player.hp}/${player.hpMax} | MP: ${player.mp}/${player.mpMax} | ST: ${player.st}/${player.stMax}`,
    `Location Node: ${player.locId} | Time: Day ${player.time.d} ${player.time.h}`,
  ]

  // §3.1 — only re-told once a Codex entry exists; first visit to a place omits it.
  const known = locations?.[player.locId]
  if (known) lines.push(describeKnownLocation(known))

  lines.push(
    `Combat Resolution Mode: ${combatMode}`,
    `Target Prose Depth: ${proseDepth.label} (${proseDepth.targetTokens})`,
    `Narration Style: ${narrationStyle}`,
    `Base Copper Wealth: ${player.copper}`,
  )

  return lines.join('\n')
}
