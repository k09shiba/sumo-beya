# CLAUDE.md — Claude Code 指示書

> このファイルはClaude Code（技術担当）への指示書です。
> PM：Claude（claude.ai）｜オーナー：プロジェクト発注者｜技術：Claude Code
> 不明点はPMに確認すること。オーナーへの直接確認は不要。

---

## 0. プロジェクト概要

相撲部屋育成ゲームのPWAアプリを開発する。

- リポジトリ：`k09shiba/sumo-beya`
- ホスティング：Vercel（mainブランチpushで自動デプロイ）
- 参照ドキュメント：`docs/GDD_v0.4.md`（ゲーム仕様）・`docs/TECH_v1.0.md`（技術仕様）

---

## 1. 役割と判断基準

### Claude Codeが自律して良いこと
- ファイル構成の作成・整理
- 仕様書に記載された機能の実装
- バグの発見と修正
- コードのリファクタリング
- 仕様の範囲内でのUX改善

### PMに確認が必要なこと
- 仕様書に記載のない新機能の追加
- ゲームバランスに関わる数値の変更
- 画面構成・動線の変更
- 技術スタックの変更

### 実装に迷ったとき
仕様書を最優先とする。仕様書に記載がない場合は「よりシンプルな実装」を選ぶ。それでも判断できない場合はPMに確認する。

---

## 2. 開発ルール

### コード品則
- 1ファイル1責務を徹底する
- 関数は短く・単機能に保つ
- マジックナンバーは定数として定義する
- コメントは日本語で書く

### 作業の進め方（PDCA）
1. **Plan**：実装する機能を`docs/TODO.md`に記載してから着手する
2. **Do**：実装する
3. **Check**：ブラウザで動作確認。コンソールエラーがないことを確認する
4. **Act**：問題があれば修正。完了したら`docs/TODO.md`を更新する

### コミットルール
```
feat: 力士ランダム生成ロジックを実装
fix: 番付計算のバグを修正
refactor: tournament.jsを整理
docs: GDDをv0.5に更新
```

---

## 3. ファイル構成

```
sumo-beya/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── wrestler.js
│   ├── tournament.js
│   ├── stable.js
│   └── save.js
├── assets/
│   └── images/
└── docs/
    ├── GDD_v0.4.md
    ├── TECH_v1.0.md
    ├── CLAUDE.md（本ファイル）
    └── TODO.md
```

### 初回作業
既存ファイルを全て削除してから上記構成で新規作成すること。

---

## 4. 開発優先順位

以下の順番で実装する。各フェーズ完了後にPMに報告してから次に進む。

```
フェーズ1：骨格
　├ ファイル構成の作成
　├ index.htmlの画面骨格
　└ save.js（GameStateの保存・読み込み）

フェーズ2：力士システム
　├ wrestler.js（力士オブジェクト定義・ランダム生成）
　└ 力士詳細画面の表示

フェーズ3：画面・導線
　├ ホーム画面
　├ 部屋ダッシュボード
　└ 画面遷移の実装

フェーズ4：稽古・場所間フェーズ
　├ 稽古システム
　└ 場所間イベント

フェーズ5：本場所
　├ tournament.js（取組シミュレーション）
　└ 本場所画面・星取表

フェーズ6：部屋経営
　└ stable.js（資金・設備・後援会）

フェーズ7：PWA対応
　├ manifest.json
　└ sw.js

フェーズ8：ビジュアル・演出
　├ キャラクタービジュアル
　└ 特別演出（昇進・引退など）
```

---

## 5. ゲーム仕様サマリー

詳細は`docs/GDD_v0.4.md`を参照。以下は実装上の重要ポイントのみ記載。

### 番付
序ノ口 → 序二段 → 三段目 → 幕下 → 十両 → 幕内（前頭）→ 小結 → 関脇 → 大関 → 横綱

### 本場所の取組数
- 十両以上：15番（毎日）
- 幕下以下：7番（奇数日のみ）※重要

### 能力値（0〜100）
体力・筋力・技・精神・体重（体重のみ別軸管理）

### 隠れ数値
怪我耐性（プレイヤーに非表示。筋力・体力に連動して自動改善）

### 体重の適正
スタイルと体格の組み合わせで適正体重が異なる。超過すると機動力ペナルティ。

### 引退条件
- 自動：30歳以上かつ負け越し6場所連続で引退勧告
- 任意：力士詳細画面の引退ボタン

### ゲームオーバー
なし。常に最低1人の弟子が在籍することを保証する。

### 資金収支
- 収入：後援会会費・懸賞金・協会交付金・お祝い金
- 支出：食費・設備維持費・アップグレード費・スカウト費・医療費

---

## 6. データ設計

### GameState
```javascript
{
  version: "1.0",
  stable: {
    name: "",
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
  phase: "training",
  wrestlers: [],
  history: {
    alumni: [],
    bashoResults: []
  }
}
```

### 力士オブジェクト
```javascript
{
  id: "",
  name: "",
  age: 18,
  origin: {
    prefecture: "",
    country: "日本",
    education: "高卒",
    sumoExperience: false
  },
  physique: "中型",
  style: "四つ相撲",
  stats: {
    stamina: 40,
    strength: 35,
    technique: 30,
    mental: 35,
    weight: 120
  },
  potential: "B",
  hiddenInjuryResistance: 50,
  rank: "序ノ口",
  rankIndex: 0,
  highestRank: "序ノ口",
  careerRecord: { wins: 0, losses: 0 },
  bashoRecord: { wins: 0, losses: 0 },
  consecutiveLosses: 0,
  dietPolicy: "標準食",
  autoMode: true,
  matchHistory: [],
  retired: false
}
```

---

## 7. UI方針

- モバイルファースト（max-width: 480px基準）
- 和風カラーパレットを使用（落ち着いた赤・紺・金・クリーム）
- フォント：DotGothic16（Google Fonts）でレトロ感を演出
- ボタンはタップしやすいサイズ（最小44px）
- スクロールは縦のみ

---

## 8. 作業開始前に必ずやること

1. `docs/GDD_v0.4.md`を読む
2. `docs/TECH_v1.0.md`を読む
3. `docs/TODO.md`に今回の作業内容を記載する
4. 既存ファイルの削除（初回のみ）

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1.0 | 2026-05-09 | 初稿 |
