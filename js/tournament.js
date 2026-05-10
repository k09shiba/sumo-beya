// 本場所ロジック・取組シミュレーション

// スタイル別の決まり手（重み付き）
const KIMARITE_BY_STYLE = {
  '押し相撲':  [['押し出し', 5], ['突き出し', 4], ['押し倒し', 3], ['はたき込み', 2], ['寄り切り', 1]],
  '四つ相撲':  [['寄り切り', 5], ['上手投げ', 4], ['下手投げ', 3], ['小手投げ', 2], ['寄り倒し', 2]],
  '技巧派':    [['はたき込み', 4], ['掬い投げ', 4], ['外掛け', 3], ['内掛け', 3], ['小手投げ', 2]],
  '精神力型':  [['うっちゃり', 4], ['上手投げ', 3], ['寄り切り', 3], ['掬い投げ', 2], ['外掛け', 2]],
  'default':   [['押し出し', 2], ['寄り切り', 2], ['はたき込み', 2], ['上手投げ', 2], ['外掛け', 1]]
};

// スタイルに応じた決まり手をランダムに選ぶ
function pickKimarite(style) {
  const list = KIMARITE_BY_STYLE[style] || KIMARITE_BY_STYLE['default'];
  const total = list.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [kimarite, weight] of list) {
    roll -= weight;
    if (roll <= 0) return kimarite;
  }
  return list[0][0];
}

// 取組の強さを計算する
function calcPower(wrestler) {
  const s = wrestler.stats;
  let power;

  switch (wrestler.style) {
    case '押し相撲':  power = s.strength * 0.4 + s.stamina * 0.3 + s.mental * 0.2 + s.technique * 0.1; break;
    case '四つ相撲':  power = s.technique * 0.4 + s.strength * 0.3 + s.stamina * 0.2 + s.mental * 0.1; break;
    case '技巧派':    power = s.technique * 0.5 + s.mental * 0.3 + s.stamina * 0.1 + s.strength * 0.1; break;
    case '精神力型':  power = s.mental * 0.5 + s.stamina * 0.3 + s.technique * 0.1 + s.strength * 0.1; break;
    default:          power = (s.stamina + s.strength + s.technique + s.mental) / 4;
  }

  // 体重超過ペナルティ（WEIGHT_RANGES は wrestler.js で定義）
  const physique = wrestler.physique || '中型';
  const wRange = WEIGHT_RANGES[physique] || { max: 150 };
  if (s.weight > wRange.max) {
    const penalty = Math.min(0.25, (s.weight - wRange.max) / 150);
    power *= (1 - penalty);
  }

  // ランダム要素（±15%）
  power *= (0.85 + Math.random() * 0.3);

  return power;
}

// 1取組のシミュレーション
function simulateMatch(player, opponent) {
  const playerPower   = calcPower(player);
  const opponentPower = calcPower(opponent);
  const total         = playerPower + opponentPower;
  const win           = Math.random() * total < playerPower;
  const winner        = win ? player : opponent;
  const kimarite      = pickKimarite(winner.style);
  return { win, kimarite };
}

