import { useEffect, useState, type FormEvent } from 'react';
import type { Account, RiotId } from '@lol/shared';
import { fetchAccount, parseRiotId } from './api';

// Stable name set in apps/desktop electron-builder config, so this always serves the newest release.
const DOWNLOAD_URL = 'https://github.com/cbogdan1/Lstats/releases/latest/download/Lstats-Setup.exe';

type Lookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; account: Account }
  | { status: 'error'; message: string };

async function toLookup(riotId: RiotId): Promise<Lookup> {
  try {
    return { status: 'done', account: await fetchAccount(riotId) };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

// Shareable link: /?riotId=Name%23TAG
const sharedQuery = new URLSearchParams(location.search).get('riotId') ?? '';
const sharedId = parseRiotId(sharedQuery);

export function App() {
  const [query, setQuery] = useState(sharedQuery);
  const [lookup, setLookup] = useState<Lookup>({ status: sharedId ? 'loading' : 'idle' });

  useEffect(() => {
    if (sharedId) void toLookup(sharedId).then(setLookup);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const riotId = parseRiotId(query);
    if (!riotId) {
      setLookup({ status: 'error', message: 'Enter a Riot ID like Name#EUNE.' });
      return;
    }
    history.replaceState(null, '', `?riotId=${encodeURIComponent(query.trim())}`);
    setLookup({ status: 'loading' });
    setLookup(await toLookup(riotId));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <span className="text-lg font-bold tracking-tight">Lstats</span>
        <a
          href="#download"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 ring-1 ring-slate-700 hover:text-white hover:ring-slate-500"
        >
          Desktop app
        </a>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-10 sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Scout any League player</h1>
          <p className="mt-3 max-w-xl text-slate-400 sm:text-lg">
            Search by Riot ID to look up a player.
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
            <label htmlFor="riot-id" className="sr-only">
              Riot ID
            </label>
            <input
              id="riot-id"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name#TAG"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md bg-slate-900 px-4 py-3 text-base ring-1 ring-slate-700 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={lookup.status === 'loading'}
              className="rounded-md bg-sky-600 px-6 py-3 font-medium hover:bg-sky-500 disabled:opacity-60"
            >
              {lookup.status === 'loading' ? 'Searching…' : 'Search'}
            </button>
          </form>

          <div aria-live="polite" className="mt-6 max-w-xl">
            {lookup.status === 'error' && <p className="text-red-400">{lookup.message}</p>}
            {lookup.status === 'done' && (
              <article className="rounded-lg bg-slate-900 p-5 ring-1 ring-slate-800">
                <h2 className="text-xl font-semibold">
                  {lookup.account.gameName}
                  <span className="text-slate-400">#{lookup.account.tagLine}</span>
                </h2>
                <p className="mt-2 text-xs text-slate-500">PUUID</p>
                <p className="font-mono text-xs break-all text-slate-400">{lookup.account.puuid}</p>
              </article>
            )}
          </div>
        </section>

        <section
          id="download"
          className="mb-12 scroll-mt-4 rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800 sm:p-10"
        >
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Desktop companion</h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Detects your League client automatically and scouts all 10 players from the loading
            screen: rank, recent form and champion experience. Uses only Riot&apos;s official APIs,
            with no game memory access.
          </p>
          <a
            href={DOWNLOAD_URL}
            className="mt-6 inline-block rounded-md bg-sky-600 px-6 py-3 font-medium hover:bg-sky-500"
          >
            Download for Windows
          </a>
          <p className="mt-2 text-xs text-slate-500">Windows 10/11, 64-bit</p>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-slate-500">
        Lstats isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of
        Riot Games or anyone officially involved in producing or managing Riot Games properties.
        Riot Games, and all associated properties are trademarks or registered trademarks of Riot
        Games, Inc.
      </footer>
    </div>
  );
}
