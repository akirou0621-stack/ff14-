'use client';

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { COMBAT_JOBS, OTHER_JOBS, capOf, emptyLevels, type JobDef, type JobLevels } from '@/lib/jobs';

const STORAGE_KEY = 'ffxiv-card-generator-v2';

/** 始めたパッチの選択肢（拡張ごとにまとめる）。新しいパッチが来たらここに足す */
const PATCH_GROUPS: { title: string; patches: string[] }[] = [
  { title: '黄金のレガシー', patches: ['7.0', '7.1', '7.2', '7.3', '7.4', '7.5'] },
  { title: '暁月のフィナーレ', patches: ['6.0', '6.1', '6.2', '6.3', '6.4', '6.5'] },
  { title: '漆黒のヴィランズ', patches: ['5.0', '5.1', '5.2', '5.3', '5.4', '5.5'] },
  { title: '紅蓮のリベレーター', patches: ['4.0', '4.1', '4.2', '4.3', '4.4', '4.5'] },
  { title: '蒼天のイシュガルド', patches: ['3.0', '3.1', '3.2', '3.3', '3.4', '3.5'] },
  { title: '新生エオルゼア', patches: ['2.0', '2.1', '2.2', '2.3', '2.4', '2.5'] }
];
const PATCH_OPTIONS = PATCH_GROUPS.flatMap((g) => g.patches.map((p) => `${p} ${g.title}`));
const LEGACY_PATCH = '旧FF14（1.x）';

/** 下半分の色の候補 */
const BASE_PALETTE: { name: string; color: string }[] = [
  { name: 'くすみブルー', color: '#86a2c0' },
  { name: 'ミストブルー', color: '#a3b9cc' },
  { name: 'ネイビーグレー', color: '#6b7a99' },
  { name: 'ティール', color: '#7fa3a0' },
  { name: 'セージ', color: '#9db8a8' },
  { name: 'ラベンダー', color: '#b5a1d0' },
  { name: 'モーヴ', color: '#c9a9c6' },
  { name: 'ローズ', color: '#d9a7b6' },
  { name: 'ベージュ', color: '#c8b49a' },
  { name: 'モカ', color: '#a68a72' },
  { name: 'グレージュ', color: '#9a958f' },
  { name: 'チャコール', color: '#4f5663' }
];
const CARD_W = 1024;
const CARD_H = 1156;

type Profile = {
  characterName: string;
  mainJob: string;
  datacenter: string;
  world: string;
  fcLabel: string;
  fc: string;
  bio: string;
  sns: string;
  patch: string;
  hashtags: string;
  credit: string;
};

type Images = {
  main: string; // 上半分の背景画像
  portraits: [string, string, string];
};

type Look = {
  veil: number; // 文字の後ろの白い背景の濃さ
  base: string; // 下半分の色
  zoom: number; // 一枚絵の拡大
  posX: number; // 一枚絵の位置 0-100
  posY: number;
};

const INITIAL_PROFILE: Profile = {
  characterName: 'Hikari Warrior',
  mainJob: 'WHITE MAGE',
  datacenter: 'Mana',
  world: 'Anima',
  fcLabel: 'FC',
  fc: 'Free Company',
  bio: 'よろしくお願いします。',
  sns: 'X : @your_id',
  patch: '6.0 暁月のフィナーレ',
  hashtags: '#雑談 #コンテンツルーレット #麻雀 #SS #ミラプリ',
  credit: '© SQUARE ENIX'
};

const INITIAL_LEVELS: JobLevels = {
  ...emptyLevels(),
  pld: 100, whm: 100, sch: 92, dnc: 100, rdm: 88, blu: 80, cul: 100, fsh: 74
};

const INITIAL_IMAGES: Images = { main: '', portraits: ['', '', ''] };
const INITIAL_LOOK: Look = { veil: 0.5, base: '#86a2c0', zoom: 1, posX: 50, posY: 50 };
const emptyHours = () => Array<boolean>(24).fill(false);
const hoursFrom = (list: number[]) => Array.from({ length: 24 }, (_, h) => list.includes(h));

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** ロドストの画像を自分のサーバー経由で読み込み、データとして持つ（PNG書き出しで止められないように） */
async function lodestoneImageToData(url: string) {
  const res = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('image');
  const blob = await res.blob();
  return readFile(new File([blob], 'img'));
}

