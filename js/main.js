// 起動・画面遷移制御

// 現在表示中の画面ID
let currentScreen = 'home-screen';

// ============================================================
// 場所間フェーズの状態（ローカル）
// ============================================================
let interBashoQueue  = []; // イベント配列
let interBashoIndex  = 0;  // 現在のイベント番号
let trainingAssigns  = {}; // wrestlerId -> { type, jiyuTarget }

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
  topRankEl.textContent = formatRank(topRank);
  topRankEl.style.color = getRankColor(topRank);
  document.getElementById('dashboard-next-basho').textContent =
    `${nb.year}年${nb.month}月 ${nb.name}`;

  // 力士ラインナップ
  renderDashboardWrestlers();

  // 「場所へ出陣」ボタンのラベルをフェーズに応じて変える
  const bashoBtn = document.getElementById('btn-start-basho');
  if (gameState.phase === 'basho') {
    bashoBtn.textContent = '本場所を続ける';
  } else {
    bashoBtn.textContent = '場所へ出陣';
  }
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
  const sorted = [...active].sort((a, b) => compareRanks(b.rank, a.rank));

  lineup.innerHTML = sorted.map(w => {
    const pv         = getPhysiqueVisual(w.physique);
    const rankColor  = getRankColor(w.rank);
    return `
      <div class="lineup-card" data-id="${w.id}">
        <div class="lineup-icon" style="color:${pv.color}; border-color:${rankColor}">${pv.char}</div>
        <div class="lineup-name">${w.name}</div>
        <div class="lineup-rank" style="color:${rankColor}">${formatRank(w.rank)}</div>
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
  const sorted = [...active].sort((a, b) => compareRanks(b.rank, a.rank));
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
  const rankColor   = getRankColor(wrestler.rank);
  const physVisual  = getPhysiqueVisual(wrestler.physique);
  const potColor    = getPotentialColor(wrestler.potential);

  // ビジュアルアイコン（体格・番付反映）
  const visualEl = document.getElementById('detail-visual');
  visualEl.style.borderColor = rankColor;
  visualEl.innerHTML = `<div class="wrestler-icon" style="color:${physVisual.color}">${physVisual.char}</div>`;

  document.getElementById('detail-wrestler-name').textContent = wrestler.name;

  // 番付（ランク色付き）
  const rankEl = document.getElementById('detail-rank');
  rankEl.textContent = formatRank(wrestler.rank);
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
  highestRankEl.textContent = formatRank(wrestler.highestRank);
  highestRankEl.style.color = getRankColor(wrestler.highestRank);

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

  // 場所へ出陣ボタン
  document.getElementById('btn-start-basho').addEventListener('click', () => {
    if (!gameState) return;
    if (gameState.phase === 'basho') {
      startBasho();
      return;
    }
    startInterBashoPhase();
  });

  // イベント画面の静的ボタンを設定する
  setupEventScreenListeners();
}

// ============================================================
// 場所間フェーズ
// ============================================================

// 場所間フェーズを開始する
function startInterBashoPhase() {
  setPhase('training');
  interBashoQueue = generateInterBashoEvents();
  interBashoIndex = 0;
  trainingAssigns = {};
  showScreen('event-screen');
  showCurrentEvent();
}

// 現在のイベントを表示する
function showCurrentEvent() {
  if (interBashoIndex >= interBashoQueue.length) {
    showInterBashoComplete();
    return;
  }

  const event = interBashoQueue[interBashoIndex];

  document.getElementById('event-title').textContent =
    event.type === 'training' ? event.title : '場所間フェーズ';
  document.getElementById('event-progress').textContent =
    `${interBashoIndex + 1} / ${interBashoQueue.length}`;
  document.getElementById('event-description').textContent = event.description;

  // 全エリアをリセット
  document.getElementById('training-area').classList.add('hidden');
  document.getElementById('training-results').classList.add('hidden');
  document.getElementById('event-complete-area').classList.add('hidden');
  document.getElementById('event-choices').innerHTML = '';

  if (event.type === 'training') {
    renderTrainingEvent();
  } else {
    renderRandomEvent(event);
  }
}

// ──────────────────────────────────────────
// 稽古イベント
// ──────────────────────────────────────────

function renderTrainingEvent() {
  const active = getActiveWrestlers();

  // 未割り当ての力士に初期値をセット
  active.forEach(w => {
    if (!trainingAssigns[w.id]) {
      trainingAssigns[w.id] = {
        type:       w.autoMode ? getAutoTrainingType(w) : '基礎稽古',
        jiyuTarget: 'stamina'
      };
    }
  });

  const listEl = document.getElementById('wrestler-training-list');
  listEl.innerHTML = active.map(w => {
    const a         = trainingAssigns[w.id];
    const rankColor = getRankColor(w.rank);
    const showJiyu  = a.type === '自主トレ';
    return `
      <div class="wrestler-training-row card" data-id="${w.id}">
        <div class="training-wrestler-info">
          <span class="training-wrestler-name" style="color:${rankColor}">${w.name}</span>
          <span class="training-wrestler-sub">${formatRank(w.rank)} | ${w.style} | ${w.physique}</span>
        </div>
        <div class="training-selects">
          <select class="select-input select-sm training-type-select" data-id="${w.id}">
            <option value="基礎稽古"     ${a.type==='基礎稽古'     ?'selected':''}>基礎稽古</option>
            <option value="申し合い稽古" ${a.type==='申し合い稽古' ?'selected':''}>申し合い稽古</option>
            <option value="ぶつかり稽古" ${a.type==='ぶつかり稽古' ?'selected':''}>ぶつかり稽古</option>
            <option value="自主トレ"     ${a.type==='自主トレ'     ?'selected':''}>自主トレ</option>
          </select>
          <select class="select-input select-sm jiyu-target-select${showJiyu?'':' hidden'}" data-id="${w.id}">
            <option value="stamina"   ${a.jiyuTarget==='stamina'   ?'selected':''}>体力</option>
            <option value="strength"  ${a.jiyuTarget==='strength'  ?'selected':''}>筋力</option>
            <option value="technique" ${a.jiyuTarget==='technique' ?'selected':''}>技</option>
            <option value="mental"    ${a.jiyuTarget==='mental'    ?'selected':''}>精神</option>
          </select>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('training-area').classList.remove('hidden');

  // 種別変更 → 自主トレ用セレクトの表示切替
  listEl.querySelectorAll('.training-type-select').forEach(sel => {
    sel.addEventListener('change', () => {
      trainingAssigns[sel.dataset.id].type = sel.value;
      const row     = sel.closest('.wrestler-training-row');
      const jiyuSel = row.querySelector('.jiyu-target-select');
      jiyuSel.classList.toggle('hidden', sel.value !== '自主トレ');
    });
  });

  // 自主トレ対象選択
  listEl.querySelectorAll('.jiyu-target-select').forEach(sel => {
    sel.addEventListener('change', () => {
      trainingAssigns[sel.dataset.id].jiyuTarget = sel.value;
    });
  });
}

// 稽古を実施して結果を表示する
function executeTraining() {
  const active  = getActiveWrestlers();
  const results = [];

  active.forEach(w => {
    const a      = trainingAssigns[w.id] || { type: '基礎稽古', jiyuTarget: 'stamina' };
    const result = applyTraining(w, a.type, a.jiyuTarget);
    results.push({ name: w.name, type: a.type, rank: w.rank, ...result });
  });

  saveState();

  // 結果描画
  const contentEl = document.getElementById('training-result-content');
  contentEl.innerHTML = results.map(r => {
    const color = getRankColor(r.rank);
    const msgs  = r.messages.join(' / ');
    return `
      <div class="training-result-wrestler">
        <div class="training-result-name" style="color:${color}">${r.name}
          <span class="training-result-type">（${r.type}）</span>
        </div>
        <div class="training-result-msgs">${msgs}</div>
      </div>
    `;
  }).join('');

  document.getElementById('training-area').classList.add('hidden');
  document.getElementById('training-results').classList.remove('hidden');
}

// ──────────────────────────────────────────
// ランダムイベント
// ──────────────────────────────────────────

function renderRandomEvent(event) {
  document.getElementById('event-title').textContent = event.title;
  const choicesEl = document.getElementById('event-choices');

  choicesEl.innerHTML = event.choices.map((c, idx) => `
    <div class="card event-choice-card">
      <button class="btn btn-secondary event-choice-btn" data-idx="${idx}">
        <span class="choice-text">${c.text}</span>
        <span class="choice-desc">${c.desc}</span>
      </button>
    </div>
  `).join('');

  choicesEl.querySelectorAll('.event-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = event.choices[parseInt(btn.dataset.idx)];
      applyEventEffect(choice.effect);
      // 選択後：結果表示
      choicesEl.innerHTML = `
        <div class="card">
          <p class="event-result-text">${choice.text}を選んだ。</p>
          <p class="event-result-effect">${choice.desc}</p>
        </div>
        <button id="btn-next-random" class="btn btn-secondary btn-large">次へ進む</button>
      `;
      document.getElementById('btn-next-random').addEventListener('click', () => {
        interBashoIndex++;
        showCurrentEvent();
      });
      updateDashboard(); // 資金・名声などをダッシュボードに反映
    });
  });
}

