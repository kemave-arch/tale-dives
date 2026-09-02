import { ensureEntry } from './autoRegister.js'

// §5.10 Location Auto-Registration — stub defaults for a place the model
// named (loc_id/loc_disp) that the Locations Codex doesn't have yet. Closes
// the "visited but can't look up later" gap without a new schema field or
// extra API call.
export function ensureLocation(locations, locId, locDisp) {
  return ensureEntry(locations, locId, () => ({
    name: locDisp,
    region: 'Unmapped',
    description: '(Auto-logged — visit again or add detail manually.)',
    dangerLevel: 'Unknown',
    factionOwner: null,
    standing: 'neutral',
  }))
}

// §3.1 — the compact re-told line that substitutes for the model's lack of
// persistent memory. Only rendered by the caller when an entry exists.
export function describeKnownLocation(entry) {
  const standing = entry.factionOwner ? `${entry.standing} (${entry.factionOwner})` : entry.standing
  return `Known Location: ${entry.name} | Danger: ${entry.dangerLevel} | Standing: ${standing}`
}
