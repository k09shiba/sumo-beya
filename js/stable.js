// 部屋経営ロジック（資金・設備・後援会）（フェーズ6で本実装）

// 設備ごとのアップグレード費用
const FACILITY_UPGRADE_COST = {
  trainingHall: [0, 200, 500, 1000],
  chankoHall: [0, 150, 400, 800],
  dormitory: [0, 180, 450, 900]
};

// 設備名の日本語マッピング
const FACILITY_NAMES = {
  trainingHall: '稽古場',
  chankoHall: 'ちゃんこ場',
  dormitory: '宿舎'
};

// 設備をアップグレードする
function upgradeFacility(facilityKey) {
  const facilities = gameState.stable.facilities;
  const currentLevel = facilities[facilityKey];
  const maxLevel = FACILITY_UPGRADE_COST[facilityKey].length - 1;
  if (currentLevel >= maxLevel) return { success: false, reason: '最大レベルです' };
  const cost = FACILITY_UPGRADE_COST[facilityKey][currentLevel + 1];
  if (gameState.stable.funds < cost) return { success: false, reason: '資金が不足しています' };
  gameState.stable.funds -= cost;
  facilities[facilityKey]++;
  saveState();
  return { success: true };
}

// 場所後の収支計算（フェーズ6で詳細実装）
function calcBashoIncome() {
  const sekitori = getSekitori();
  // 協会交付金（番付連動）
  const rankBonus = sekitori.reduce((sum, w) => sum + w.rankIndex * 50, 0);
  // 後援会会費
  const supporterIncome = Math.floor(gameState.stable.supporters * 10);
  return rankBonus + supporterIncome;
}

// 場所後の支出計算（フェーズ6で詳細実装）
function calcBashoExpense() {
  const count = getActiveWrestlers().length;
  // 食費（人数 × 食事方針係数）
  return count * 30;
}
