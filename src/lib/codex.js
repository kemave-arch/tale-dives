import { ensureEntry } from './autoRegister.js'
import { slugify } from './slug.js'
import { parseKeywordLinks } from './keywordLinks.js'
import { ensureLocation } from './locations.js'
import { emptyNpc } from './npcs.js'

function ensureStub(dict, id, factory) {
  return ensureEntry(dict, id, factory).dict
}

// §5.14 — applies every {{Term|category}} mention in this turn's prose to the
// matching Codex dictionary, auto-registering anything new. Locations and
// NPCs already have their own richer registration paths (loc_id/loc_disp,
// npc_mem_up) — this ADDS entries for things only mentioned in passing, and
// gives both paths a real display name (a keyword tag's Term) instead of a
// bare id, provided this runs before those other paths each turn.
export function applyKeywordLinks(codex, nar) {
  let { locations, npcs, factions, lore, quests, bestiary } = codex

  for (const { term, category } of parseKeywordLinks(nar)) {
    const id = slugify(term)
    if (!id) continue

    switch (category) {
      case 'loc':
        locations = ensureLocation(locations, id, term).dict
        break
      case 'npc':
        npcs = ensureStub(npcs, id, () => emptyNpc(term))
        break
      case 'faction':
        factions = ensureStub(factions, id, () => ({ name: term, repTier: 0 }))
        break
      case 'lore':
        lore = ensureStub(lore, id, () => ({ name: term, category: 'Unknown' }))
        break
      case 'quest':
        quests = ensureStub(quests, id, () => ({ name: term }))
        break
      case 'beast':
        bestiary = ensureStub(bestiary, id, () => ({ name: term, threatTier: 'Unknown' }))
        break
    }
  }

  return { locations, npcs, factions, lore, quests, bestiary }
}
