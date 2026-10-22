// ジョブ定義（カードに並ぶ順番）。
// names には「ロドストに表示されうる名前」をすべて入れておく。
// ジョブを取得する前はクラス名（剣術士など）で表示されるため、それも含める。

export type JobDef = {
  id: string;
  label: string; // 画面に出す日本語名
  en: string; // カードに出す英語名
  names: string[]; // ロドスト上の表記（日本語・英語・クラス名）
};

export const COMBAT_JOBS: JobDef[] = [
  { id: 'pld', label: 'ナイト', en: 'PALADIN', names: ['ナイト', '剣術士', 'Paladin', 'Gladiator'] },
  { id: 'war', label: '戦士', en: 'WARRIOR', names: ['戦士', '斧術士', 'Warrior', 'Marauder'] },
  { id: 'drk', label: '暗黒騎士', en: 'DARK KNIGHT', names: ['暗黒騎士', 'Dark Knight'] },
  { id: 'gnb', label: 'ガンブレイカー', en: 'GUNBREAKER', names: ['ガンブレイカー', 'Gunbreaker'] },
  { id: 'whm', label: '白魔道士', en: 'WHITE MAGE', names: ['白魔道士', '幻術士', 'White Mage', 'Conjurer'] },
  { id: 'sch', label: '学者', en: 'SCHOLAR', names: ['学者', 'Scholar'] },
  { id: 'ast', label: '占星術師', en: 'ASTROLOGIAN', names: ['占星術師', 'Astrologian'] },
  { id: 'sge', label: '賢者', en: 'SAGE', names: ['賢者', 'Sage'] },
  { id: 'mnk', label: 'モンク', en: 'MONK', names: ['モンク', '格闘士', 'Monk', 'Pugilist'] },
  { id: 'drg', label: '竜騎士', en: 'DRAGOON', names: ['竜騎士', '槍術士', 'Dragoon', 'Lancer'] },
  { id: 'nin', label: '忍者', en: 'NINJA', names: ['忍者', '双剣士', 'Ninja', 'Rogue'] },
  { id: 'sam', label: '侍', en: 'SAMURAI', names: ['侍', 'Samurai'] },
  { id: 'rpr', label: 'リーパー', en: 'REAPER', names: ['リーパー', 'Reaper'] },
  { id: 'vpr', label: 'ヴァイパー', en: 'VIPER', names: ['ヴァイパー', 'Viper'] },
  { id: 'brd', label: '吟遊詩人', en: 'BARD', names: ['吟遊詩人', '弓術士', 'Bard', 'Archer'] },
  { id: 'mch', label: '機工士', en: 'MACHINIST', names: ['機工士', 'Machinist'] },
  { id: 'dnc', label: '踊り子', en: 'DANCER', names: ['踊り子', 'Dancer'] },
  { id: 'blm', label: '黒魔道士', en: 'BLACK MAGE', names: ['黒魔道士', '呪術士', 'Black Mage', 'Thaumaturge'] },
  { id: 'smn', label: '召喚士', en: 'SUMMONER', names: ['召喚士', '巴術士', 'Summoner', 'Arcanist'] },
  { id: 'rdm', label: '赤魔道士', en: 'RED MAGE', names: ['赤魔道士', 'Red Mage'] },
  { id: 'pct', label: 'ピクトマンサー', en: 'PICTOMANCER', names: ['ピクトマンサー', 'Pictomancer'] }
];

