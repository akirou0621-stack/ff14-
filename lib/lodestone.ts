import * as cheerio from 'cheerio';
import { emptyLevels, jobIdFromName, type JobLevels } from './jobs';

// ロドストのページは2つに分かれている
//   /lodestone/character/ID/            名前・ワールド・FC・画像
//   /lodestone/character/ID/class_job/  全ジョブのレベル
// HTML の「目印（クラス名）」を頼りに中身を取り出す。
// ロドストのデザインが変わったら、下の SELECTORS を直せば復活する。

const SELECTORS = {
  name: '.frame__chara__name',
  world: '.frame__chara__world', // 例: "Mandragora [Meteor]"
  title: '.frame__chara__title',
  fc: '.character__freecompany__name h4 a',
  portrait: '.character__detail__image img, .js__image_popup > img',
  face: '.frame__chara__face img',
  jobItem: '.character__job li',
  jobLevel: '.character__job__level',
  jobName: '.character__job__name'
};

const REGIONS = ['jp', 'na', 'eu', 'fr', 'de'];

export type LodestoneProfile = {
  id: string;
  region: string;
  characterName: string;
  world: string;
  datacenter: string;
  title: string;
  fc: string;
  portrait: string; // 全身画像
  face: string; // 顔アイコン
  levels: JobLevels; // null = 未解放
  unlockedCount: number;
};

/** URL でも ID だけでも受け付けて、地域と ID に分解する */
export function parseCharacterInput(input: string) {
  const value = input.trim();
  const m = value.match(/(?:https?:\/\/)?(\w+)\.finalfantasyxiv\.com\/lodestone\/character\/(\d+)/i);
  if (m) {
    const region = REGIONS.includes(m[1].toLowerCase()) ? m[1].toLowerCase() : 'jp';
    return { region, id: m[2] };
  }
  if (/^\d{1,12}$/.test(value)) return { region: 'jp', id: value };
  throw new Error('ロドストのキャラクターページのURL（…/lodestone/character/数字/）か、キャラクターIDを入力してください。');
}

async function getHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FFXIVCardGenerator/2.0; +https://github.com/ruruchan1128/ff14-)',
      'Accept-Language': 'ja,en;q=0.8'
    },
    // 同じキャラを短時間に何度も取りに行かないよう10分キャッシュ
    next: { revalidate: 600 }
  });
  if (res.status === 404) throw new Error('キャラクターが見つかりませんでした。URL か ID を確認してください。');
  if (res.status === 503) throw new Error('ロドストがメンテナンス中のようです。時間をおいて試してください。');
  if (!res.ok) throw new Error(`ロドストにアクセスできませんでした（${res.status}）。`);
  return res.text();
}

export function parseProfilePage(html: string) {
  const $ = cheerio.load(html);
  const worldText = $(SELECTORS.world).first().text().trim();
  const wm = worldText.match(/^(.+?)\s*\[(.+?)\]/);
  return {
    characterName: $(SELECTORS.name).first().text().trim(),
    world: wm ? wm[1].trim() : worldText,
    datacenter: wm ? wm[2].trim() : '',
    title: $(SELECTORS.title).first().text().trim(),
    fc: $(SELECTORS.fc).first().text().trim(),
    portrait: $(SELECTORS.portrait).first().attr('src') ?? '',
    face: $(SELECTORS.face).first().attr('src') ?? ''
  };
}

export function parseClassJobPage(html: string) {
  const $ = cheerio.load(html);
  const levels = emptyLevels();
  $(SELECTORS.jobItem).each((_, li) => {
    // クラス名で見つからなければ「li の中の 3番目＝名前、2番目＝レベル」という並び順で探す
    let nameEl = $(li).find(SELECTORS.jobName).first();
    if (!nameEl.length) nameEl = $(li).children().eq(2);
    let levelEl = $(li).find(SELECTORS.jobLevel).first();
    if (!levelEl.length) levelEl = $(li).children().eq(1);

    const id = jobIdFromName(nameEl.text()) ?? jobIdFromName(nameEl.attr('data-tooltip') ?? '');
    if (!id) return; // ボズヤ・エウレカなどカードに無いものは無視
    const raw = levelEl.text().trim();
    const lv = Number(raw);
    levels[id] = raw !== '' && raw !== '-' && Number.isFinite(lv) && lv > 0 ? lv : null;
  });
  return levels;
}

export async function fetchLodestoneProfile(input: string): Promise<LodestoneProfile> {
  const { region, id } = parseCharacterInput(input);
  const base = `https://${region}.finalfantasyxiv.com/lodestone/character/${id}/`;
  const [profileHtml, jobHtml] = await Promise.all([getHtml(base), getHtml(`${base}class_job/`)]);

  const profile = parseProfilePage(profileHtml);
  if (!profile.characterName) {
    throw new Error('ページは開けましたが、キャラクター情報を読み取れませんでした。ロドストの表示が変わった可能性があります。');
  }
  const levels = parseClassJobPage(jobHtml);
  const unlockedCount = Object.values(levels).filter((v) => v !== null).length;

  return { id, region, ...profile, levels, unlockedCount };
}
