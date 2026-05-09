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
