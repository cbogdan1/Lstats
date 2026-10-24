import type {
  ChampionMastery,
  MatchDetails,
  MatchPlayer,
  MatchSummary,
  PlayerProfile,
  RankedEntry,
  RiotId,
  SeasonChampions,
} from '@lol/shared';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { fetchMatchDetails, fetchSeasonChampions, PLATFORM_LABELS } from './api';
import { championIcon, itemIcon, profileIcon, rankCrest, type StaticData } from './ddragon';

const QUEUES: Record<number, string> = {
  400: 'Normal Draft',
  420: 'Ranked Solo/Duo',
  430: 'Normal Blind',
  440: 'Ranked Flex',
  450: 'ARAM',
  480: 'Swiftplay',
  490: 'Quickplay',
  700: 'Clash',
  720: 'ARAM Clash',
  900: 'ARURF',
  1020: 'One for All',
  1300: 'Nexus Blitz',
  1700: 'Arena',
  1710: 'Arena',
  1900: 'URF',
};
const POSITIONS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'Bot',
  UTILITY: 'Support',
};
const TIER_COLORS: Record<string, string> = {
  IRON: 'text-stone-400',
  BRONZE: 'text-orange-400',
  SILVER: 'text-slate-300',
  GOLD: 'text-yellow-300',
  PLATINUM: 'text-teal-300',
  EMERALD: 'text-emerald-300',
  DIAMOND: 'text-sky-300',
  MASTER: 'text-fuchsia-300',
  GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-amber-200',
};
const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

const winRate = (wins: number, losses: number) =>
  wins + losses ? Math.round((100 * wins) / (wins + losses)) : 0;
const kdaRatio = (k: number, d: number, a: number) =>
  d === 0 ? 'Perfect' : `${((k + a) / d).toFixed(2)} KDA`;
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, '0')}s`;
const sameRiotId = (a: RiotId, b: RiotId) =>
  a.gameName.toLowerCase() === b.gameName.toLowerCase() &&
  a.tagLine.toLowerCase() === b.tagLine.toLowerCase();

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];
function timeAgo(epochMs: number): string {
  const sec = (epochMs - Date.now()) / 1000;
  for (const [unit, size] of TIME_UNITS) {
    if (Math.abs(sec) >= size) return relativeTime.format(Math.round(sec / size), unit);
  }
  return 'just now';
}

function rankLabel(entry: RankedEntry): string {
  return APEX_TIERS.has(entry.tier)
    ? titleCase(entry.tier)
    : `${titleCase(entry.tier)} ${entry.rank}`;
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-ink-900/80 p-5 ring-1 ring-white/[0.06] backdrop-blur">
      {title && (
        <h3 className="mb-4 text-xs font-semibold tracking-wider text-ink-400 uppercase">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function ChampionIcon({
  sd,
  championId,
  championName,
  size,
  className = '',
}: {
  sd: StaticData | null;
  championId: number;
  championName: string;
  size: number;
  className?: string;
}) {
  const champ = sd?.champions[championId];
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden bg-ink-700 ${className}`}
      style={{ width: size, height: size }}
    >
      {sd && (
        <img
          src={championIcon(sd.version, champ?.id ?? championName)}
          alt={champ?.name ?? championName}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full scale-110 object-cover"
        />
      )}
    </span>
  );
}

function WinBar({ wins, losses }: { wins: number; losses: number }) {
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-rose-500/70" aria-hidden>
      <div className="bg-emerald-400" style={{ width: `${winRate(wins, losses)}%` }} />
    </div>
  );
}

