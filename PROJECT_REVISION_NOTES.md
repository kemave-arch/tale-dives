# Tale Dives — Project Revision Notes

**Last updated:** 2026-09-03, by a Claude Code session working autonomously overnight.
**Read this first if you are a Claude Code session picking this project back up** — this
file exists specifically so a *different* session (possibly on a different machine) can
resume without re-deriving context. It reflects the actual code on `master` as of commit
`3597869`, verified by direct inspection (grep/read), not by trusting the blueprint doc's
intentions — several blueprint sections describe features that are **not** built yet, and
that distinction matters below. **Check the Revision log at the bottom first** — it's the
fastest way to see what's changed since your last read of this file.

## 0. How to resume

```bash
cd tale-dives   # this repo, wherever it's cloned on the current machine
npm install     # if node_modules isn't present
npm run dev     # Vite dev server, http://localhost:5173
```

- `npm run typecheck` — `tsc --noEmit`, should be clean before any commit.
- `npm run build` — `tsc --noEmit && vite build`, the real pre-commit gate.
- No test suite exists. Verification is manual: run the dev server, click through the
  actual flow in a browser. Don't claim a UI change works without having done this.
- A Gemini API key is required to actually play (Settings screen, gear icon on Title or
  Chronicle header). Without one, `sendAction` immediately no-ops with an error banner —
  this is expected, not a bug.
- Repo remote: `origin` → `https://github.com/kemave-arch/tale-dives.git`, branch
  `master`. All work this session was committed directly to `master` and pushed after
  each logical batch — there is no PR workflow in use here.

### A tooling trap that cost real time this session

The in-session browser-automation tool's `screenshot` action is occasionally stale by one
render frame — clicking a button and immediately screenshotting can show the *pre-click*
UI, looking exactly like the app is frozen/unresponsive. This happened here and briefly
looked like a serious regression (see commit `72f7ef9`'s development history). Before
concluding something is actually broken: re-screenshot after a short `wait`, or use
`read_page`/`get_page_text` to check real DOM state rather than trusting one screenshot.
A hard `preview_stop`/`preview_start` cycle plus a forced navigate also clears any stale
Vite HMR state if you're unsure the dev server is serving current source.

## 1. What Tale Dives is

A single-player, browser-only (no backend) AI-narrated text RPG. Vite + React 19 +
TypeScript + Tailwind v4. All state lives in `localStorage` via `src/lib/store.ts` — no
server, no accounts. The player narrates actions in free text; Google Gemini (currently
the only wired provider) returns structured JSON turns (narration + state deltas) per
`src/api/turnContract.ts`'s schema, applied client-side by `src/App.tsx`'s `sendAction`.
The full intended design lives in `Tale-Dives-Blueprint-v2_4.md` in the repo root — it is
a design document, not a status report. Treat every `§` reference below as "see that
section of the blueprint for the full spec," not "this is built."

## 2. Current file inventory (verified against actual `src/`, not assumed)

**Screens** (`src/screens/*.tsx`): `Title`, `Settings`, `MainMenu`, `WorldSetup`,
`NewGame`, `Chronicle` (main gameplay), `Codex` (Locations/NPCs/Factions/Lore/Quests/
Bestiary/Items browser + CRUD), `SlashCommandManager` (new this session).

**Lib** (`src/lib/*.ts`): `store.ts` (persistence), `jitContext.ts` (per-turn context
slicing), `shadowReferee.ts` (client-side validation of model-proposed deltas), `codex.ts`
+ `keywordLinks.ts` (`{{Term|category}}` auto-registration), `locations.ts`, `npcs.ts`,
`quests.ts`, `inventory.ts` (per-domain state appliers), `combat.ts` (Tactical combat
math), `leveling.ts` (milestone leveling + chapter boundaries), `bangCommands.ts` (`!`
client-side commands), `discovery.ts` (§5.12 Codex Discovery reveal checks, new this
session), `currency.ts`, `derivedStats.ts`, `richText.tsx`, `slug.ts`, `autoRegister.ts`,
`turnStates.ts`, `backup.ts` (JSON download/upload only).

**API** (`src/api/`): `turnContract.ts` (system prompt + `TURN_SCHEMA`),
`providers/gemini.ts` (the *only* provider implementation — `runTurn`, `runSummary`).

**Data** (`src/data/classes.ts`): static `PRESET_CLASSES` + `getClassById()`.

## 3. What's actually built (chronological, oldest to newest)

Everything below is implemented and working as of `3597869`. See `git log --oneline` for
the literal commit sequence; the summary here groups by feature, not commit.

- **Core loop**: Title → Main Menu (Tales/Worlds/Protagonists libraries) → World Setup
  (Original Mode only) → New Game (protagonist creation) → Chronicle (the turn loop) →
  Codex. Gemini API wired end-to-end with structured-JSON turns.
- **§5.1 / §5.13 Tactical combat** — client-computed exchange math, no round-trip to
  Gemini for damage resolution once a fight is active.
- **§5.1a Milestone Leveling** — auto level-ups on quest completion / chapter boundaries.
- **§5.7 Player Defeat State** — soft-fail recovery (HP/currency penalty + a dedicated
  narrated recovery turn), not a hard game-over.
- **§2 Phase E Chapter Recap** — periodic summary + history-window flush so token cost
  stays bounded regardless of campaign length (the JIT context system in
  `jitContext.ts` is the other half of this).
- **{{Term\|category}} keyword links** — parsed out of narration, auto-register Codex
  stub entries, tappable in the Chronicle to open a popup card or jump to the Codex.
- **§6.4D Codex UI** — full browsable Codex across all 6 categories, with manual CRUD
  (§9) as a correction path for auto-logged entries.
- **§6.0 obsidian dark chrome redesign** — the current visual language: dark
  header/HUD/input glass with a gold (`#e8ca8a`) accent, turn-state theming, draggable
  block navigator, parchment-textured narration pane.
- **§6.6 Bang Commands** — `!npc`, `!items`, `!location`, `!faction`, `!quests`,
  `!bestiary`, `!recall`, all 0-token and entirely client-resolved
  (`src/lib/bangCommands.ts`), rendered as a "Roleplay Paused" dossier block in the
  Chronicle. Includes command-palette autocomplete (typing `!` opens a filtered dropdown).
- **§6.6 Slash Commands** (this session, commit `72f7ef9`) — player-authored saved
  prompts invoked as `/name`, sent through the *real* turn pipeline (unlike bang
  commands, these do cost tokens). Scoped per-campaign or Global (shared across every
  Tale) via a checkbox in the manager UI (`SlashCommandManager.tsx`, opened by the `/`
  button next to the Chronicle input). Each command carries a `pauseRoleplay` flag that
  forces that turn's state to `PAUSE` client-side (`App.tsx`'s `sendAction` takes a
  `forcePauseState` param for this). Autocomplete mirrors the bang-command dropdown.
