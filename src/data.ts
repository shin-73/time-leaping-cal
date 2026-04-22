export interface YearData {
  year: number;
  events: string[];
  buzzwords: string[];
  songs: string[];
  imageUrl: string;
}

export const getThemeForEra = (era: string) => {
  switch (era) {
    case '明治': return { bg: 'bg-stone-800', text: 'text-stone-100', card: 'bg-stone-900/60', fontTitle: 'font-serif' };
    case '大正': return { bg: 'bg-red-950', text: 'text-amber-50', card: 'bg-red-900/60', fontTitle: 'font-serif' };
    case '昭和': return { bg: 'bg-amber-900', text: 'text-amber-100', card: 'bg-amber-800/60', fontTitle: 'font-serif' };
    case '平成': return { bg: 'bg-blue-900', text: 'text-blue-50', card: 'bg-blue-800/60', fontTitle: 'font-sans' };
    case '令和': return { bg: 'bg-indigo-950', text: 'text-indigo-50', card: 'bg-zinc-900/60', fontTitle: 'font-sans' };
    default: return { bg: 'bg-gray-900', text: 'text-gray-100', card: 'bg-gray-800/60', fontTitle: 'font-sans' };
  }
};

export const MOCK_YEAR_DATA: Record<number, Partial<YearData>> = {
  1989: {
    events: ['消費税施行（3%）', 'ベルリンの壁崩壊', 'ゲームボーイ発売'],
    buzzwords: ['セクシャルハラスメント', 'オバタリアン'],
    songs: ['Diamonds (プリンセス プリンセス)', 'とんぼ (長渕剛)'],
    imageUrl: 'https://images.unsplash.com/photo-1628102491629-778571d893a3?auto=format&fit=crop&q=80',
  },
  1990: {
    events: ['スーパーファミコン発売', '秋篠宮ご夫妻結婚', '東西ドイツ統一'],
    buzzwords: ['ファジィ', 'アッシーくん', 'ちびまる子ちゃん'],
    songs: ['おどるポンポコリン', '浪漫飛行 (米米CLUB)'],
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80',
  },
  1995: {
    events: ['阪神・淡路大震災', '地下鉄サリン事件', 'Windows 95発売'],
    buzzwords: ['無党派', 'NOMO', 'がんばろうKOBE'],
    songs: ['LOVE PHANTOM (B\'z)', 'WOW WAR TONIGHT', 'TOMORROW'],
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80',
  },
  1998: {
    events: ['長野オリンピック開幕', '和歌山毒物カレー事件', '横浜ベイスターズ日本一'],
    buzzwords: ['ハマの大魔神', '凡人・軍人・変人', 'だっちゅーの'],
    songs: ['夜空ノムコウ (SMAP)', 'HONEY (L\'Arc〜en〜Ciel)', 'Time goes by (Every Little Thing)'],
    imageUrl: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80',
  },
  2000: {
    events: ['シドニーオリンピック開催 (高橋尚子金メダル)', 'BSデジタル放送開始', '2000円札発行'],
    buzzwords: ['おっはー', 'IT革命', '最高で金、最低でも金'],
    songs: ['TSUNAMI (サザンオールスターズ)', '桜坂 (福山雅治)', 'Wait&See ～リスク～ (宇多田ヒカル)'],
    imageUrl: 'https://images.unsplash.com/photo-1496366624584-c8c25dbcb242?auto=format&fit=crop&q=80',
  },
  2010: {
    events: ['小惑星探査機はやぶさ帰還', 'iPad発売', '東北新幹線 全線開通'],
    buzzwords: ['ゲゲゲの', 'いい質問ですねぇ', 'イクメン'],
    songs: ['Beginner (AKB48)', 'ヘビーローテーション (AKB48)', 'Troublemaker (嵐)'],
    imageUrl: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&q=80',
  },
  2019: {
    events: ['元号が「令和」に改元', '消費税10%開始', 'ラグビーW杯日本大会'],
    buzzwords: ['ONE TEAM', '計画運休', 'タピる'],
    songs: ['Lemon (米津玄師)', 'マリーゴールド (あいみょん)', 'Pretender (Official髭男dism)'],
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80',
  },
};