export const OTHER_JOBS: JobDef[] = [
  { id: 'blu', label: '青魔道士', en: 'BLUE MAGE', names: ['青魔道士', 'Blue Mage'] },
  { id: 'bst', label: '魔獣使い', en: 'BEASTMASTER', names: ['魔獣使い', 'Beastmaster'] },
  { id: 'crp', label: '木工師', en: 'CARPENTER', names: ['木工師', 'Carpenter'] },
  { id: 'bsm', label: '鍛冶師', en: 'BLACKSMITH', names: ['鍛冶師', 'Blacksmith'] },
  { id: 'arm', label: '甲冑師', en: 'ARMORER', names: ['甲冑師', 'Armorer'] },
  { id: 'gsm', label: '彫金師', en: 'GOLDSMITH', names: ['彫金師', 'Goldsmith'] },
  { id: 'ltw', label: '革細工師', en: 'LEATHERWORKER', names: ['革細工師', 'Leatherworker'] },
  { id: 'wvr', label: '裁縫師', en: 'WEAVER', names: ['裁縫師', 'Weaver'] },
  { id: 'alc', label: '錬金術師', en: 'ALCHEMIST', names: ['錬金術師', 'Alchemist'] },
  { id: 'cul', label: '調理師', en: 'CULINARIAN', names: ['調理師', 'Culinarian'] },
  { id: 'min', label: '採掘師', en: 'MINER', names: ['採掘師', 'Miner'] },
  { id: 'btn', label: '園芸師', en: 'BOTANIST', names: ['園芸師', 'Botanist'] },
  { id: 'fsh', label: '漁師', en: 'FISHER', names: ['漁師', 'Fisher'] }
];

export const ALL_JOBS = [...COMBAT_JOBS, ...OTHER_JOBS];

// カードの下段は「リミテッド」「クラフター」「ギャザラー」を少し離して並べる
const pick = (ids: string[]) => OTHER_JOBS.filter((j) => ids.includes(j.id));
export const LIMITED_JOBS = pick(['blu', 'bst']);
export const CRAFTER_JOBS = pick(['crp', 'bsm', 'arm', 'gsm', 'ltw', 'wvr', 'alc', 'cul']);
export const GATHERER_JOBS = pick(['min', 'btn', 'fsh']);

/** レベル上限（カンスト表示に使う）。拡張で上がったらここを変える */
export const LEVEL_CAP: Record<string, number> = { blu: 80 };
export const DEFAULT_LEVEL_CAP = 100;
export const capOf = (id: string) => LEVEL_CAP[id] ?? DEFAULT_LEVEL_CAP;

/** null = 未解放 */
export type JobLevels = Record<string, number | null>;

export function emptyLevels(): JobLevels {
  return Object.fromEntries(ALL_JOBS.map((j) => [j.id, null]));
}

const NAME_INDEX = new Map<string, string>();
ALL_JOBS.forEach((j) => j.names.forEach((n) => NAME_INDEX.set(n.toLowerCase(), j.id)));

/** ロドスト上の表記からジョブIDを探す（「ナイト / 剣術士」のような表記にも対応） */
export function jobIdFromName(raw: string): string | undefined {
  for (const part of raw.split('/')) {
    const id = NAME_INDEX.get(part.trim().toLowerCase());
    if (id) return id;
  }
  return undefined;
}

/** メインジョブの選択肢（ロールごと） */
export const JOB_ROLES: { title: string; ids: string[] }[] = [
  { title: 'タンク', ids: ['pld', 'war', 'drk', 'gnb'] },
  { title: 'ヒーラー', ids: ['whm', 'sch', 'ast', 'sge'] },
  { title: '近接DPS', ids: ['mnk', 'drg', 'nin', 'sam', 'rpr', 'vpr'] },
  { title: '遠隔物理DPS', ids: ['brd', 'mch', 'dnc'] },
  { title: '遠隔魔法DPS', ids: ['blm', 'smn', 'rdm', 'pct'] },
  { title: 'リミテッド', ids: ['blu', 'bst'] },
  { title: 'クラフター', ids: ['crp', 'bsm', 'arm', 'gsm', 'ltw', 'wvr', 'alc', 'cul'] },
  { title: 'ギャザラー', ids: ['min', 'btn', 'fsh'] }
];
export const jobById = (id: string) => ALL_JOBS.find((j) => j.id === id);
