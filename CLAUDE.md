# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

ComfyUI用プロンプトワード記録Chrome拡張機能（Manifest V3）。エヴァンゲリオン初号機テーマのUI。階層的なグループ構造でワードを管理し、重複排除した最終プロンプトを生成する。選択組み合わせをメタデータ付きプリセットとして保存・還元できる。

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
- プリセット関連: `savePreset` / `applyPreset` / `updatePresetMeta` / `updatePresetEntries` / `analyzePresetApply` / `diffPresetEntries` など

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

// プリセット（選択組み合わせ + 生成メタ）
PromptPreset {
  id, name
  baseModel, baseModelKind
  loras?: PresetModelRef[]        // { model, strength }
  controlNets?: PresetModelRef[]
  metadata: PresetMetadata        // steps, cfg, sampler, scheduler, width, height
  image: string                   // プレビュー画像（最大560px JPEG data URL）
  description?: string
  entries: PresetEntry[]          // { wordId, text, strength } text は差分通知用
  createdAt, updatedAt?
}

PresetFormData {
  // 新規保存・メタ編集の入力（id/createdAt 以外）
  // metadata は未入力時 optional。保存時に正規化して metadata へ落とす
}
```

### ツリー操作 ([src/lib/tree/](src/lib/tree/))

単一責任の原則（SRP）に基づき、機能ごとにモジュール分割された純粋関数群。すべての更新は immutable（structuredClone ベース）。

**モジュール構成**:

- **[tree/id.ts](src/lib/tree/id.ts)** (18行): ID生成
  - `genId()`: ユニークID生成（タイムスタンプ + カウンタ + ランダム）

- **[tree/factory.ts](src/lib/tree/factory.ts)**: オブジェクト生成
  - `createWord()`, `createGroup()`: 新規オブジェクト生成

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

- **[tree/collector.ts](src/lib/tree/collector.ts)** (57行): 選択ワード収集
  - `collectSelected()`: 深さ優先で選択ワードを収集（出現順維持）
  - `groupHasSelection()`: 選択ワード存在チェック（折り畳み徽章用）
  - `countSelectedWords()`, `countSelectedWordsInGroup()`
  - `SelectedWordRef`: 選択ワード参照の型定義

- **[tree/navigation.ts](src/lib/tree/navigation.ts)** (71行): グループ列挙・展開
  - `collectAllGroups()`: 全グループを平坦化（時計ロードマップ用）
  - `expandGroupPath()`: 指定グループとその祖先を展開
  - `GroupRef`: グループ参照の型定義

- **[tree/preset.ts](src/lib/tree/preset.ts)** (370行): プリセット操作
  - `collectPresetEntries()`: 現在の選択から PresetEntry 配列を構築
  - `savePreset(form)`: 現在の選択 + フォーム情報を新規保存（同名でも上書きしない。重複名チェックはフォーム側）
  - `updatePresetMeta(id, form)`: メタ情報のみ更新（entries は維持）
  - `updatePresetEntries(id)`: ワード情報だけを現在の選択で更新
  - `applyPreset(id)`: 全ワードを未選択・強度0にリセット後、entries の wordId で selected/strength を当てはめる（text は復元しない）
  - `analyzePresetApply(id)`: 還元前に id 欠落・text 変更を検査
  - `diffPresetEntries(id)`: 現在の選択 vs プリセット entries の差分（追加/削除/強度変更/text変更）
  - `deletePreset()`, `renamePreset()`, `reorderPresets()`

- **[tree/normalize.ts](src/lib/tree/normalize.ts)** (190行): Import/Export正規化
  - `normalizeImportedState()`: 外部データを検証・正規化
  - 旧形式プリセット（name + entries のみ）も読み込み可能
  - 未知・欠損フィールドは安全なデフォルトへ落とす

**メインファイル [tree.ts](src/lib/tree.ts)** (71行): 全モジュールから関数を再エクスポート。外部から見たAPIは変更なし。

### 重複排除 ([src/lib/normalize.ts](src/lib/normalize.ts))

`normalizeText()`: trim + 小文字化 + 連続空白圧縮で重複判定キーを生成。総括欄（SynthesisPanel）で使用。

### 強度調整 ([src/lib/strength.ts](src/lib/strength.ts))

- 0 = そのまま
- 1 = `(text)`
- 2..10 = `(text:1.1)` .. `(text:1.9)`

### 差分検出 ([src/lib/diff.ts](src/lib/diff.ts))

コピーボタン押下時にスナップショットを保存し、以降の変更（追加・削除・強度変更）を検出。

### 画像処理 ([src/lib/image.ts](src/lib/image.ts))

- ワード画像: 最大 420×420px、sizeBudget 約 60KB（`WORD_IMAGE_MAX_DIM`）
- プリセット画像: 最大 560px、sizeBudget 約 140KB（`PRESET_IMAGE_MAX_DIM`）
- 品質を段階的に下げて予算内の JPEG data URL を採用
- `processPresetImage()`: 元解像度取得 + 560px 圧縮を一括（width/height を metadata に自動記入）
- `getImageNaturalSize()`: 元解像度のみ取得

### 永続化 ([src/lib/storage.ts](src/lib/storage.ts))

- `chrome.storage.local` に JSON 保存
- `PROMPT_STATE_KEY`: メイン状態
- `PROMPT_SNAPSHOT_KEY`: 差分検出用スナップショット
- debounce 関数による書き込み頻度制御

### コンポーネント構成

**メインレイアウト**:

- **[App.tsx](src/App.tsx)** (69行): ルートコンポーネント
  - 黄金比レイアウト（左61.8% / 右38.2%）
  - Provider 階層: Prompt → Confirm → WordEditor → PresetForm → PresetList → ClockNav

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

- **[SynthesisPanel.tsx](src/components/SynthesisPanel.tsx)** (140行): 右上総括欄
  - 選択ワードを重複排除して最終プロンプト生成
  - カンマ区切り/改行区切り切替
  - コピーボタン（スナップショット保存 → 差分検出開始）
  - 差分ポップアップは `synthesis/DiffPopup` に分離

- **[SelectedPanel.tsx](src/components/SelectedPanel.tsx)** (164行): 右下選択ワード一覧
  - 選択中ワードをグループパス付きで表示
  - クリックで選択解除 / 強度ステッパー
  - ヘッダからプリセット保存（ブックマーク）・一覧（レイヤー）を起動

**プリセット UI**:

- **[PresetFormModal.tsx](src/components/PresetFormModal.tsx)** (227行): 保存・メタ編集フォーム
  - 画像 / 名前 / baseModel / LoRA・ControlNet / 生成メタ（steps, cfg 等）/ 説明
  - 同名プリセットはフォーム側で送信ブロック（上書き不可）
  - 子: `preset/FormField`, `ImagePicker`, `ModelListEditor`, `NumField`（EVA風ステッパー）

- **[PresetListPanel.tsx](src/components/PresetListPanel.tsx)**: 全画面スライドインの一覧
  - 正六角形ハニカム + Motion DnD 並替
  - タイルクリックで 3D 詳細カード（表面=画像 / 裏面=メタ）
  - 還元・エントリ更新・削除・メタ編集
  - 子: `preset/PresetHexTile`, `HexDragGhost`, `PresetDetailCard`, `UpdateDiffBody`

- **[PresetFormContext.tsx](src/context/PresetFormContext.tsx)**: 保存/編集モーダルの open API
- **[PresetListContext.tsx](src/context/PresetListContext.tsx)**: 一覧パネルの open/close API

**モーダル・ダイアログ**:

- **[WordEditModal.tsx](src/components/WordEditModal.tsx)** (288行): ワード追加・編集モーダル
  - ワード本文、注釈、画像（最大420×420px）を編集
  - Provider + Context で呼び出し
  - 画像は自動圧縮（JPEG quality 段階低下）

- **[ConfirmDialog.tsx](src/components/ConfirmDialog.tsx)** (120行): 確認ダイアログ
  - `window.confirm`の代替（エヴァ風デザイン）
  - Promise<boolean>で結果を返す
  - 破壊的操作（削除）は赤紫の確認ボタン
  - ReactNode ボディ対応（プリセット更新差分 UI 等）

**ナビゲーション**:

- **[ClockNav.tsx](src/components/ClockNav.tsx)** (428行): 時計の指針型ロードマップ
  - 「WORDS」ラベルから起動
  - マウスの動きに合わせて針が回転
  - クリックで該当グループへジャンプ（祖先展開+スクロール）
  - 深度別の色分けリング表示

### カスタム Hooks ([src/hooks/](src/hooks/))

- **useClickOutside**: 要素外クリックでコールバック
- **useEscapeKey**: Esc キーでコールバック
- **useSynthesisCopy**: 総括欄コピー + スナップショット更新
- **usePresetFormState**: フォーム状態・バリデーション・画像処理
- **usePresetHexDnD**: ハニカム並替のポインタ DnD / ゴースト
- **usePresetListActions**: 還元・エントリ更新・削除（確認ダイアログ付き）

### 操作仕様

- **グループ**: シングルクリック=折り畳み、ダブルクリック=編集、ドラッグ&ドロップ=順調整＆入れ子移動
- **ワード**: シングルクリック=選択、ダブルクリック=編集、ドラッグ&ドロップ=同一グループ内並替、選択時右クリック=強度調整
- **注釈**: ワード横の緑印（注釈あり）をホバーで画像＋注釈をポップアップ表示
- **検索**: ワード本文と注釈を検索、非ヒットを淡色化
- **折り畳み徽章**: 選択ワードを内包するグループに緑の徽章（件数表示）
- **プリセット保存**: SELECTED ヘッダのブックマーク → フォーム入力 → 現在の選択 + メタを保存
- **プリセット一覧**: SELECTED ヘッダのレイヤー → ハニカム一覧。還元は wordId 基準（text は復元しない）。更新時は差分プレビューあり
