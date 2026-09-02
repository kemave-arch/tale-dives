import { useEffect, useState } from 'react'
import Title from './screens/Title.jsx'
import Settings from './screens/Settings.jsx'
import MainMenu from './screens/MainMenu.jsx'
import WorldSetup from './screens/WorldSetup.jsx'
import NewGame from './screens/NewGame.jsx'
import Chronicle from './screens/Chronicle.jsx'
import { getClassById } from './data/classes.js'
import { startingAttributes, derivedPools } from './lib/derivedStats.js'
import { buildContextSlice } from './lib/jitContext.js'
import { applyTurn } from './lib/shadowReferee.js'
import { ensureLocation } from './lib/locations.js'
import { applyNpcUpdates } from './lib/npcs.js'
import { runTurn } from './api/providers/gemini.js'
import { PROSE_DEPTHS, DEFAULT_NARRATION_STYLE } from './api/turnContract.js'
import { downloadJSON, readJSONFile } from './lib/backup.js'
import * as store from './lib/store.js'

function findDefault(dict) {
  return Object.values(dict).find((e) => e.isDefault) ?? null
}

export default function App() {
  const [screen, setScreen] = useState('title')
  const [settingsReturnTo, setSettingsReturnTo] = useState('title')

  const [apiSettings, setApiSettings] = useState(store.loadApiSettings)
  const [uiPrefs, setUiPrefs] = useState(store.loadUiPrefs)
  const [worlds, setWorlds] = useState(store.loadWorlds)
  const [protagonists, setProtagonists] = useState(store.loadProtagonists)
  const [campaigns, setCampaigns] = useState(store.loadCampaigns)
  const [activeCampaignId, setActiveCampaignId] = useState(store.loadActiveCampaignId)

  const [game, setGame] = useState(() => {
    const id = store.loadActiveCampaignId()
    const all = store.loadCampaigns()
    return id && all[id] ? all[id] : null
  })

  // §Phase A/B — held between the World Setup and New Game steps.
  const [pendingWorld, setPendingWorld] = useState(null)
  const [worldSetupMode, setWorldSetupMode] = useState('tale') // 'tale' | 'library'
  const [worldSetupInitial, setWorldSetupInitial] = useState(null)
  const [newGameMode, setNewGameMode] = useState('tale') // 'tale' | 'library'
  const [newGameInitial, setNewGameInitial] = useState(null)

  const [history, setHistory] = useState([]) // Gemini `contents` sliding window (§3.1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { store.saveApiSettings(apiSettings) }, [apiSettings])
  useEffect(() => { store.saveUiPrefs(uiPrefs) }, [uiPrefs])
  useEffect(() => { store.saveWorlds(worlds) }, [worlds])
  useEffect(() => { store.saveProtagonists(protagonists) }, [protagonists])
  useEffect(() => { store.saveCampaigns(campaigns) }, [campaigns])
  useEffect(() => { if (activeCampaignId) store.saveActiveCampaignId(activeCampaignId) }, [activeCampaignId])

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', uiPrefs.skin)
  }, [uiPrefs.skin])

  // The actively-played campaign is kept in `game` for the turn loop, and
  // mirrored into the `campaigns` library on every change.
  useEffect(() => {
    if (!game) return
    setCampaigns((c) => ({ ...c, [game.id]: game }))
  }, [game])

  function upsertWorld(worldData, existingId) {
    const id = existingId ?? store.newId('world')
    const entry = { ...worldData, id, isDefault: worlds[id]?.isDefault ?? false }
    setWorlds((w) => ({ ...w, [id]: entry }))
    return entry
  }

  function upsertProtagonist(pData, existingId, className) {
    const id = existingId ?? store.newId('protagonist')
    const entry = { ...pData, id, className, isDefault: protagonists[id]?.isDefault ?? false }
    setProtagonists((p) => ({ ...p, [id]: entry }))
    return entry
  }

  function beginCampaign(protagonistData) {
    const cls = getClassById(protagonistData.classId)
    const attrs = startingAttributes(cls.weights)
    const { hpMax, mpMax, stMax } = derivedPools(attrs)

    const player = {
      name: protagonistData.name,
      className: cls.name,
      level: 1,
      attrs,
      hp: hpMax,
      hpMax,
      mp: mpMax,
      mpMax,
      st: stMax,
      stMax,
      copper: 14580,
      locId: 'loc_start',
      locDisp: 'An Unwritten Place',
      time: { d: 1, h: '08:00 AM' },
    }

    const world = pendingWorld ?? {
      name: 'Untitled World',
      background: '',
      genreTone: '',
      conflict: '',
      narrationStyle: DEFAULT_NARRATION_STYLE,
    }

    // Both land in their libraries the moment a Tale begins (§6.4B) —
    // creation IS how the World/Protagonist Library gets populated.
    const worldEntry = upsertWorld(world, world.id)
    const protagonistEntry = upsertProtagonist(protagonistData, protagonistData.id, cls.name)

    const campaignId = store.newId('campaign')
    const campaign = {
      id: campaignId,
      title: `${player.name}'s Tale`,
      synopsis: (protagonistData.opening || world.background || '').slice(0, 140),
      worldId: worldEntry.id,
      protagonistId: protagonistEntry.id,
      world, // §Phase A — kept for reference until the Codex Realm Overview exists
      player,
      combatMode: 'NARRATIVE', // Tactical combat math isn't implemented yet in this build
      proseDepth: PROSE_DEPTHS.BALANCED,
      narrationStyle: world.narrationStyle || DEFAULT_NARRATION_STYLE,
      locations: {}, // §5.10 Locations Codex — populated by auto-registration
      npcs: {}, // §5.5/§5.14 NPC Codex — populated by auto-registration
      log: [],
      lastPlayed: Date.now(),
    }

    setGame(campaign)
    setActiveCampaignId(campaignId)
    setHistory([])
    setError(null)
    setPendingWorld(null)
    setScreen('chronicle')

    // §Phase B.4 — the Tale Dive Brief fires Turn 1, folding in the World
    // Background/Genre/Conflict from Phase A so the opening is actually
    // grounded in what was set up rather than fabricated from nothing.
    const worldLines = [
      world.background?.trim() && `World Background: ${world.background.trim()}`,
      world.genreTone?.trim() && `Genre & Tone: ${world.genreTone.trim()}`,
      world.conflict?.trim() && `Core Regional Conflict: ${world.conflict.trim()}`,
    ].filter(Boolean)

    const briefLine = protagonistData.opening?.trim()
      ? `Tale Dive Brief — open Turn 1 here: ${protagonistData.opening.trim()}`
      : 'No Tale Dive Brief given — invent a fitting, evocative opening scene consistent with the world above.'

    const firstAction = [...worldLines, briefLine].join('\n')

    // Pass campaign + a fresh history directly — setGame/setHistory above
    // haven't flushed into this closure yet, so sendAction needs both handed
    // to it explicitly rather than reading stale `game`/`history` state.
    sendAction(firstAction, campaign, [])
  }

  async function sendAction(actionText, overrideGame, overrideHistory) {
    const current = overrideGame ?? game
    if (!current) return
    if (!apiSettings.apiKey) {
      setError('No API key set — open Settings and paste your Gemini API key first.')
      return
    }

    setBusy(true)
    setError(null)

    const baseHistory = overrideHistory ?? history
    const contextSlice = buildContextSlice(current)
    const userTurnText = `${contextSlice}\n\nPlayer Action: ${actionText}`
    const newHistory = [...baseHistory, { role: 'user', parts: [{ text: userTurnText }] }]

    try {
      const result = await runTurn({
        apiKey: apiSettings.apiKey,
        model: apiSettings.model,
        temperature: apiSettings.temperature,
        maxOutputTokens: current.proseDepth.maxOutputTokens,
        history: newHistory,
      })

      if (!result.ok) {
        setGame((g) => ({
          ...g,
          lastPlayed: Date.now(),
          log: [...g.log, { action: actionText, nar: `[Repairing State] ${result.fallbackText}` }],
        }))
        setHistory([...newHistory, { role: 'model', parts: [{ text: result.raw }] }])
        return
      }

      const turn = result.turn
      const { player: nextPlayer, defeated } = applyTurn(current.player, turn)
      nextPlayer.time = turn.time ?? current.player.time // Shadow Referee doesn't own time

      const { dict: nextLocations } = ensureLocation(current.locations, turn.loc_id, turn.loc_disp)
      const nextNpcs = applyNpcUpdates(current.npcs, turn.npc_mem_up, turn.loc_id)

      setGame((g) => ({
        ...g,
        player: nextPlayer,
        locations: nextLocations,
        npcs: nextNpcs,
        lastPlayed: Date.now(),
        log: [...g.log, { action: actionText, nar: turn.nar, turnState: turn.turn_state, defeated }],
      }))
      setHistory([...newHistory, { role: 'model', parts: [{ text: result.raw }] }])
    } catch (err) {
      setError(`The thread of fate falters... (${err.message})`)
    } finally {
      setBusy(false)
    }
  }

  function openSettings(from) {
    setSettingsReturnTo(from)
    setScreen('settings')
  }

  function startNewStory(worldId, protagonistId) {
    const world = worldId ? worlds[worldId] : findDefault(worlds)
    const protagonist = protagonistId ? protagonists[protagonistId] : findDefault(protagonists)
    setWorldSetupMode('tale')
    setWorldSetupInitial(world ?? null)
    setNewGameMode('tale')
    setNewGameInitial(protagonist ?? null)
    setPendingWorld(null)
    setScreen('worldsetup')
  }

  // ---- Screens ----

  if (screen === 'title') {
    return <Title onEnter={() => setScreen('mainmenu')} onSettings={() => openSettings('title')} />
  }

  if (screen === 'settings') {
    return (
      <Settings
        apiSettings={apiSettings}
        uiPrefs={uiPrefs}
        game={game}
        onBack={() => setScreen(settingsReturnTo)}
        onSave={({ apiSettings: nextApi, uiPrefs: nextUi, proseDepthKey, combatMode }) => {
          setApiSettings(nextApi)
          setUiPrefs(nextUi)
          if (game) {
            setGame((g) => ({ ...g, proseDepth: PROSE_DEPTHS[proseDepthKey], combatMode }))
          }
          setScreen(settingsReturnTo)
        }}
        onExportActive={() => game && downloadJSON(`${game.title}.json`, game)}
        onBackupAll={() =>
          downloadJSON('tale-dives-backup.json', {
            worlds,
            protagonists,
            campaigns,
            apiSettings: { ...apiSettings, apiKey: undefined },
          })
        }
        onImportJson={async (file) => {
          try {
            const data = await readJSONFile(file)
            if (data.worlds || data.protagonists || data.campaigns) {
              setWorlds((w) => ({ ...w, ...(data.worlds ?? {}) }))
              setProtagonists((p) => ({ ...p, ...(data.protagonists ?? {}) }))
              setCampaigns((c) => ({ ...c, ...(data.campaigns ?? {}) }))
            } else if (data.player && data.log) {
              const id = data.id ?? store.newId('campaign')
              setCampaigns((c) => ({ ...c, [id]: { ...data, id, lastPlayed: Date.now() } }))
            }
          } catch {
            setError('That file could not be read as a Tale Dives save.')
          }
        }}
        onResetDefaults={() => {
          if (!window.confirm('Erase all Tales, Worlds, and Protagonists on this device? This cannot be undone.')) return
          localStorage.clear()
          window.location.reload()
        }}
      />
    )
  }

  if (screen === 'mainmenu') {
    return (
      <MainMenu
        worlds={worlds}
        protagonists={protagonists}
        campaigns={campaigns}
        onResume={(id) => {
          setGame(campaigns[id])
          setActiveCampaignId(id)
          setHistory([])
          setScreen('chronicle')
        }}
        onNewSession={(worldId, protagonistId) => startNewStory(worldId, protagonistId)}
        onDeleteCampaign={(id) => {
          if (!window.confirm('Delete this Tale? This cannot be undone.')) return
          setCampaigns((c) => {
            const next = { ...c }
            delete next[id]
            return next
          })
          if (activeCampaignId === id) {
            setGame(null)
            setActiveCampaignId(null)
          }
        }}
        onExportCampaign={(id) => downloadJSON(`${campaigns[id].title}.json`, campaigns[id])}
        onImportCampaign={async (file) => {
          try {
            const data = await readJSONFile(file)
            const id = data.id ?? store.newId('campaign')
            setCampaigns((c) => ({ ...c, [id]: { ...data, id, lastPlayed: Date.now() } }))
          } catch {
            setError('That file could not be read as a Tale save.')
          }
        }}
        onNewWorld={() => {
          setWorldSetupMode('library')
          setWorldSetupInitial(null)
          setScreen('worldsetup')
        }}
        onSetDefaultWorld={(id) =>
          setWorlds((w) => Object.fromEntries(Object.entries(w).map(([k, v]) => [k, { ...v, isDefault: k === id }])))
        }
        onDeleteWorld={(id) => {
          if (!window.confirm('Delete this World template?')) return
          setWorlds((w) => {
            const next = { ...w }
            delete next[id]
            return next
          })
        }}
        onNewProtagonist={() => {
          setNewGameMode('library')
          setNewGameInitial(null)
          setScreen('newgame')
        }}
        onSetDefaultProtagonist={(id) =>
          setProtagonists((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, isDefault: k === id }])))
        }
        onDeleteProtagonist={(id) => {
          if (!window.confirm('Delete this Protagonist template?')) return
          setProtagonists((p) => {
            const next = { ...p }
            delete next[id]
            return next
          })
        }}
        onOpenSettings={() => openSettings('mainmenu')}
      />
    )
  }

  if (screen === 'worldsetup') {
    return (
      <WorldSetup
        worldTemplates={Object.values(worlds)}
        initial={worldSetupInitial}
        onBack={() => setScreen('mainmenu')}
        onContinue={(worldData) => {
          if (worldSetupMode === 'library') {
            upsertWorld(worldData, worldData.id)
            setScreen('mainmenu')
          } else {
            setPendingWorld(worldData)
            setScreen('newgame')
          }
        }}
      />
    )
  }

  if (screen === 'newgame') {
    return (
      <NewGame
        protagonistTemplates={Object.values(protagonists)}
        initial={newGameInitial}
        onBack={() => setScreen(newGameMode === 'tale' ? 'worldsetup' : 'mainmenu')}
        onBegin={(protagonistData) => {
          if (newGameMode === 'library') {
            const cls = getClassById(protagonistData.classId)
            upsertProtagonist(protagonistData, protagonistData.id, cls.name)
            setScreen('mainmenu')
          } else {
            beginCampaign(protagonistData)
          }
        }}
      />
    )
  }

  if (screen === 'chronicle' && game) {
    return (
      <Chronicle
        player={game.player}
        log={game.log}
        busy={busy}
        error={error}
        onSend={sendAction}
        onOpenSettings={() => openSettings('chronicle')}
        onOpenMenu={() => setScreen('mainmenu')}
      />
    )
  }

  return <Title onEnter={() => setScreen('mainmenu')} onSettings={() => openSettings('title')} />
}
