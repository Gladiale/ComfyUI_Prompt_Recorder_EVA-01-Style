# vibe coding
- MODEL: glm 5.2
- IDE:   vscode + claude code + cc switch

![preview](preview_01.png)
![preview](preview_02.png)

# ComfyUI Prompt Recorder

エヴァンゲリオン初号機をテーマにした、ComfyUI プロンプトワード記録 Chrome 拡張機能（Manifest V3）。
プロンプトワードを階層化されたグループへ記録・選定し、重複を排除した最終プロンプトを生成する。

# 操作方法
- **グループ**: シングルクリック折り畳み、ダブルクリック編集、ドラッグ&ドロップ順調整＆入れ子機能。
- **ワード**: シングルクリック選択、ダブルクリック編集、ドラッグ&ドロップ順調整、ワードが選定された場合、右クリックプロンプト強度調整。

## 機能

- **ツリー状グループ**: グループは無制限にネスト可能（CHARACTER > Upper Body > Hair …）
- **ワード選択/編集**: シングルクリックで選択切替、ダブルクリックで `text` / `note` 編集
- **注釈 (note)**: ワード横の緑の印で注釈の有無を表示
- **横断検索**: ワード本文と注釈を検索し、非ヒットを淡色化
- **折り畳み**: 選択ワードを内包するグループに緑の徽章を表示
- **総括欄 (右上)**: 選択ワードを出現順に集約し、正規化で重複排除。カンマ/改行切替・クリップボードコピー
- **選択済み一覧 (右下)**: クリックで即時選択解除 → 総括欄が再計算
- **ドラッグ&ドロップ**: ワードは同一グループ内の並替、グループは並替＋他グループ内へのネスト移動
- **JSON 入出力**: アイコンのみで Import（赤紫↓）/ Export（緑↑）。Import 時はマージ確認付き
- **永続化**: `chrome.storage.local` へ debounce 自動保存

## レイアウト

黄金比（1.618:1）。左 61.8% = ワード画面、右上 = 総括欄、右下 = 選択ワード一覧。
ポップアップサイズは 800×600px（Chrome popup 上限 800×600 内）。

## 技術スタック

React 19 / Vite / TypeScript / Tailwind CSS / Motion / React Icons / Manifest V3 / CRXJS Vite Plugin  

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

## ファイル構成

```
src/
├─ main.tsx                 # React エントリ
├─ App.tsx                  # 黄金比レイアウト
├─ popup.html               # Vite 入力 HTML
├─ context/PromptContext.tsx# グローバル状態 + chrome.storage 永続化
├─ components/
│  ├─ WordPanel.tsx         # 左：ワード画面
│  ├─ SynthesisPanel.tsx    # 右上：総括欄
│  ├─ SelectedPanel.tsx     # 右下：選択ワード
│  ├─ GroupNode.tsx         # 再帰的グループ表示
│  ├─ WordItem.tsx          # ワード行（選択/編集/DnD）
│  ├─ SearchBox.tsx         # 検索欄
│  └─ IOButtons.tsx         # Import/Export アイコン
├─ lib/
│  ├─ tree.ts               # ツリー操作（追加/移動/並替/集約）
│  ├─ normalize.ts          # 重複判定
│  └─ storage.ts            # chrome.storage ラッパ
├─ types.ts                 # Group / Word 型定義
└─ index.css                # Tailwind + EVA テーマ
public/
└─ manifest.json
```
