# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

エヴァンゲリオン初号機（EVA-01）をテーマにした ComfyUI プロンプト記録 Chrome 拡張機能（Manifest V3）。プロンプトワードを階層化されたグループへ記録・選定し、重複を排除した最終プロンプトを生成するポップアップ UI。仕様は [specification.html](specification.html) に基づく。

## コマンド

```bash
npm install
npm run dev          # Vite 開発サーバ (http://localhost:5173/src/popup.html) — UI 確認用
npm run build        # tsc -b && vite build → dist/ に拡張機能を出力
npm run typecheck    # tsc -b --noEmit（型チェックのみ）
```

Chrome への読み込み：`npm run build` 後、`chrome://extensions` のデベロッパーモードから `dist/` を「パッケージ化されていない拡張機能」として読み込む。

**テストフレームワークは存在しない。** 動作確認はビルドして Chrome に読み込むか `npm run dev` で行う。

## ビルドの重要な挙動

[vite.config.ts](vite.config.ts) の `popupToRoot` プラグインが `closeBundle` で `dist/src/popup.html` を `dist/popup.html` へ移動し、HTML 内の相対参照 `../assets/` を `./assets/` に書き換える。これは Manifest V3 の `default_popup` がルート相対を前提とするため。ビルド出力構造を触る場合はこの補正ロジックを維持すること。

## アーキテクチャ

### 状態管理の中核：`PromptContext` + 純粋関数ツリー操作

すべてのアプリ状態は [src/context/PromptContext.tsx](src/context/PromptContext.tsx) の `PromptProvider` が単一の `useState<RootState>` として保持する。コンポーネントは `usePrompt()` から `state`（参照）と `actions`（ミューテータ）を取得する。

**重要な不変量**：状態変更は必ず [src/lib/tree.ts](src/lib/tree.ts) の純粋関数（`addGroup`, `toggleWord`, `moveGroup`, `savePreset` 等）経由で行う。これらは内部で `structuredClone` による immutable 更新を行い、新しい `RootState` を返す。`PromptContext` の `actions` は単に `setState((s) => treeXxx(s, ...))` を呼ぶだけの薄いラッパー。ツリー操作のロジックをコンポーネントに書かず、`tree.ts` の関数を追加・編集すること。

データモデル（[src/types.ts](src/types.ts)）：`RootState` が `rootGroups: Group[]` と `presets?: PromptPreset[]` を持つ。`Group` は `groups: Group[]`（任意の深さで再帰）と `words: Word[]` を持つ。`Word` は `selected`, `strength`(0..10), `image?`(Base64 data URL), `note` を持つ。

### 永続化：chrome.storage.local + フォールバック

[src/lib/storage.ts](src/lib/storage.ts) が `chrome.storage.local` のラッパ。`chrome.storage` が未定義な通常ブラウザ（`npm run dev` 等）では `localStorage` へ、さらに無ければメモリ `Map` へフォールバックする。`PromptContext` は `state` 変更を 220ms debounce で保存。ストレージキーは `comfy_prompt_recorder_state_v1`（スナップショットは `_snapshot_v1`）。

### 派生値の計算（重複排除ルール）

`PromptContext` が `useMemo` で派生値を計算する。以下の3つは**同一の重複排除ルール**を共有する：選択ワードを深さ優先・出現順で収集し、`formatWordWithStrength` で整形したテキストを `normalizeText`（[src/lib/normalize.ts](src/lib/normalize.ts)：trim + 小文字化 + 連続空白圧縮）で正規化したキーで最初の出現のみ残す。

- `synthesis`（総括欄テキスト）— [PromptContext.tsx](src/context/PromptContext.tsx) 内
- `buildSnapshotEntries` / `makeSnapshot`（コピーボタン押下時の基準）— [src/lib/diff.ts](src/lib/diff.ts)
- `computeDiff`（基準スナップショットと現在選択の差分：added/removed/strength/text）

重複排除ルールを変更する場合はこの3箇所を一致させること。`diff.ts` のコメントにも明記されている。

### 強度（Strength）のフォーマット

[src/lib/strength.ts](src/lib/strength.ts)：`strength` 0→そのまま、1→`(text)`、2..10→`(text:1.x)`（重み = 1.0 + (n-1)*0.1）。`clampStrength` で 0..10 に丸める。総括欄への出力は選択時のみ反映。

### ドラッグ&ドロップ（2系統の自前実装）

**Motion（`motion/react`）の `Reorder` は flex-wrap の2D配置だと行内並替が壊れるため、ワードの並替は HTML5 DnD を自前で実装している**（[GroupNode.tsx](src/components/GroupNode.tsx) の `handleWordDragOver`：ポインタが要素中央より左か右かで前/後を挿入）。これは意図的な設計で、Motion に戻さないこと。

グループ自体の移動も HTML5 DnD（同ファイル `onGroupDrop`）で、展開時は上22%/中央56%/下22%で before/into/after を判定し、折り畳み時は中央で二分する。`moveGroup`（[tree.ts](src/lib/tree.ts)）は循環判定（自分や子孫への移動禁止）とアンカー基準の安全な挿入位置計算を行う。ドラッグ中データは `text/word` / `text/group` の dataTransfer types でワードDnDとグループDnDを区別。

### クリック判別

シングルクリックとダブルクリックを 230ms のタイマー遅延で判別（`DBL_CLICK_DELAY`、[WordItem.tsx](src/components/WordItem.tsx) と [GroupNode.tsx](src/components/GroupNode.tsx)）。シングル=選択切替/折り畳み、ダブル=編集モーダル。

### レイアウト（黄金比）

[App.tsx](src/App.tsx)：固定 760×560px（Chrome popup 上限 800×600 内）。左 61.8% = `WordPanel`（ワードツリー）、右上 = `SynthesisPanel`（総括欄）、右下 = `SelectedPanel`（選択一覧）。`flexBasis` で黄金比を指定。

## スタイリング（EVA-01 テーマ）

Tailwind CSS + カスタムテーマ（[tailwind.config.js](tailwind.config.js)）。`eva-*` カラーパレット（purple/green/magenta/ink）、カスタムフォント（Cinzel / Cinzel Decorative / EB Garamond / JetBrains Mono）、`shadow-glow-green/purple`、`flicker` アニメーションを定義。グローバルスタイルとテーマ変数は [src/index.css](src/index.css)。コンポーネント内ではこれらの `eva-*` クラスを使う。

## データのインポート/エクスポート

[IOButtons.tsx](src/components/IOButtons.tsx) が JSON の Export/Import を扱う。Import 時は `normalizeImportedState`（[tree.ts](src/lib/tree.ts)）が未知データを検証付きで `RootState` へ正規化する（各フィールドの型チェック・`strength` の 0..10 クランプ・不正エントリの除外）。`replaceState` action 経由で適用。

## 備考

- 画像は [src/lib/image.ts](src/lib/image.ts) で縦横最大420px・JPEG強圧縮の Base64 data URL に変換して `chrome.storage` に収める（サイズ優先）。透過JPEGの黒潰れ防止で白背景を敷く。
- ID 生成（[tree.ts](src/lib/tree.ts) `genId`）は `Date.now` + カウンタ + 乱数の組合せ。コメントに「Date.now / Math.random は使わず」とあるが実装は使用しているため、コメントと実装が乖離している点に注意。
- 全コードコメントは日本語で書かれている。新規コードも日本語コメントを踏襲すること。
