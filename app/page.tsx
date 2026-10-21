"use client";

import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

const STORAGE_KEY = 'ffxiv-card-generator-state';

const JOB_GROUPS = [
  {
    title: 'タンク',
    jobs: [
      { id: 'paladin', name: 'ナイト' },
      { id: 'warrior', name: '戦士' },
      { id: 'darkknight', name: '暗黒騎士' },
      { id: 'gunbreaker', name: 'ガンブレイカー' }
    ]
  },
  {
    title: 'ヒーラー',
    jobs: [
      { id: 'whitemage', name: '白魔道士' },
      { id: 'scholar', name: '学者' },
      { id: 'astrologian', name: '占星術師' },
      { id: 'sage', name: '賢者' }
    ]
  },
  {
    title: '近接物理DPS',
    jobs: [
      { id: 'monk', name: 'モンク' },
      { id: 'dragoon', name: '竜騎士' },
      { id: 'ninja', name: '忍者' },
      { id: 'samurai', name: '侍' },
      { id: 'reaper', name: 'リーパー' }
    ]
  },
  {
    title: '遠隔物理DPS',
    jobs: [
      { id: 'bard', name: '吟遊詩人' },
      { id: 'machinist', name: '機工士' },
      { id: 'dancer', name: '踊り子' }
    ]
  },
  {
    title: '遠隔魔法DPS',
    jobs: [
      { id: 'blackmage', name: '黒魔道士' },
      { id: 'summoner', name: '召喚士' },
      { id: 'redmage', name: '赤魔道士' },
      { id: 'bluemage', name: '青魔道士' }
    ]
  },
  {
    title: 'ギャザラー',
    jobs: [
      { id: 'miner', name: '採掘' },
      { id: 'botanist', name: '園芸' },
      { id: 'fisher', name: '漁師' }
    ]
  },
  {
    title: 'クラフター',
    jobs: [
      { id: 'carpenter', name: '木工師' },
      { id: 'blacksmith', name: '鍛冶師' },
      { id: 'armorer', name: '甲冶師' },
      { id: 'goldsmith', name: '彫金師' },
      { id: 'leatherworker', name: '革細工師' },
      { id: 'weaver', name: '裁縫師' },
      { id: 'alchemist', name: '錬金術師' },
      { id: 'culinarian', name: '調理師' }
    ]
  }
];

const DEFAULT_JOB_LEVELS: Record<string, number> = {
  paladin: 90,
  warrior: 80,
  darkknight: 90,
  gunbreaker: 90,
  whitemage: 100,
  scholar: 90,
  astrologian: 90,
  sage: 100,
  monk: 100,
  dragoon: 100,
  ninja: 100,
  samurai: 100,
  reaper: 100,
  bard: 100,
  machinist: 100,
  dancer: 100,
  blackmage: 100,
  summoner: 100,
  redmage: 100,
  bluemage: 100,
  miner: 100,
  botanist: 100,
  fisher: 100,
  carpenter: 100,
  blacksmith: 100,
  armorer: 100,
  goldsmith: 100,
  leatherworker: 100,
  weaver: 100,
  alchemist: 100,
  culinarian: 100
};

const INITIAL_PROFILE = {
  characterName: 'Aster Kisaragi',
  mainJob: '白魔道士',
  world: 'ラールガーデン',
  datacenter: 'マザーグース',
  fc: '星葬会',
  bio: '冒険とお茶と静かな夜が好き。人に優しく、今日は今日で一番いい日を目指します。',
  xUrl: '@aster_ff14',
  patch: '7.0 / Dawntrail',
  hashtags: ['FF14', '冒険', '白魔', 'コスプレ'],
  weekdayPlaytime: '20:00-23:00',
  weekendPlaytime: '10:00-18:00'
};

function getDefaultJobLevels() {
  return { ...DEFAULT_JOB_LEVELS };
}

