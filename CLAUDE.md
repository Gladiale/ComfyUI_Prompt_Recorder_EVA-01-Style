# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

ComfyUI用プロンプトワード記録Chrome拡張機能（Manifest V3）。エヴァンゲリオン初号機テーマのUI。階層的なグループ構造でワードを管理し、重複排除した最終プロンプトを生成する。

## 開発コマンド

```bash
# 開発サーバ起動（ブラウザで UI 確認）
npm run dev
# → http://localhost:5173/src/popup.html

# 本番ビルド（型チェック + ビルド）
npm run build
# → dist/ に拡張機能を出力

# リント
npm run lint
```

## Chrome拡張機能の読み込み

1. `npm run build` 実行
2. Chrome で `chrome://extensions` を開く
3. 「デベロッパー モード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」→ `dist/` フォルダを選択

## 技術スタック

- **フレームワーク**: React 19 + Vite + TypeScript
- **スタイル**: Tailwind CSS 4 (エヴァンゲリオン初号機カラーテーマ)
- **アニメーション**: Motion (framer-motion の軽量版)
- **アイコン**: React Icons
- **状態管理**: React Context API
- **永続化**: chrome.storage.local
- **拡張機能ビルド**: @crxjs/vite-plugin

**注意**: React Compiler (babel-plugin-react-compiler) は未使用。

## アーキテクチャ

### 状態管理の中核

**[src/context/PromptContext.tsx](src/context/PromptContext.tsx)** がグローバル状態を管理：
- `RootState`: ルートグループ配列 + プリセット
- 全ての更新操作は immutable（structuredClone ベース）
- debounce（220ms）で chrome.storage.local へ自動保存
- 選択ワードの収集・重複排除・差分計算は useMemo で派生

### データモデル ([src/types.ts](src/types.ts))

```typescript
RootState {
  version: number
  rootGroups: Group[]
  presets?: PromptPreset[]
}

Group {
  id, name, collapsed
  groups: Group[]    // 無制限ネスト可能
  words: Word[]
}

Word {
  id, text, note, selected
  strength?: number  // 0..10（0=デフォルト / 1=() / 2..10=(text:1.x)）
  image?: string     // Base64 data URL（最大420×420）
}
```

### ツリー操作 ([src/lib/tree.ts](src/lib/tree.ts))

純粋関数による immutable 更新：
- `collectSelected()`: 深さ優先で選択ワードを収集（出現順維持）
- `moveGroup()`: ドラッグ&ドロップ移動（循環検出付き、アンカーID基準で挿入位置決定）
- `reorderWords()`: 同一グループ内でのワード並替（Motion Reorder 対応）
- プリセット操作: savePreset / applyPreset / deletePreset / renamePreset / reorderPresets

### 重複排除 ([src/lib/normalize.ts](src/lib/normalize.ts))

`normalizeText()`: trim + 小文字化 + 連続空白圧縮で重複判定キーを生成。総括欄（SynthesisPanel）で使用。

### 強度調整 ([src/lib/strength.ts](src/lib/strength.ts))

- 0 = そのまま
- 1 = `(text)`
- 2..10 = `(text:1.1)` .. `(text:1.9)`

### 差分検出 ([src/lib/diff.ts](src/lib/diff.ts))

コピーボタン押下時にスナップショットを保存し、以降の変更（追加・削除・強度変更）を検出。

### コンポーネント構成

- **[src/App.tsx](src/App.tsx)**: 黄金比レイアウト（左61.8% / 右38.2%）
- **[src/components/WordPanel.tsx](src/components/WordPanel.tsx)**: 左側ワード画面
  - GroupNode.tsx: 再帰的グループ表示（折り畳み・ドラッグ&ドロップ）
  - WordItem.tsx: ワード行（シングルクリック=選択、ダブルクリック=編集、右クリック=強度調整）
  - SearchBox.tsx: ワード本文と注釈を横断検索
- **[src/components/SynthesisPanel.tsx](src/components/SynthesisPanel.tsx)**: 右上総括欄（重複排除済み最終プロンプト、カンマ/改行切替、コピー）
- **[src/components/SelectedPanel.tsx](src/components/SelectedPanel.tsx)**: 右下選択ワード一覧（クリックで選択解除）
- **[src/components/IOButtons.tsx](src/components/IOButtons.tsx)**: Import（赤紫↓）/ Export（緑↑）アイコン

### 操作仕様

- **グループ**: シングルクリック=折り畳み、ダブルクリック=編集、ドラッグ&ドロップ=順調整＆入れ子移動
- **ワード**: シングルクリック=選択、ダブルクリック=編集、ドラッグ&ドロップ=同一グループ内並替、選択時右クリック=強度調整
- **注釈**: ワード横の緑印（注釈あり）をホバーで画像＋注釈をポップアップ表示
- **検索**: ワード本文と注釈を検索、非ヒットを淡色化
- **折り畳み徽章**: 選択ワードを内包するグループに緑の徽章（件数表示）

### 画像処理 ([src/lib/image.ts](src/lib/image.ts))

ユーザー提供画像を最大420×420pxに縮小（比率維持）、JPEG圧縮（quality=0.7）、Base64 data URLとして保存。

### 永続化 ([src/lib/storage.ts](src/lib/storage.ts))

- `chrome.storage.local` に JSON 保存
- `PROMPT_STATE_KEY`: メイン状態
- `PROMPT_SNAPSHOT_KEY`: 差分検出用スナップショット
- debounce 関数による書き込み頻度制御
