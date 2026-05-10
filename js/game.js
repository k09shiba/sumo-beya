// ゲーム全体の状態管理

// 番付の序列（低インデックスほど下位）
const RANKS = [
  '序ノ口', '序二段', '三段目', '幕下',
  '十両', '前頭', '小結', '関脇', '大関', '横綱'
];

// 関取の番付インデックス（十両以上）
const SEKITORI_RANK_INDEX = 4;

// 場所名
const BASHO_NAMES = ['初場所', '春場所', '夏場所', '名古屋場所', '秋場所', '九州場所'];

// 場所の開催月（1/3/5/7/9/11月）
const BASHO_MONTHS = [1, 3, 5, 7, 9, 11];

// 場所の開催地
const BASHO_LOCATIONS = ['東京', '大阪', '東京', '名古屋', '東京', '福岡'];

// フェーズの表示名
const PHASE_NAMES = { training: '場所間', basho: '本場所', result: '場所結果' };

// 現在のゲーム状態
let gameState = null;

// ゲームを新規開始する
function initNewGame(stableName) {
  gameState = createInitialState(stableName);
  // 初期力士を2人生成する
  gameState.wrestlers.push(createInitialWrestler(1));
  gameState.wrestlers.push(createInitialWrestler(2));
  saveGame(gameState);
  return gameState;
}

// セーブデータからゲームを再開する
function resumeGame() {
  const saved = loadGame();
  if (!saved) return null;
  gameState = saved;
  return gameState;
}

// 現在の場所名を返す
function getCurrentBashoName() {
  return BASHO_NAMES[(gameState.basho - 1) % 6];
}

// 現在の場所の開催月を返す
function getCurrentBashoMonth() {
  return BASHO_MONTHS[(gameState.basho - 1) % 6];
}

// 現在の場所の開催地を返す
function getCurrentBashoLocation() {
  return BASHO_LOCATIONS[(gameState.basho - 1) % 6];
}

// 次の場所の情報（年・月・場所名）を返す
function getNextBashoInfo() {
  return {
    year:  gameState.year,
    month: getCurrentBashoMonth(),
    name:  getCurrentBashoName()
  };
}

// 現在のフェーズ名を返す
function getCurrentPhaseName() {
  return PHASE_NAMES[gameState.phase] || '場所間';
}

// 在籍力士（引退していない）を返す
function getActiveWrestlers() {
  return gameState.wrestlers.filter(w => !w.retired);
}

// 関取（十両以上）を返す
function getSekitori() {
  return getActiveWrestlers().filter(w => w.rankIndex >= SEKITORI_RANK_INDEX);
}

// 部屋の最高位番付を返す
function getTopRank() {
  const active = getActiveWrestlers();
  if (active.length === 0) return '序ノ口';
  const top = active.reduce((prev, curr) =>
    curr.rankIndex > prev.rankIndex ? curr : prev
  );
  return top.rank;
}

// 番付インデックスから番付名を返す
function getRankName(index) {
  return RANKS[Math.max(0, Math.min(index, RANKS.length - 1))];
}

// 番付名からインデックスを返す
function getRankIndex(rankName) {
  const idx = RANKS.indexOf(rankName);
  return idx === -1 ? 0 : idx;
}

// ゲーム状態を保存する（shortcut）
function saveState() {
  saveGame(gameState);
}

// フェーズを変更する
function setPhase(phase) {
  gameState.phase = phase;
  saveState();
}

// 次の場所に進める
function advanceToNextBasho() {
  gameState.basho++;
  if (gameState.basho > 6) {
    gameState.basho = 1;
    gameState.year++;
  }
  // 力士の年齢を更新（1年ごと）
  if (gameState.basho === 1) {
    getActiveWrestlers().forEach(w => { w.age++; });
  }
  gameState.phase = 'training';
  saveState();
}

// ============================================================
// 稽古システム
// ============================================================

// 稽古の定義（怪我リスクと能力値成長範囲）
const TRAINING_TYPES = {
  '基礎稽古':     { injuryRisk: 0.05, effects: [{ stat: 'stamina', min: 1, max: 4 }, { stat: 'strength', min: 1, max: 3 }] },
  '申し合い稽古': { injuryRisk: 0.15, effects: [{ stat: 'technique', min: 2, max: 5 }, { stat: 'mental',  min: 1, max: 3 }] },
  'ぶつかり稽古': { injuryRisk: 0.35, effects: [{ stat: 'strength', min: 3, max: 7 }, { stat: 'mental',  min: 2, max: 4 }] },
  '自主トレ':     { injuryRisk: 0.05, effects: [] } // jiyuTargetで決まる
};

// 伸びしろランクの成長倍率
const POTENTIAL_MULTIPLIERS = { S: 1.5, A: 1.2, B: 1.0, C: 0.8, D: 0.6 };