// CPU力士を生成する（対戦相手用）
function generateCpuWrestler(playerRank) {
  const divIdx   = getDivisionIndex(playerRank.division);
  const basePow  = 20 + divIdx * 8;  // 序ノ口=20, 横綱=92
  const spread   = 15;
  const styles   = ['押し相撲', '四つ相撲', '技巧派', '精神力型'];
  const physiques = ['小兵', '中型', '大型', '超重量級'];

  const physique = physiques[Math.floor(Math.random() * physiques.length)];
  const style    = styles[Math.floor(Math.random() * styles.length)];
  const wRange   = WEIGHT_RANGES[physique];
  const weight   = randInt(wRange.min, wRange.max);

  const stats = {
    stamina:   Math.min(100, Math.max(10, basePow + randInt(-spread, spread))),
    strength:  Math.min(100, Math.max(10, basePow + randInt(-spread, spread))),
    technique: Math.min(100, Math.max(10, basePow + randInt(-spread, spread))),
    mental:    Math.min(100, Math.max(10, basePow + randInt(-spread, spread))),
    weight
  };

  const side       = Math.random() < 0.5 ? '東' : '西';
  const rankNumber = Math.max(1, (playerRank.rankNumber || 1) + randInt(-3, 3));
  const cpuRank    = { division: playerRank.division, rankNumber, side };

  return {
    id:                   `cpu_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name:                 generateShikona([]),
    rank:                 cpuRank,
    physique,
    style,
    stats,
    hiddenInjuryResistance: randInt(30, 70),
    isCpu:                true
  };
}

// 本場所を初期化する
function initBasho() {
  const active = getActiveWrestlers();

  // 今場所成績をリセット
  active.forEach(w => {
    w.bashoRecord = { wins: 0, losses: 0 };
  });

  // 各力士のスケジュール生成
  const schedule = {};
  active.forEach(w => {
    const days = isSekitori(w)
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]  // 十両以上：15番
      : [1, 3, 5, 7, 9, 11, 13];                               // 幕下以下：7番（奇数日）

    schedule[w.id] = days.map(day => ({
      day,
      opponent: generateCpuWrestler(w.rank),
      result:   null
    }));
  });

  gameState.bashoState = { day: 1, schedule, completed: false };
  saveState();
}

// 指定した力士の今日の未実施試合を返す
function getTodayMatch(wrestler) {
  const bs   = gameState.bashoState;
  const sched = bs && bs.schedule[wrestler.id];
  if (!sched) return null;
  return sched.find(m => m.day === bs.day && m.result === null) || null;
}

// 今日試合がある力士リストを返す
function getTodayWrestlers() {
  const bs = gameState.bashoState;
  if (!bs) return [];
  return getActiveWrestlers().filter(w => getTodayMatch(w) !== null);
}

// 今日の全取組を実施する
function executeDayMatches() {
  const bs      = gameState.bashoState;
  const results = [];

  getTodayWrestlers().forEach(w => {
    const match = getTodayMatch(w);
    if (!match) return;

    const { win, kimarite } = simulateMatch(w, match.opponent);
    match.result = { win, kimarite };

    if (win) { w.careerRecord.wins++;  w.bashoRecord.wins++;  }
    else     { w.careerRecord.losses++; w.bashoRecord.losses++; }

    w.matchHistory.push({
      year:         gameState.year,
      basho:        gameState.basho,
      day:          bs.day,
      opponentName: match.opponent.name,
      opponentRank: match.opponent.rank,
      win,
      kimarite
    });

    results.push({ wrestler: w, win, kimarite, opponent: match.opponent });
  });

  saveState();
  return results;
}

// 次の日に進む
function advanceDay() {
  const bs = gameState.bashoState;
  if (!bs) return;
  bs.day++;
  if (bs.day > 15) bs.completed = true;
  saveState();
}

// 場所が終了したか判定する
function isBashoComplete() {
  const bs = gameState.bashoState;
  if (!bs) return false;
  return bs.completed || bs.day > 15;
}

// 場所結果を確定してresultフェーズへ移行する
function finalizeBasho() {
  const active = getActiveWrestlers();

  active.forEach(w => {
    // 負け越し連続場所数を更新する
    if (w.bashoRecord.losses > w.bashoRecord.wins) {
      w.consecutiveLossBaschos = (w.consecutiveLossBaschos || 0) + 1;
    } else {
      w.consecutiveLossBaschos = 0;
    }

    // 最高位を更新する
    if (compareRanks(w.rank, w.highestRank) > 0) {
      w.highestRank = { ...w.rank };
    }
  });

  // 場所成績をhistoryに記録する
  const summary = active
    .map(w => `${w.name} ${w.bashoRecord.wins}勝${w.bashoRecord.losses}敗`)
    .join(' / ');

  gameState.history.bashoResults.push({
    year:    gameState.year,
    basho:   gameState.basho,
    name:    getCurrentBashoName(),
    summary
  });

  gameState.bashoState = null;
  setPhase('result');
}
