import type { ApiSettings, Campaign, Dict, ProtagonistData, UiPrefs, WorldData } from '../types.ts'

// Centralized localStorage persistence. Splits the old single-save shape
// into Tales (campaigns), Worlds, and Protagonists libraries (Blueprint
// §6.4B), plus UI-level prefs (skin) that live outside any one campaign.
const KEYS = {
  apiSettings: 'td_api_settings',
  uiPrefs: 'td_ui_prefs',
  worlds: 'td_worlds',
  protagonists: 'td_protagonists',
  campaigns: 'td_campaigns',
  activeCampaign: 'td_active_campaign',
  legacyGame: 'td_game_state', // pre-library single-save format
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadApiSettings(): ApiSettings {
  return load(KEYS.apiSettings, { provider: 'gemini', model: 'gemini-3.1-flash-lite', apiKey: '', temperature: 0.7 })
}
export const saveApiSettings = (s: ApiSettings): void => save(KEYS.apiSettings, s)

export function loadUiPrefs(): UiPrefs {
  return load(KEYS.uiPrefs, { skin: 'parchment' })
}
export const saveUiPrefs = (p: UiPrefs): void => save(KEYS.uiPrefs, p)

export const loadWorlds = (): Dict<WorldData> => load(KEYS.worlds, {})
export const saveWorlds = (w: Dict<WorldData>): void => save(KEYS.worlds, w)

export const loadProtagonists = (): Dict<ProtagonistData> => load(KEYS.protagonists, {})
export const saveProtagonists = (p: Dict<ProtagonistData>): void => save(KEYS.protagonists, p)

// Migrates the old single td_game_state save (pre-library) into the new
// multi-campaign shape the first time it's read, so existing playtesting
// progress isn't lost by this redesign.
export function loadCampaigns(): Dict<Campaign> {
  const campaigns = load<Dict<Campaign> | null>(KEYS.campaigns, null)
  if (campaigns) return campaigns

  const legacy = load<(Partial<Campaign> & { player?: { name?: string }; world?: { background?: string } }) | null>(
    KEYS.legacyGame,
    null,
  )
  if (!legacy) return {}

  const id = `campaign_${Date.now()}`
  const migrated: Dict<Campaign> = {
    [id]: {
      ...legacy,
      id,
      title: legacy.player?.name ? `${legacy.player.name}'s Tale` : 'Untitled Tale',
      synopsis: legacy.world?.background?.slice(0, 140) ?? '',
      lastPlayed: Date.now(),
    } as Campaign,
  }
  save(KEYS.campaigns, migrated)
  save(KEYS.activeCampaign, id)
  return migrated
}
export const saveCampaigns = (c: Dict<Campaign>): void => save(KEYS.campaigns, c)

export const loadActiveCampaignId = (): string | null => load(KEYS.activeCampaign, null)
export const saveActiveCampaignId = (id: string): void => save(KEYS.activeCampaign, id)

export function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}`
}
