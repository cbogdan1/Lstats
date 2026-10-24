import { useEffect, useState } from 'react';
import type { GameflowPhase } from '@lol/shared';

export function App() {
  const [phase, setPhase] = useState<GameflowPhase>('None');

  useEffect(() => {
    void window.api.getPhase().then(setPhase);
    return window.api.onPhase(setPhase);
  }, []);

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-2 bg-slate-950 text-slate-100">
      <h1 className="text-sm tracking-widest text-slate-400 uppercase">Gameflow phase</h1>
      <p className="text-4xl font-semibold" aria-live="polite">
        {phase}
      </p>
      {phase === 'None' && <p className="text-sm text-slate-500">Waiting for the League client…</p>}
    </main>
  );
}
