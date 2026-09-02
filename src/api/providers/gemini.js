// Gemini provider adapter — Blueprint §7.1 (call shape) and §3.3 (self-healing pipeline).
import { SYSTEM_INSTRUCTIONS, TURN_SCHEMA } from '../turnContract.js'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// Stage 1 (Regex Sanitizer): strip markdown fences / trailing commas before parsing.
function sanitize(raw) {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

// Stage 3 (Fallback Reader) helper — §3.3: "extracts pure prose between quotes
// and renders it directly," not the raw JSON blob. Walks the "nar" field's
// string content by hand (rather than a single regex) so a response cut off
// mid-string by MAX_TOKENS still yields whatever prose made it out.
function extractNarrative(raw) {
  const match = raw.match(/"nar"\s*:\s*"/)
  if (!match) return null

  const ESCAPES = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/' }
  let result = ''
  for (let i = match.index + match[0].length; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '"') break // unescaped closing quote — end of the field
    if (ch === '\\') {
      const next = raw[i + 1]
      if (next === 'u') {
        result += String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16))
        i += 5
      } else {
        result += ESCAPES[next] ?? next
        i += 1
      }
      continue
    }
    result += ch
  }
  return result || null
}

async function requestOnce({ apiKey, model, temperature, maxOutputTokens, history }) {
  // Key goes in a header, not the URL — keeps it out of browser history and network logs.
  const url = `${BASE_URL}/${encodeURIComponent(model)}:generateContent`

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTIONS }] },
    contents: history,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
      responseSchema: TURN_SCHEMA,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const message = errBody?.error?.message ?? `HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const finishReason = data?.candidates?.[0]?.finishReason
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''

  return { text, finishReason }
}

// Stage 0: one silent retry on request failure (§3.3).
export async function runTurn({ apiKey, model, temperature, maxOutputTokens, history }) {
  let lastError
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text, finishReason } = await requestOnce({ apiKey, model, temperature, maxOutputTokens, history })
      const cleaned = sanitize(text)

      try {
        // Stage 2 (Schema Parser)
        return { ok: true, turn: JSON.parse(cleaned), finishReason, raw: text }
      } catch {
        // Stage 3 (Fallback Reader): surface the narrative prose rather than losing
        // the turn — extracted "nar" text if possible, only the raw blob as a last resort.
        return { ok: false, fallbackText: extractNarrative(text) ?? cleaned ?? text, finishReason, raw: text }
      }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}
