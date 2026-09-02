// Blueprint §4.2 Mandatory Rich Text Markup — renders the four narrative
// markers as styled inline spans instead of leaking raw [brackets]/>angle
// brackets</>quotes'/{{tags}} syntax into what the player reads. Tapping
// through to a Codex Popup Card (§6.4C) isn't built yet — this is display
// styling only, no interaction.
//
// Two passes, not one combined regex: a {{Term|category}} tag can appear
// *nested* inside a 'thought/dialogue' span (an NPC's line mentioning a
// place by name is entirely normal), so keyword-link tags are resolved
// within every text segment the outer pass produces, not just at top level.

// The thought pattern's quotes need care: an apostrophe inside a contraction
// ("haven't", "Ymma's") must not be mistaken for a closing quote. A real
// closing quote is never immediately flanked by a word character the way a
// mid-word apostrophe is, so boundary lookarounds tell them apart, and `.+?`
// (not a `[^']` class) lets the match run past internal apostrophes at all.
const OUTER_RE = /\[([^\]]+)\]|>([^<]+)<|(?<!\w)'(.+?)'(?!\w)/g
const TAG_RE = /\{\{([^{}|]+)\|(\w+)\}\}/g

function renderTags(text, keyPrefix) {
  const nodes = []
  let lastIndex = 0
  let key = 0
  let match

  TAG_RE.lastIndex = 0
  while ((match = TAG_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    nodes.push(
      <span
        key={`${keyPrefix}-tag${key++}`}
        className="underline decoration-dotted decoration-gold-accent/50 underline-offset-2"
      >
        {match[1]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

export function renderNarrative(text) {
  if (!text) return null
  const nodes = []
  let lastIndex = 0
  let key = 0
  let match

  OUTER_RE.lastIndex = 0
  while ((match = OUTER_RE.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(...renderTags(text.slice(lastIndex, match.index), `p${key}`))
    }

    const [full, skill, item, thought] = match
    if (skill !== undefined) {
      nodes.push(
        <span
          key={`s${key}`}
          className="inline-block rounded-full border border-skill/40 bg-skill-bg px-2 py-0.5 text-[0.85em] text-skill"
        >
          {renderTags(skill, `s${key}`)}
        </span>,
      )
    } else if (item !== undefined) {
      nodes.push(
        <span
          key={`i${key}`}
          className="inline-block rounded-full border border-gold-accent/40 bg-gold-accent/15 px-2 py-0.5 text-[0.85em] text-gold-primary"
        >
          {renderTags(item, `i${key}`)}
        </span>,
      )
    } else if (thought !== undefined) {
      nodes.push(
        <em key={`th${key}`} className="text-ink-muted">
          '{renderTags(thought, `th${key}`)}'
        </em>,
      )
    }

    lastIndex = match.index + full.length
    key++
  }

  if (lastIndex < text.length) nodes.push(...renderTags(text.slice(lastIndex), `p${key}`))
  return nodes
}
