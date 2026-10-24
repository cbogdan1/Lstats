import type { Platform, PlayerProfile, RiotId } from '@lol/shared';

// `?.` because import.meta.env only exists under Vite, not when tests run in plain Node.
const API_URL: string = import.meta.env?.VITE_API_URL ?? '/api';

export const DEFAULT_PLATFORM: Platform = 'eun1';

export const PLATFORM_LABELS: Record<Platform, string> = {
  eun1: 'EUNE',
  euw1: 'EUW',
  na1: 'NA',
  kr: 'KR',
  br1: 'BR',
  la1: 'LAN',
  la2: 'LAS',
  oc1: 'OCE',
  tr1: 'TR',
  ru: 'RU',
  jp1: 'JP',
  me1: 'ME',
  sg2: 'SG',
  tw2: 'TW',
  vn2: 'VN',
};

export function isPlatform(value: string | null): value is Platform {
  return value !== null && Object.hasOwn(PLATFORM_LABELS, value);
}

/** `Name#TAG` -> RiotId, using the same length limits the proxy enforces. */
export function parseRiotId(input: string): RiotId | null {
  const hash = input.lastIndexOf('#');
  const gameName = input.slice(0, hash).trim();
  const tagLine = input.slice(hash + 1).trim();
  if (hash < 0 || gameName.length < 3 || gameName.length > 16) return null;
  if (tagLine.length < 3 || tagLine.length > 5) return null;
  return { gameName, tagLine };
}

export async function fetchProfile(
  platform: Platform,
  { gameName, tagLine }: RiotId,
  apiUrl = API_URL,
): Promise<PlayerProfile> {
  const res = await fetch(
    `${apiUrl}/profile/${platform}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
  return body as PlayerProfile;
}
