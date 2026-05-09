// セーブ・ロード管理（localStorage）

const SAVE_KEY = 'sumoBeyaSave';

// GameStateの初期値
const INITIAL_STATE = {
  version: '1.0',
  stable: {
    name: '',
    reputation: 0,
    funds: 1000,
    supporters: 0,
    facilities: {
      trainingHall: 1,
      chankoHall: 1,
      dormitory: 1
    }
  },
  year: 2024,
  basho: 1,
  phase: 'training',
  wrestlers: [],
  history: {
    alumni: [],
    bashoResults: []
  }
};

// 現在のGameStateを保存する
function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('セーブに失敗しました:', e);
  }
}

// GameStateを読み込む（データなしはnullを返す）
function loadGame() {
  const data = localStorage.getItem(SAVE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('ロードに失敗しました:', e);
    return null;
  }
}

// セーブデータを削除する
function resetGame() {
  localStorage.removeItem(SAVE_KEY);
}

// セーブデータが存在するか確認する
function hasSaveData() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

// 初期StateのディープコピーをGameStateとして返す
function createInitialState(stableName) {
  const state = JSON.parse(JSON.stringify(INITIAL_STATE));
  state.stable.name = stableName || '新星部屋';
  return state;
}
