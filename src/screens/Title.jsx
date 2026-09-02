import { Settings as SettingsIcon } from 'lucide-react'

// Blueprint §6.4A — v1 scaffold: wordmark, tagline, ENTER into the Main Menu.
export default function Title({ onEnter, onSettings }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas text-ink px-6 text-center">
      <h1 className="font-display font-black text-5xl tracking-wide text-gold-primary">TALE DIVES</h1>
      <p className="font-narrative italic text-lg">Dive into a world of your own making.</p>
      <button
        onClick={onEnter}
        className="mt-4 rounded-full bg-gold-action px-8 py-3 font-display font-semibold text-ink"
      >
        ENTER
      </button>
      <button
        onClick={onSettings}
        aria-label="Settings"
        className="mt-2 w-10 h-10 rounded-full inline-flex items-center justify-center text-gold-primary/70 hover:text-gold-primary"
      >
        <SettingsIcon size={18} />
      </button>
      <p className="mt-12 text-xs opacity-50 font-mono">Developed by Kem Ave</p>
    </div>
  )
}