/* ============================== ページ本体 ============================== */

export default function Home() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [levels, setLevels] = useState<JobLevels>(INITIAL_LEVELS);
  const [weekday, setWeekday] = useState<boolean[]>(hoursFrom([20, 21, 22, 23]));
  const [holiday, setHoliday] = useState<boolean[]>(hoursFrom([13, 14, 15, 16, 20, 21, 22, 23]));
  const [images, setImages] = useState<Images>(INITIAL_IMAGES);
  const [look, setLook] = useState<Look>(INITIAL_LOOK);
  const [loaded, setLoaded] = useState(false);

  const [lodestoneUrl, setLodestoneUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: 'ロドストのキャラページのURLを入れると、名前・ワールド・全ジョブのレベルを読み込みます。'
  });
  const [storageNote, setStorageNote] = useState('');

  /* ---------- 保存と復元（ブラウザ内） ---------- */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) {
        if (saved.profile) setProfile({ ...INITIAL_PROFILE, ...saved.profile });
        if (saved.levels) setLevels({ ...emptyLevels(), ...saved.levels });
        if (saved.weekday) setWeekday(saved.weekday);
        if (saved.holiday) setHoliday(saved.holiday);
        if (saved.look) setLook({ ...INITIAL_LOOK, ...saved.look });
        if (saved.images) setImages({ main: saved.images.main ?? '', portraits: saved.images.portraits ?? ['', '', ''] });
      }
    } catch {
      /* 壊れていたら初期値のまま */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const base = { profile, levels, weekday, holiday, look };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, images }));
      setStorageNote('');
    } catch {
      // 画像が大きくて保存しきれないときは、文字だけ保存する
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
        setStorageNote('画像が大きいため、画像は自動保存されません（ページを閉じると消えます）。');
      } catch {
        setStorageNote('このブラウザでは自動保存できません。');
      }
    }
  }, [loaded, profile, levels, weekday, holiday, look, images]);

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((p) => ({ ...p, [key]: value }));
  const updateLook = <K extends keyof Look>(key: K, value: Look[K]) => setLook((l) => ({ ...l, [key]: value }));

  const setLevel = (id: string, raw: string) => {
    const n = parseInt(raw, 10);
    setLevels((prev) => ({ ...prev, [id]: Number.isFinite(n) && n > 0 ? Math.min(n, 999) : null }));
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 'main' | 0 | 1 | 2) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const data = await readFile(file);
    setImages((prev) => {
      if (typeof slot === 'number') {
        const portraits = [...prev.portraits] as Images['portraits'];
        portraits[slot] = data;
        return { ...prev, portraits };
      }
      return { ...prev, [slot]: data };
    });
  };

  /* ---------- ロドストから読み込み ---------- */
  const fetchLodestone = async () => {
    if (!lodestoneUrl.trim()) {
      setStatus({ type: 'error', message: 'ロドストのURLかキャラクターIDを入力してください。' });
      return;
    }
    setIsLoading(true);
    setStatus({ type: 'idle', message: 'ロドストから読み込んでいます…' });
    try {
      const res = await fetch(`/api/lodestone?url=${encodeURIComponent(lodestoneUrl.trim())}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || '読み込みに失敗しました。');
      const d = json.data;

      setProfile((p) => ({
        ...p,
        characterName: d.characterName || p.characterName,
        world: d.world || p.world,
        datacenter: d.datacenter || p.datacenter,
        fc: d.fc || p.fc
      }));
      setLevels({ ...emptyLevels(), ...d.levels });

      // 顔アイコンは、まだ自分で入れていなければ丸アイコン1に入れる（上半分の背景は自分で選ぶ）
      const imageTasks: Promise<void>[] = [];
      if (d.face && !images.portraits[0]) {
        imageTasks.push(
          lodestoneImageToData(d.face).then((data) =>
            setImages((p) => ({ ...p, portraits: [data, p.portraits[1], p.portraits[2]] }))
          )
        );
      }
      await Promise.allSettled(imageTasks);

      setStatus({
        type: 'success',
        message: `${d.characterName} を読み込みました（解放済み ${d.unlockedCount} ジョブ）。違うところは手で直せます。`
      });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : '読み込みに失敗しました。' });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- PNG書き出し ---------- */
  const exportPng = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 2,
        cacheBust: true
      });
      setExported(dataUrl);
      const a = document.createElement('a');
      a.download = `${profile.characterName || 'ffxiv-card'}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: '画像の書き出しに失敗しました。画像を入れ直してもう一度試してください。' });
    } finally {
      setIsExporting(false);
    }
  };

  const resetAll = () => {
    setProfile(INITIAL_PROFILE);
    setLevels(emptyLevels());
    setWeekday(emptyHours());
    setHoliday(emptyHours());
    setImages(INITIAL_IMAGES);
    setLook(INITIAL_LOOK);
  };

  return (
    <main className="shell">
      <header className="page-head">
        <h1>FFXIV Profile Card</h1>
        <p>入力するとすぐプレビューに反映されます。最後に「PNGで保存」。</p>
      </header>

      <div className="workspace">
        {/* ============ 編集パネル ============ */}
        <div className="editor">
          <section className="box">
            <h2>ロドストから読み込む</h2>
            <div className="lodestone-row">
              <input
                id="lodestone-url"
                value={lodestoneUrl}
                onChange={(e) => setLodestoneUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLodestone()}
                placeholder="https://jp.finalfantasyxiv.com/lodestone/character/12345678/"
              />
              <button className="primary" onClick={fetchLodestone} disabled={isLoading}>
                {isLoading ? '読み込み中…' : '読み込む'}
              </button>
            </div>
            <p className={`status ${status.type}`}>{status.message}</p>
            <LodestoneHelp />
          </section>

          <section className="box">
            <h2>プロフィール</h2>
            <Field id="name" label="キャラクター名" value={profile.characterName} onChange={(v) => update('characterName', v)} />
            <div className="grid3">
              <Field id="mainjob" label="メインジョブ" value={profile.mainJob} onChange={(v) => update('mainJob', v)} />
              <Field id="dc" label="データセンター" value={profile.datacenter} onChange={(v) => update('datacenter', v)} />
              <Field id="world" label="ワールド" value={profile.world} onChange={(v) => update('world', v)} />
            </div>
            <div className="grid2">
              <Field id="fclabel" label="小見出し" value={profile.fcLabel} onChange={(v) => update('fcLabel', v)} />
              <Field id="fc" label="FC名など" value={profile.fc} onChange={(v) => update('fc', v)} />
            </div>
            <label className="field" htmlFor="bio">
              <span>ひとこと</span>
              <textarea id="bio" value={profile.bio} onChange={(e) => update('bio', e.target.value)} />
            </label>
            <Field id="sns" label="SNSなど" value={profile.sns} onChange={(v) => update('sns', v)} />
          </section>

          <section className="box">
            <h2>ジョブレベル</h2>
            <p className="hint">空欄は未解放として、カードでは何も表示されません。カンストは金色になります。</p>
            <LevelInputs jobs={COMBAT_JOBS} levels={levels} onChange={setLevel} />
            <LevelInputs jobs={OTHER_JOBS} levels={levels} onChange={setLevel} />
          </section>

          <section className="box">
            <h2>Patch / PLAY time</h2>
            <label className="field" htmlFor="patch">
              <span>始めたパッチ</span>
              <select id="patch" value={profile.patch} onChange={(e) => update('patch', e.target.value)}>
                <option value="">（表示しない）</option>
                {profile.patch && profile.patch !== LEGACY_PATCH && !PATCH_OPTIONS.includes(profile.patch) && (
                  <option value={profile.patch}>{profile.patch}</option>
                )}
                {PATCH_GROUPS.map((g) => (
                  <optgroup key={g.title} label={g.title}>
                    {g.patches.map((p) => (
                      <option key={p} value={`${p} ${g.title}`}>{`${p} ${g.title}`}</option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="それより前">
                  <option value={LEGACY_PATCH}>{LEGACY_PATCH}</option>
                </optgroup>
              </select>
            </label>
            <p className="hint">遊ぶ時間帯をなぞって塗ってください。塗ったマスをなぞると消えます。</p>
            <HourPicker rows={[['平日', weekday, setWeekday], ['休日', holiday, setHoliday]]} />
          </section>

          <section className="box">
            <h2>画像</h2>
            <ImageInput id="img-main" label="背景画像（上半分）" has={!!images.main}
              onPick={(e) => upload(e, 'main')} onClear={() => setImages((p) => ({ ...p, main: '' }))} />
            <div className="grid3">
              <Range id="zoom" label="背景 拡大" min={1} max={3} step={0.01} value={look.zoom} onChange={(v) => updateLook('zoom', v)} />
              <Range id="posx" label="背景 左右" min={0} max={100} step={1} value={look.posX} onChange={(v) => updateLook('posX', v)} />
              <Range id="posy" label="背景 上下" min={0} max={100} step={1} value={look.posY} onChange={(v) => updateLook('posY', v)} />
            </div>
            <div className="grid3">
              {([0, 1, 2] as const).map((i) => (
                <ImageInput key={i} id={`img-p${i}`} label={`丸アイコン ${i + 1}`} has={!!images.portraits[i]}
                  onPick={(e) => upload(e, i)}
                  onClear={() => setImages((p) => {
                    const portraits = [...p.portraits] as Images['portraits'];
                    portraits[i] = '';
                    return { ...p, portraits };
                  })} />
              ))}
            </div>
            <Range id="veil" label="文字の後ろの白い背景（右ほど濃い）" min={0} max={0.9} step={0.01} value={look.veil} onChange={(v) => updateLook('veil', v)} />
            <div className="field">
              <span>下半分の色</span>
              <div className="palette" role="radiogroup" aria-label="下半分の色">
                {BASE_PALETTE.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    role="radio"
                    aria-checked={look.base.toLowerCase() === c.color}
                    aria-label={c.name}
                    title={c.name}
                    className="swatch"
                    style={{ background: c.color }}
                    onClick={() => updateLook('base', c.color)}
                  />
                ))}
                <label className="swatch custom" title="自分で選ぶ" htmlFor="base">
                  <input id="base" type="color" value={look.base} onChange={(e) => updateLook('base', e.target.value)} />
                </label>
              </div>
            </div>
            {storageNote && <p className="hint warn">{storageNote}</p>}
          </section>

          <section className="box">
            <h2>タグと表記</h2>
            <Field id="tags" label="ハッシュタグ（スペース区切り）" value={profile.hashtags} onChange={(v) => update('hashtags', v)} />
            <Field id="credit" label="権利表記" value={profile.credit} onChange={(v) => update('credit', v)} />
            <button className="ghost" onClick={resetAll}>すべて空にする</button>
          </section>
        </div>

        {/* ============ プレビュー ============ */}
        <div className="preview">
          <ScaledCard>
            <Card ref={cardRef} profile={profile} levels={levels} weekday={weekday} holiday={holiday} images={images} look={look} />
          </ScaledCard>
          <button className="primary big" onClick={exportPng} disabled={isExporting}>
            {isExporting ? '書き出し中…' : 'PNGで保存'}
          </button>
          {exported && (
            <p className="hint">ダウンロードされない場合は、下の画像を長押し（スマホ）か右クリックで保存してください。</p>
          )}
          {exported && <img className="exported" src={exported} alt="書き出したカード" />}
        </div>
      </div>
    </main>
  );
}

/* ============================== カード ============================== */

type CardProps = {
  profile: Profile;
  levels: JobLevels;
  weekday: boolean[];
  holiday: boolean[];
  images: Images;
  look: Look;
};

const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ profile, levels, weekday, holiday, images, look }, ref) {
  // 名前が長いときは自動で文字を小さくする（だいたい 0.5文字幅 × 文字数 が 940px に収まるように）
  const nameSize = Math.min(104, Math.floor(1880 / Math.max(profile.characterName.length, 1)));
  const tags = profile.hashtags.split(/\s+/).filter(Boolean);

  return (
    <div ref={ref} className="card" style={{ '--base': look.base } as React.CSSProperties}>
      <div className="card-top">
        {images.main ? (
          <img
            className="cover"
            src={images.main}
            alt=""
            style={{
              objectPosition: `${look.posX}% ${look.posY}%`,
              transform: `scale(${look.zoom})`,
              transformOrigin: `${look.posX}% ${look.posY}%`
            }}
          />
        ) : (
          <div className="cover placeholder-bg">
            <span>背景画像</span>
          </div>
        )}
        <div className="card-veil" style={{ background: `rgba(255,255,255,${look.veil})` }} />
        <div className="card-text">
          <div className="c-name" style={{ fontSize: nameSize }}>{profile.characterName}</div>
          <div className="c-job">{profile.mainJob}</div>
          <div className="c-dc">{profile.datacenter}</div>
          <div className="c-dc">{profile.world}</div>
          <div className="c-fclabel">{profile.fcLabel}</div>
          <div className="c-fc">{profile.fc}</div>
          <div className="c-bio">{profile.bio}</div>
          <div className="c-sns">{profile.sns}</div>
        </div>
      </div>

      <div className="card-bottom">
        <div className="c-portraits">
          {images.portraits.map((src, i) => (
            <div key={i} className="c-portrait">
              {src ? <img src={src} alt="" /> : <span>IMAGE {i + 1}</span>}
            </div>
          ))}
        </div>

        <div className="c-main">
          <JobTable jobs={COMBAT_JOBS} levels={levels} />
          <JobTable jobs={OTHER_JOBS} levels={levels} />

          <div className="c-info">
            <div className="c-patch">
              <div className="c-label">Patch</div>
              <div className="c-patch-value">{profile.patch}</div>
              <div className="c-tags">
                {tags.map((t, i) => <span key={`${t}-${i}`}>{t.startsWith('#') ? t : `#${t}`}</span>)}
              </div>
            </div>
            <div className="c-time">
              <div className="c-label">PLAY time</div>
              <HourBar label="平日" hours={weekday} />
              <HourBar label="休日" hours={holiday} />
            </div>
          </div>
        </div>

        {profile.credit && <div className="c-credit">{profile.credit}</div>}
      </div>
    </div>
  );
});