function ProfileHeader({ profile, sd }: { profile: PlayerProfile; sd: StaticData | null }) {
  const { account, ranked } = profile;
  const wins = ranked.reduce((n, r) => n + r.wins, 0);
  const losses = ranked.reduce((n, r) => n + r.losses, 0);
  const solo = ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const stats = [
    { label: 'Level', value: profile.summonerLevel.toLocaleString() },
    {
      label: 'Solo/Duo',
      value: solo ? `${rankLabel(solo)} · ${solo.leaguePoints} LP` : 'Unranked',
    },
    { label: 'Ranked games', value: (wins + losses).toLocaleString() },
    { label: 'Ranked win rate', value: wins + losses ? `${winRate(wins, losses)}%` : '–' },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative w-fit shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-2xl bg-ink-700 ring-2 ring-emerald-400/70 sm:h-24 sm:w-24">
            {sd && (
              <img
                src={profileIcon(sd.version, profile.profileIconId)}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink-950 px-2 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/50">
            {profile.summonerLevel}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-ink-100 sm:text-3xl">
              {account.gameName}
            </h1>
            <span className="text-lg text-ink-400">#{account.tagLine}</span>
            <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
              {PLATFORM_LABELS[profile.platform]}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[11px] font-medium tracking-wider text-ink-400 uppercase">
                  {s.label}
                </dt>
                <dd className="font-semibold text-ink-100">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}

function RankCard({ title, entry }: { title: string; entry?: RankedEntry }) {
  return (
    <Card title={title}>
      {entry ? (
        <>
          <div className="flex items-center gap-4">
            <img src={rankCrest(entry.tier)} alt="" className="h-14 w-14 shrink-0" />
            <div>
              <p className={`text-lg font-bold ${TIER_COLORS[entry.tier] ?? 'text-ink-100'}`}>
                {rankLabel(entry)}
              </p>
              <p className="text-sm text-ink-300">{entry.leaguePoints} LP</p>
            </div>
            <div className="ml-auto text-right text-sm">
              <p className="text-ink-100">
                {entry.wins}W <span className="text-ink-400">/</span> {entry.losses}L
              </p>
              <p className="font-semibold text-emerald-300">
                {winRate(entry.wins, entry.losses)}% WR
              </p>
            </div>
          </div>
          <div className="mt-4">
            <WinBar wins={entry.wins} losses={entry.losses} />
            <p className="mt-2 text-xs text-ink-400">
              {(entry.wins + entry.losses).toLocaleString()} games played this season
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-400">Unranked</p>
      )}
    </Card>
  );
}

const POLL_MS = 3000;
const SHOWN_CHAMPIONS = 7;

/** Season stats are crawled by the proxy in the background; poll until it reports done. */
function SeasonChampionsCard({ profile, sd }: { profile: PlayerProfile; sd: StaticData | null }) {
  const [data, setData] = useState<SeasonChampions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { platform, account } = profile;

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const next = await fetchSeasonChampions(platform, account.puuid);
        if (!live) return;
        setData(next);
        if (next.status === 'running') timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : String(err));
      }
    };
    void poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [platform, account.puuid]);

  const champions = data?.champions ?? [];
  const shown = showAll ? champions : champions.slice(0, SHOWN_CHAMPIONS);
  const running = data?.status === 'running';
  const progress = data?.target ? Math.round((100 * data.analyzed) / data.target) : 0;

  return (
    <Card title="Ranked champions · this season">
      {!data && !error && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading ranked champions">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-ink-800/80" />
          ))}
        </div>
      )}
      {(error ?? data?.error) && <p className="text-sm text-rose-300">{error ?? data?.error}</p>}

      {data && (running || data.analyzed < data.target) && (
        <div className="mb-4" aria-live="polite">
          <div className="flex justify-between text-xs">
            <span className="text-ink-300">
              {running ? 'Analyzing' : 'Analyzed'} {data.analyzed.toLocaleString()} /{' '}
              {data.target.toLocaleString()} games
            </span>
            <span className="font-semibold text-emerald-300">{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className={`h-full rounded-full bg-emerald-400 transition-[width] duration-700 ${running ? 'animate-pulse' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-400">
            {running
              ? 'Big seasons take a few minutes the first time. Stats update live.'
              : 'Riot only returned part of this season.'}
          </p>
        </div>
      )}
      {data && !running && data.analyzed === data.target && data.target > 0 && (
        <p className="mb-4 text-xs text-ink-400">
          All {data.target.toLocaleString()} ranked games this season
        </p>
      )}
      {data && !running && !champions.length && !data.error && (
        <p className="text-sm text-ink-400">No ranked games this season.</p>
      )}

      {shown.length > 0 && (
        <ul className="space-y-3">
          {shown.map((c) => {
            const wr = winRate(c.wins, c.games - c.wins);
            return (
              <li key={c.championId} className="flex items-center gap-3">
                <ChampionIcon
                  sd={sd}
                  championId={c.championId}
                  championName={c.championName}
                  size={36}
                  className="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium text-ink-100">
                      {sd?.champions[c.championId]?.name ?? c.championName}
                    </p>
                    <p
                      className={`text-sm font-semibold ${wr >= 50 ? 'text-emerald-300' : 'text-rose-400'}`}
                    >
                      {wr}%
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-rose-500/50">
                      <div className="h-full bg-emerald-400" style={{ width: `${wr}%` }} />
                    </div>
                    <p className="shrink-0 text-[11px] text-ink-400">
                      {c.wins}W {c.games - c.wins}L · {kdaRatio(c.kills, c.deaths, c.assists)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {champions.length > SHOWN_CHAMPIONS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 w-full rounded-lg py-1.5 text-xs font-medium text-ink-300 ring-1 ring-white/10 hover:text-emerald-300 hover:ring-emerald-400/40"
        >
          {showAll ? 'Show less' : `Show all ${champions.length} champions`}
        </button>
      )}
    </Card>
  );
}

function MasteryCard({ mastery, sd }: { mastery: ChampionMastery[]; sd: StaticData | null }) {
  if (!mastery.length) return null;
  return (
    <Card title="Top mastery">
      <ul className="space-y-3">
        {mastery.map((m) => (
          <li key={m.championId} className="flex items-center gap-3">
            <ChampionIcon
              sd={sd}
              championId={m.championId}
              championName=""
              size={40}
              className="rounded-xl"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-100">
                {sd?.champions[m.championId]?.name ?? `Champion ${m.championId}`}
              </p>
              <p className="text-xs text-ink-400">Mastery {m.championLevel}</p>
            </div>
            <p className="ml-auto text-sm font-semibold text-emerald-300">
              {m.championPoints.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-ink-400">pts</span>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecentSummary({ matches, sd }: { matches: MatchSummary[]; sd: StaticData | null }) {
  const played = matches.filter((m) => !m.remake);
  if (!played.length) return null;
  const wins = played.filter((m) => m.win).length;
  const losses = played.length - wins;
  const wr = winRate(wins, losses);
  const avg = (key: 'kills' | 'deaths' | 'assists') =>
    played.reduce((n, m) => n + m[key], 0) / played.length;
  const [k, d, a] = [avg('kills'), avg('deaths'), avg('assists')];

  const byChampion = new Map<number, { name: string; games: number; wins: number }>();
  for (const m of played) {
    const c = byChampion.get(m.championId) ?? { name: m.championName, games: 0, wins: 0 };
    c.games++;
    if (m.win) c.wins++;
    byChampion.set(m.championId, c);
  }
  const topChampions = [...byChampion].sort((x, y) => y[1].games - x[1].games).slice(0, 3);
  const roles = played.reduce<Record<string, number>>((acc, m) => {
    if (m.position) acc[m.position] = (acc[m.position] ?? 0) + 1;
    return acc;
  }, {});
  const mainRole = Object.entries(roles).sort((x, y) => y[1] - x[1])[0]?.[0];

  return (
    <Card title={`Last ${played.length} games`}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="flex items-center gap-4">
          <div
            className="grid h-20 w-20 place-items-center rounded-full"
            style={{ background: `conic-gradient(#34d399 ${wr}%, rgb(244 63 94 / 0.55) 0)` }}
            role="img"
            aria-label={`${wr}% win rate`}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-ink-900">
              <span className="text-lg font-bold text-ink-100">{wr}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-ink-300">
              {wins}W {losses}L
            </p>
            <p className="font-semibold text-ink-100">
              {k.toFixed(1)} / <span className="text-rose-400">{d.toFixed(1)}</span> /{' '}
              {a.toFixed(1)}
            </p>
            <p className="text-sm font-semibold text-emerald-300">
              {kdaRatio(k, d, a).replace(' KDA', ':1 KDA')}
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {topChampions.map(([id, c]) => (
            <li key={id} className="flex items-center gap-2 text-sm">
              <ChampionIcon
                sd={sd}
                championId={id}
                championName={c.name}
                size={24}
                className="rounded-full"
              />
              <span className="w-24 truncate text-ink-100">
                {sd?.champions[id]?.name ?? c.name}
              </span>
              <span
                className={
                  winRate(c.wins, c.games - c.wins) >= 50 ? 'text-emerald-300' : 'text-rose-400'
                }
              >
                {winRate(c.wins, c.games - c.wins)}%
              </span>
              <span className="text-ink-400">
                ({c.wins}W {c.games - c.wins}L)
              </span>
            </li>
          ))}
        </ul>

        {mainRole && (
          <div>
            <p className="text-[11px] font-medium tracking-wider text-ink-400 uppercase">
              Main role
            </p>
            <p className="font-semibold text-ink-100">{POSITIONS[mainRole] ?? mainRole}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function Items({ items, sd, size }: { items: number[]; sd: StaticData | null; size: number }) {
  return (
    <div className="flex gap-1">
      {items.map((item, i) => (
        <span
          key={i}
          className={`overflow-hidden bg-ink-800 ${i === 6 ? 'ml-1 rounded-full' : 'rounded-lg'}`}
          style={{ width: size, height: size }}
        >
          {item > 0 && sd && (
            <img src={itemIcon(sd.version, item)} alt="" className="h-full w-full" />
          )}
        </span>
      ))}
    </div>
  );
}

function RankBadge({ rank }: { rank: RankedEntry | null }) {
  if (!rank) return <span className="text-xs text-ink-400">Unranked</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <img src={rankCrest(rank.tier)} alt="" className="h-4 w-4" />
      <span className={`font-semibold ${TIER_COLORS[rank.tier] ?? 'text-ink-100'}`}>
        {rankLabel(rank)}
      </span>
      <span className="text-ink-400">{rank.leaguePoints} LP</span>
    </span>
  );
}

// Re-expanding a match must not cost another 10 Riot calls.
const detailsCache = new Map<string, Promise<MatchDetails>>();

type DetailsState =
  | { status: 'loading' }
  | { status: 'done'; details: MatchDetails }
  | { status: 'error'; message: string };

function MatchDetailsPanel({
  match,
  me,
  sd,
  onPlayerClick,
}: {
  match: MatchSummary;
  me: RiotId;
  sd: StaticData | null;
  onPlayerClick: (riotId: RiotId) => void;
}) {
  const [state, setState] = useState<DetailsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cached = detailsCache.get(match.matchId);
    if (!cached) {
      cached = fetchMatchDetails(match.matchId);
      detailsCache.set(match.matchId, cached);
      cached.catch(() => detailsCache.delete(match.matchId)); // allow a retry after errors
    }
    let live = true;
    cached.then(
      (details) => live && setState({ status: 'done', details }),
      (err: unknown) =>
        live &&
        setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
    );
    return () => {
      live = false;
    };
  }, [match.matchId, attempt]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading match details">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-800/80" />
        ))}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="flex items-center gap-3 p-4 text-sm text-rose-300">
        {state.message}
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
          className="rounded-lg px-3 py-1 font-medium text-ink-100 ring-1 ring-white/15 hover:ring-emerald-400/50"
        >
          Retry
        </button>
      </div>
    );
  }

  const { participants } = state.details;
  const myTeam = participants.find((p) => sameRiotId(p, me))?.teamId ?? 100;
  const maxDamage = Math.max(1, ...participants.map((p) => p.damage));
  const teams = [myTeam, myTeam === 100 ? 200 : 100].map((teamId) =>
    participants.filter((p) => p.teamId === teamId),
  );
  const minutes = match.durationSec / 60;

  return (
    <div className="space-y-5 px-3 pt-1 pb-4 sm:px-4">
      {teams.map((team, i) => {
        const won = team[0]?.win ?? false;
        const kills = team.reduce((n, p) => n + p.kills, 0);
        const gold = team.reduce((n, p) => n + p.gold, 0);
        return (
          <section key={i} aria-label={i === 0 ? 'Your team' : 'Enemy team'}>
            <header className="mb-2 flex items-center gap-2 text-xs">
              <span className="font-semibold tracking-wider text-ink-300 uppercase">
                {i === 0 ? 'Your team' : 'Enemy team'}
              </span>
              <span className={won ? 'text-emerald-300' : 'text-rose-400'}>
                {match.remake ? 'Remake' : won ? 'Victory' : 'Defeat'}
              </span>
              <span className="ml-auto text-ink-400">
                {kills} kills · {(gold / 1000).toFixed(1)}k gold
              </span>
            </header>
            <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-xl bg-ink-950/50 ring-1 ring-white/[0.04]">
              {team.map((p) => {
                const isMe = sameRiotId(p, me);
                return (
                  <li
                    key={`${p.gameName}#${p.tagLine}`}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_3.5rem_auto] ${isMe ? 'bg-emerald-400/[0.06]' : ''}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="relative">
                        <ChampionIcon
                          sd={sd}
                          championId={p.championId}
                          championName={p.championName}
                          size={32}
                          className="rounded-lg"
                        />
                        <span className="absolute -right-1 -bottom-1 rounded bg-ink-950 px-0.5 text-[9px] font-bold text-ink-100">
                          {p.champLevel}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onPlayerClick(p)}
                          title={`${p.gameName}#${p.tagLine}`}
                          className={`block max-w-full truncate text-left text-sm hover:text-emerald-300 hover:underline ${isMe ? 'font-semibold text-ink-100' : 'text-ink-300'}`}
                        >
                          {p.gameName}
                        </button>
                        <RankBadge rank={p.rank} />
                      </div>
                    </div>
                    <p className="text-right text-sm text-ink-100 sm:text-left">
                      {p.kills}/<span className="text-rose-400">{p.deaths}</span>/{p.assists}
                      <span className="block text-[11px] text-ink-400">
                        {kdaRatio(p.kills, p.deaths, p.assists)}
                      </span>
                    </p>
                    <div
                      className="hidden sm:block"
                      title={`${p.damage.toLocaleString()} damage to champions`}
                    >
                      <p className="text-xs text-ink-300">{p.damage.toLocaleString()}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-ink-800">
                        <div
                          className={`h-full rounded-full ${p.teamId === myTeam ? 'bg-emerald-400' : 'bg-rose-400/80'}`}
                          style={{ width: `${(100 * p.damage) / maxDamage}%` }}
                        />
                      </div>
                    </div>
                    <p className="hidden text-xs text-ink-300 sm:block">
                      {p.cs} CS
                      <span className="block text-ink-400">
                        {minutes ? (p.cs / minutes).toFixed(1) : 0}/m
                      </span>
                    </p>
                    <div className="col-span-2 sm:col-span-1">
                      <Items items={p.items} sd={sd} size={22} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-[11px] text-ink-400">Ranks are each player&apos;s current rank.</p>
    </div>
  );
}

/** Two rows of five champion portraits: the player's team first. */
function TeamStrips({ match, me, sd }: { match: MatchSummary; me: RiotId; sd: StaticData | null }) {
  const myTeam = match.players.find((p) => sameRiotId(p, me))?.teamId ?? 100;
  const rows = [myTeam, myTeam === 100 ? 200 : 100].map((id) =>
    match.players.filter((p) => p.teamId === id),
  );
  return (
    <div className="hidden space-y-1 md:block" aria-hidden>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1">
          {row.map((p: MatchPlayer) => (
            <ChampionIcon
              key={`${p.gameName}#${p.tagLine}`}
              sd={sd}
              championId={p.championId}
              championName={p.championName}
              size={20}
              className={`rounded-full ${sameRiotId(p, me) ? 'ring-2 ring-emerald-400' : i === 0 ? 'opacity-90' : 'opacity-60'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function MatchCard({
  match: m,
  me,
  sd,
  onPlayerClick,
}: {
  match: MatchSummary;
  me: RiotId;
  sd: StaticData | null;
  onPlayerClick: (riotId: RiotId) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const tone = m.remake
    ? {
        glow: 'from-ink-600/20',
        ring: 'ring-ink-600',
        pill: 'bg-ink-700 text-ink-300',
        label: 'Remake',
      }
    : m.win
      ? {
          glow: 'from-emerald-400/[0.12]',
          ring: 'ring-emerald-400',
          pill: 'bg-emerald-400/15 text-emerald-300',
          label: 'Win',
        }
      : {
          glow: 'from-rose-500/[0.12]',
          ring: 'ring-rose-500',
          pill: 'bg-rose-500/15 text-rose-300',
          label: 'Loss',
        };
  const minutes = m.durationSec / 60;
  const chips = [
    kdaRatio(m.kills, m.deaths, m.assists),
    `${Math.round(m.killParticipation * 100)}% KP`,
    `${minutes ? (m.cs / minutes).toFixed(1) : 0} CS/m`,
  ];

  return (
    <li className="overflow-hidden rounded-2xl bg-ink-900/80 ring-1 ring-white/[0.06]">
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-48 bg-gradient-to-r to-transparent ${tone.glow}`}
        />
        <div className="relative shrink-0">
          <ChampionIcon
            sd={sd}
            championId={m.championId}
            championName={m.championName}
            size={56}
            className={`rounded-full ring-2 ring-offset-2 ring-offset-ink-900 ${tone.ring}`}
          />
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-ink-950 px-1.5 text-[10px] font-bold text-ink-100 ring-1 ring-white/10">
            {m.champLevel}
          </span>
        </div>

        <div className="relative w-48 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${tone.pill}`}
            >
              {tone.label}
            </span>
            <span className="truncate text-sm font-medium text-ink-100">
              {QUEUES[m.queueId] ?? 'Special mode'}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-400">
            {timeAgo(m.startedAt)} · {formatDuration(m.durationSec)}
            {m.position && ` · ${POSITIONS[m.position] ?? m.position}`}
          </p>
        </div>

        <div className="min-w-36">
          <p className="text-lg font-bold tracking-tight text-ink-100">
            {m.kills} <span className="text-ink-600">/</span>{' '}
            <span className="text-rose-400">{m.deaths}</span>{' '}
            <span className="text-ink-600">/</span> {m.assists}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-md bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-300"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <Items items={m.items} sd={sd} size={26} />

        <div className="ml-auto flex items-center gap-4">
          <TeamStrips match={m} me={me} sd={sd} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-300 ring-1 ring-white/10 transition hover:text-emerald-300 hover:ring-emerald-400/40"
          >
            {open ? 'Hide' : 'Details'}
            <svg
              viewBox="0 0 20 20"
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="currentColor"
              aria-hidden
            >
              <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
      </div>
      <div id={panelId} className="border-t border-white/[0.05]" hidden={!open}>
        {open && <MatchDetailsPanel match={m} me={me} sd={sd} onPlayerClick={onPlayerClick} />}
      </div>
    </li>
  );
}

export function ProfileView({
  profile,
  sd,
  onPlayerClick,
}: {
  profile: PlayerProfile;
  sd: StaticData | null;
  onPlayerClick: (riotId: RiotId) => void;
}) {
  const queue = (type: string) => profile.ranked.find((r) => r.queueType === type);
  return (
    <div className="space-y-4">
      <ProfileHeader profile={profile} sd={sd} />
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <RankCard title="Ranked Solo/Duo" entry={queue('RANKED_SOLO_5x5')} />
          <RankCard title="Ranked Flex" entry={queue('RANKED_FLEX_SR')} />
          <SeasonChampionsCard key={profile.account.puuid} profile={profile} sd={sd} />
          <MasteryCard mastery={profile.topMastery} sd={sd} />
        </aside>
        <section className="min-w-0 space-y-4" aria-label="Match history">
          <RecentSummary matches={profile.matches} sd={sd} />
          {profile.matches.length ? (
            <ol className="space-y-2">
              {profile.matches.map((m) => (
                <MatchCard
                  key={m.matchId}
                  match={m}
                  me={profile.account}
                  sd={sd}
                  onPlayerClick={onPlayerClick}
                />
              ))}
            </ol>
          ) : (
            <Card>
              <p className="text-sm text-ink-400">No recent matches.</p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  const block = 'animate-pulse rounded-2xl bg-ink-900/80 ring-1 ring-white/[0.06]';
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading profile">
      <div className={`h-36 ${block}`} />
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className={`h-40 ${block}`} />
          <div className={`h-40 ${block}`} />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`h-24 ${block}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
