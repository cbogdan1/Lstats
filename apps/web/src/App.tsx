import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Platform, PlayerProfile, RiotId } from '@lol/shared';
import { DEFAULT_PLATFORM, fetchProfile, isPlatform, parseRiotId, PLATFORM_LABELS } from './api';
import { loadStaticData, type StaticData } from './ddragon';
import { Landing } from './Landing';
import { Logo } from './Logo';
import { ProfileSkeleton, ProfileView } from './Profile';

// Stable name set in apps/desktop electron-builder config, so this always serves the newest release.
const DOWNLOAD_URL = 'https://github.com/cbogdan1/Lstats/releases/latest/download/Lstats-Setup.exe';

type View =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; profile: PlayerProfile }
  | { status: 'error'; message: string };

/** Shareable link: /?region=eun1&riotId=Name%23TAG */
function readUrl() {
  const params = new URLSearchParams(location.search);
  const region = params.get('region');
  return {
    platform: isPlatform(region) ? region : DEFAULT_PLATFORM,
    riotId: params.get('riotId') ?? '',
  };
}

const initial = readUrl();

function SearchForm({
  platform,
  query,
  busy,
  compact = false,
  onPlatform,
  onQuery,
  onSubmit,
}: {
  platform: Platform;
  query: string;
  busy: boolean;
  compact?: boolean;
  onPlatform: (p: Platform) => void;
  onQuery: (q: string) => void;
  onSubmit: () => void;
}) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }
  const pad = compact ? 'py-2' : 'py-3.5';
  return (
    <form
      onSubmit={submit}
      role="search"
      className="flex w-full items-stretch rounded-xl bg-ink-900/85 ring-1 backdrop-blur-md ring-white/10 focus-within:ring-2 focus-within:ring-emerald-400"
    >
      <label htmlFor={compact ? 'region-compact' : 'region'} className="sr-only">
        Region
      </label>
      <select
        id={compact ? 'region-compact' : 'region'}
        value={platform}
        onChange={(e) => onPlatform(e.target.value as Platform)}
        className={`rounded-l-xl border-r border-white/10 bg-transparent pr-2 pl-3 text-sm font-semibold text-emerald-300 outline-none ${pad}`}
      >
        {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-ink-900 text-ink-100">
            {label}
          </option>
        ))}
      </select>
      <label htmlFor={compact ? 'riot-id-compact' : 'riot-id'} className="sr-only">
        Riot ID
      </label>
      <input
        id={compact ? 'riot-id-compact' : 'riot-id'}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Name#TAG"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`min-w-0 flex-1 bg-transparent px-3 text-base text-ink-100 outline-none placeholder:text-ink-400 ${pad}`}
      />
      <button
        type="submit"
        disabled={busy}
        className={`m-1 rounded-lg bg-emerald-400 px-4 font-semibold text-ink-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-60 sm:px-6 ${compact ? 'text-sm' : ''}`}
      >
        {busy ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}

export function App() {
  const [platform, setPlatform] = useState(initial.platform);
  const [query, setQuery] = useState(initial.riotId);
  const [view, setView] = useState<View>(
    parseRiotId(initial.riotId) ? { status: 'loading' } : { status: 'idle' },
  );
  const [sd, setSd] = useState<StaticData | null>(null);
  const latest = useRef(0); // drop responses from searches the user already replaced

  async function load(target: Platform, riotId: RiotId) {
    const id = ++latest.current;
    let next: View;
    try {
      next = { status: 'done', profile: await fetchProfile(target, riotId) };
    } catch (err) {
      next = { status: 'error', message: err instanceof Error ? err.message : String(err) };
    }
    if (id === latest.current) setView(next);
  }

  function search(target: Platform, text: string) {
    const riotId = parseRiotId(text);
    if (!riotId) {
      setView({ status: 'error', message: 'Enter a Riot ID like Name#EUNE.' });
      return;
    }
    const url = `?region=${target}&riotId=${encodeURIComponent(`${riotId.gameName}#${riotId.tagLine}`)}`;
    if (url !== location.search) history.pushState(null, '', url);
    setPlatform(target);
    setQuery(`${riotId.gameName}#${riotId.tagLine}`);
    setView({ status: 'loading' });
    window.scrollTo({ top: 0 });
    void load(target, riotId);
  }

  useEffect(() => {
    loadStaticData().then(setSd, () => {}); // icons are optional; stats still render
    const riotId = parseRiotId(initial.riotId);
    if (riotId) void load(initial.platform, riotId);

    const onPopState = () => {
      const { platform: p, riotId: text } = readUrl();
      const parsed = parseRiotId(text);
      setPlatform(p);
      setQuery(text);
      setView(parsed ? { status: 'loading' } : { status: 'idle' });
      if (parsed) void load(p, parsed);
    };
    addEventListener('popstate', onPopState);
    return () => removeEventListener('popstate', onPopState);
  }, []);

  const idle = view.status === 'idle';
  const form = (compact: boolean) => (
    <SearchForm
      platform={platform}
      query={query}
      busy={view.status === 'loading'}
      compact={compact}
      onPlatform={setPlatform}
      onQuery={setQuery}
      onSubmit={() => search(platform, query)}
    />
  );

  return (
    <div className="relative isolate flex min-h-dvh flex-col text-ink-100">
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
        <a
          href="/"
          aria-label="Lstats home"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          <Logo />
        </a>
        {!idle && (
          <div className="order-last w-full sm:order-none sm:w-auto sm:max-w-md sm:flex-1">
            {form(true)}
          </div>
        )}
        <a
          href={DOWNLOAD_URL}
          className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 ring-1 ring-white/10 transition hover:text-emerald-300 hover:ring-emerald-400/40"
        >
          Desktop app
        </a>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12">
        {idle ? (
          <Landing search={form(false)} />
        ) : (
          <div className="pt-4" aria-live="polite">
            {view.status === 'loading' && <ProfileSkeleton />}
            {view.status === 'error' && (
              <div className="rounded-2xl bg-rose-500/10 p-6 text-rose-300 ring-1 ring-rose-500/30">
                {view.message}
              </div>
            )}
            {view.status === 'done' && (
              <ProfileView
                profile={view.profile}
                sd={sd}
                onPlayerClick={(p) => search(platform, `${p.gameName}#${p.tagLine}`)}
              />
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto w-full max-w-7xl border-t border-white/[0.06] px-4 py-6 text-xs text-ink-400">
        Lstats isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of
        Riot Games or anyone officially involved in producing or managing Riot Games properties.
        Riot Games, and all associated properties are trademarks or registered trademarks of Riot
        Games, Inc.
      </footer>
    </div>
  );
}