function JobTable({ jobs, levels }: { jobs: JobDef[]; levels: JobLevels }) {
  return (
    <div className="c-jobs" style={{ gridTemplateColumns: `repeat(${jobs.length}, 35.5px)` }}>
      {jobs.map((j) => (
        <div key={j.id} className="c-job-icon">
          <img src={`/jobs/${j.id}.png`} alt={j.label} />
        </div>
      ))}
      {jobs.map((j) => {
        const lv = levels[j.id];
        return (
          <div key={j.id} className={`c-job-lv${lv != null && lv >= capOf(j.id) ? ' cap' : ''}`}>
            {lv ?? ''}
          </div>
        );
      })}
    </div>
  );
}

function HourBar({ label, hours }: { label: string; hours: boolean[] }) {
  return (
    <div className="c-hour-row">
      <span className="c-hour-label">{label}</span>
      <div className="c-hour-track">
        <div className="c-hour-ticks">
          {[0, 6, 12, 18, 24].map((h) => <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{h}</span>)}
        </div>
        <div className="c-hour-cells">
          {hours.map((on, h) => <i key={h} className={on ? 'on' : ''} />)}
        </div>
      </div>
    </div>
  );
}

/** カードは 1024px で作り、画面幅に合わせて縮小表示する（書き出しは原寸） */
function ScaledCard({ children }: { children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / CARD_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={boxRef} className="card-scaler" style={{ height: CARD_H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CARD_W }}>{children}</div>
    </div>
  );
}

