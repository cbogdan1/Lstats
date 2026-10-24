import type { Account, RiotId } from '@lol/shared';

// `?.` because import.meta.env only exists under Vite, not when tests run in plain Node.
const API_URL: string = import.meta.env?.VITE_API_URL ?? '/api';

/** `Name#TAG` -> RiotId, using the same length limits the proxy enforces. */
export function parseRiotId(input: string): RiotId | null {
  const hash = input.lastIndexOf('#');
  const gameName = input.slice(0, hash).trim();
  const tagLine = input.slice(hash + 1).trim();
  if (hash < 0 || gameName.length < 3 || gameName.length > 16) return null;
  if (tagLine.length < 3 || tagLine.length > 5) return null;
  return { gameName, tagLine };
}

export async function fetchAccount(
  { gameName, tagLine }: RiotId,
  apiUrl = API_URL,
): Promise<Account> {
  const res = await fetch(
    `${apiUrl}/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  );
  if (res.status === 404) throw new Error('Player not found. Check the name and tag.');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
  return body as Account;
}