// ──────────────────────────────────────────
// 場所間フェーズ終了
// ──────────────────────────────────────────

function showInterBashoComplete() {
  const dietResults = applyAllDietPolicies();

  document.getElementById('event-title').textContent    = '場所間フェーズ終了';
  document.getElementById('event-progress').textContent = '';
  document.getElementById('event-description').textContent =
    '全てのイベントが終了しました。弟子たちは本場所に向けて準備が整っています。';

  // 食事方針の結果
  let dietHTML = '';
  if (dietResults.length > 0) {
    dietHTML = `<div class="card">
      <h3 class="card-title">食事方針の効果</h3>
      ${dietResults.map(r =>
        `<div class="diet-result-row">
          <span class="diet-result-name">${r.name}</span>
          <span class="diet-result-msgs">${r.messages.join(' / ')}</span>
        </div>`
      ).join('')}
    </div>`;
  }

  const area = document.getElementById('event-complete-area');
  area.innerHTML = dietHTML +
    `<button id="btn-go-to-basho" class="btn btn-primary btn-large btn-basho">本場所へ出陣</button>`;
  area.classList.remove('hidden');

  document.getElementById('btn-go-to-basho').addEventListener('click', () => {
    setPhase('basho');
    startBasho();
  });
}

// ──────────────────────────────────────────
// 場所間フェーズの静的ボタンを設定する
// ──────────────────────────────────────────

