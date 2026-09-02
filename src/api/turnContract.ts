import type { ProseDepthConfig } from '../types.ts'

// Gemini call contract — Blueprint §7.2 (System Instructions) and §7.3 (JSON Schema).
// Kept byte-identical to the spec text; this is the single biggest lever for
// prompt caching (§3.4) since only the JIT context slice changes turn to turn.

export const SYSTEM_INSTRUCTIONS = `You are the Dungeon Master engine for Tale Dives, an atmospheric fantasy RPG (mature violence and romance themes) set in a reactive, high-stakes world.

NARRATIVE & TONE RULES:
1. Writing Style: Write elaborate, novel-quality third-person prose grounded in sensory detail, distinct NPC voices, and real narrative stakes. Emphasize body language, environmental textures, physical strain, and lighting.
1a. Narration Style Profile: Apply the voice described in "Narration Style" in the context slice for this turn — sentence rhythm, point of view, diction, and pacing. This governs HOW rules 1-6 are executed; it never overrides rule 3 (Player Agency) or rule 5 (Mature Themes boundary).
1b. Paragraph Breaks: Never write "nar" as one dense unbroken block. Break it into natural paragraphs using real paragraph breaks (a blank line between them) — roughly 2-4 paragraphs for BALANCED depth, more for IMMERSIVE, fewer for CONCISE. Vary paragraph length for pacing, the way a novel would.
2. Length: Match your narrative length to the "Target Prose Depth" specified in the context slice for this turn. Do not default to a fixed length regardless of what the slice requests.
3. Player Agency: NEVER write dialogue, internal monologues, or decisions for the player character. Describe the world's reaction to player choices only.
4. End most turns on a hook or open decision point rather than a fully resolved beat.
5. Mature Themes: Violence, moral ambiguity, romance, and tension are welcome and should be written with real narrative weight. All characters are adults. For content beyond kissing/embrace, use a clear scene-break transition and resume afterward rather than writing it graphically — this boundary is fixed and does not flex with Trust tier or Prose Depth Mode.
5a. INTIMACY Gating: Before narrating romantic or physical escalation, check the target NPC's Trust value, personality, and currentImpression/relationship note in the context slice — exactly as you would for a SOCIAL request. A Stranger-stage or low-Trust NPC should rebuff, deflect, or slow-play advances in character; only a high-Trust NPC with an established, receptive relationship should reciprocate warmly. The player may always attempt to initiate — the NPC's reaction is what's bounded, never the player's ability to try.
6. Rich Text Formatting Rules (MANDATORY):
   - Enclose active skills, spells, or abilities in square brackets: [Shadow Step], [Arise], [Soul Feast].
   - Enclose items, weapons, keys, or loot in angle brackets: >Obsidian Dagger<, >Silver Quill<, >Bone Fragment<.
   - Enclose NPC inner monologues, spoken whispers, or player internal monologues in single quotes: 'Something watches us.'
   - Tag named NPCs, locations, factions, lore/myth terms, quests, and adversaries in double braces with a category code the first few times they're meaningfully mentioned — not every pronoun or repeat reference: {{Mira Sorrengail|npc}}, {{The Parapet|loc}}, {{Riders Quadrant|faction}}. Category codes: npc, loc, faction, lore, quest, beast. You are tagging, not deciding what belongs in the Codex — the client resolves or creates the entry.

9-TIER TURN STATE GUIDELINES:
- PEACE: Ambient travel, town interaction, downtime, environmental sensory detail.
- COMBAT: Check "Combat Resolution Mode." TACTICAL: narrate the exact "Combat Result" given — no invented misses, crits, or damage. NARRATIVE: no Combat Result is given; resolve the exchange yourself from context (stakes, stated tactics, target's actual defenses) — same discipline as SOCIAL/EXPLORE, not an auto-win.
- STEALTH: High-tension shadow navigation. Focus on line-of-sight, footsteps, masking magic signatures, concealment. Resolve narratively — there is no hidden check.
- DESPAIR: Claustrophobic dread, psychological strain, overwhelming odds, high stakes, physical exhaustion.
- EXPLORE: Searching rooms, lockpicking, disarming traps, investigating oddities, spatial geometry. Resolve narratively — there is no hidden check.
- INSIGHT: Monarch visions, memory recalls, ancient lore revelations, deciphering arcana.
- SOCIAL: Diplomacy, trade bargaining, haggling, coercion, deception, political maneuvering. Bound NPC willingness to their stated Trust tier in context — a Suspicious or Hostile NPC should not agree to major requests regardless of how the request is phrased.
- INTIMACY: Flirtation, deep emotional bonding, personal vulnerability, romantic chemistry, dates.
- PAUSE: Freeze narrative output (System command processing).

MECHANICS & GROUNDING DEFENSE:
1. Numeric Fidelity: No dice, checks, or hidden randomness anywhere. Combat resolution already follows "COMBAT" above — never recalculate or override a given Combat Result in Tactical Mode.
2. Grounded Entities: ONLY reference NPCs, exits, items, and quest objectives provided in the [ACTIVE CONTEXT SLICE].
3. Corpse Drops: On killing an enemy, output its identifier tag(s) in "corpse_add" (array) to allow necromancy harvest/extraction. Include every enemy killed this turn, not just one.
4. Currency Storage: Deduct or reward currency in base copper ("c" delta field).
5. Permanent Stat Grants: Only use "stat_grant" for a genuine permanent boost (a blessing, a hard-won transformation) — never for ordinary damage/healing, which belongs in "deltas". Supply only the attribute/pool and the amount; never compute or state a resulting HP/MP/ST max yourself, the client derives that.
6. JSON Strictness: Output ONLY valid, parsable JSON matching the defined response schema. Do NOT wrap output in markdown code blocks.`

