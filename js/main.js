// 起動・画面遷移制御

// 現在表示中の画面ID
let currentScreen = 'home-screen';

// 画面を切り替える
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
    currentScreen = screenId;
  }
}

// トースト通知を表示する
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

// 確認ダイアログを表示する
function showConfirm(message, onYes) {
  const dialog = document.getElementById('confirm-dialog');
  document.getElementById('confirm-message').textContent = message;
  dialog.classList.remove('hidden');
  const yesBtn = document.getElementById('confirm-yes');
  const noBtn = document.getElementById('confirm-no');
  const cleanup = () => {
    dialog.classList.add('hidden');
    yesBtn.removeEventListener('click', handleYes);
    noBtn.removeEventListener('click', handleNo);
  };
  const handleYes = () => { cleanup(); onYes(); };
  const handleNo = () => cleanup();
  yesBtn.addEventListener('click', handleYes);
  noBtn.addEventListener('click', handleNo);
}

// ダッシュボードの表示を更新する
function updateDashboard() {
  const s = gameState.stable;

  // ヘッダー
  document.getElementById('dashboard-stable-name').textContent = s.name;
  document.getElementById('dashboard-phase-badge').textContent = getCurrentPhaseName();
  const nb = getNextBashoInfo();
  document.getElementById('dashboard-basho-info').textContent =
    `${nb.year}年${nb.month}月 ${nb.name}`;

  // 部屋ステータス
  document.getElementById('dashboard-reputation').textContent = s.reputation;
  document.getElementById('dashboard-funds').textContent = `${s.funds.toLocaleString()}万円`;
  document.getElementById('dashboard-supporters').textContent = `${s.supporters}人`;
  const avgFacility = Math.round(
    (s.facilities.trainingHall + s.facilities.chankoHall + s.facilities.dormitory) / 3
  );
  document.getElementById('dashboard-facility').textContent = avgFacility;

  // 力士ステータス
  const active = getActiveWrestlers();
  document.getElementById('dashboard-wrestler-count').textContent = `${active.length}人`;
  document.getElementById('dashboard-sekitori-count').textContent = `${getSekitori().length}人`;
  const topRank = getTopRank();
  const topRankEl = document.getElementById('dashboard-top-rank');
  topRankEl.textContent = topRank;
  topRankEl.style.color = getRankColor(active.length
    ? active.reduce((p, c) => c.rankIndex > p.rankIndex ? c : p).rankIndex
    : 0);
  document.getElementById('dashboard-next-basho').textContent =
    `${nb.year}年${nb.month}月 ${nb.name}`;

  // 力士ラインナップ
  renderDashboardWrestlers();
}

// ダッシュボードの力士ラインナップを描画する
function renderDashboardWrestlers() {
  const lineup  = document.getElementById('dashboard-wrestler-lineup');
  const active  = getActiveWrestlers();

  if (active.length === 0) {
    lineup.innerHTML = '<p class="lineup-empty">在籍力士がいません</p>';
    return;
  }

  // 番付の高い順にソート
  const sorted = [...active].sort((a, b) => b.rankIndex - a.rankIndex);

  lineup.innerHTML = sorted.map(w => {
    const pv         = getPhysiqueVisual(w.physique);
    const rankColor  = getRankColor(w.rankIndex);
    return `
      <div class="lineup-card" data-id="${w.id}">
        <div class="lineup-icon" style="color:${pv.color}; border-color:${rankColor}">${pv.char}</div>
        <div class="lineup-name">${w.name}</div>
        <div class="lineup-rank" style="color:${rankColor}">${w.rank}</div>
      </div>
    `;
  }).join('');

  // カードタップで詳細に遷移
  lineup.querySelectorAll('.lineup-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const wrestler = gameState.wrestlers.find(w => w.id === id);
      if (wrestler) showWrestlerDetail(wrestler);
    });
  });
}

