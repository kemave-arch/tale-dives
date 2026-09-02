// Preset Class Dictionary — Blueprint §5.1a. Each weight vector sums to 1.0.
export const PRESET_CLASSES = [
  { id: 'warrior', name: 'Warrior', weights: { STR: 0.6, INT: 0.1, AGI: 0.3 } },
  { id: 'assassin', name: 'Assassin', weights: { STR: 0.15, INT: 0.15, AGI: 0.7 } },
  { id: 'dragon_rider', name: 'Dragon Rider', weights: { STR: 0.35, INT: 0.3, AGI: 0.35 } },
  { id: 'dark_monarch', name: 'Dark Monarch', weights: { STR: 0.55, INT: 0.2, AGI: 0.25 } },
  { id: 'necromancer', name: 'Classic Necromancer', weights: { STR: 0.2, INT: 0.55, AGI: 0.25 } },
  { id: 'summoner', name: 'Contract Gate Summoner', weights: { STR: 0.15, INT: 0.45, AGI: 0.4 } },
  { id: 'mage', name: 'Mage', weights: { STR: 0.05, INT: 0.7, AGI: 0.25 } },
  { id: 'tank', name: 'Tank', weights: { STR: 0.7, INT: 0.05, AGI: 0.25 } },
  { id: 'paladin', name: 'Paladin', weights: { STR: 0.4, INT: 0.4, AGI: 0.2 } },
]

export function getClassById(id) {
  return PRESET_CLASSES.find((c) => c.id === id) ?? PRESET_CLASSES[0]
}
