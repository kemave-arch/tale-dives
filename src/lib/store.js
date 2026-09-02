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

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadApiSettings() {
  return load(KEYS.apiSettings, { provider: 'gemini', model: 'gemini-3.1-flash-lite', apiKey: '', temperature: 0.7 })
}
export const saveApiSettings = (s) => save(KEYS.apiSettings, s)

export function loadUiPrefs() {
  return load(KEYS.uiPrefs, { skin: 'parchment' })
}
export const saveUiPrefs = (p) => save(KEYS.uiPrefs, p)

export const loadWorlds = () => load(KEYS.worlds, {})
export const saveWorlds = (w) => save(KEYS.worlds, w)

export const loadProtagonists = () => load(KEYS.protagonists, {})
export const saveProtagonists = (p) => save(KEYS.protagonists, p)

// Migrates the old single td_game_state save (pre-library) into the new
// multi-campaign shape the first time it's read, so existing playtesting
// progress isn't lost by this redesign.
export function loadCampaigns() {
  const campaigns = load(KEYS.campaigns, null)
  if (campaigns) return campaigns

  const legacy = load(KEYS.legacyGame, null)
  if (!legacy) return {}

  const id = `campaign_${Date.now()}`
  const migrated = {
    [id]: {
      ...legacy,
      id,
      title: legacy.player?.name ? `${legacy.player.name}'s Tale` : 'Untitled Tale',
      synopsis: legacy.world?.background?.slice(0, 140) ?? '',
      lastPlayed: Date.now(),
    },
  }
  save(KEYS.campaigns, migrated)
  save(KEYS.activeCampaign, id)
  return migrated
}
export const saveCampaigns = (c) => save(KEYS.campaigns, c)

export const loadActiveCampaignId = () => load(KEYS.activeCampaign, null)
export const saveActiveCampaignId = (id) => save(KEYS.activeCampaign, id)

export function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}`
}
