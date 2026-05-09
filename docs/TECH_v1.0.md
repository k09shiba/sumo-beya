# 相撲部屋育成ゲーム — 技術設計書 v1.0

> ステータス：確定｜PM：Claude  
> 次のステップ：オーナー承認 → CLAUDE.md作成 → Claude Code始動

---

## 1. 技術スタック

| 項目 | 選定技術 | 理由 |
|------|---------|------|
| 言語 | HTML / CSS / JavaScript | フレームワークなし。軽量・シンプル・Claude Codeが迷わない |
| データ保存 | localStorage | PWA標準。サーバー不要 |
| バージョン管理 | GitHub（k09shiba/sumo-beya） | 既存リポジトリを流用 |
| ホスティング | Vercel（既存アカウント） | mainブランチpushで自動デプロイ |
| PWA対応 | manifest.json + Service Worker | オフライン対応・ホーム画面追加を実現 |

---

## 2. デプロイフロー

```
Claude Codeがコードを編集
　└ GitHubにpush（mainブランチ）
　　　└ Vercelが自動検知・ビルド・デプロイ
　　　　　└ 公開URL（Vercel発行）に反映
```

---

## 3. ファイル構成

```
sumo-beya/
├── index.html              # エントリーポイント・画面のHTML
├── manifest.json           # PWA設定（アイコン・アプリ名・テーマカラー）
├── sw.js                   # Service Worker（オフライン対応・キャッシュ）
├── css/
│   └── style.css           # 全画面共通スタイル
├── js/
│   ├── main.js             # 起動・画面遷移制御
│   ├── game.js             # ゲーム状態管理・全体ロジック
│   ├── wrestler.js         # 力士データ定義・ランダム生成
│   ├── tournament.js       # 本場所ロジック・取組シミュレーション
│   ├── stable.js           # 部屋経営ロジック（資金・設備・後援会）
│   └── save.js             # セーブ・ロード（localStorage）
├── assets/
│   └── images/             # ビジュアル素材（力士・UI）
└── docs/
    ├── GDD_v0.4.md         # ゲームデザインドキュメント
    └── TECH_v1.0.md        # 本ドキュメント
```

---

## 4. 各ファイルの責務

### index.html
- 全画面のHTML構造を保持
- 画面の切り替えはCSSの`display`で制御（画面ごとにセクションを持つ）
- JavaScriptは全てjsフォルダから読み込む

### main.js
- アプリ起動時の初期化
- 画面遷移の管理（どの画面を表示するかの制御）
- イベントリスナーの登録

### game.js
- ゲーム全体の状態（GameState）を一元管理
- 年・場所・フェーズの進行管理
- 各モジュールの橋渡し役

### wrestler.js
- 力士オブジェクトの定義
- ランダム生成ロジック（四股名・能力値・体格・スタイル・出自）
- 成長カーブの計算
- 引退判定

### tournament.js
- 本場所の進行管理
- 取組シミュレーション（勝敗・決まり手の計算）
- 星取表・成績の管理
- CPU力士の生成・再出現率の制御

### stable.js
- 部屋の資金・収支計算
- 設備レベル管理
- 後援会管理
- スカウト候補の生成

### save.js
- GameStateのlocalStorageへの保存・読み込み
- 初期化処理

---

## 5. データ設計

### GameState（ゲーム全体の状態）
```javascript
{
  version: "1.0",
  stable: {
    name: "部屋名",
    reputation: 0,        // 名声レベル
    funds: 0,             // 資金
    supporters: 0,        // 後援会規模
    facilities: {
      trainingHall: 1,    // 稽古場レベル
      chankoHall: 1,      // ちゃんこ場レベル
      dormitory: 1        // 宿舎レベル
    }
  },
  year: 2024,
  basho: 1,               // 1〜6（場所番号）
  phase: "training",      // training / basho / result
  wrestlers: [...],       // 力士オブジェクトの配列
  history: {
    alumni: [...],        // OB力士
    bashoResults: [...]   // 場所ごとの記録
  }
}
```

### 力士オブジェクト
```javascript
{
  id: "uuid",
  name: "四股名",
  age: 18,
  origin: {
    prefecture: "東京都",
    country: "日本",
    education: "高卒",
    sumoExperience: false
  },
  physique: "中型",         // 小兵/中型/大型/超重量級
  style: "四つ相撲",         // 押し相撲/四つ相撲/技巧派/精神力型
  stats: {
    stamina: 40,            // 体力
    strength: 35,           // 筋力
    technique: 30,          // 技
    mental: 35,             // 精神
    weight: 120             // 体重（kg）
  },
  potential: "B",           // 伸びしろランク S/A/B/C/D
  hiddenInjuryResistance: 50, // 隠れ数値
  rank: "序ノ口",
  highestRank: "序ノ口",
  careerRecord: { wins: 0, losses: 0 },
  bashoRecord: { wins: 0, losses: 0 },
  dietPolicy: "標準食",
  autoMode: true,
  matchHistory: [],         // 過去対戦記録
  retired: false
}
```

---

## 6. 画面制御方針

- 画面はすべて`index.html`内にセクションとして定義
- `main.js`が`showScreen(screenId)`で表示を切り替え
- モバイルファースト設計（max-width: 480px基準）

---

## 7. PWA設定方針

### manifest.json
- アプリ名：相撲部屋育成ゲーム（仮）
- 表示モード：standalone（ネイティブアプリ風）
- テーマカラー：和風カラーを使用（後でビジュアル設計時に確定）

### Service Worker
- キャッシュ戦略：Cache First
- オフライン時も起動できることを保証

---

## 8. 初期対応方針

### 既存ファイルの扱い
- `k09shiba/sumo-beya`の既存ファイルは全て削除
- 本設計書の構成で新規作成

### 開発優先順位
1. ファイル構成・骨格の作成
2. データ設計・save.jsの実装
3. 力士生成ロジック（wrestler.js）
4. ホーム画面・ダッシュボード
5. 場所間フェーズ・稽古システム
6. 本場所・取組シミュレーション
7. 部屋経営システム
8. PWA対応（manifest.json・sw.js）
9. ビジュアル・演出

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1.0 | 2026-05-09 | 初稿。技術設計確定 |