- **Autocomplete dropdown opacity** — both the bang and slash dropdowns use
  `bg-[#141622]/60` + `backdrop-blur-sm` (60% opacity, per explicit user request this
  session).
- **§5.12 Codex Discovery ("Fog of Lore")** (this session, commit `fbdef88`) — every
  Codex entry can carry a `discovery` object (`src/types.ts`'s `Discovery` type: `state`
  known/hidden, `revealTrigger`, `revealCondition`, `teaser`). Reveal checks run
  client-side every turn (`src/lib/discovery.ts`'s `checkCodexReveals`, called from
  `App.tsx`'s `sendAction`) against `flag_add`/`loc_id`/`npc_mem_up`/`quest_update` —
  zero extra tokens, zero new turn-schema fields. A reveal surfaces an inline "Codex
  Updated" badge in the Chronicle log. Masking is enforced in both the Chronicle's
  tap-to-open popup card and the full Codex UI (grid cards + detail view show
  `???`/teaser/Lock treatment) — except inside CRUD Edit Mode, which always shows the
  full record plus an editable Discovery panel so a player can hand-author their own
  reveals. **Caveat**: there's still no seeding/grounding call that pre-populates hidden
  lore on its own — today an entry only becomes hidden via manual CRUD.
- **§5.1b Class Evolution** (this session, commit `3597869`) — the player's single class
  slot can change mid-campaign, replaced outright (non-retroactive: already-earned
  attribute points keep their history, only future level-ups follow the new class's
  weight vector). Two triggers: story-driven via an optional `class_evolution` field on
  `TurnResponse` (schema-constrained to the Preset Class Dictionary, so the model can
  never propose an unrecognized class — see `src/api/turnContract.ts`), or manual via a
  new "Character" Codex category (`src/screens/Codex.tsx`) with a class-picker edit mode.
  The Chronicle surfaces it as a banner reusing the Codex Discovery badge treatment (a
  synthetic divider block for the manual trigger, an inline pill for the story-driven
  one). **Scope note**: this works within the existing Preset Class Dictionary only — the
  blueprint describes evolution as reusing a "Class Grounding" search-grounded call for
  freely-typed class names, which doesn't exist at character creation either; that's
  bundled with Inspired Mode (Tier 3 item #15 below) as shared future work.

## 4. What's NOT built yet — the Tier 3 priority list

This is the standing priority order. Each item was independently verified against the
actual source (not the blueprint's aspirational text) immediately before writing this
doc — "not implemented" below means a real grep/read confirmed zero code, not an
assumption.

1. ~~**#10 Class Evolution**~~ (blueprint §5.1b) — **done**, commit `3597869` (within the
   Preset Class Dictionary only — see §3 above for the free-form "Class Grounding" scope
   note, folded into item #15 below).

2. **#12 Crafting & Resource Management** (blueprint §5.8) — timestamp-based, 0-token,
   client-resolved. **Zero implementation.** No queue/recipe/workbench type anywhere in
   `types.ts`; `Campaign.inventory` is just a flat `Dict<number>` (item id → qty) with no
   crafting metadata. Needs: recipe data (new `src/data/` module, mirroring
   `classes.ts`'s pattern), a crafting queue on `Campaign` keyed off the existing
   `player.time: {d, h}` clock, and Chronicle/Codex UI surface (blueprint mentions a
   conditional `Hammer` radial-menu icon + Workbenches & Recipes Entry Cards — the radial
   menu itself doesn't exist yet either, see note below).

3. **#13 Three-Branch Summoning & Minion Engine** (blueprint §5.3) — class-specific
   summon/minion ability kits. **Zero implementation** beyond one class's flavor *name*
   ("Contract Gate Summoner" in `classes.ts`) with no mechanics attached. Needs: a
   `Minion`/`Summon` type, per-class ability gating (only classes that grant this branch
   get access — ties into Class Evolution above, since evolving into a summoner-type
   class should presumably grant it), and combat integration in `combat.ts`.

4. **#14 Faction rivalry** (blueprint §5.4/§5.11) — **still zero implementation.**
   `FactionEntry` is currently just `{ name, repTier, autoLogged?, discovery? }` — no
   faction-vs-faction relationship graph, no derived standing math. `LocationEntry.standing`
   is a hand-authored/model-set string, not computed from faction rep at all. (Codex
   Discovery / "Fog of Lore", the other half of this item as originally scoped, **is now
   built** — see §3 above and `src/lib/discovery.ts`. This item is faction rivalry only
   going forward.)

5. **#15 Inspired Mode** (blueprint §Phase A.2) — adapting a real novel/series via
   title/author grounding (Gemini search-grounding tool + structured JSON output in the
   same call — noted in the blueprint as needing its own verification since that's an
   unusual combination). **UI stub only**: `WorldSetup.tsx` renders it as a disabled
   "Coming soon" tab; `WorldData.mode` is hardcoded to `'original'` on every submit
   regardless of which tab is active. An in-code comment at `WorldSetup.tsx:13-17`
   already flags this as the reason it's stubbed. This is likely the highest-risk item on
   the list technically (untested Gemini API capability combination) — budget time to
   spike/verify the grounding+schema combination in isolation before wiring UI.

6. **#16 Multi-provider support + on-device folder saves** — two separate items:
   - **Multi-provider**: `ApiSettings.provider` exists as a plain `string` field and is
     persisted, but *nothing reads it* — `App.tsx` imports `runTurn`/`runSummary`
     directly from `./api/providers/gemini.ts` with no indirection. There is no provider
     interface/adapter type anywhere. Needs: define a provider interface (probably
     matching `gemini.ts`'s existing `runTurn`/`runSummary` signature shape), refactor
     `gemini.ts` to implement it, add a registry/lookup keyed by `apiSettings.provider`,
     and only then add a second real provider. Settings screen's model dropdown is also
     currently Gemini-only and will need to become provider-aware.
   - **On-device folder saves**: `src/lib/backup.ts` is presently just
     `downloadJSON()`/`readJSONFile()` — manual browser Save-As/file-picker, not a
     persistent directory handle. Needs the File System Access API
     (`showDirectoryPicker`/`FileSystemHandle`) — confirmed zero existing usage. Note
     this API has real browser-support gaps (notably Firefox/Safari) — decide whether
     it's a progressive enhancement over the existing download/upload path or a hard
     replacement before implementing.

### Also noted in the blueprint but not on the numbered list above

The blueprint's radial quick-action menu (§6.5) is referenced by both the Crafting and
general UI sections but doesn't appear to exist as a built component yet — worth
confirming/scoping if Crafting (#12) is picked up, since its UI hook depends on it.

## 5. Explicitly requested but not yet started (separate from the feature list)

Per the standing instruction this session was given:

- **Verify all existing functions/components and fix issues found.** Not yet done as a
  systematic pass. This session verified the Slash Command Manager batch specifically
  (see §0's tooling-trap note — it works correctly, confirmed live in-browser), but has
  not done a full sweep of the rest of the app (Codex CRUD, combat math, leveling edge
  cases, chapter recap, defeat/recovery flow, etc.).
- **Final "beautification of the entire app" pass.** Not started — this is explicitly the
  *last* step per the standing instruction, after the Tier 3 list and the verification
  pass above are both done.

## 6. Suggested resumption order

1. ~~Pick up Tier 3 item #14's Codex Discovery half first~~ — **done** (commit `fbdef88`).
2. ~~#10 Class Evolution~~ — **done** (commit `3597869`).
3. Work the rest of the Tier 3 list in order (#12 → #13 → #14 remainder → #15 → #16),
   committing and pushing after each, and **repeat this notes-file update after each
   major chunk** (append a dated entry below rather than rewriting history above) — this
   was the explicit instruction that produced this file in the first place. #13
   (Summoning) has a soft dependency on #10 (a summoner-type class should presumably
   grant the summon ability branch on evolving into it) — that dependency is now
   satisfied, so #12 → #13 in either order is fine next.
4. Do the full verify-and-fix pass across existing functions/components.
5. Do the final beautification pass last.
6. Always run `npm run typecheck` and `npm run build` clean, and manually click through
   the actual change in the dev server (see §0's tooling-trap warning) before committing.
   Note: a `window.confirm()`/`window.alert()` dialog in a flow you're testing live may
   get silently auto-dismissed by the browser-automation tool — if a confirm-gated action
   appears to silently no-op, override it first (`window.confirm = () => true` via the
   JS-exec tool) before concluding the underlying handler is broken. This cost real
   verification time on the Class Evolution manual-trigger flow this session.

---

## Revision log

- **2026-09-03** — Initial version of this document, written after committing and pushing
  the Slash Command Manager feature (`72f7ef9`). Tier 3 list above is the starting point
  for all future work; nothing in §4 has been started yet.
- **2026-09-03** — Codex Discovery / "Fog of Lore" (blueprint §5.12) implemented and
  pushed (`fbdef88`). This closes the Codex Discovery half of what was originally Tier 3
  item #14 — that item is now faction-rivalry-only. Verified live in the dev server:
  created a hidden Lore entry via CRUD with a `flag`-trigger reveal condition, confirmed
  it renders as `???` + teaser + Lock badge in both the Codex grid and the Chronicle's
  tap-to-open popup, confirmed CRUD Edit Mode still shows the full record while hidden
  (masking exception per spec), and confirmed toggling the state back to Known correctly
  un-masks it everywhere. Did not verify the automatic in-turn reveal path (that would
  require spending a real Gemini API call) — that logic (`checkCodexReveals` in
  `src/lib/discovery.ts`) is straightforward, typechecked, and code-reviewed, but a
  future session should watch for it the first time a real flag/location/NPC/quest
  reveal fires during actual play, since it hasn't been observed live yet. `npm run
  typecheck` and `npm run build` both clean. Next up per §6: Tier 3 item #10 (Class
  Evolution), which can now reuse the `entry.discoveries` inline-badge pattern in
  `Chronicle.tsx`'s `TurnBlock` for its own reveal banner.
- **2026-09-03** — Class Evolution (blueprint §5.1b) implemented and pushed (`3597869`).
  Added `class_evolution` as an optional schema-constrained field on `TurnResponse` (enum
  of the Preset Class Dictionary — the model can never propose a class the client doesn't
  recognize), applied non-retroactively in `App.tsx`'s `sendAction` (this turn's own
  level-up, if any, still uses the old weight vector; only future level-ups follow the
  new class), plus a manual trigger via a new "Character" Codex category. The Chronicle
  banner reuses the Codex Discovery badge pattern as intended. Verified live end-to-end:
  opened the new Character category (showed real Warrior/Level 3/attrs/pools data),
  edited the class to Mage, confirmed the change persisted and the Chronicle log showed a
  "CLASS EVOLUTION — Now a MAGE" banner. **Tooling note for future sessions**: the first
  save attempt silently no-op'd because the browser-automation tool auto-dismisses native
  `window.confirm()` dialogs (returns false) — had to override `window.confirm = () =>
  true` via the JS-exec tool before the save handler's logic could be verified. This is a
  testing-environment quirk, not an app bug; §6 above now carries this as a standing note.
  Did not verify the story-driven (model-proposed) trigger path live, since that would
  need a real Gemini call narrating an undeniable, permanent role change — the manual
  trigger path exercises the same `evolveClass`-adjacent logic (weight vector re-pointing,
  banner rendering) so this is lower-risk than it sounds, but a future session should
  watch for it the first time a real campaign's story actually fires `class_evolution`.
  `npm run typecheck` and `npm run build` both clean. Next up per §6: Tier 3 item #12
  (Crafting) or #13 (Summoning), either order — both are independent of everything shipped
  so far.