// 力士一覧の表示を更新する
function updateWrestlerList() {
  const list = document.getElementById('wrestler-list');
  const active = getActiveWrestlers();
  if (active.length === 0) {
    list.innerHTML = '<p class="info-text">在籍力士がいません。</p>';
    return;
  }
  // 番付の高い順にソート
  const sorted = [...active].sort((a, b) => b.rankIndex - a.rankIndex);
  list.innerHTML = sorted.map(w => renderWrestlerCard(w)).join('');
  // カードタップで詳細に遷移
  list.querySelectorAll('.wrestler-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const wrestler = gameState.wrestlers.find(w => w.id === id);
      if (wrestler) showWrestlerDetail(wrestler);
    });
  });
}

// 力士詳細画面を表示する
function showWrestlerDetail(wrestler) {
  const rankColor   = getRankColor(wrestler.rankIndex);
  const physVisual  = getPhysiqueVisual(wrestler.physique);
  const potColor    = getPotentialColor(wrestler.potential);

  // ビジュアルアイコン（体格・番付反映）
  const visualEl = document.getElementById('detail-visual');
  visualEl.style.borderColor = rankColor;
  visualEl.innerHTML = `<div class="wrestler-icon" style="color:${physVisual.color}">${physVisual.char}</div>`;

  document.getElementById('detail-wrestler-name').textContent = wrestler.name;

  // 番付（ランク色付き）
  const rankEl = document.getElementById('detail-rank');
  rankEl.textContent = wrestler.rank;
  rankEl.style.color = rankColor;

  document.getElementById('detail-age').textContent = `${wrestler.age}歳`;

  const originText = wrestler.origin.country === '日本'
    ? `${wrestler.origin.prefecture}出身`
    : `${wrestler.origin.country}出身`;
  document.getElementById('detail-origin').textContent = originText;
  document.getElementById('detail-style').textContent = `${wrestler.style} / ${wrestler.physique}`;

  // 能力値バー
  const s = wrestler.stats;
  setStatBar('stamina',   s.stamina);
  setStatBar('strength',  s.strength);
  setStatBar('technique', s.technique);
  setStatBar('mental',    s.mental);
  // 体重バー（230kgを上限として計算）
  const weightPct = Math.min(100, Math.round((s.weight / 230) * 100));
  document.getElementById('stat-weight').style.width = `${weightPct}%`;
  document.getElementById('stat-weight-num').textContent = `${s.weight}kg`;

  // 伸びしろ（色付き）
  const potEl = document.getElementById('detail-potential');
  potEl.textContent = wrestler.potential;
  potEl.style.color = potColor;

  // 成績
  document.getElementById('detail-career-record').textContent =
    `${wrestler.careerRecord.wins}勝${wrestler.careerRecord.losses}敗`;
  document.getElementById('detail-basho-record').textContent =
    `${wrestler.bashoRecord.wins}勝${wrestler.bashoRecord.losses}敗`;

  const highestRankEl = document.getElementById('detail-highest-rank');
  highestRankEl.textContent = wrestler.highestRank;
  highestRankEl.style.color = getRankColor(wrestler.highestRankIndex || 0);

  // プロフィール詳細
  document.getElementById('detail-origin-detail').textContent =
    wrestler.origin.country === '日本' ? wrestler.origin.prefecture : wrestler.origin.country;
  document.getElementById('detail-education').textContent = wrestler.origin.education;
  document.getElementById('detail-sumo-exp').textContent =
    wrestler.origin.sumoExperience ? 'あり' : 'なし';

  // 食事方針
  document.getElementById('detail-diet-policy').value = wrestler.dietPolicy;
  document.getElementById('detail-diet-policy').onchange = (e) => {
    wrestler.dietPolicy = e.target.value;
    saveState();
    showToast(`${wrestler.name}の食事方針を「${wrestler.dietPolicy}」に変更しました`);
  };

  // 稽古指示（フェーズ4で有効化 - 現在は場所間のみ操作可能と表示）
  const inTraining = gameState.phase === 'training';
  document.getElementById('detail-training-note').textContent =
    inTraining ? '稽古指示を選んでください（フェーズ4実装予定）' : '場所間フェーズで稽古を指示できます';

  // 過去対戦記録
  renderMatchHistory(wrestler);

  // 引退ボタン
  document.getElementById('btn-retire-wrestler').onclick = () => {
    showConfirm(`${wrestler.name}を引退させますか？`, () => {
      retireWrestler(wrestler);
    });
  };

  showScreen('wrestler-detail-screen');
}

