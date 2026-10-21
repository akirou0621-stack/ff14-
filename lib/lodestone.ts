export type LodestoneProfile = {
  characterName: string;
  world: string;
  datacenter: string;
  mainJob: string;
  fc: string;
  title: string;
  avatar: string;
  url: string;
  levels: Record<string, number>;
};

const JOB_NAME_MAP: Record<string, string> = {
  paladin: 'ナイト',
  warrior: '戦士',
  darkknight: '暗黒騎士',
  gunbreaker: 'ガンブレイカー',
  whitemage: '白魔道士',
  scholar: '学者',
  astrologian: '占星術師',
  sage: '賢者',
  monk: 'モンク',
  dragoon: '竜騎士',
  ninja: '忍者',
  samurai: '侍',
  reaper: 'リーパー',
  bard: '吟遊詩人',
  machinist: '機工士',
  dancer: '踊り子',
  blackmage: '黒魔道士',
  summoner: '召喚士',
  redmage: '赤魔道士',
  bluemage: '青魔道士',
  miner: '採掘',
  botanist: '園芸',
  fisher: '漁師',
  carpenter: '木工師',
  blacksmith: '鍛冶師',
  armorer: '甲冶師',
  goldsmith: '彫金師',
  leatherworker: '革細工師',
  weaver: '裁縫師',
  alchemist: '錬金術師',
  culinarian: '調理師'
};

const DEFAULT_LEVELS: Record<string, number> = {
  paladin: 0,
  warrior: 0,
  darkknight: 0,
  gunbreaker: 0,
  whitemage: 0,
  scholar: 0,
  astrologian: 0,
  sage: 0,
  monk: 0,
  dragoon: 0,
  ninja: 0,
  samurai: 0,
  reaper: 0,
  bard: 0,
  machinist: 0,
  dancer: 0,
  blackmage: 0,
  summoner: 0,
  redmage: 0,
  bluemage: 0,
  miner: 0,
  botanist: 0,
  fisher: 0,
  carpenter: 0,
  blacksmith: 0,
  armorer: 0,
  goldsmith: 0,
  leatherworker: 0,
  weaver: 0,
  alchemist: 0,
  culinarian: 0
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function extractTextFromHtml(html: string) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  );
}

function parseJobLevelsFromText(text: string) {
  const levels: Record<string, number> = { ...DEFAULT_LEVELS };
  const matches = [...text.matchAll(/([A-Za-z\u30A0-\u30FF]+)\s*[:：]\s*(\d{1,3})/g)];

  matches.forEach((match) => {
    const [jobLabel, rawLevel] = [match[1], match[2]];
    const numeric = Number(rawLevel);
    if (!Number.isFinite(numeric)) return;

    const normalized = jobLabel.replace(/\s+/g, '').toLowerCase();
    const key = Object.entries(JOB_NAME_MAP).find(([, value]) =>
      value.replace(/\s+/g, '') === normalized || value.includes(jobLabel)
    )?.[0];

    if (key) levels[key] = numeric;
  });

  return levels;
}

export function resolveCharacterInput(rawUrl?: string | null, characterId?: string | null) {
  if (rawUrl) {
    const value = rawUrl.trim();
    if (value.includes('/lodestone/character/')) return value;
    if (/^\d+$/.test(value)) return `https://jp.finalfantasyxiv.com/lodestone/character/${value}/`;
    return value;
  }

  if (characterId) {
    return `https://jp.finalfantasyxiv.com/lodestone/character/${characterId}/`;
  }

  throw new Error('Lodestone の URL または ID を指定してください。');
}

export async function extractLodestoneProfile(input: string): Promise<LodestoneProfile> {
  const url = input.startsWith('http') ? input : `https://jp.finalfantasyxiv.com/lodestone/character/${input}/`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FFXIVCardGenerator/1.0; +https://github.com/ruruchan1128/ff14-)',
      Accept: 'text/html,application/xhtml+xml'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Lodestone へのアクセスが失敗しました。公開設定 or URL を確認してください。');
  }

  const html = await response.text();

  if (!html || html.length < 200) {
    throw new Error('Lodestone の公開ページからデータを読み取れませんでした。');
  }

  const text = extractTextFromHtml(html);
  const nameMatch = text.match(/([A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF\s]+?)(?:\s+\d+?\s*Lv|\s+Level|\s+レベル)/);
  const characterName = nameMatch?.[1]?.trim() || 'キャラクター';

  const worldMatch = text.match(/([A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF\s]+?)\s*\(([^)]+)\)/);
  const defaultWorld = worldMatch?.[2]?.trim() || 'ワールド未取得';
  const world = defaultWorld || 'ワールド未取得';

  const datacenterMatch = text.match(/データセンター[:：]?[\s\S]*?([A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF]+(?:\s+[A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF]+)*)/);
  const datacenter = datacenterMatch?.[1]?.trim() || '不明';

  const fcMatch = text.match(/FC[:：]?\s*([A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF\s]+)/i);
  const fc = fcMatch?.[1]?.trim() || '未所属';

  const avatarMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  const avatar = avatarMatch?.[1]?.trim() || '';

  const mainJobMatch = text.match(/([A-Za-z\u3040-\u30FF\u4E00-\u9FFF]+)\s*\d+\s*Lv/i);
  const mainJob = mainJobMatch?.[1]?.trim() || '不明';

  const title = normalizeWhitespace(text).slice(0, 80) || 'The Adventurer';

  const levels = parseJobLevelsFromText(text);

  return {
    characterName,
    world,
    datacenter,
    mainJob,
    fc,
    title,
    avatar,
    url,
    levels
  };
}

export function getJobNameById(jobId: string) {
  return JOB_NAME_MAP[jobId] ?? jobId;
}
