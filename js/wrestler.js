// 力士データ定義・ランダム生成

// 四股名の構成パーツ
const SHIKONA_PREFIX = [
  '大', '小', '若', '龍', '鷹', '鬼', '富士', '白', '黒', '風',
  '浪', '海', '山', '花', '錦', '朝', '旭', '千', '武', '羽',
  '翠', '碧', '雷', '雄', '豪', '勝', '猛', '剛', '輝', '王'
];

const SHIKONA_SUFFIX = [
  '山', '海', '川', '龍', '鷹', '錦', '富士', '嶋', '鵬', '虎',
  '浪', '岩', '峰', '星', '輝', '光', '翔', '雲', '桜', '梅',
  '柱', '岳', '嵐', '竜', '丸', '吉', '太郎', '郎', '雄', '士'
];

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

// モンゴル出身者の確率（リアリティ担保）
const FOREIGN_COUNTRIES = [
  { country: 'モンゴル', weight: 15, preferredStyle: '四つ相撲' },
  { country: 'ジョージア', weight: 3, preferredStyle: '技巧派' },
  { country: 'エジプト', weight: 1, preferredStyle: '押し相撲' },
  { country: 'ブルガリア', weight: 1, preferredStyle: '押し相撲' }
];

const PHYSIQUES = ['小兵', '中型', '大型', '超重量級'];
const STYLES = ['押し相撲', '四つ相撲', '技巧派', '精神力型'];
const POTENTIALS = ['S', 'A', 'B', 'C', 'D'];
const EDUCATION_TYPES = ['高卒', '中卒', '大卒'];
const DIET_POLICIES = ['標準食', '増量食', '絞り食'];

// 体格ごとの体重範囲（kg）
const WEIGHT_RANGES = {
  '小兵': { min: 70, max: 100 },
  '中型': { min: 100, max: 140 },
  '大型': { min: 140, max: 180 },
  '超重量級': { min: 180, max: 230 }
};

// 伸びしろランクの出現確率
const POTENTIAL_WEIGHTS = { S: 2, A: 10, B: 35, C: 35, D: 18 };

let wrestlerIdCounter = 1;

// ランダム整数を返す（min以上max以下）
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 重み付きランダム選択
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

// 四股名を生成する
function generateShikona() {
  const prefix = SHIKONA_PREFIX[Math.floor(Math.random() * SHIKONA_PREFIX.length)];
  const suffix = SHIKONA_SUFFIX[Math.floor(Math.random() * SHIKONA_SUFFIX.length)];
  // 同じ文字が連続しないようにする
  if (prefix === suffix) return generateShikona();
  return prefix + suffix;
}

// 伸びしろランクを生成する
function generatePotential() {
  const items = POTENTIALS.map(p => ({ value: p, weight: POTENTIAL_WEIGHTS[p] }));
  return weightedRandom(items).value;
}

// 出自を生成する
function generateOrigin() {
  const foreignRoll = Math.random() * 100;
  const totalForeignWeight = FOREIGN_COUNTRIES.reduce((s, c) => s + c.weight, 0);
  if (foreignRoll < totalForeignWeight) {
    const country = weightedRandom(FOREIGN_COUNTRIES.map(c => ({ ...c, value: c.country })));
    return {
      prefecture: '―',
      country: country.country,
      education: '高卒',
      sumoExperience: Math.random() < 0.6,
      preferredStyle: country.preferredStyle
    };
  }
  return {
    prefecture: PREFECTURES[Math.floor(Math.random() * PREFECTURES.length)],
    country: '日本',
    education: EDUCATION_TYPES[Math.floor(Math.random() * EDUCATION_TYPES.length)],
    sumoExperience: Math.random() < 0.4,
    preferredStyle: null
  };
}

