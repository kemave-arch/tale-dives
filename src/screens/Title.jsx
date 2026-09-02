// Blueprint §6.4A — v1 scaffold: wordmark, tagline, ENTER, continue shortcut.
export default function Title({ onEnter, onSettings, hasSave }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-ivory text-ink px-6 text-center">
      <h1 className="font-display font-black text-5xl tracking-wide text-gold-primary">TALE DIVES</h1>
      <p className="font-narrative italic text-lg">Dive into a world of your own making.</p>
      <button
        onClick={onEnter}
        className="mt-4 rounded-full bg-gold-action px-8 py-3 font-display font-semibold text-ink"
      >
        ENTER
      </button>
      {hasSave && (
        <button onClick={onEnter} className="text-sm font-display text-gold-primary/80 underline">
          ▶ CONTINUE
        </button>
      )}
      <button onClick={onSettings} className="text-xs font-display text-gold-primary/70 underline mt-2">
        API Settings
      </button>
      <p className="mt-12 text-xs opacity-50 font-mono">Developed by Kem Ave</p>
    </div>
  )
}
