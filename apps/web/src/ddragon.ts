// Riot's static asset CDNs. Data Dragon: champion/item/profile icons. Community Dragon: rank crests.
const DDRAGON = 'https://ddragon.leagueoflegends.com';
const CDRAGON = 'https://raw.communitydragon.org/latest';

export interface StaticData {
  version: string;
  /** Champion numeric key ("246") -> Data Dragon id ("Qiyana") and display name. */
  champions: Record<string, { id: string; name: string }>;
}

let staticData: Promise<StaticData> | undefined;

export function loadStaticData(): Promise<StaticData> {
  staticData ??= (async () => {
    const [version] = (await (await fetch(`${DDRAGON}/api/versions.json`)).json()) as string[];
    const res = await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`);
    const { data } = (await res.json()) as {
      data: Record<string, { id: string; key: string; name: string }>;
    };
    const champions = Object.fromEntries(
      Object.values(data).map((c) => [c.key, { id: c.id, name: c.name }]),
    );
    return { version: version!, champions };
  })();
  return staticData;
}

export const championIcon = (version: string, id: string) =>
  `${DDRAGON}/cdn/${version}/img/champion/${id}.png`;
export const itemIcon = (version: string, id: number) =>
  `${DDRAGON}/cdn/${version}/img/item/${id}.png`;
export const profileIcon = (version: string, id: number) =>
  `${DDRAGON}/cdn/${version}/img/profileicon/${id}.png`;
export const rankCrest = (tier: string) =>
  `${CDRAGON}/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.svg`;