export default function Home() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [jobs, setJobs] = useState<Record<string, number>>(getDefaultJobLevels());
  const [mainImage, setMainImage] = useState('');
  const [portraitImages, setPortraitImages] = useState<string[]>(['', '', '']);
  const [lodestoneUrl, setLodestoneUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '公開プロフィールのURLを入力すると、ジョブレベルを自動取得できます。'
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        profile?: typeof INITIAL_PROFILE;
        jobs?: Record<string, number>;
        mainImage?: string;
        portraitImages?: string[];
      };

      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.jobs) setJobs(parsed.jobs);
      if (parsed.mainImage) setMainImage(parsed.mainImage);
      if (parsed.portraitImages) setPortraitImages(parsed.portraitImages.slice(0, 3));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({ profile, jobs, mainImage, portraitImages });
    localStorage.setItem(STORAGE_KEY, payload);
  }, [profile, jobs, mainImage, portraitImages]);

  const updateProfile = <K extends keyof typeof INITIAL_PROFILE>(field: K, value: (typeof INITIAL_PROFILE)[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, slot: 'main' | 'portrait') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (slot === 'main') {
        setMainImage(result);
      } else {
        setPortraitImages((prev) => {
          const next = [...prev];
          const index = Number(event.target.dataset.index ?? 0);
          next[index] = result;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const setJobLevel = (jobId: string, nextValue: number) => {
    setJobs((prev) => ({ ...prev, [jobId]: Math.max(0, Math.min(1000, nextValue)) }));
  };

  const fetchLodestoneProfile = async () => {
    if (!lodestoneUrl.trim()) {
      setStatus({ type: 'error', message: 'Lodestone の URL またはキャラクターIDを入力してください。' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'idle', message: 'Lodestone の公開プロフィールを取得しています...' });

    try {
      const params = new URLSearchParams();
      params.set('url', lodestoneUrl.trim());
      const response = await fetch(`/api/lodestone?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Lodestone からの取得に失敗しました。');
      }

      const result = data.data;

      if (result.characterName) updateProfile('characterName', result.characterName);
      if (result.world) updateProfile('world', result.world);
      if (result.datacenter) updateProfile('datacenter', result.datacenter);
      if (result.fc) updateProfile('fc', result.fc);
      if (result.mainJob) updateProfile('mainJob', result.mainJob);
      if (result.title) updateProfile('bio', result.title);
      if (result.avatar) setMainImage(result.avatar);

      if (result.levels && typeof result.levels === 'object') {
        setJobs((prev) => ({ ...prev, ...result.levels }));
      }

      setStatus({
        type: 'success',
        message: `${result.characterName || 'キャラクター'} の公開情報を取得しました。取得できないジョブは手動で修正できます。`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Lodestone の取得に失敗しました。URL と公開設定を確認してください。'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: false
      });

      const link = document.createElement('a');
      link.download = `${profile.characterName || 'ffxiv-card'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      setStatus({
        type: 'error',
        message: '画像の書き出しに失敗しました。ブラウザの設定や画像読み込みを確認してください。'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const clearPortraitAt = (index: number) => {
    setPortraitImages((prev) => {
      const next = [...prev];
      next[index] = '';
      return next;
    });
  };

  return (
    <main className="shell">
      <div className="workspace">
        <aside className="panel editor">
          <div className="panel-header">
            <span className="eyebrow">Profile</span>
            <h1>カード編集</h1>
          </div>

          <div className="field-list">
            <label className="field">
              <span>キャラクター名</span>
              <input value={profile.characterName} onChange={(e) => updateProfile('characterName', e.target.value)} />
            </label>

            <label className="field">
              <span>メインジョブ</span>
              <input value={profile.mainJob} onChange={(e) => updateProfile('mainJob', e.target.value)} />
            </label>

            <div className="two-column">
              <label className="field">
                <span>ワールド</span>
                <input value={profile.world} onChange={(e) => updateProfile('world', e.target.value)} />
              </label>

              <label className="field">
                <span>データセンター</span>
                <input value={profile.datacenter} onChange={(e) => updateProfile('datacenter', e.target.value)} />
              </label>
            </div>

            <label className="field">
              <span>所属FC</span>
              <input value={profile.fc} onChange={(e) => updateProfile('fc', e.target.value)} />
            </label>

            <label className="field field-textarea">
              <span>自己紹介</span>
              <textarea value={profile.bio} onChange={(e) => updateProfile('bio', e.target.value)} />
            </label>

            <label className="field">
              <span>SNSアカウント</span>
              <input value={profile.xUrl} onChange={(e) => updateProfile('xUrl', e.target.value)} />
            </label>

            <label className="field">
              <span>パッチ情報</span>
              <input value={profile.patch} onChange={(e) => updateProfile('patch', e.target.value)} />
            </label>

            <label className="field">
              <span>ハッシュタグ</span>
              <input
                value={profile.hashtags.join(', ')}
                onChange={(e) => updateProfile('hashtags', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))}
              />
            </label>

            <div className="two-column">
              <label className="field">
                <span>平日</span>
                <input value={profile.weekdayPlaytime} onChange={(e) => updateProfile('weekdayPlaytime', e.target.value)} />
              </label>

              <label className="field">
                <span>休日</span>
                <input value={profile.weekendPlaytime} onChange={(e) => updateProfile('weekendPlaytime', e.target.value)} />
              </label>
            </div>
          </div>

          <div className="section-box">
            <div className="section-header">
              <span className="eyebrow">Lodestone</span>
              <h2>ジョブレベル自動取得</h2>
            </div>
            <div className="lodestone-box">
              <input
                value={lodestoneUrl}
                onChange={(e) => setLodestoneUrl(e.target.value)}
                placeholder="https://jp.finalfantasyxiv.com/lodestone/character/123456789/"
              />
              <button className="primary" onClick={fetchLodestoneProfile} disabled={isLoading}>
                {isLoading ? '取得中...' : '取得する'}
              </button>
            </div>
            <p className={`status ${status.type}`}>{status.message}</p>
          </div>

          <div className="section-box">
            <div className="section-header">
              <span className="eyebrow">Images</span>
              <h2>画像アップロード</h2>
            </div>

            <div className="upload-block">
              <label className="image-label">
                <span>メイン画像</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'main')} />
              </label>
              {mainImage ? (
                <button type="button" className="ghost" onClick={() => setMainImage('')}>
                  画像を削除
                </button>
              ) : null}
            </div>

            <div className="portrait-row">
              {portraitImages.map((image, index) => (
                <div key={index} className="portrait-slot">
                  <label className="portrait-upload">
                    {image ? <img src={image} alt={`portrait-${index}`} /> : <span>+</span>}
                    <input
                      type="file"
                      accept="image/*"
                      data-index={index}
                      onChange={(e) => handleImageUpload(e, 'portrait')}
                    />
                  </label>
                  {image ? (
                    <button type="button" className="ghost small" onClick={() => clearPortraitAt(index)}>
                      削除
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="section-box">
            <div className="section-header">
              <span className="eyebrow">Levels</span>
              <h2>ジョブレベル一覧</h2>
            </div>

            <div className="job-grid">
              {JOB_GROUPS.map((group) => (
                <div key={group.title} className="job-group">
                  <h3>{group.title}</h3>
                  {group.jobs.map((job) => (
                    <label key={job.id} className="job-row">
                      <span>{job.name}</span>
                      <input
                        type="number"
                        value={jobs[job.id] ?? 0}
                        min={0}
                        max={1000}
                        onChange={(e) => setJobLevel(job.id, Number(e.target.value || 0))}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel preview-panel">
          <div className="preview-toolbar">
            <div>
              <span className="eyebrow">Preview</span>
              <h2>カードプレビュー</h2>
            </div>
            <button className="primary" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? '保存中...' : 'PNGで保存'}
            </button>
          </div>

          <div className="card-frame">
            <div ref={cardRef} className="card">
              <div className="card-top">
                <div className="card-copy">
                  <div className="name-block">
                    <span className="tagline">FFXIV Character Card</span>
                    <h3>{profile.characterName}</h3>
                  </div>

                  <div className="meta-grid">
                    <div><span>Primary</span><strong>{profile.mainJob}</strong></div>
                    <div><span>World</span><strong>{profile.world}</strong></div>
                    <div><span>Data Center</span><strong>{profile.datacenter}</strong></div>
                    <div><span>FC</span><strong>{profile.fc}</strong></div>
                  </div>

                  <p className="bio">{profile.bio}</p>

                  <div className="card-links">
                    <span>{profile.xUrl}</span>
                    <span>{profile.patch}</span>
                  </div>
                </div>

                <div className="hero-image-wrap">
                  {mainImage ? (
                    <img src={mainImage} alt="Character art" className="hero-image" />
                  ) : (
                    <div className="hero-placeholder">Main Image</div>
                  )}
                </div>
              </div>

              <div className="card-middle">
                <div className="mini-portrait-list">
                  {portraitImages.map((image, index) => (
                    <div key={index} className="mini-portrait">
                      {image ? <img src={image} alt={`Portrait ${index + 1}`} /> : <span>{index + 1}</span>}
                    </div>
                  ))}
                </div>

                <div className="level-panel">
                  <h4>ジョブレベル</h4>
                  <div className="level-table">
                    {JOB_GROUPS.map((group) => (
                      <div key={group.title} className="level-group">
                        <span className="group-name">{group.title}</span>
                        {group.jobs.map((job) => (
                          <div key={job.id} className="level-row">
                            <span>{job.name}</span>
                            <strong>{jobs[job.id] ?? 0}</strong>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <div className="time-boxes">
                  <div>
                    <span>平日</span>
                    <strong>{profile.weekdayPlaytime}</strong>
                  </div>
                  <div>
                    <span>休日</span>
                    <strong>{profile.weekendPlaytime}</strong>
                  </div>
                </div>

                <div className="tags">
                  {profile.hashtags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
