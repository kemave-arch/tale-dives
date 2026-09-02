// Scaffold smoke-test — confirms Vite + Tailwind + fonts are wired correctly.
// Replace with src/screens/Title.jsx once screen navigation is built (Blueprint §6.4A).
export default function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-ivory text-ink">
      <h1 className="font-display font-black text-5xl tracking-wide text-gold-primary">
        TALE DIVES
      </h1>
      <p className="font-narrative italic text-lg">
        Dive into a world of your own making.
      </p>
      <button className="mt-4 rounded-full bg-gold-action px-8 py-3 font-display font-semibold text-ink">
        ENTER
      </button>
      <p className="mt-12 text-xs opacity-50 font-mono">
        Developed by Kem Ave — scaffold build
      </p>
    </div>
  )
}
