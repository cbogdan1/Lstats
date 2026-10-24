import type {
  ChampionMastery,
  MatchPlayer,
  MatchSummary,
  PlayerProfile,
  RankedEntry,
  RiotId,
} from '@lol/shared';
import type { ReactNode } from 'react';
import { PLATFORM_LABELS } from './api';
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

function TeamList({
  players,
  me,
  sd,
  onPlayerClick,
}: {
  players: MatchPlayer[];
  me: RiotId;
  sd: StaticData | null;
  onPlayerClick: (riotId: RiotId) => void;
}) {
  return (
    <ul className="w-36 space-y-0.5">
      {players.map((p) => (
        <li key={`${p.gameName}#${p.tagLine}`} className="flex items-center gap-1.5">
          <ChampionIcon
            sd={sd}
            championId={p.championId}
            championName={p.championName}
            size={16}
            className="rounded"
          />
          <button
            type="button"
            onClick={() => onPlayerClick(p)}
            title={`${p.gameName}#${p.tagLine}`}
            className={`truncate text-left text-xs hover:text-emerald-300 hover:underline ${sameRiotId(p, me) ? 'font-semibold text-ink-100' : 'text-ink-400'}`}
          >
            {p.gameName}
          </button>
        </li>
      ))}
    </ul>
  );
}

function MatchRow({
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
  const tone = m.remake
    ? { row: 'border-ink-600 bg-ink-900/70', text: 'text-ink-300', label: 'Remake' }
    : m.win
      ? {
          row: 'border-emerald-400 bg-emerald-400/[0.07]',
          text: 'text-emerald-300',
          label: 'Victory',
        }
      : { row: 'border-rose-500 bg-rose-500/[0.07]', text: 'text-rose-400', label: 'Defeat' };
  const minutes = m.durationSec / 60;
  const teams = [100, 200].map((id) => m.players.filter((p) => p.teamId === id));

  return (
    <li className={`rounded-xl border-l-4 ring-1 ring-white/[0.05] ${tone.row}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3 sm:p-4">
        <div className="w-28 shrink-0">
          <p className={`text-sm font-semibold ${tone.text}`}>
            {QUEUES[m.queueId] ?? 'Special mode'}
          </p>
          <p className="text-xs text-ink-400">{timeAgo(m.startedAt)}</p>
          <p className="mt-1 text-xs text-ink-300">
            {tone.label} · {formatDuration(m.durationSec)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <ChampionIcon
              sd={sd}
              championId={m.championId}
              championName={m.championName}
              size={48}
              className="rounded-xl"
            />
            <span className="absolute -right-1 -bottom-1 rounded-md bg-ink-950 px-1 text-[10px] font-bold text-ink-100 ring-1 ring-white/10">
              {m.champLevel}
            </span>
          </div>
          <div className="w-28">
            <p className="font-semibold text-ink-100">
              {m.kills} / <span className="text-rose-400">{m.deaths}</span> / {m.assists}
            </p>
            <p className="text-xs text-ink-300">{kdaRatio(m.kills, m.deaths, m.assists)}</p>
            <p className="text-xs text-ink-400">
              {m.cs} CS ({minutes ? (m.cs / minutes).toFixed(1) : 0}/m)
              {m.position && ` · ${POSITIONS[m.position] ?? m.position}`}
            </p>
          </div>
        </div>

        <div className="flex gap-1">
          {m.items.map((item, i) => (
            <span
              key={i}
              className={`h-7 w-7 overflow-hidden bg-ink-800 ${i === 6 ? 'ml-1 rounded-full' : 'rounded-md'}`}
            >
              {item > 0 && sd && (
                <img src={itemIcon(sd.version, item)} alt="" className="h-full w-full" />
              )}
            </span>
          ))}
        </div>

        <div className="ml-auto hidden gap-2 xl:flex">
          {teams.map((team, i) => (
            <TeamList key={i} players={team} me={me} sd={sd} onPlayerClick={onPlayerClick} />
          ))}
        </div>
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
          <MasteryCard mastery={profile.topMastery} sd={sd} />
        </aside>
        <section className="min-w-0 space-y-4" aria-label="Match history">
          <RecentSummary matches={profile.matches} sd={sd} />
          {profile.matches.length ? (
            <ol className="space-y-2">
              {profile.matches.map((m) => (
                <MatchRow
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
