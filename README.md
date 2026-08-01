# vibe coding
- MODEL: glm 5.2 + grok 4.5
- IDE:   vscode + claude code + cc switch

![preview](preview_01.png)
![preview](preview_02.png)
![preview](preview_03.png)

# ComfyUI Prompt Recorder

エヴァンゲリオン初号機をテーマにした、ComfyUI プロンプトワード記録 Chrome 拡張機能（Manifest V3）。
プロンプトワードを階層化されたグループへ記録・選定し、重複を排除した最終プロンプトを生成する。
選択組み合わせはメタデータ付きプリセットとして保存・還元できる。
総括欄には文字列変換ルールを適用でき、元ワード本文は変えずに表示・コピー内容だけを変換できる。

# 操作方法
- **グループ**: シングルクリック折り畳み、ダブルクリック編集、ドラッグ&ドロップ順調整＆入れ子機能。
- **ワード**: シングルクリック選択、ダブルクリック編集、ドラッグ&ドロップ順調整、右クリックで強度調整・グループ移動。
- **総括欄変換ルール**: SYNTHESIS ヘッダのスライダーアイコンからルールを追加・適用・並替。有効ルールのみ一覧順にリテラル置換。
- **プリセット**: SELECTED ヘッダから保存（ブックマーク）・一覧（レイヤー）。一覧は六角形ハニカムで並替、詳細カードから還元・更新・編集・削除。

## 機能

- **ツリー状グループ**: グループは無制限にネスト可能（CHARACTER > Upper Body > Hair …）
- **ワード選択/編集**: シングルクリックで選択切替、ダブルクリックで `text` / `note` 編集
- **注釈 (note)**: ワード横の緑の印で注釈の有無を表示
- **横断検索**: ワード本文と注釈を検索し、ヒットしたワードと直属グループ名のみ表示
- **折り畳み**: 選択ワードを内包するグループに緑の徽章を表示
- **総括欄 (右上)**: 選択ワードを出現順に集約し、変換ルール適用 → 強度付与 → 正規化で重複排除。カンマ/改行切替・クリップボードコピー。コピー基準からの差分表示
- **総括欄変換ルール**: 元ワード本文は変更せず、表示・コピー内容だけを文字列置換
  - 有効ルールを一覧順に逐次適用（リテラル置換。正規表現は解釈しない）
  - 変換後が空文字になったワードは表示から除外
  - 強度表記は変換後に付与
  - ルール追加/編集/適用切替/削除/DnD並替。新規ルールは無効状態で登録
  - 有効ルールがある場合、ヘッダのスライダーボタンが発光
- **選択済み一覧 (右下)**: クリックで即時選択解除、強度ステッパー。ヘッダからプリセット保存・一覧を起動
- **プリセット**: 選択組み合わせ + ベースモデル / LoRA / ControlNet / 生成パラメータ / プレビュー画像を保存
  - 還元は wordId 基準（text は復元しない）。id 欠落・テキスト変更は事前警告
  - エントリ更新時は追加/削除/強度変更の差分プレビュー
  - 同名プリセットは上書きせず、フォーム側で重複名を禁止
  - 一覧は正六角形ハニカム + DnD 並替、詳細は 3D フリップカード
- **ドラッグ&ドロップ**: ワードは同一グループ内の並替、グループは並替＋他グループ内へのネスト移動
- **JSON 入出力**: アイコンのみで Import（赤紫↓）/ Export（緑↑）。Import 時はマージ確認付き。旧形式プリセットも読み込み可。Export には常に `rules` を含む
- **永続化**: `chrome.storage.local` へ debounce 自動保存

## レイアウト

左 = ワード画面、右上 = 総括欄、右下 = 選択ワード一覧。
ポップアップサイズは 800×600px（Chrome popup 上限 800×600 内）。

## 技術スタック

React 19 / Vite / TypeScript / Tailwind CSS / Motion / React Icons / Manifest V3 / CRXJS Vite Plugin / Vitest  

ReactCompilerは未使用

## 開発モード

```bash
npm run dev
http://localhost:5173/src/popup.html
```

## セットアップ

```bash
npm install
npm run build      # dist/ に拡張機能を出力
```

## Chrome への読み込み

