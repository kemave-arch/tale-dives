import type { Dict, InventoryChange } from '../types.ts'

// §5.9/§3.2 Inventory Sanity Check — inv_add creates or increments; inv_rem
// for an item the player doesn't (fully) own is clamped rather than driven
// negative, and a fully-removed item's entry is dropped rather than left at 0.
export function applyInventoryChanges(
  inventory: Dict<number> | undefined,
  add: InventoryChange[] = [],
  remove: InventoryChange[] = [],
): Dict<number> {
  const next: Dict<number> = { ...(inventory ?? {}) }

  for (const item of add) {
    if (!item.id) continue
    next[item.id] = (next[item.id] ?? 0) + Math.max(1, item.qty ?? 1)
  }

  for (const item of remove) {
    if (!item.id || !next[item.id]) continue
    const qty = Math.max(0, next[item.id] - Math.max(1, item.qty ?? 1))
    if (qty === 0) delete next[item.id]
    else next[item.id] = qty
  }

  return next
}
