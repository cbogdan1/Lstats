import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const SPLASHES = [
  'Ahri',
  'Yasuo',
  'Jinx',
  'Kaisa',
  'Akali',
  'Thresh',
  'Ezreal',
  'Lux',
  'Zed',
  'Viego',
];
const SPLASH_MS = 7000;
const splashUrl = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg`;

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

// Intro timeline (seconds): 0 scope draws off to the right, 0.3 hook thrown from the left,
// 0.8 hit, 0.85-1.35 logo pulled to center, 1.35 splash opens like an iris, 1.55 wordmark, 1.8 search.

/** Full-screen champion splash art, cross-fading every few seconds. */
function SplashBackdrop() {
  // Last two splashes: the older one stays underneath while the newer one fades in.
  const [layers, setLayers] = useState(() => [Math.floor(Math.random() * SPLASHES.length)]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let index = layers[0]!;
    const next = () => {
      const candidate = (index + 1) % SPLASHES.length;
      const img = new Image();
      // Swap only after the image is downloaded, so the fade never shows a blank frame.
      img.onload = () => {
        index = candidate;
        setLayers((l) => [l[l.length - 1]!, candidate]);
        timer = setTimeout(next, SPLASH_MS);
      };
      img.onerror = () => {
        index = candidate;
        timer = setTimeout(next, SPLASH_MS);
      };
      img.src = splashUrl(SPLASHES[candidate]!);
    };
    timer = setTimeout(next, SPLASH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start the cycle once
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[100svh] min-h-[560px] overflow-hidden"
    >
      <div className="absolute inset-0 animate-iris" style={delay(1.35)}>
        {layers.map((i) => (
          <img
            key={i}
            src={splashUrl(SPLASHES[i]!)}
            alt=""
            className="absolute inset-0 h-full w-full animate-splash object-cover object-[center_20%]"
          />
        ))}
        <div className="absolute inset-0 bg-ink-950/45" />
        <div className="absolute inset-0 bg-emerald-500/15 mix-blend-color" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgb(4_10_7/0.6)_60%,var(--color-ink-950)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-transparent to-ink-950" />
      </div>
      <div
        className="absolute inset-0 animate-flash bg-[radial-gradient(circle_at_50%_40%,rgb(110_231_183/0.55),transparent_45%)]"
        style={delay(1.35)}
      />
    </div>
  );
}

/** The logo as a living scope: draws itself, then sweeps like a radar. */
/**
 * A spectral green hook-and-chain (Thresh Q style, own drawing) thrown from the left edge of the
 * screen. The chain's width is animated so its links never stretch; the hook rides its end.
 */
function HookChain() {
  return (
    <div
      className="absolute top-1/2 left-[calc(50%-50vw)] h-1.5 -translate-y-1/2 animate-qthrow rounded-full bg-[repeating-linear-gradient(90deg,#6ee7b7_0_9px,transparent_9px_11px,#10b981_11px_14px,transparent_14px_16px)] drop-shadow-[0_0_6px_#34d399]"
      style={delay(0.3)}
    >
      <svg
        viewBox="0 0 48 48"
        className="absolute top-1/2 -right-2 h-16 w-16 -translate-y-1/2 drop-shadow-[0_0_8px_#34d399]"
      >
        <defs>
          <linearGradient
            id="hook-fill"
            x1="0"
            y1="0"
            x2="48"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#d1fae5" />
            <stop offset="0.45" stopColor="#34d399" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>
        <circle cx="5" cy="24" r="3.5" stroke="#6ee7b7" strokeWidth="2.2" fill="none" />
        <path d="M8.5 22.5h13l2 1.5-2 1.5h-13Z" fill="url(#hook-fill)" />
        <path
          d="M21 26.5c9 2.5 19-1 23.5-9.5 2.5-5 1.5-11-3-14.5 1.5 6-1 12-6.5 15.5-4 2.6-9 3.4-14 3.2Z"
          fill="url(#hook-fill)"
        />
        <path d="M24 26c2.5 4 2.5 9-.5 13.5 5-2.5 7.5-7.5 6.5-13Z" fill="url(#hook-fill)" />
      </svg>
    </div>
  );
}

function HeroMark() {
  const centered: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };
  return (
    <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28" aria-hidden>
      <HookChain />
      {/* Waits off to the right until the hook lands, then gets pulled to the center. */}
      <div className="absolute inset-0 animate-pulled" style={delay(0.85)}>
        <div
          className="absolute inset-0 scale-150 animate-fade rounded-full bg-emerald-500/25 blur-2xl"
          style={delay(0.6)}
        />
        <div
          className="absolute inset-[6%] animate-impact rounded-full ring-4 ring-emerald-300/70"
          style={delay(0.8)}
        />
        <div
          className="absolute inset-[6%] animate-ping-ring rounded-full ring-2 ring-emerald-300/40"
          style={delay(1.9)}
        />
        <div className="absolute inset-[6%] rounded-full bg-ink-950/85 backdrop-blur-sm" />
        <div
          className="absolute inset-[16%] animate-sweep rounded-full bg-[conic-gradient(from_0deg,rgb(52_211_153/0.5),transparent_30%)]"
          style={delay(0.9)}
        />
        <svg viewBox="0 0 64 64" fill="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient
              id="hero-fill"
              x1="8"
              y1="4"
              x2="56"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6ee7b7" />
              <stop offset="0.5" stopColor="#10b981" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
          </defs>
          <circle
            cx="32"
            cy="32"
            r="24"
            stroke="url(#hero-fill)"
            strokeWidth="5"
            pathLength="100"
            strokeDasharray="100"
            className="animate-draw"
            style={{ ...centered, rotate: '-90deg' }}
          />
          <path
            d="M32 3v9M32 52v9M3 32h9M52 32h9"
            stroke="url(#hero-fill)"
            strokeWidth="5"
            strokeLinecap="round"
            className="animate-snap"
            style={{ ...centered, ...delay(0.55) }}
          />
          <path
            d="M25 19.5h6v19h10.5v6H25Z"
            fill="#f0fdf4"
            className="animate-snap"
            style={{ ...centered, ...delay(0.75) }}
          />
        </svg>
      </div>
    </div>
  );
}

export function Landing({ search }: { search: ReactNode }) {
  return (
    <section className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center overflow-x-clip pb-24 text-center">
      <SplashBackdrop />
      {/* Shaken on landing; kept separate so the transform never re-anchors the backdrop. */}
      <div className="flex w-full animate-shake flex-col items-center" style={delay(1.3)}>
        <HeroMark />
        <h1
          className="mt-5 animate-focus text-6xl font-black tracking-tighter drop-shadow-[0_6px_30px_rgb(0_0_0/0.7)] sm:text-7xl"
          style={delay(1.55)}
        >
          L
          <span className="animate-shimmer bg-[linear-gradient(110deg,#34d399_40%,#ecfdf5_50%,#34d399_60%)] bg-[length:200%_100%] bg-clip-text text-transparent">
            stats
          </span>
        </h1>
        <div className="relative mt-9 w-full max-w-xl animate-rise" style={delay(1.8)}>
          <div
            aria-hidden
            className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-to-r from-emerald-400/45 via-teal-300/15 to-emerald-400/45 blur-lg"
          />
          <div className="relative">{search}</div>
        </div>
      </div>
    </section>
  );
}