/* ============================== 入力部品 ============================== */

/** 「ロドストのURL・IDの調べ方」の折りたたみ説明 */
function LodestoneHelp() {
  return (
    <details className="help">
      <summary>ロドストのURL・IDの調べ方</summary>
      <p className="help-lead">
        <a href="https://jp.finalfantasyxiv.com/lodestone/" target="_blank" rel="noreferrer">ロドスト</a>
        を開き、ログインして「マイページ」から自分のキャラクターのページへ進みます。ページのURLをコピーして、上の入力欄に貼り付けてください。URL末尾の数字（キャラクターID）だけでも読み込めます。
      </p>
      <div className="browser" aria-label="キャラクターページを開いたときのブラウザの見本">
        <div className="browser-tabs">
          <span className="browser-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="browser-tab">キャラクター名 | FINAL FANTASY XIV</span>
        </div>
        <div className="browser-bar">
          <span className="browser-url">
            jp.finalfantasyxiv.com/lodestone/character/<mark>12345678/</mark>
          </span>
        </div>
        <div className="browser-callout">ここの数字</div>
        <div className="browser-page" aria-hidden="true">
          <span>マイページ</span><span>›</span><span>マイキャラクター</span>
        </div>
      </div>
      <p className="hint">
        ログインしない場合は、
        <a href="https://jp.finalfantasyxiv.com/lodestone/character/" target="_blank" rel="noreferrer">キャラクター検索</a>
        でキャラクター名とワールドを入れて探し、自分のキャラのページを開いてもOKです。
      </p>
    </details>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Range(props: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field" htmlFor={props.id}>
      <span>{props.label}</span>
      <input id={props.id} type="range" min={props.min} max={props.max} step={props.step} value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))} />
    </label>
  );
}

