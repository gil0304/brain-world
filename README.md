# BRAIN WORLD

> A miniature world inside my mind.

脳の形をしたガラスの容器の中に、好きなもの・取り組んでいることをミニチュアの箱庭として詰め込んだ自己紹介 Web 作品です。

## 起動

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ に静的ファイルを出力（GitHub Pages などにそのまま置けます）
```

## 操作

| 操作 | 内容 |
| --- | --- |
| ドラッグ | 回転（真横・真上・裏側には回り込まないよう制限） |
| スクロール / ピンチ | ズーム |
| クリック | エリア・オブジェクト・ラベルの詳細カードを表示し、そこへカメラが寄る |
| ダブルクリック / ↺ ボタン / `R` | 全体表示に戻る |
| `Esc` | カードを閉じる |
| Save PNG | 1:1 / 4:5 / 16:9 を選んで高解像度 PNG を保存 |

## 保存機能

Save PNG を押すと、カードとハイライトを消して全体構図にカメラを戻し、保存専用の固定構図でオフスクリーン描画します。

- 出力サイズ：1:1 = 2160×2160、4:5 = 2160×2700、16:9 = 3840×2160（GPU の上限に合わせて自動で縮小）
- ラベルは WebGL ではなく 2D キャンバスに描いているので、画面と同じラベルがそのまま画像に入ります
- タイトルとサブコピーは画像側で配置し、ラベルがタイトルに重ならないよう自動で避けます
- イントロ演出の途中で保存しても、完成状態の箱庭が保存されます

## 技術構成

仕様書の Nuxt 3 ではなく、**Vite + Vue 3 + TypeScript** を採用しました。1ページ完結で SSR や
ルーティングが不要なうえ、Three.js はクライアント専用なので、Nuxt を入れても恩恵がなく構成だけが重くなるためです。
静的ビルド（`base: './'`）なので GitHub Pages にそのまま置けます。

| 役割 | 使用技術 |
| --- | --- |
| UI（ヘッダー・カード・保存ボタン） | Vue 3 |
| 箱庭・カメラ・アニメーション | Three.js |
| 発光・ホバー輪郭・ビネット・トーンマップ | postprocessing（pmndrs） |
| カメラ移動・イントロ・保存演出 | GSAP |
| QR コード | qrcode |
| フォント | Outfit / Zen Maru Gothic（@fontsource、セルフホスト） |

画像アセットは使っていません。脳の殻、地形、建物、テクスチャ（回路基板、スマホ画面、巻物など）はすべてコードで生成しています。

## ファイル構成

```
src/
├── App.vue                     # 画面全体・保存フロー
├── components/
│   ├── BrainWorldCanvas.vue    # Three.js シーンの入れ物
│   ├── MinimalHeader.vue       # タイトル / サブコピー / 操作説明
│   ├── InfoCard.vue            # 詳細カード（QR表示つき）
│   ├── SaveControls.vue        # 比率選択・保存・リセット
│   └── LoadingVeil.vue
├── data/brainWorldData.ts      # ★ コンテンツ定義（文言・色・リンク）
├── three/
│   ├── BrainWorld.ts           # レンダラー・カメラ・操作・クリック判定・PNG書き出し
│   ├── brainShell.ts           # 透明な脳の殻（シワはノイズの等高線）
│   ├── island.ts               # 浮島・地面のエリア発光・神経の道
│   ├── labels.ts               # ラベル描画（重なり回避つき）
│   ├── layout.ts               # エリア配置
│   ├── environment.ts          # 背景・星・台座
│   └── areas/                  # 6つのエリア（making / music / programming / sports / hobby / anime）
└── styles/main.css
```

## 内容を変えるには

文言・説明・色・リンクは `src/data/brainWorldData.ts` を編集するだけで、ラベルとカードの両方に反映されます。
エリアの位置は `src/three/layout.ts`、各エリアの模型は `src/three/areas/*.ts` にあります。

## 公開

`main` に push すると GitHub Actions（`.github/workflows/deploy.yml`）がビルドして GitHub Pages に公開します。

公開URL：https://gil0304.github.io/brain-world/
