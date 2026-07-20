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

### ツリー操作 ([src/lib/tree/](src/lib/tree/))

単一責任の原則（SRP）に基づき、機能ごとにモジュール分割された純粋関数群。すべての更新は immutable（structuredClone ベース）。

**モジュール構成**:

- **[tree/id.ts](src/lib/tree/id.ts)** (18行): ID生成
  - `genId()`: ユニークID生成（タイムスタンプ + カウンタ + ランダム）

- **[tree/factory.ts](src/lib/tree/factory.ts)** (58行): オブジェクト生成
  - `createWord()`, `createGroup()`: 新規オブジェクト生成
  - `createDefaultState()`: 初期状態生成（サンプルデータ）

- **[tree/search.ts](src/lib/tree/search.ts)** (42行): ツリー検索
  - `findGroup()`: グループをIDで検索
  - `isDescendant()`: 子孫関係判定（循環参照防止）

- **[tree/immutable.ts](src/lib/tree/immutable.ts)** (25行): immutable更新ヘルパ
  - `clone()`: structuredCloneによる深いコピー
  - `mutateGroup()`: グループを安全に更新

- **[tree/group.ts](src/lib/tree/group.ts)** (161行): グループ操作
  - `addGroup()`, `renameGroup()`, `deleteGroup()`
  - `toggleCollapse()`, `setCollapsed()`
  - `moveGroup()`: ドラッグ&ドロップ対応の複雑な移動ロジック（循環検出、アンカーID基準で挿入位置決定）
  - `GroupDropTarget`: 移動先の型定義（into / before / after / root）

- **[tree/word.ts](src/lib/tree/word.ts)** (87行): ワード操作
  - `addWord()`, `updateWord()`, `deleteWord()`
  - `toggleWord()`, `setWordSelected()`, `setWordStrength()`
  - `reorderWords()`: 同一グループ内の並替（Motion Reorder 対応）

- **[tree/collector.ts](src/lib/tree/collector.ts)** (52行): 選択ワード収集
  - `collectSelected()`: 深さ優先で選択ワードを収集（出現順維持）
  - `groupHasSelection()`: 選択ワード存在チェック（折り畳み徽章用）
  - `countSelectedWords()`: 選択ワード数カウント
  - `SelectedWordRef`: 選択ワード参照の型定義

- **[tree/navigation.ts](src/lib/tree/navigation.ts)** (71行): グループ列挙・展開
  - `collectAllGroups()`: 全グループを平坦化（時計ロードマップ用）
  - `expandGroupPath()`: 指定グループとその祖先を展開
  - `GroupRef`: グループ参照の型定義

- **[tree/preset.ts](src/lib/tree/preset.ts)** (118行): プリセット操作
  - `savePreset()`: 現在の選択状態を保存（同名なら上書き）
  - `applyPreset()`: プリセットを復元（完全置換）
  - `deletePreset()`, `renamePreset()`, `reorderPresets()`

- **[tree/normalize.ts](src/lib/tree/normalize.ts)** (93行): Import/Export正規化
  - `normalizeImportedState()`: 外部データを検証・正規化

**メインファイル [tree.ts](src/lib/tree.ts)** (63行): 全モジュールから関数を再エクスポート。外部から見たAPIは変更なし。

### 重複排除 ([src/lib/normalize.ts](src/lib/normalize.ts))

`normalizeText()`: trim + 小文字化 + 連続空白圧縮で重複判定キーを生成。総括欄（SynthesisPanel）で使用。

### 強度調整 ([src/lib/strength.ts](src/lib/strength.ts))

- 0 = そのまま
- 1 = `(text)`
- 2..10 = `(text:1.1)` .. `(text:1.9)`

### 差分検出 ([src/lib/diff.ts](src/lib/diff.ts))

コピーボタン押下時にスナップショットを保存し、以降の変更（追加・削除・強度変更）を検出。

### コンポーネント構成

**メインレイアウト**:

- **[App.tsx](src/App.tsx)** (63行): ルートコンポーネント
  - 黄金比レイアウト（左61.8% / 右38.2%）
  - 各種Providerでラップ（PromptContext, ClockNav, WordEditor, Confirm）

**左側パネル - ワード管理**:

- **[WordPanel.tsx](src/components/WordPanel.tsx)** (84行): 左側ワード画面の統括
  - 検索ボックス、グループツリー、Import/Exportボタンを配置

- **[SearchBox.tsx](src/components/SearchBox.tsx)** (39行): 検索UI
  - ワード本文と注釈を横断検索
  - 非ヒットグループ/ワードを淡色化

- **[GroupNode.tsx](src/components/GroupNode.tsx)** (376行): 再帰的グループ表示
  - 折り畳み/展開（選択ワード内包時に緑徽章表示）
  - ドラッグ&ドロップでグループ移動・ネスト化
  - ダブルクリックで名前編集
  - コンテキストメニュー（削除、全展開/全折り畳み）

- **[WordItem.tsx](src/components/WordItem.tsx)** (307行): ワード行の表示と操作
  - シングルクリック=選択トグル
  - ダブルクリック=編集モーダル起動
  - 選択時右クリック=強度調整（0..10）
  - ドラッグ&ドロップで同一グループ内並替（Motion Reorder）
  - 注釈アイコン（緑）ホバーで画像+注釈ポップアップ

- **[IOButtons.tsx](src/components/IOButtons.tsx)** (73行): Import/Exportボタン
  - Import（赤紫↓）: JSONファイル読み込み
  - Export（緑↑）: 現在の状態をJSON保存

**右側パネル - プロンプト生成**:

- **[SynthesisPanel.tsx](src/components/SynthesisPanel.tsx)** (341行): 右上総括欄
  - 選択ワードを重複排除して最終プロンプト生成
  - カンマ区切り/改行区切り切替
  - コピーボタン（スナップショット保存 → 差分検出開始）
  - 差分表示（追加=緑、削除=赤、強度変更=黄）
  - プリセット管理（保存・適用・並替・削除）

- **[SelectedPanel.tsx](src/components/SelectedPanel.tsx)** (426行): 右下選択ワード一覧
  - 選択中ワードをグループパス付きで表示
  - クリックで選択解除
  - グループ名クリックでジャンプ（祖先ごと展開+スクロール）

**モーダル・ダイアログ**:

- **[WordEditModal.tsx](src/components/WordEditModal.tsx)** (288行): ワード追加・編集モーダル
  - ワード本文、注釈、画像（最大420×420px）を編集
  - Provider + Context で呼び出し
  - 画像は自動圧縮（JPEG quality=0.7）

- **[ConfirmDialog.tsx](src/components/ConfirmDialog.tsx)** (111行): 確認ダイアログ
  - `window.confirm`の代替（エヴァ風デザイン）
  - Promise<boolean>で結果を返す
  - 破壊的操作（削除）は赤紫の確認ボタン

**ナビゲーション**:

- **[ClockNav.tsx](src/components/ClockNav.tsx)** (419行): 時計の指針型ロードマップ
  - 「WORDS」ラベルから起動
  - マウスの動きに合わせて針が回転
  - クリックで該当グループへジャンプ（祖先展開+スクロール）
  - 深度別の色分けリング表示

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
