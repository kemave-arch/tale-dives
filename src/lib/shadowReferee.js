// Client-side Shadow Referee — Blueprint §3.2. Gemini proposes, this validates.
// v1 scope: Narrative Mode delta bounds only (§5.1d) — Tactical precomputed
// combat math (§2 Phase D.2) lands as its own feature once this loop is proven.

// §5.1d/§8 item 7: soft-cap share of a max pool a single narrated turn can move.
// Placeholder tunable — revisit once real playtesting shows the right feel.
const NARRATIVE_MAGNITUDE_CAP = 0.5

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function boundedDelta(delta, max) {
  if (!delta) return 0
  const cap = Math.round(max * NARRATIVE_MAGNITUDE_CAP)
  return clamp(delta, -cap, cap)
}

export function applyTurn(player, turn) {
  const deltas = turn.deltas ?? {}
  const next = { ...player }

  next.hp = clamp(player.hp + boundedDelta(deltas.hp, player.hpMax), 0, player.hpMax)
  next.mp = clamp(player.mp + boundedDelta(deltas.mp, player.mpMax), 0, player.mpMax)
  next.st = clamp(player.st + boundedDelta(deltas.st, player.stMax), 0, player.stMax)
  next.copper = Math.max(0, player.copper + (deltas.c ?? 0))

  if (turn.loc_id) next.locId = turn.loc_id
  if (turn.loc_disp) next.locDisp = turn.loc_disp

  return { player: next, defeated: next.hp <= 0 }
}
