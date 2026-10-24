import { useEffect, useState } from 'react';
import type { GameflowPhase } from '@lol/shared';
import logo from '@lol/shared/logo.svg';

export function App() {
  const [phase, setPhase] = useState<GameflowPhase>('None');

  useEffect(() => {
    void window.api.getPhase().then(setPhase);
    return window.api.onPhase(setPhase);
  }, []);

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-3 bg-[radial-gradient(40rem_20rem_at_50%_-5rem,rgb(16_185_129/0.18),transparent_70%)] bg-[#040a07] text-[#e6f4ee]">
      <img src={logo} alt="" width={72} height={72} />
      <p className="text-2xl font-extrabold tracking-tight">
        L<span className="text-emerald-400">stats</span>
      </p>
      <h1 className="mt-6 text-xs font-semibold tracking-widest text-[#7d9c8e] uppercase">
        Gameflow phase
      </h1>
      <p className="text-4xl font-semibold text-emerald-300" aria-live="polite">
        {phase}
      </p>
      {phase === 'None' && <p className="text-sm text-[#7d9c8e]">Waiting for the League client…</p>}
    </main>
  );
}
