import { useEffect, useState } from 'react'
import Title from './screens/Title.tsx'
import Settings, { type SettingsSavePayload } from './screens/Settings.tsx'
import MainMenu from './screens/MainMenu.tsx'
import WorldSetup from './screens/WorldSetup.tsx'
import NewGame from './screens/NewGame.tsx'
import Chronicle from './screens/Chronicle.tsx'
import Codex from './screens/Codex.tsx'
import { getClassById } from './data/classes.ts'
import { startingAttributes, derivedPools } from './lib/derivedStats.ts'
import { buildContextSlice } from './lib/jitContext.ts'
import { applyTurn, type TacticalOverride } from './lib/shadowReferee.ts'
import { ensureLocation } from './lib/locations.ts'
import { applyNpcUpdates } from './lib/npcs.ts'
import { applyKeywordLinks } from './lib/codex.ts'
import { applyQuestUpdate } from './lib/quests.ts'
import { applyInventoryChanges } from './lib/inventory.ts'
import { computePlayerAttack, isDisengaging, describeCombatResult, ensureAdversary } from './lib/combat.ts'
import { applyLevelUps, isChapterBoundary, CHAPTER_TURN_INTERVAL } from './lib/leveling.ts'
import { parseKeywordLinks } from './lib/keywordLinks.ts'
import { slugify } from './lib/slug.ts'
import { runTurn, runSummary } from './api/providers/gemini.ts'
import { PROSE_DEPTHS, DEFAULT_NARRATION_STYLE } from './api/turnContract.ts'
import { downloadJSON, readJSONFile } from './lib/backup.ts'
import * as store from './lib/store.ts'
import type { Campaign, CombatState, Dict, HistoryTurn, ProtagonistData, TurnState, WorldData } from './types.ts'

type Screen = 'title' | 'settings' | 'mainmenu' | 'worldsetup' | 'newgame' | 'chronicle' | 'codex'
type CreationMode = 'tale' | 'library'

// §5.7 Player Defeat State — soft-fail recovery, client-owned.
const DEFEAT_HP_RESTORE_FRACTION = 0.4
const DEFEAT_CURRENCY_PENALTY_FRACTION = 0.15