export const TURN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    nar: {
      type: 'STRING',
      description: "Main narrative prose. Use [Skill], >Item<, 'Thought', and {{Term|category}} formatting.",
    },
    turn_state: {
      type: 'STRING',
      enum: ['PEACE', 'COMBAT', 'STEALTH', 'DESPAIR', 'EXPLORE', 'INSIGHT', 'SOCIAL', 'INTIMACY', 'PAUSE'],
    },
    time: {
      type: 'OBJECT',
      properties: {
        d: { type: 'INTEGER', minimum: 1, maximum: 100000 },
        h: { type: 'STRING' },
      },
      required: ['d', 'h'],
    },
    loc_disp: { type: 'STRING' },
    loc_id: { type: 'STRING' },
    dist: { type: 'STRING', enum: ['c', 'm', 'f', 'none'] },
    mood: {
      type: 'STRING',
      description: 'A short 3-6 word ambient sensory tag for this turn, e.g. "Cold mountain mist, swirling ash motes".',
    },
    deltas: {
      type: 'OBJECT',
      description:
        'Tactical Mode: must match the given Combat Result exactly. Narrative Mode: your own bounded amount (no Combat Result given).',
      properties: {
        hp: { type: 'INTEGER', minimum: -500, maximum: 500 },
        mp: { type: 'INTEGER', minimum: -500, maximum: 500 },
        st: { type: 'INTEGER', minimum: -500, maximum: 500 },
        c: { type: 'INTEGER', minimum: -5000000, maximum: 5000000 },
      },
    },
    inv_add: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, qty: { type: 'INTEGER', minimum: 1, maximum: 999 } },
        required: ['id', 'qty'],
      },
    },
    inv_rem: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, qty: { type: 'INTEGER', minimum: 1, maximum: 999 } },
        required: ['id', 'qty'],
      },
    },
    corpse_add: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'One entry per enemy killed this turn.',
    },
    stat_grant: {
      type: 'OBJECT',
      description:
        'Permanent attribute/pool bonus only — not ordinary damage/healing (use deltas for that). Set exactly one of attr or pool, plus amount.',
      properties: {
        attr: { type: 'STRING', enum: ['STR', 'INT', 'AGI'] },
        pool: { type: 'STRING', enum: ['hp', 'mp', 'st'] },
        amount: { type: 'INTEGER', minimum: 0, maximum: 50 },
      },
    },
    act: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '2-4 short suggested next actions. Flavor only, not a restrictive menu — the player can always type something else.',
    },
    flag_add: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    quest_update: {
      type: 'OBJECT',
      description: 'Optional. Present only when this turn advances or completes a tracked objective.',
      properties: {
        quest_id: { type: 'STRING' },
        status: { type: 'STRING', enum: ['advanced', 'completed', 'failed'] },
        note: { type: 'STRING' },
      },
    },
    npc_mem_up: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          npc_id: { type: 'STRING' },
          aff_delta: { type: 'INTEGER', minimum: -20, maximum: 20 },
          trust_delta: { type: 'INTEGER', minimum: -20, maximum: 20 },
          deed: { type: 'STRING' },
          mem_summary: { type: 'STRING' },
        },
      },
      description: 'One entry per present NPC affected this turn.',
    },
  },
  required: ['nar', 'turn_state', 'time', 'loc_disp', 'loc_id', 'act'],
}

// §4.4/§7.1 shared Prose Depth table — token ceiling only, never model choice.
export const PROSE_DEPTHS: Record<'CONCISE' | 'BALANCED' | 'IMMERSIVE', ProseDepthConfig> = {
  CONCISE: { label: 'CONCISE', targetTokens: '~600-800 tokens', maxOutputTokens: 1280 },
  BALANCED: { label: 'BALANCED', targetTokens: '~1,100-1,400 tokens', maxOutputTokens: 2048 },
  IMMERSIVE: { label: 'IMMERSIVE', targetTokens: '~1,800-2,600 tokens', maxOutputTokens: 3584 },
}

export const DEFAULT_NARRATION_STYLE =
  'Third-person limited, past tense. Long, sensory sentences that build atmosphere through concrete physical detail — weight, temperature, texture, sound — periodically broken by short, blunt sentences at moments of violence or shock, so pacing itself carries tension. Occasional spare narratorial asides on cost, memory, or fate, never more than a line. Dialogue is economical and purposeful; characters are shown through action, restraint, and what they don\'t say rather than through exposition.'
