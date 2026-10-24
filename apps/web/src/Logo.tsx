import logo from '@lol/shared/logo.svg';

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src={logo} alt="" width={size} height={size} />
      <span className="text-xl font-extrabold tracking-tight text-ink-100">
        L<span className="text-emerald-400">stats</span>
      </span>
    </span>
  );
}