function ImageInput(props: { id: string; label: string; has: boolean; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void }) {
  return (
    <div className="field">
      <span>{props.label}</span>
      <div className="image-input">
        <label className="ghost small" htmlFor={props.id}>{props.has ? '変更' : '選択'}</label>
        <input id={props.id} type="file" accept="image/*" onChange={props.onPick} hidden />
        {props.has && <button type="button" className="ghost small" onClick={props.onClear}>削除</button>}
      </div>
    </div>
  );
}

function LevelInputs({ jobs, levels, onChange }: { jobs: JobDef[]; levels: JobLevels; onChange: (id: string, v: string) => void }) {
  return (
    <div className="level-inputs">
      {jobs.map((j) => {
        const lv = levels[j.id];
        return (
          <label key={j.id} className={`level-input${lv != null && lv >= capOf(j.id) ? ' cap' : ''}`} htmlFor={`lv-${j.id}`} title={j.label}>
            <img src={`/jobs/${j.id}.png`} alt="" />
            <input id={`lv-${j.id}`} inputMode="numeric" value={lv ?? ''} placeholder="-"
              aria-label={`${j.label}のレベル`} onChange={(e) => onChange(j.id, e.target.value.replace(/\D/g, ''))} />
          </label>
        );
      })}
    </div>
  );
}