1. `npm run build` を実行（`dist/` が生成される）
2. Chrome で `chrome://extensions` を開く
3. 右上「デベロッパー モード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」→ `dist/` フォルダを選択
5. ツールバーの拡張機能アイコンをクリック → ポップアップが起動

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | Vite 開発サーバ（ブラウザで UI 確認用） |
| `npm run build` | 型チェック + 本番ビルド → `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Vitest（watch） |
| `npm run test:run` | Vitest（1回実行） |
| `npm run test:coverage` | Vitest（カバレッジ） |

## ファイル構成

```
src/
├─ main.tsx                 # React エントリ
├─ App.tsx                  # レイアウト + Provider 階層
├─ popup.html               # Vite 入力 HTML
├─ types.ts                 # 型定義（RootState/Group/Word/Preset/Rule）
├─ index.css                # Tailwind + EVA-01 テーマ
├─ context/
│  ├─ PromptContext.tsx     # グローバル状態 + chrome.storage 永続化
│  ├─ GroupTreeDndContext.tsx
│  ├─ WordEditorContext.tsx # ワード追加・編集モーダル API
│  ├─ PresetFormContext.tsx # プリセット保存・編集モーダル API
│  ├─ PresetListContext.tsx # プリセット一覧パネル open/close API
│  └─ ClockNavContext.tsx   # 時計ナビ open API
├─ components/
│  ├─ WordPanel.tsx         # 左：ワード画面統括
│  ├─ SynthesisPanel.tsx    # 右上：総括欄（変換ルール・重複排除・コピー）
│  ├─ SelectedPanel.tsx     # 右下：選択ワード一覧 + プリセット起動
│  ├─ GroupNode.tsx         # 再帰的グループ表示（折り畳み・DnD）
│  ├─ WordItem.tsx          # ワード行（選択/編集/強度調整/DnD）
│  ├─ SearchBox.tsx         # 検索欄（ワード本文+注釈横断）
│  ├─ SearchResults.tsx     # 検索ヒット一覧
│  ├─ IOButtons.tsx         # Import/Export アイコン
│  ├─ WordEditModal.tsx     # ワード追加・編集モーダル
│  ├─ ConfirmDialog.tsx     # 確認ダイアログ（エヴァ風デザイン）
│  ├─ PresetFormModal.tsx   # プリセット保存・メタ編集フォーム
│  ├─ PresetListPanel.tsx   # プリセット一覧（ハニカム + 詳細カード）
│  ├─ group/                # GroupNode 表示部品
│  ├─ word/                 # WordItem 表示部品 + 右クリックメニュー
│  ├─ clock/                # 時計の指針型ロードマップ
│  ├─ preset/               # プリセット UI 部品
│  │  ├─ FormField.tsx
│  │  ├─ ImagePicker.tsx
│  │  ├─ ModelListEditor.tsx
│  │  ├─ NumField.tsx       # EVA風カスタムステッパー
│  │  ├─ PresetHexTile.tsx
│  │  ├─ HexDragGhost.tsx
│  │  ├─ PresetDetailCard.tsx
│  │  └─ UpdateDiffBody.tsx # エントリ更新時の差分表示
│  └─ synthesis/            # 総括欄 UI
│     ├─ DiffPopup.tsx
│     ├─ DiffSection.tsx
│     ├─ countSynthesisPoints.ts
│     ├─ RulesPopup.tsx     # 変換ルール一覧・フォーム・DnD
│     ├─ RuleForm.tsx
│     └─ RuleListItem.tsx
├─ hooks/
│  ├─ useClickOutside.tsx
│  ├─ useEscapeKey.tsx
│  ├─ useSynthesisCopy.tsx
│  ├─ usePresetFormState.tsx
│  ├─ usePresetHexDnD.tsx
│  ├─ usePresetListActions.tsx
│  ├─ useWordEditFormState.tsx
│  ├─ useWordClickActions.tsx
│  ├─ useWordDragEvents.tsx
│  ├─ useWordContextMenu.tsx
│  ├─ useInfoPopover.tsx
│  ├─ useGroupNodeEditing.tsx
│  ├─ useGroupWordReordering.tsx
│  ├─ useGroupDnD.tsx
│  ├─ useClockDial.tsx
│  └─ useClockJump.tsx
└─ lib/
   ├─ tree.ts               # ツリー操作（全モジュールを再エクスポート）
   ├─ tree/                 # ツリー操作モジュール（SRP分割）
   │  ├─ id.ts              # ID生成
   │  ├─ factory.ts / factory.test.ts
   │  ├─ search.ts / search.test.ts
   │  ├─ searchHits.ts / searchHits.test.ts
   │  ├─ immutable.ts / immutable.test.ts
   │  ├─ group.ts / group.test.ts
   │  ├─ word.ts / word.test.ts
   │  ├─ collector.ts / collector.test.ts
   │  ├─ navigation.ts / navigation.test.ts
   │  ├─ preset.ts / preset.test.ts
   │  ├─ rules.ts / rules.test.ts      # 変換ルール CRUD・並替
   │  ├─ normalize.ts / normalize.test.ts
   │  └─ __fixtures__/      # テスト用固定 ID 状態・Import サンプル
   ├─ transform.ts / transform.test.ts  # 総括欄プロンプト変換
   ├─ normalize.ts / normalize.test.ts
   ├─ strength.ts / strength.test.ts
   ├─ diff.ts / diff.test.ts
   ├─ image.ts / image.test.ts
   ├─ array.ts / array.test.ts
   ├─ storage.ts / storage.test.ts
   ├─ clockGeometry.ts / clockGeometry.test.ts
   ├─ wordPopoverGeometry.ts / wordPopoverGeometry.test.ts
   ├─ contextMenuGeometry.ts / contextMenuGeometry.test.ts
   └─ motions.ts            # Motion用アニメーション定義
public/
├─ manifest.json            # Chrome拡張機能マニフェスト（V3）
├─ icons/                   # アイコン画像（16/32/48/128px）
└─ images/                  # UI用背景画像（PresetPanelBg 等）
vitest.config.ts            # テスト専用設定（vite.config と分離）
```