function findDefault<T extends { isDefault?: boolean }>(dict: Dict<T>): T | null {
  return Object.values(dict).find((e) => e.isDefault) ?? null
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [settingsReturnTo, setSettingsReturnTo] = useState<Screen>('title')

  const [apiSettings, setApiSettings] = useState(store.loadApiSettings)
  const [uiPrefs, setUiPrefs] = useState(store.loadUiPrefs)
  const [worlds, setWorlds] = useState<Dict<WorldData>>(store.loadWorlds)
  const [protagonists, setProtagonists] = useState<Dict<ProtagonistData>>(store.loadProtagonists)
  const [campaigns, setCampaigns] = useState<Dict<Campaign>>(store.loadCampaigns)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(store.loadActiveCampaignId)

  const [game, setGame] = useState<Campaign | null>(() => {
    const id = store.loadActiveCampaignId()
    const all = store.loadCampaigns()
    return id && all[id] ? all[id] : null
  })

  // §Phase A/B — held between the World Setup and New Game steps.
  const [pendingWorld, setPendingWorld] = useState<WorldData | null>(null)
  const [worldSetupMode, setWorldSetupMode] = useState<CreationMode>('tale')
  const [worldSetupInitial, setWorldSetupInitial] = useState<WorldData | null>(null)
  const [newGameMode, setNewGameMode] = useState<CreationMode>('tale')
  const [newGameInitial, setNewGameInitial] = useState<ProtagonistData | null>(null)

  const [history, setHistory] = useState<HistoryTurn[]>([]) // Gemini `contents` sliding window (§3.1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  function upsertWorld(worldData: WorldData, existingId?: string | null): WorldData {
    const id = existingId ?? store.newId('world')
    const entry: WorldData = { ...worldData, id, isDefault: worlds[id]?.isDefault ?? false }
    setWorlds((w) => ({ ...w, [id]: entry }))
    return entry
  }

  function upsertProtagonist(pData: ProtagonistData, existingId: string | null | undefined, className: string): ProtagonistData {
    const id = existingId ?? store.newId('protagonist')
    const entry: ProtagonistData = { ...pData, id, className, isDefault: protagonists[id]?.isDefault ?? false }
    setProtagonists((p) => ({ ...p, [id]: entry }))
    return entry
  }

  function beginCampaign(protagonistData: ProtagonistData) {
    const cls = getClassById(protagonistData.classId)
    const attrs = startingAttributes(cls.weights)
    const { hpMax, mpMax, stMax } = derivedPools(attrs)

    const player = {
      name: protagonistData.name,
      classId: cls.id,
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

    const world: WorldData = pendingWorld ?? {
      name: 'Untitled World',
      mode: 'original',
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
    const campaign: Campaign = {
      id: campaignId,
      title: `${player.name}'s Tale`,
      synopsis: (protagonistData.opening || world.background || '').slice(0, 140),
      worldId: worldEntry.id!,
      protagonistId: protagonistEntry.id!,
      world, // §Phase A — kept for reference until the Codex Realm Overview exists
      player,
      combatMode: 'TACTICAL', // Blueprint §5.1d default
      proseDepth: PROSE_DEPTHS.BALANCED,
      narrationStyle: world.narrationStyle || DEFAULT_NARRATION_STYLE,
      locations: {}, // §5.10 Locations Codex — populated by auto-registration
      npcs: {}, // §5.5/§5.14 NPC Codex — populated by auto-registration
      factions: {}, // §5.14 — populated by {{Term|faction}} keyword links
      lore: {}, // §5.14 — populated by {{Term|lore}} keyword links
      quests: {}, // §5.14 — populated by {{Term|quest}} keyword links (quest_update integration is still pending)
      bestiary: {}, // §5.13/§5.14 — populated by {{Term|beast}} keyword links, full stat blocks once combat begins
      combat: { active: false }, // §2 Phase D.2/§5.13 — ephemeral, reset each encounter
      flags: [], // §5.6 World Impact Ledger
      inventory: {}, // §5.9
      log: [],
      lastPlayed: Date.now(),
      turnCount: 0,
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
    ].filter(Boolean) as string[]

    const briefLine = protagonistData.opening?.trim()
      ? `Tale Dive Brief — open Turn 1 here: ${protagonistData.opening.trim()}`
      : 'No Tale Dive Brief given — invent a fitting, evocative opening scene consistent with the world above.'

    const firstAction = [...worldLines, briefLine].join('\n')

    // Pass campaign + a fresh history directly — setGame/setHistory above
    // haven't flushed into this closure yet, so sendAction needs both handed
    // to it explicitly rather than reading stale `game`/`history` state.
    sendAction(firstAction, campaign, [])
  }

  async function sendAction(actionText: string, overrideGame?: Campaign, overrideHistory?: HistoryTurn[]) {
    const current = overrideGame ?? game
    if (!current) return
    if (!apiSettings.apiKey) {
      setError('No API key set — open Settings and paste your Gemini API key first.')
      return
    }

    setBusy(true)
    setError(null)

    // §2 Phase D.2/§5.1d — Tactical Mode precomputes the exchange before the
    // prompt goes out, but only once combat is already active (its opening
    // beat is still Gemini's narrative call, §5.13) and the action isn't a
    // disengage attempt.
    const inCombat = current.combatMode === 'TACTICAL' && current.combat?.active && !isDisengaging(actionText)
    let combatResultLine: string | null = null
    let tacticalOverride: TacticalOverride | undefined
    let combatOutcome: { enemyHpAfter: number; enemyDefeated: boolean } | null = null

    if (inCombat) {
      const combat = current.combat // invariant: active=true always carries enemyHp/enemyDmgBase (set together in the branch below)
      const attack = computePlayerAttack(current.player)
      const enemyHpAfter = Math.max(0, combat.enemyHp! - attack.damage)
      const enemyDefeated = enemyHpAfter <= 0
      const playerDamageTaken = enemyDefeated ? 0 : combat.enemyDmgBase!

      combatResultLine = describeCombatResult({
        enemyName: combat.enemyName,
        damage: attack.damage,
        enemyHp: enemyHpAfter,
        enemyHpMax: combat.enemyHpMax,
        defeated: enemyDefeated,
        playerDamageTaken,
        exhausted: attack.exhausted,
      })
      tacticalOverride = { hpDelta: -playerDamageTaken, stDelta: -attack.stCost }
      combatOutcome = { enemyHpAfter, enemyDefeated }
    }

    const baseHistory = overrideHistory ?? history
    const contextSlice = buildContextSlice(current, combatResultLine)
    const userTurnText = `${contextSlice}\n\nPlayer Action: ${actionText}`
    const newHistory: HistoryTurn[] = [...baseHistory, { role: 'user', parts: [{ text: userTurnText }] }]

    try {
      const result = await runTurn({
        apiKey: apiSettings.apiKey,
        model: apiSettings.model,
        temperature: apiSettings.temperature,
        maxOutputTokens: current.proseDepth.maxOutputTokens,
        history: newHistory,
      })

      if (!result.ok) {
        setGame((g) =>
          g && {
            ...g,
            lastPlayed: Date.now(),
            log: [...g.log, { action: actionText, nar: `[Repairing State] ${result.fallbackText}` }],
          },
        )
        setHistory([...newHistory, { role: 'model', parts: [{ text: result.raw }] }])
        return
      }

      const turn = result.turn!
      const { player: nextPlayer, defeated: playerDefeated } = applyTurn(current.player, turn, tacticalOverride)
      nextPlayer.time = turn.time ?? current.player.time // Shadow Referee doesn't own time

      // Keyword links run first so a {{Term|npc}}/{{Term|loc}} tag's real name
      // wins over the plainer fallback loc_id/npc_id-derived stub name.
      const linked = applyKeywordLinks(
        {
          locations: current.locations,
          npcs: current.npcs,
          factions: current.factions,
          lore: current.lore,
          quests: current.quests,
          bestiary: current.bestiary,
        },
        turn.nar,
      )
      const { dict: nextLocations } = ensureLocation(linked.locations, turn.loc_id, turn.loc_disp)
      const nextNpcs = applyNpcUpdates(linked.npcs, turn.npc_mem_up, turn.loc_id)
      const nextQuests = applyQuestUpdate(linked.quests, turn.quest_update)
      const nextFlags = turn.flag_add?.length ? Array.from(new Set([...current.flags, ...turn.flag_add])) : current.flags
      const nextInventory = applyInventoryChanges(current.inventory, turn.inv_add, turn.inv_rem)

      // §3.2 Turn State Consistency — forced to COMBAT whenever a Tactical
      // result was precomputed; otherwise Gemini's own call, same as always.
      let turnState: TurnState = turn.turn_state
      let nextCombat: CombatState = current.combat ?? { active: false }
      let nextBestiary = linked.bestiary

      if (inCombat && combatOutcome) {
        turnState = 'COMBAT'
        nextCombat = combatOutcome.enemyDefeated
          ? { active: false }
          : { ...current.combat, enemyHp: combatOutcome.enemyHpAfter }
      } else if (turnState === 'COMBAT' && !current.combat?.active) {
        // Combat is starting narratively this turn — stand up a stat block
        // (§5.13) for whichever adversary got tagged, if any.
        const beastLink = parseKeywordLinks(turn.nar).find((l) => l.category === 'beast')
        if (beastLink) {
          const enemyId = slugify(beastLink.term)
          const { dict: withAdversary, entry } = ensureAdversary(
            nextBestiary,
            enemyId,
            beastLink.term,
            'standard',
            current.player.level,
          )
          nextBestiary = withAdversary
          nextCombat = {
            active: true,
            enemyId,
            enemyName: beastLink.term,
            enemyHp: entry.hpMax,
            enemyHpMax: entry.hpMax,
            enemyDmgBase: entry.dmgBase,
          }
        }
      } else if (turnState !== 'COMBAT' && current.combat?.active) {
        // Gemini narratively ended the fight (fled, negotiated, etc.).
        nextCombat = { active: false }
      }

      if (playerDefeated) nextCombat = { active: false }

      // §5.1a Milestone Leveling — +1 per completed quest this turn, +1 at
      // every Chapter Milestone boundary (§8 item 5's Secret-quest question
      // is moot for now since quest_update doesn't track a tier at all yet).
      const turnNumber = (current.turnCount ?? 0) + 1 // ?? tolerates saves from before turnCount existed
      const questLevels = turn.quest_update?.status === 'completed' ? 1 : 0
      const chapterLevels = isChapterBoundary(turnNumber) ? 1 : 0
      const { player: leveledPlayer, leveled } = applyLevelUps(
        nextPlayer,
        getClassById(current.player.classId).weights,
        questLevels + chapterLevels,
      )

      const nextCampaign: Campaign = {
        ...current,
        player: leveledPlayer,
        locations: nextLocations,
        npcs: nextNpcs,
        factions: linked.factions,
        lore: linked.lore,
        quests: nextQuests,
        bestiary: nextBestiary,
        combat: nextCombat,
        flags: nextFlags,
        inventory: nextInventory,
        lastPlayed: Date.now(),
        turnCount: turnNumber,
        log: [
          ...current.log,
          {
            action: actionText,
            nar: turn.nar,
            turnState,
            defeated: playerDefeated,
            ...(leveled ? { levelUp: leveledPlayer.level } : {}),
          },
        ],
      }

      setGame(nextCampaign)
      const historyWithResponse: HistoryTurn[] = [...newHistory, { role: 'model', parts: [{ text: result.raw }] }]
      setHistory(historyWithResponse)

      // §5.7 Player Defeat State — chains into its own resolution turn once
      // the fatal blow itself is committed, rather than leaving the player
      // stuck at 0 HP with nothing to do.
      if (playerDefeated) resolveDefeat(nextCampaign, historyWithResponse)

      // §2 Phase E Chapter Milestone — same boundary trigger as the
      // chapter-level-up above; the recap call reads historyWithResponse
      // (this turn included) before the sliding window gets flushed.
      if (chapterLevels > 0) {
        recapChapter(historyWithResponse, Math.floor(turnNumber / CHAPTER_TURN_INTERVAL))
      }
    } catch (err) {
      setError(`The thread of fate falters... (${errorMessage(err)})`)
    } finally {
      setBusy(false)
    }
  }

  // §5.7 — a fixed defeat context, no further damage math left to the model;
  // the client owns the recovery HP/currency outright, Gemini only narrates it.
  async function resolveDefeat(campaign: Campaign, baseHistory: HistoryTurn[]) {
    setBusy(true)
    const defeatAction =
      '[SYSTEM: The protagonist has just fallen (HP reached 0). Narrate a brief DESPAIR-tier resolution: they wake, injured but alive, at the nearest safe location. This is a soft-fail recovery beat, not a continuation of the fight — do not narrate death.]'

    const contextSlice = buildContextSlice(campaign)
    const userTurnText = `${contextSlice}\n\nPlayer Action: ${defeatAction}`
    const newHistory: HistoryTurn[] = [...baseHistory, { role: 'user', parts: [{ text: userTurnText }] }]

    const restoredHp = Math.round(campaign.player.hpMax * DEFEAT_HP_RESTORE_FRACTION)
    const penalizedCopper = Math.max(0, Math.round(campaign.player.copper * (1 - DEFEAT_CURRENCY_PENALTY_FRACTION)))

    try {
      const result = await runTurn({
        apiKey: apiSettings.apiKey,
        model: apiSettings.model,
        temperature: apiSettings.temperature,
        maxOutputTokens: campaign.proseDepth.maxOutputTokens,
        history: newHistory,
      })

      const nar = result.ok ? result.turn!.nar : (result.fallbackText ?? 'Consciousness returns slowly, aching but alive.')
      const nextPlayer = {
        ...campaign.player,
        hp: restoredHp,
        copper: penalizedCopper,
        ...(result.ok && result.turn!.loc_id ? { locId: result.turn!.loc_id, locDisp: result.turn!.loc_disp } : {}),
        ...(result.ok ? { time: result.turn!.time } : {}),
      }

      setGame((g) =>
        g && {
          ...g,
          player: nextPlayer,
          combat: { active: false },
          lastPlayed: Date.now(),
          log: [...g.log, { nar, turnState: 'DESPAIR' }],
        },
      )
      setHistory([...newHistory, { role: 'model', parts: [{ text: result.raw }] }])
    } catch (err) {
      setError(`The thread of fate falters... (${errorMessage(err)})`)
    } finally {
      setBusy(false)
    }
  }

  // §2 Phase E Chapter Milestone — plain-text 2-sentence recap, then flush
  // the sliding history window: "past conversation turns are flushed... while
  // persistent summary cards are saved locally." A missed recap costs only
  // flavor (the log entry), so failures are swallowed rather than surfaced —
  // the window keeps growing and the next boundary just retries.
  async function recapChapter(historyForSummary: HistoryTurn[], chapterNumber: number) {
    try {
      const summary = await runSummary({
        apiKey: apiSettings.apiKey,
        model: apiSettings.model,
        temperature: apiSettings.temperature,
        history: historyForSummary,
      })

      setGame((g) => g && { ...g, log: [...g.log, { nar: '', chapterSummary: summary, chapterNumber }] })
      setHistory([])
    } catch {
      // swallowed — see comment above
    }
  }

  function openSettings(from: Screen) {
    setSettingsReturnTo(from)
    setScreen('settings')
  }

  function startNewStory(worldId?: string, protagonistId?: string) {
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
        onSave={({ apiSettings: nextApi, uiPrefs: nextUi, proseDepthKey, combatMode }: SettingsSavePayload) => {
          setApiSettings(nextApi)
          setUiPrefs(nextUi)
          if (game) {
            setGame((g) => g && { ...g, proseDepth: PROSE_DEPTHS[proseDepthKey], combatMode })
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
        onImportJson={async (file: File) => {
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

  if (screen === 'codex' && game) {
    return (
      <Codex
        world={game.world}
        log={game.log}
        npcs={game.npcs}
        factions={game.factions}
        locations={game.locations}
        lore={game.lore}
        quests={game.quests}
        bestiary={game.bestiary}
        flags={game.flags}
        inventory={game.inventory}
        onBack={() => setScreen('chronicle')}
      />
    )
  }

  if (screen === 'chronicle' && game) {
    return (
      <Chronicle
        player={game.player}
        combat={game.combat}
        log={game.log}
        busy={busy}
        error={error}
        onSend={sendAction}
        onOpenSettings={() => openSettings('chronicle')}
        onOpenMenu={() => setScreen('mainmenu')}
        onOpenCodex={() => setScreen('codex')}
      />
    )
  }

  return <Title onEnter={() => setScreen('mainmenu')} onSettings={() => openSettings('title')} />
}