function setupEventScreenListeners() {
  // 一括指示
  document.getElementById('btn-batch-apply').addEventListener('click', () => {
    const type = document.getElementById('batch-training-select').value;
    if (!type) return;
    getActiveWrestlers().forEach(w => {
      trainingAssigns[w.id] = { type, jiyuTarget: 'stamina' };
    });
    renderTrainingEvent();
  });

  // 稽古実施
  document.getElementById('btn-execute-training').addEventListener('click', () => {
    executeTraining();
  });

  // 稽古結果の「次へ」
  document.getElementById('btn-after-training').addEventListener('click', () => {
    interBashoIndex++;
    showCurrentEvent();
  });
}

// ============================================================
// 本場所フェーズ
// ============================================================

// 本場所を開始または再開する
function startBasho() {
  if (!gameState.bashoState || gameState.bashoState.completed) {
    initBasho();
  }
  updateDashboard();
  renderBashoScreen();
  showScreen('basho-screen');
}

// 本場所画面を描画する
function renderBashoScreen() {
  const bs = gameState.bashoState;
  if (!bs) return;

  const nb = getNextBashoInfo();
  document.getElementById('basho-title').textContent =
    `${nb.year}年${nb.month}月 ${getCurrentBashoName()}`;
  document.getElementById('basho-day').textContent = `${bs.day}日目`;

  const titleEl = document.getElementById('today-matches-title');
  if (titleEl) titleEl.textContent = `${bs.day}日目の取組`;

  renderTodayMatches();
  renderHoshitori();
  setupBashoButton();
}