// 能力値の日本語名
const STAT_NAMES = { stamina: '体力', strength: '筋力', technique: '技', mental: '精神' };

// 年齢による成長倍率を返す
function getAgeMultiplier(age) {
  if (age < 20) return 1.3;
  if (age < 25) return 1.0;
  if (age < 28) return 0.8;
  return 0.6;
}

// 稽古を1回適用し結果を返す
function applyTraining(wrestler, trainingType, jiyuTarget) {
  const def = TRAINING_TYPES[trainingType];
  if (!def) return { messages: [], injured: false };

  const potMult  = POTENTIAL_MULTIPLIERS[wrestler.potential] || 1.0;
  const ageMult  = getAgeMultiplier(wrestler.age);
  const injMult  = 1 - wrestler.hiddenInjuryResistance / 200;
  const messages = [];

  // 怪我判定
  if (Math.random() < def.injuryRisk * injMult) {
    wrestler.hiddenInjuryResistance = Math.min(100, wrestler.hiddenInjuryResistance + 2);
    messages.push('稽古中に怪我をしてしまった…今場所は影響が出るかもしれない。');
    return { messages, injured: true };
  }

  // 成長する能力値（自主トレは選択した1能力）
  const effects = (trainingType === '自主トレ' && jiyuTarget)
    ? [{ stat: jiyuTarget, min: 1, max: 4 }]
    : def.effects;

  let grew = false;
  effects.forEach(({ stat, min, max }) => {
    const base   = randInt(min, max);
    const gain   = Math.max(1, Math.round(base * potMult * ageMult));
    const before = wrestler.stats[stat];
    wrestler.stats[stat] = Math.min(100, before + gain);
    const actual = wrestler.stats[stat] - before;
    if (actual > 0) { messages.push(`${STAT_NAMES[stat]} +${actual}`); grew = true; }
  });

  if (!grew) messages.push('今回は目立った変化がなかった。');

  // hiddenInjuryResistance：体力・筋力の平均に連動して自動改善
  wrestler.hiddenInjuryResistance = Math.min(100,
    Math.round((wrestler.stats.stamina + wrestler.stats.strength) / 2 * 0.8));

  return { messages, injured: false };
}

// autoModeの力士にスタイルに合った稽古を返す
function getAutoTrainingType(wrestler) {
  const prefs = {
    '押し相撲':  ['基礎稽古', 'ぶつかり稽古', '基礎稽古'],
    '四つ相撲':  ['申し合い稽古', '基礎稽古',   '申し合い稽古'],
    '技巧派':    ['申し合い稽古', '自主トレ',   '申し合い稽古'],
    '精神力型':  ['ぶつかり稽古', '申し合い稽古','ぶつかり稽古']
  };
  const list = prefs[wrestler.style] || ['基礎稽古', '申し合い稽古', '自主トレ'];
  return list[Math.floor(Math.random() * list.length)];
}

// ============================================================
// 食事方針システム
// ============================================================

// 全力士に食事方針を適用し結果を返す（場所間終了時に呼ぶ）
function applyAllDietPolicies() {
  const chankoLv   = gameState.stable.facilities.chankoHall;
  const chankoMult = 1 + (chankoLv - 1) * 0.3; // Lv1=1.0, Lv2=1.3, Lv3=1.6, Lv4=1.9
  const results    = [];

  getActiveWrestlers().forEach(w => {
    const msgs = applyDietPolicyToWrestler(w, chankoMult);
    if (msgs.length > 0) results.push({ name: w.name, messages: msgs });
  });

  saveState();
  return results;
}

function applyDietPolicyToWrestler(wrestler, chankoMult) {
  const msgs   = [];
  const stats  = wrestler.stats;
  const wRange = WEIGHT_RANGES[wrestler.physique]; // wrestler.jsで定義

  if (wrestler.dietPolicy === '増量食') {
    const gain = Math.round(randInt(2, 5) * chankoMult);
    stats.weight += gain;
    stats.strength = Math.min(100, stats.strength + Math.round(chankoMult));
    msgs.push(`体重 +${gain}kg`);
    if (stats.weight > wRange.max) {
      const penalty = Math.floor((stats.weight - wRange.max) / 10);
      if (penalty > 0) {
        stats.stamina   = Math.max(1, stats.stamina   - penalty);
        stats.technique = Math.max(1, stats.technique - penalty);
        msgs.push(`体重超過！機動力低下（体力・技 -${penalty}）`);
      }
    }
  } else if (wrestler.dietPolicy === '絞り食') {
    const loss = Math.round(randInt(2, 4) * chankoMult);
    stats.weight = Math.max(wRange.min, stats.weight - loss);
    msgs.push(`体重 -${loss}kg`);
  }
  // 標準食は微変動のみでメッセージなし

  return msgs;
}

// ============================================================
// 場所間イベント生成
// ============================================================