type HourRow = [string, boolean[], React.Dispatch<React.SetStateAction<boolean[]>>];

function HourPicker({ rows }: { rows: HourRow[] }) {
  const paint = useRef<{ row: number; value: boolean } | null>(null);

  useEffect(() => {
    const stop = () => (paint.current = null);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const set = (row: number, h: number, value: boolean) =>
    rows[row][2]((prev) => (prev[h] === value ? prev : prev.map((v, i) => (i === h ? value : v))));

  const onMove = (e: React.PointerEvent) => {
    if (!paint.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const h = el?.dataset?.hour;
    const r = el?.dataset?.row;
    if (h != null && r != null && Number(r) === paint.current.row) set(Number(r), Number(h), paint.current.value);
  };

  return (
    <div className="hour-picker" onPointerMove={onMove}>
      <div className="hour-ticks">
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 6 === 0 ? h : ''}</span>)}
      </div>
      {rows.map(([label, hours], r) => (
        <div key={label} className="hour-row">
          <span>{label}</span>
          {hours.map((on, h) => (
            <button
              key={h}
              type="button"
              data-row={r}
              data-hour={h}
              className={on ? 'on' : ''}
              aria-label={`${label} ${h}時`}
              aria-pressed={on}
              onPointerDown={(e) => {
                e.preventDefault();
                paint.current = { row: r, value: !on };
                set(r, h, !on);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  set(r, h, !on);
                }
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