const DEFAULT_IMAGES = {
  '明治': 'https://images.unsplash.com/photo-1499955799307-eacfa3e1d156?auto=format&fit=crop&q=80',
  '大正': 'https://images.unsplash.com/photo-1533157582539-71536761dc13?auto=format&fit=crop&q=80',
  '昭和': 'https://images.unsplash.com/photo-1560248232-a5eeb10c954f?auto=format&fit=crop&q=80',
  '平成': 'https://images.unsplash.com/photo-1536697246787-1f2713110901?auto=format&fit=crop&q=80',
  '令和': 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&q=80',
};

export const getYearData = (year: number, era: string): YearData => {
  const mockData = MOCK_YEAR_DATA[year];
  return {
    year,
    events: mockData?.events || [`${year}年の主な出来事`],
    buzzwords: mockData?.buzzwords || ['(流行語データなし)'],
    songs: mockData?.songs || ['(大ヒット曲データなし)'],
    imageUrl: mockData?.imageUrl || DEFAULT_IMAGES[era as keyof typeof DEFAULT_IMAGES] || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80'
  };
};

export const ERAS = [
  { name: '令和', startYear: 2019, startMonth: 5, startDay: 1 },
  { name: '平成', startYear: 1989, startMonth: 1, startDay: 8 },
  { name: '昭和', startYear: 1926, startMonth: 12, startDay: 25 },
  { name: '大正', startYear: 1912, startMonth: 7, startDay: 30 },
  { name: '明治', startYear: 1868, startMonth: 10, startDay: 23 },
] as const;

export const convertAdToJapaneseEra = (year: number) => {
  if (year >= 2019) return { era: '令和', eraYear: year - 2018 };
  if (year >= 1989) return { era: '平成', eraYear: year - 1988 };
  if (year >= 1926) return { era: '昭和', eraYear: year - 1925 };
  if (year >= 1912) return { era: '大正', eraYear: year - 1911 };
  if (year >= 1868) return { era: '明治', eraYear: year - 1867 };
  return { era: '以前', eraYear: 0 };
}

// Extract year from string "平成7" etc
export const convertEraToAdYear = (query: string): number | null => {
  const match = query.match(/^(明治|大正|昭和|平成|令和)(\d+|元)年?$/);
  if (!match) return null;
  const eraName = match[1];
  const yStr = match[2];
  const eraYearNum = yStr === '元' ? 1 : parseInt(yStr, 10);
  
  if (eraName === '令和') return 2018 + eraYearNum;
  if (eraName === '平成') return 1988 + eraYearNum;
  if (eraName === '昭和') return 1925 + eraYearNum;
  if (eraName === '大正') return 1911 + eraYearNum;
  if (eraName === '明治') return 1867 + eraYearNum;
  return null;
}

export const getLifeStage = (birthDateStr: string | null, targetYear: number) => {
  if (!birthDateStr) return null;
  const [bYear, bMonth, bDay] = birthDateStr.split('-').map(Number);
  
  // April 2 cutoff date
  // 学年 (school cohort year) = year when someone turns "n" years old between April 2 and next April 1.
  // E.g. born 1990-04-02 -> cohort 1990. born 1990-04-01 -> cohort 1989.
  
  const isEarlyBorn = bMonth < 4 || (bMonth === 4 && bDay === 1);
  const cohortYear = isEarlyBorn ? bYear - 1 : bYear;
  
  // Grade 1 of elementary is at age 6 / exactly turning 7 in the cohort.
  // E.g. cohort 1990 enters Elementary Grade 1 in April 1997.
  // So year - cohortYear = 7 => Grade 1.
  // Age in that target year... roughly:
  const age = targetYear - bYear; 
  const diff = targetYear - cohortYear;
  
  let stage = '';
  
  if (diff < 0) {
    stage = '生まれる前';
  } else if (diff === 0) {
    stage = '0歳（生まれた年）';
  } else if (diff >= 1 && diff <= 3) {
    stage = `乳幼児（${diff}歳頃）`;
  } else if (diff >= 4 && diff <= 6) {
    stage = `幼稚園・保育園（${diff}歳頃）`;
  } else if (diff >= 7 && diff <= 12) {
    stage = `小学${diff - 6}年生`;
  } else if (diff >= 13 && diff <= 15) {
    stage = `中学${diff - 12}年生`;
  } else if (diff >= 16 && diff <= 18) {
    stage = `高校${diff - 15}年生`;
  } else if (diff >= 19 && diff <= 22) {
    stage = `大学${diff - 18}年生・専門学生`;
  } else {
    stage = '';
  }
  
  return {
    age,
    cohortYear,
    stage
  };
};
