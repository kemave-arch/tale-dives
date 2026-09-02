// Shared stub-creation pattern — Blueprint §5.14. Every Codex category
// (Locations first, then NPCs/Adversaries/Items) reuses this same rule:
// when the model references something the client doesn't have yet, stub
// one in immediately, flagged autoLogged so the UI can mark/correct it later.
export function ensureEntry(dict, id, factory) {
  const safeDict = dict ?? {} // tolerate saves from before this Codex category existed
  if (!id || safeDict[id]) {
    return { dict: safeDict, entry: safeDict[id] ?? null, created: false }
  }
  const entry = { ...factory(), autoLogged: true }
  return { dict: { ...safeDict, [id]: entry }, entry, created: true }
}
