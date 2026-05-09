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
  document.getElementById('dashboard-stable-name').textContent = s.name;
  document.getElementById('dashboard-basho-info').textContent =
    `${gameState.year}年 ${getCurrentBashoName()}`;
  document.getElementById('dashboard-reputation').textContent = s.reputation;
  document.getElementById('dashboard-funds').textContent = `${s.funds.toLocaleString()}万円`;
  document.getElementById('dashboard-supporters').textContent = `${s.supporters}人`;
  const avgFacility = Math.floor(
    (s.facilities.trainingHall + s.facilities.chankoHall + s.facilities.dormitory) / 3
  );
  document.getElementById('dashboard-facility').textContent = `Lv.${avgFacility}`;
  const active = getActiveWrestlers();
  document.getElementById('dashboard-wrestler-count').textContent = `${active.length}人`;
  document.getElementById('dashboard-sekitori-count').textContent = `${getSekitori().length}人`;
  document.getElementById('dashboard-top-rank').textContent = getTopRank();
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
  document.getElementById('detail-wrestler-name').textContent = wrestler.name;
  document.getElementById('detail-rank').textContent = wrestler.rank;
  document.getElementById('detail-age').textContent = `${wrestler.age}歳`;
  const originText = wrestler.origin.country === '日本'
    ? wrestler.origin.prefecture
    : wrestler.origin.country;
  document.getElementById('detail-origin').textContent = `${originText}出身`;
  document.getElementById('detail-style').textContent = `${wrestler.style} / ${wrestler.physique}`;
  // 能力値バー
  const s = wrestler.stats;
  setStatBar('stamina', s.stamina);
  setStatBar('strength', s.strength);
  setStatBar('technique', s.technique);
  setStatBar('mental', s.mental);
  document.getElementById('stat-weight').style.width = `${Math.min(100, s.weight / 2.5)}%`;
  document.getElementById('stat-weight-num').textContent = `${s.weight}kg`;
  document.getElementById('detail-potential').textContent = wrestler.potential;
  document.getElementById('detail-career-record').textContent =
    `${wrestler.careerRecord.wins}勝${wrestler.careerRecord.losses}敗`;
  document.getElementById('detail-basho-record').textContent =
    `${wrestler.bashoRecord.wins}勝${wrestler.bashoRecord.losses}敗`;
  document.getElementById('detail-highest-rank').textContent = wrestler.highestRank;
  document.getElementById('detail-diet-policy').value = wrestler.dietPolicy;
  // 食事方針変更
  document.getElementById('detail-diet-policy').onchange = (e) => {
    wrestler.dietPolicy = e.target.value;
    saveState();
    showToast(`${wrestler.name}の食事方針を「${wrestler.dietPolicy}」に変更しました`);
  };
  // 引退ボタン
  document.getElementById('btn-retire-wrestler').onclick = () => {
    showConfirm(`${wrestler.name}を引退させますか？`, () => {
      retireWrestler(wrestler);
    });
  };
  showScreen('wrestler-detail-screen');
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
  document.getElementById('facility-training-level').textContent = `Lv.${f.trainingHall}`;
  document.getElementById('facility-chanko-level').textContent = `Lv.${f.chankoHall}`;
  document.getElementById('facility-dormitory-level').textContent = `Lv.${f.dormitory}`;
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
      if (target === 'dashboard-screen') updateDashboard();
      if (target === 'wrestler-list-screen') updateWrestlerList();
      showScreen(target);
    });
  });
}

// ダッシュボードのナビゲーションを設定する
function setupDashboardNav() {
  document.querySelectorAll('.btn-nav[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (target === 'wrestler-list-screen') updateWrestlerList();
      if (target === 'facility-screen') updateFacilityScreen();
      if (target === 'supporter-screen') updateSupporterScreen();
      if (target === 'history-screen') updateHistoryScreen();
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