// 過去対戦記録を描画する
function renderMatchHistory(wrestler) {
  const container = document.getElementById('detail-match-history');
  const history   = wrestler.matchHistory || [];
  if (history.length === 0) {
    container.innerHTML = '<p class="info-text">まだ対戦記録がありません。</p>';
    return;
  }
  // 直近10件を新しい順で表示
  const recent = [...history].reverse().slice(0, 10);
  container.innerHTML = recent.map(m => {
    const resultClass = m.win ? 'win' : 'lose';
    const resultText  = m.win ? '○' : '●';
    return `
      <div class="match-history-item">
        <span class="match-history-result ${resultClass}">${resultText}</span>
        <span class="match-history-opponent">${m.opponentName}</span>
        <span class="match-history-kimarite">${m.kimarite}</span>
        <span class="match-history-date">${m.year}年${BASHO_NAMES[(m.basho - 1) % 6]}</span>
      </div>
    `;
  }).join('');
}

// 能力値バーをセットする
function setStatBar(key, value) {
  document.getElementById(`stat-${key}`).style.width = `${value}%`;
  document.getElementById(`stat-${key}-num`).textContent = value;
}

// 力士を引退させる
function retireWrestler(wrestler) {
  const active = getActiveWrestlers();
  if (active.length <= 1) {
    showToast('最後の弟子は引退させられません');
    return;
  }
  wrestler.retired = true;
  gameState.history.alumni.push({
    id: wrestler.id,
    name: wrestler.name,
    highestRank: wrestler.highestRank,
    careerRecord: wrestler.careerRecord,
    retiredYear: gameState.year,
    retiredBasho: gameState.basho
  });
  saveState();
  showToast(`${wrestler.name}が引退しました`);
  showScreen('wrestler-list-screen');
  updateWrestlerList();
}

// 設備管理画面を更新する
function updateFacilityScreen() {
  const f = gameState.stable.facilities;
  const facilityData = [
    { key: 'trainingHall', levelId: 'facility-training-level' },
    { key: 'chankoHall',   levelId: 'facility-chanko-level'   },
    { key: 'dormitory',    levelId: 'facility-dormitory-level' }
  ];

  facilityData.forEach(({ key, levelId }) => {
    document.getElementById(levelId).textContent = `Lv.${f[key]}`;
  });

  // アップグレードボタンのラベルと動作を設定する
  document.querySelectorAll('[data-facility]').forEach(btn => {
    const key          = btn.dataset.facility;
    const currentLevel = f[key];
    const costs        = FACILITY_UPGRADE_COST[key];
    const maxLevel     = costs.length - 1;

    if (currentLevel >= maxLevel) {
      btn.textContent = '最大Lv';
      btn.disabled    = true;
    } else {
      const cost      = costs[currentLevel + 1];
      btn.textContent = `強化 ${cost}万円`;
      btn.disabled    = false;
      btn.onclick     = () => {
        const result = upgradeFacility(key);
        if (result.success) {
          showToast(`${FACILITY_NAMES[key]}をLv.${f[key]}に強化しました`);
          updateFacilityScreen();
          updateDashboard();
        } else {
          showToast(result.reason);
        }
      };
    }
  });
}

// 後援会画面を更新する
function updateSupporterScreen() {
  document.getElementById('supporter-count').textContent = `${gameState.stable.supporters}人`;
  const income = Math.floor(gameState.stable.supporters * 10);
  document.getElementById('supporter-income').textContent = `${income}万円`;
}

