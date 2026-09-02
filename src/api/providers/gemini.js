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
        // Stage 3 (Fallback Reader): surface raw prose rather than losing the turn.
        return { ok: false, fallbackText: cleaned || text, finishReason, raw: text }
      }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}
