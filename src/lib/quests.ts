import { ensureEntry } from './autoRegister.ts'
import { slugify } from './slug.ts'
import type { Dict, QuestEntry, QuestUpdate } from '../types.ts'

// Applies a turn's quest_update (if any) into the Quests Codex — separate
// from the leveling check in App.tsx (§5.1a), which only cares whether
// status reached "completed"; this persists the fuller record for display.
export function applyQuestUpdate(quests: Dict<QuestEntry> | undefined, update: QuestUpdate | undefined): Dict<QuestEntry> {
  if (!update?.quest_id) return quests ?? {}
  const id = slugify(update.quest_id)
  if (!id) return quests ?? {}

  const { dict } = ensureEntry(quests, id, () => ({ name: update.quest_id }))
  return {
    ...dict,
    [id]: { ...dict[id], status: update.status, note: update.note ?? dict[id].note },
  }
}