// 部屋の歴史画面を更新する
function updateHistoryScreen() {
  const alumni = gameState.history.alumni;
  const alumniList = document.getElementById('history-alumni-list');
  if (alumni.length === 0) {
    alumniList.innerHTML = '<p class="info-text">まだOBはいません。</p>';
  } else {
    alumniList.innerHTML = alumni.map(a =>
      `<div class="history-item">
        <span>${a.name}</span>
        <span>${a.highestRank} / ${a.careerRecord.wins}勝${a.careerRecord.losses}敗</span>
      </div>`
    ).join('');
  }
  const bashoResults = gameState.history.bashoResults;
  const bashoList = document.getElementById('history-basho-list');
  if (bashoResults.length === 0) {
    bashoList.innerHTML = '<p class="info-text">まだ場所の記録がありません。</p>';
  } else {
    bashoList.innerHTML = bashoResults.slice(-10).reverse().map(r =>
      `<div class="history-item"><span>${r.year}年 ${r.name}</span><span>${r.summary}</span></div>`
    ).join('');
  }
}

// 戻るボタンの遷移先を設定する
function setupBackButtons() {
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back;
      if (target === 'dashboard-screen')     updateDashboard();
      if (target === 'wrestler-list-screen') updateWrestlerList();
      if (target === 'home-screen')          syncHomeButtons();
      showScreen(target);
    });
  });
}

// ホーム画面のボタン状態を最新のセーブ状況に同期する
function syncHomeButtons() {
  document.getElementById('btn-continue').disabled = !hasSaveData();
}

// data-screen 属性を持つ全ボタンのナビゲーションを設定する
function setupDashboardNav() {
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!gameState) return;
      const target = btn.dataset.screen;
      if (target === 'wrestler-list-screen') updateWrestlerList();
      if (target === 'facility-screen')      updateFacilityScreen();
      if (target === 'supporter-screen')     updateSupporterScreen();
      if (target === 'history-screen')       updateHistoryScreen();
      showScreen(target);
    });
  });
}

// アプリ起動時の初期化
function init() {
  setupBackButtons();
  setupDashboardNav();

  // 続きからボタン：セーブデータがある場合のみ有効化
  const btnContinue = document.getElementById('btn-continue');
  if (hasSaveData()) {
    btnContinue.disabled = false;
  }

  // 新規開始ボタン
  document.getElementById('btn-new-game').addEventListener('click', () => {
    if (hasSaveData()) {
      showConfirm('新規開始するとデータが消えます。よろしいですか？', () => {
        showScreen('stable-name-screen');
      });
    } else {
      showScreen('stable-name-screen');
    }
  });

  // 続きからボタン
  btnContinue.addEventListener('click', () => {
    const state = resumeGame();
    if (!state) {
      showToast('セーブデータが見つかりません');
      return;
    }
    updateDashboard();
    showScreen('dashboard-screen');
  });

  // データ初期化ボタン
  document.getElementById('btn-reset').addEventListener('click', () => {
    showConfirm('セーブデータをすべて削除します。よろしいですか？', () => {
      resetGame();
      btnContinue.disabled = true;
      showToast('データを初期化しました');
    });
  });

  // 部屋名決定ボタン
  document.getElementById('btn-start-game').addEventListener('click', () => {
    const nameInput = document.getElementById('stable-name-input');
    const name = nameInput.value.trim();
    if (!name) {
      showToast('部屋名を入力してください');
      return;
    }
    initNewGame(name);
    updateDashboard();
    showScreen('dashboard-screen');
    showToast(`${name}が誕生しました！`);
  });

  // 場所へ出陣ボタン（フェーズ5で詳細実装）
  document.getElementById('btn-start-basho').addEventListener('click', () => {
    showToast('本場所システムは準備中です（フェーズ5）');
  });
}

document.addEventListener('DOMContentLoaded', init);

// Service Workerの登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
