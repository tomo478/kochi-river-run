# Kochi River Run

高知を題材にした、ブラウザでそのまま遊べる Canvas ミニゲームです。

四万十川をくだりながらカツオを集め、岩や渦を避けて 60 秒のハイスコアを狙います。鳴子ゲージが 100% になると、画面内の岩と渦を一掃する「鳴子バースト」が使えます。

## Play

`index.html` をブラウザで開くだけで遊べます。

## Controls

- 移動: 矢印キー / WASD
- 鳴子バースト: Space
- リスタート: R

## Files

- `index.html`: ゲーム画面
- `styles.css`: レイアウトと HUD
- `game.js`: ゲームループ、描画、入力、判定
- `assets/`: 画像生成で作成した背景とスプライト
- `tests/game-static-checks.js`: 主要仕様の静的チェック

## Validation

```bash
node --check game.js
node tests/game-static-checks.js
```