// 場所間イベントのシーケンスを生成する
function generateInterBashoEvents() {
  const count       = randInt(3, 5);
  const hasSekitori = getSekitori().length > 0;
  const pool        = buildRandomEventPool(hasSekitori);
  const events      = [];

  for (let i = 0; i < count; i++) {
    events.push({
      type: 'training', number: i + 1, total: count,
      title:       `稽古 (${i + 1}/${count})`,
      description: '弟子たちに今回の稽古を指示してください。'
    });
    // 50%でランダムイベントを挿入（最終稽古の後は挿入しない）
    if (i < count - 1 && Math.random() < 0.5 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      events.push(pool.splice(idx, 1)[0]);
    }
  }
  return events;
}

function buildRandomEventPool(hasSekitori) {
  const pool = [
    {
      type: 'random', title: '後援会からの招待',
      description: '後援会の理事から懇親会の招待状が届いた。出席すれば後援者との絆が深まり、会員数が増えるだろう。',
      choices: [
        { text: '出席する',       desc: '+後援者15人・+資金100万円',    effect: { supporters: 15, funds: 100 } },
        { text: '稽古を優先する', desc: '効果なし',                      effect: {} }
      ]
    },
    {
      type: 'random', title: '地域の祭りへの参加依頼',
      description: '地元の祭りから相撲実演の依頼が来た。力士が参加すれば地域からの支持が高まる。',
      choices: [
        { text: '全員参加する',   desc: '+名声5・全力士の精神+3',         effect: { reputation: 5, wrestlerMental: 3 } },
        { text: '体を休める',     desc: '全力士の体力+3',                  effect: { wrestlerStamina: 3 } }
      ]
    },
    {
      type: 'random', title: '医師の往診',
      description: '懇意にしている医師が定期検診に来た。力士たちの体を診てもらうか。',
      choices: [
        { text: '全員診察（-30万円）', desc: '-30万円・全力士の体力+5',   effect: { funds: -30, wrestlerStamina: 5 } },
        { text: '希望者のみ（-10万円）', desc: '-10万円・全力士の体力+2', effect: { funds: -10, wrestlerStamina: 2 } }
      ]
    },
    {
      type: 'random', title: 'メディアの取材',
      description: '相撲専門誌の記者が取材に来た。好印象を与えれば名声が高まる。',
      choices: [
        { text: '取材に協力する',   desc: '+名声8',  effect: { reputation: 8 } },
        { text: '稽古中なので断る', desc: '効果なし', effect: {} }
      ]
    },
    {
      type: 'random', title: 'スカウト情報',
      description: '知人から有望な若者の情報が届いた。早めに動けば良い弟子を迎えられるかもしれない。',
      choices: [
        { text: 'スカウトに動く（-50万円）', desc: '-50万円・名声+3',     effect: { funds: -50, reputation: 3 } },
        { text: '今は様子を見る',            desc: '効果なし',             effect: {} }
      ]
    }
  ];

  if (hasSekitori) {
    pool.push(
      {
        type: 'random', title: '出稽古の誘い',
        description: '名門部屋から出稽古の招待が届いた。関取たちが他の力士と切磋琢磨できる絶好の機会だ。',
        choices: [
          { text: '出稽古に行く',   desc: '関取の技+4・精神+3',             effect: { sekitoriTechnique: 4, sekitoriMental: 3 } },
          { text: '今回は断る',     desc: '効果なし',                        effect: {} }
        ]
      },
      {
        type: 'random', title: '地方巡業への参加',
        description: '相撲協会から巡業参加の依頼が届いた。関取が参加すれば部屋の名声と後援者が増える。',
        choices: [
          { text: '参加する',         desc: '+名声10・+後援者20人',           effect: { reputation: 10, supporters: 20 } },
          { text: '体調管理を優先する', desc: '関取の体力+3',                 effect: { sekitoriStamina: 3 } }
        ]
      }
    );
  }

  return pool;
}

// ランダムイベントの選択肢を適用する
function applyEventEffect(effect) {
  const s = gameState.stable;
  if (effect.funds      != null) s.funds      = Math.max(0, s.funds + effect.funds);
  if (effect.supporters != null) s.supporters += effect.supporters;
  if (effect.reputation != null) s.reputation += effect.reputation;

  const applyTo = (wrestlers, key, stat) => {
    if (effect[key] == null) return;
    wrestlers.forEach(w => { w.stats[stat] = Math.min(100, w.stats[stat] + effect[key]); });
  };

  applyTo(getActiveWrestlers(), 'wrestlerMental',    'mental');
  applyTo(getActiveWrestlers(), 'wrestlerStamina',   'stamina');
  applyTo(getSekitori(),        'sekitoriTechnique', 'technique');
  applyTo(getSekitori(),        'sekitoriMental',   'mental');
  applyTo(getSekitori(),        'sekitoriStamina',  'stamina');

  saveState();
}