// 体格に応じた初期能力値を生成する
function generateStats(physique, style) {
  const weightRange = WEIGHT_RANGES[physique];
  const weight = randInt(weightRange.min, weightRange.max);
  // スタイルによって得意能力に偏りを持たせる
  const base = { stamina: 25, strength: 25, technique: 20, mental: 25 };
  if (style === '押し相撲') { base.strength += 10; base.stamina += 5; }
  if (style === '四つ相撲') { base.technique += 8; base.strength += 5; }
  if (style === '技巧派') { base.technique += 15; base.mental += 5; }
  if (style === '精神力型') { base.mental += 15; base.stamina += 5; }
  // 体格によって筋力・体力に差をつける
  if (physique === '大型' || physique === '超重量級') { base.strength += 8; }
  if (physique === '小兵') { base.technique += 5; }
  return {
    stamina: Math.min(100, base.stamina + randInt(-5, 15)),
    strength: Math.min(100, base.strength + randInt(-5, 15)),
    technique: Math.min(100, base.technique + randInt(-5, 15)),
    mental: Math.min(100, base.mental + randInt(-5, 15)),
    weight
  };
}

// 力士オブジェクトを生成する
function createWrestler(overrides = {}) {
  const origin = generateOrigin();
  const physique = PHYSIQUES[Math.floor(Math.random() * PHYSIQUES.length)];
  const style = origin.preferredStyle || STYLES[Math.floor(Math.random() * STYLES.length)];
  const stats = generateStats(physique, style);
  const potential = generatePotential();

  const wrestler = {
    id: `w${wrestlerIdCounter++}`,
    name: generateShikona(),
    age: randInt(18, 22),
    origin: {
      prefecture: origin.prefecture,
      country: origin.country,
      education: origin.education,
      sumoExperience: origin.sumoExperience
    },
    physique,
    style,
    stats,
    potential,
    hiddenInjuryResistance: randInt(30, 70),
    rank: '序ノ口',
    rankIndex: 0,
    highestRank: '序ノ口',
    highestRankIndex: 0,
    careerRecord: { wins: 0, losses: 0 },
    bashoRecord: { wins: 0, losses: 0 },
    consecutiveLosses: 0,
    dietPolicy: '標準食',
    autoMode: true,
    matchHistory: [],
    retired: false
  };

  return Object.assign(wrestler, overrides);
}

// チュートリアル用の初期力士を生成する（1人目：標準、2人目：個性的）
function createInitialWrestler(index) {
  if (index === 1) {
    // 操作を覚えやすいバランス型
    return createWrestler({
      physique: '中型',
      style: '四つ相撲',
      potential: 'B',
      age: 18,
      origin: {
        prefecture: PREFECTURES[Math.floor(Math.random() * 47)],
        country: '日本',
        education: '高卒',
        sumoExperience: true
      }
    });
  } else {
    // 個性的な力士（比較が生まれる）
    const physiques = ['小兵', '大型', '超重量級'];
    const physique = physiques[Math.floor(Math.random() * physiques.length)];
    const styles = ['押し相撲', '技巧派', '精神力型'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    return createWrestler({ physique, style, age: randInt(18, 21) });
  }
}

// 引退条件を確認する（自動引退：30歳以上かつ6場所連続負け越し）
function checkRetirement(wrestler) {
  return wrestler.age >= 30 && wrestler.consecutiveLosses >= 6;
}

// 力士の力士カードHTML文字列を生成する
function renderWrestlerCard(wrestler) {
  const record = `${wrestler.careerRecord.wins}勝${wrestler.careerRecord.losses}敗`;
  return `
    <div class="wrestler-card" data-id="${wrestler.id}">
      <div class="wrestler-card-icon">力</div>
      <div class="wrestler-card-info">
        <div class="wrestler-card-name">${wrestler.name}</div>
        <div class="wrestler-card-details">${wrestler.rank} | ${wrestler.age}歳 | ${wrestler.physique}・${wrestler.style}</div>
      </div>
      <div class="wrestler-card-record">${record}</div>
    </div>
  `;
}
