import { useState } from 'react'

// Blueprint §3.4 — API Settings is the single source of truth every call reads
// from. The key is stored locally only (localStorage, via App.jsx) and never
// sent anywhere but the provider's own endpoint.
export default function Settings({ initial, onSave, onBack }) {
  const [provider] = useState('gemini') // only adapter implemented so far
  const [model, setModel] = useState(initial.model)
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [temperature, setTemperature] = useState(initial.temperature)

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col items-center justify-center gap-4 px-6">
      <h2 className="font-display font-bold text-2xl text-gold-primary">API Settings</h2>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <label className="text-sm font-display">
          Provider
          <input
            value="Gemini"
            disabled
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-mono text-sm opacity-60"
          />
        </label>

        <label className="text-sm font-display">
          Model ID
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. gemini-2.5-flash"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="text-sm font-display">
          API Key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Gemini API key"
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="text-sm font-display">
          Temperature
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gold-accent/40 bg-card px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="rounded-full border border-gold-accent/50 px-6 py-2 font-display text-sm">
          Back
        </button>
        <button
          onClick={() => onSave({ provider, model, apiKey, temperature })}
          disabled={!model || !apiKey}
          className="rounded-full bg-gold-action px-6 py-2 font-display text-sm font-semibold text-ink disabled:opacity-40"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
