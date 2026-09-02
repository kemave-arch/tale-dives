import { useEffect, useState } from 'react'
import Title from './screens/Title.jsx'
import Settings from './screens/Settings.jsx'
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

const API_KEY_STORAGE = 'td_api_settings'
const GAME_STORAGE = 'td_game_state'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [screen, setScreen] = useState('title')
  const [apiSettings, setApiSettings] = useState(() =>
    loadJSON(API_KEY_STORAGE, { provider: 'gemini', model: 'gemini-3.1-flash-lite', apiKey: '', temperature: 0.7 }),
  )
  const [game, setGame] = useState(() => loadJSON(GAME_STORAGE, null))
  const [pendingWorld, setPendingWorld] = useState(null) // §Phase A world data, held until Phase B completes
  const [history, setHistory] = useState([]) // Gemini `contents` sliding window (§3.1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE, JSON.stringify(apiSettings))
  }, [apiSettings])

  useEffect(() => {
    if (game) localStorage.setItem(GAME_STORAGE, JSON.stringify(game))
  }, [game])

  function beginCampaign({ name, classId, opening }) {
    const cls = getClassById(classId)
    const attrs = startingAttributes(cls.weights)
    const { hpMax, mpMax, stMax } = derivedPools(attrs)

    const player = {
      name,
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

    const world = pendingWorld ?? { background: '', genreTone: '', conflict: '', narrationStyle: DEFAULT_NARRATION_STYLE }

    const campaign = {
      world, // §Phase A — kept for reference until the Codex Realm Overview exists
      player,
      combatMode: 'NARRATIVE', // Tactical combat math isn't implemented yet in this build
      proseDepth: PROSE_DEPTHS.BALANCED,
      narrationStyle: world.narrationStyle || DEFAULT_NARRATION_STYLE,
      locations: {}, // §5.10 Locations Codex — populated by auto-registration
      npcs: {}, // §5.5/§5.14 NPC Codex — populated by auto-registration
      log: [],
    }
    setGame(campaign)
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

    const briefLine = opening?.trim()
      ? `Tale Dive Brief — open Turn 1 here: ${opening.trim()}`
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
        log: [...g.log, { action: actionText, nar: turn.nar, turnState: turn.turn_state, defeated }],
      }))
      setHistory([...newHistory, { role: 'model', parts: [{ text: result.raw }] }])
    } catch (err) {
      setError(`The thread of fate falters... (${err.message})`)
    } finally {
      setBusy(false)
    }
  }

  if (screen === 'title') {
    return (
      <Title
        onEnter={() => setScreen(game ? 'chronicle' : 'worldsetup')}
        onSettings={() => setScreen('settings')}
        hasSave={!!game}
      />
    )
  }

  if (screen === 'worldsetup') {
    return (
      <WorldSetup
        onBack={() => setScreen('title')}
        onContinue={(world) => {
          setPendingWorld(world)
          setScreen('newgame')
        }}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <Settings
        initial={apiSettings}
        onBack={() => setScreen(game ? 'chronicle' : 'title')}
        onSave={(s) => {
          setApiSettings(s)
          setScreen(game ? 'chronicle' : 'title')
        }}
      />
    )
  }

  if (screen === 'newgame') {
    return <NewGame onBack={() => setScreen('worldsetup')} onBegin={beginCampaign} />
  }

  if (screen === 'chronicle' && game) {
    return (
      <Chronicle
        player={game.player}
        log={game.log}
        busy={busy}
        error={error}
        onSend={sendAction}
        onOpenSettings={() => setScreen('settings')}
      />
    )
  }

  return <Title onEnter={() => setScreen('worldsetup')} onSettings={() => setScreen('settings')} hasSave={false} />
}