// 今日の取組カードを描画する
function renderTodayMatches() {
  const bs  = gameState.bashoState;
  if (!bs) return;

  const day       = bs.day;
  const container = document.getElementById('today-matches-list');
  const active    = getActiveWrestlers();

  // 今日予定がある力士を取得する
  const todayEntries = active
    .map(w => {
      const sched = bs.schedule[w.id];
      if (!sched) return null;
      const match = sched.find(m => m.day === day);
      return match ? { w, match } : null;
    })
    .filter(Boolean);

  if (todayEntries.length === 0) {
    container.innerHTML = `<p class="info-text">${day}日目は全員休場です</p>`;
    return;
  }

  container.innerHTML = todayEntries.map(({ w, match }) => {
    const rankColor = getRankColor(w.rank);
    if (match.result) {
      const { win, kimarite } = match.result;
      const cls  = win ? 'match-win' : 'match-loss';
      const mark = win ? '○' : '●';
      return `
        <div class="match-row ${cls}">
          <div class="match-athlete">
            <span class="match-rank" style="color:${rankColor}">${formatRank(w.rank)}</span>
            <span class="match-name">${w.name}</span>
          </div>
          <div class="match-result-mark">${mark}</div>
          <div class="match-athlete match-opp">
            <span class="match-rank">${formatRank(match.opponent.rank)}</span>
            <span class="match-name">${match.opponent.name}</span>
          </div>
          <span class="match-kimarite">${kimarite}</span>
        </div>
      `;
    }
    return `
      <div class="match-row">
        <div class="match-athlete">
          <span class="match-rank" style="color:${rankColor}">${formatRank(w.rank)}</span>
          <span class="match-name">${w.name}</span>
          <span class="match-rec">${w.bashoRecord.wins}勝${w.bashoRecord.losses}敗</span>
        </div>
        <div class="match-vs">対</div>
        <div class="match-athlete match-opp">
          <span class="match-rank">${formatRank(match.opponent.rank)}</span>
          <span class="match-name">${match.opponent.name}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 星取表を描画する
function renderHoshitori() {
  const bs        = gameState.bashoState;
  const container = document.getElementById('hoshitori');
  if (!bs || !container) return;

  const active = [...getActiveWrestlers()].sort((a, b) => compareRanks(b.rank, a.rank));

  container.innerHTML = active.map(w => {
    const sched     = bs.schedule[w.id] || [];
    const rankColor = getRankColor(w.rank);

    const stars = Array.from({ length: 15 }, (_, i) => {
      const day   = i + 1;
      const match = sched.find(m => m.day === day);
      if (!match) return '<span class="star none">―</span>';
      if (!match.result) return '<span class="star pending">・</span>';
      return match.result.win
        ? '<span class="star win">○</span>'
        : '<span class="star lose">●</span>';
    }).join('');

    return `
      <div class="hoshitori-row">
        <div class="hoshitori-name" style="color:${rankColor}">${w.name}</div>
        <div class="hoshitori-stars">${stars}</div>
        <div class="hoshitori-record">${w.bashoRecord.wins}−${w.bashoRecord.losses}</div>
      </div>
    `;
  }).join('');
}

// 取組ボタンの状態を設定する
function setupBashoButton() {
  const btn = document.getElementById('btn-do-match');
  if (!btn) return;

  // onclick を上書きして毎回最新のハンドラに差し替える
  if (isBashoComplete()) {
    btn.textContent = '場所結果を見る';
    btn.onclick = () => {
      finalizeBasho();
      showResultScreen();
    };
    return;
  }

  const bs  = gameState.bashoState;
  const day = bs.day;
  const active = getActiveWrestlers();

  // 今日に試合があるかチェックする
  const hasTodayMatch = active.some(w => {
    const sched = bs.schedule[w.id];
    return sched && sched.some(m => m.day === day);
  });

  if (!hasTodayMatch) {
    btn.textContent = '翌日へ進む';
    btn.onclick = () => {
      advanceDay();
      renderBashoScreen();
    };
    return;
  }

  // 今日の試合が全て完了しているかチェックする
  const allDone = active.every(w => {
    const sched = bs.schedule[w.id];
    if (!sched) return true;
    const todayMatch = sched.find(m => m.day === day);
    return !todayMatch || todayMatch.result !== null;
  });

  if (allDone) {
    btn.textContent = isBashoComplete() ? '場所結果を見る' : '翌日へ進む';
    btn.onclick = () => {
      if (isBashoComplete()) {
        finalizeBasho();
        showResultScreen();
      } else {
        advanceDay();
        renderBashoScreen();
      }
    };
  } else {
    btn.textContent = '取組を行う';
    btn.onclick = () => {
      executeDayMatches();
      renderTodayMatches();
      renderHoshitori();
      setupBashoButton();
    };
  }
}

// 場所結果画面を表示する
function showResultScreen() {
  const active  = getActiveWrestlers();
  const sorted  = [...active].sort((a, b) => compareRanks(b.rank, a.rank));
  const nb      = getNextBashoInfo();

  document.getElementById('result-title').textContent =
    `${nb.year}年${nb.month}月 ${getCurrentBashoName()} 結果`;

  document.getElementById('result-list').innerHTML = sorted.map(w => {
    const rankColor = getRankColor(w.rank);
    const cls       = w.bashoRecord.wins >= w.bashoRecord.losses ? 'kachi' : 'make';
    return `
      <div class="result-item ${cls}">
        <span class="result-rank" style="color:${rankColor}">${formatRank(w.rank)}</span>
        <span class="result-name">${w.name}</span>
        <span class="result-record">${w.bashoRecord.wins}勝${w.bashoRecord.losses}敗</span>
      </div>
    `;
  }).join('');

  document.getElementById('rank-changes').innerHTML =
    '<p class="info-text">番付変動はフェーズ5Bで実装予定です</p>';
  document.getElementById('growth-list').innerHTML =
    '<p class="info-text">成長記録は今後実装予定です</p>';

  document.getElementById('btn-next-basho').onclick = () => {
    advanceToNextBasho();
    updateDashboard();
    showScreen('dashboard-screen');
  };

  showScreen('result-screen');
}

document.addEventListener('DOMContentLoaded', init);

// Service Workerの登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
