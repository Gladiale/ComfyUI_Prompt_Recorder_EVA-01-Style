# Vitest テストプラン（残り）

> 最終更新: 2026-07-24  
> ブランチ: `feature/preset-enhancement`  
> 現状: **Phase 0〜7 + 8a（条件付き）完了** / **Phase 8b・8c 未着手（任意）**

---

## 1. 完了済みサマリ

| Phase | 内容 | 主な成果物 | コミット |
|-------|------|------------|----------|
| 0 Setup | Vitest 導入 | `vitest.config.ts`, scripts, CLAUDE.md | `7c7c8d6` |
| 1 | 超純粋ユーティリティ | `normalize` / `strength` / `array` | `0d63cca` |
| 2 | ツリー基盤 | factory / search / collector / navigation / immutable + fixtures | `f4e0914` |
| 3 | word / group CRUD | `word.test.ts` / `group.test.ts`（`moveGroup` 重点） | `cc20c97` |
| 4 | プリセット | `preset.test.ts`（save/apply/diff/analyze + 統合） | `44a8117` |
| 5 | Import 正規化 | `normalize.test.ts` + `import-samples.ts` | `b1778a3` |
| 6 | 差分検出 | `diff.test.ts` | `b44c2b7` |
| 7 | storage | `storage.test.ts`（memory + chrome mock + debounce） | `f94c7d5` |
| 8a | image（条件付き） | `fitWithin` export + `image.test.ts`（定数・寸法計算のみ） | （未コミット） |

```bash
npm run test:run
# 目安: 15 files / 236 tests（Phase 8a 時点）
```

### 実行コマンド

| コマンド | 用途 |
|----------|------|
| `npm test` | watch モード |
| `npm run test:run` | 1 回実行（CI 向け） |
| `npm run test:coverage` | カバレッジ（要 `@vitest/coverage-v8`） |

### 設定上の注意（Windows）

ワーカー分離時に `config` / runner 未初期化で落ちることがあるため、現状は次を固定している。

- `pool: "vmThreads"`（forks は Windows で断続的に config 未初期化）
- `maxWorkers: 1`
- `fileParallelism: false`
- `isolate: false`

設定ファイル: [`vitest.config.ts`](../vitest.config.ts)  
CLI でも同フラグを scripts に直書き（`package.json`）。

### テスト配置方針（継続）

- コロケーション: `src/lib/**/*.test.ts`
- 共通フィクスチャ: [`src/lib/tree/__fixtures__/sampleState.ts`](../src/lib/tree/__fixtures__/sampleState.ts)
- 純粋関数優先（DOM / Motion / DnD は後回し）
- `genId` の完全一致には依存しない（プレフィックス or 存在のみ）
- `Date.now` が絡む処理は `vi.useFakeTimers()` で固定

---

## 2. 残りフェーズ一覧

| Phase | 優先度 | 対象 | 目安工数 | 依存 |
|-------|--------|------|----------|------|
| ~~**5** Import 正規化~~ | ~~高~~ | ~~`tree/normalize.ts`~~ | ✅ 完了 | — |
| ~~**6** 差分検出~~ | ~~高~~ | ~~`diff.ts`~~ | ✅ 完了 | — |
| ~~**7** storage~~ | ~~中~~ | ~~`storage.ts`~~ | ✅ 完了 | — |
| ~~**8a** image~~ | ~~低~~ | ~~`image.ts`（fitWithin のみ）~~ | ✅ 条件付き完了 | — |
| **8b** hooks | 低 | `src/hooks/*` | 1 日 | jsdom + RTL |
| **8c** UI smoke | 任意 | 主要コンポーネント | 1 日〜 | RTL |

**推奨着手順:** （必要なら）8b。Canvas / `processPresetImage` 全体のモックテストは行わない。

---

## 3. Phase 5 — Import / Export 正規化

### 対象

- 実装: [`src/lib/tree/normalize.ts`](../src/lib/tree/normalize.ts)
- 公開 API: `normalizeImportedState(raw: unknown): RootState`
- 内部: `normalizeGroup` / `normalizeWord` / `normalizePreset` / `normalizePresetEntry` / `normalizeMetadata` / `normalizeModelList`

### テストファイル案

```
src/lib/tree/normalize.test.ts
src/lib/tree/__fixtures__/import-samples.ts
```

### フィクスチャ案（`import-samples.ts`）

回帰用に「壊れた / 旧形式 / 正常」JSON を固定する。

```ts
// 例（イメージ）
export const SAMPLE_INVALID = [null, [], "str", 42, true];
export const SAMPLE_MINIMAL_OK = { rootGroups: [] };
export const SAMPLE_LEGACY_PRESET = {
  rootGroups: [/* ... */],
  presets: [{ name: "old", entries: [{ wordId: "w1", selected: true }] }],
};
export const SAMPLE_CORRUPT_STRENGTH = { /* strength: "x" / 99 / -1 */ };
```

### ケース表

#### 3.1 ルートフォールバック

| # | 入力 | 期待 |
|---|------|------|
| R1 | `null` / `undefined` | `{ version: ROOT_VERSION, rootGroups: [] }`、`presets` なし |
| R2 | 配列 `[]` / プリミティブ | 同上 |
| R3 | `{}` | 空 rootGroups、presets キーなし |
| R4 | `{ rootGroups: "x", presets: "y" }` | 両方空扱い |

#### 3.2 グループ

| # | 入力 | 期待 |
|---|------|------|
| G1 | 正常ネスト | id/name/words/groups 復元 |
| G2 | `name` 欠落・空白 | `"GROUP"` |
| G3 | `id` 欠落 | `grp_` プレフィックスの自動 ID |
| G4 | `collapsed` 非 boolean | `false` |
| G5 | `groups` / `words` 非配列 | `[]` |
| G6 | 子に `null` 混在 | filter で除去 |
| G7 | 未知フィールド | 無視（落ちない） |

#### 3.3 ワード

| # | 入力 | 期待 |
|---|------|------|
| W1 | 正常 | text/note/selected/strength/image |
| W2 | `id` 欠落 | `w_` 自動 ID |
| W3 | `text` 非 string | `""` |
| W4 | `strength` 範囲外 / 非数 | `clampStrength` と同一（0..10） |
| W5 | `image` 空文字 | `image` プロパティなし |
| W6 | `selected` 非 boolean | `false` |

#### 3.4 プリセット（現行形式）

| # | 入力 | 期待 |
|---|------|------|
| P1 | 完全な PromptPreset | 全フィールド復元 |
| P2 | `name` 空白 | `"PRESET"` |
| P3 | `id` 欠落 | `preset_` 自動 ID |
| P4 | `metadata` 欠落 | steps/cfg/width/height=0、sampler/scheduler="" |
| P5 | metadata 不正数値 | 非負整数丸め / cfg は有限数 fallback |
| P6 | `loras` / `controlNets` 空・不正 | `undefined` または有効分のみ |
| P7 | model 空白エントリ | 除去 |
| P8 | strength 非数（model list） | デフォルト `1` |
| P9 | `description` 空白 | キーなし |
| P10 | `createdAt` 欠落 | `0` |
| P11 | `updatedAt` 有限数 | 保持 |
| P12 | `presets: []` | **state に `presets` キーを持たない** |

#### 3.5 プリセット（旧形式互換）— 重要

| # | 入力 | 期待 |
|---|------|------|
| L1 | `{ name, entries }` のみ | 読み込み可。metadata デフォルト、baseModel="" 等 |
| L2 | entry に `selected` のみ・`text` なし | `text: ""`、wordId 必須、strength clamp |
| L3 | entry に `wordId` 欠落 | その entry は破棄（null filter） |

#### 3.6 ラウンドトリップ寄り

| # | 手順 | 期待 |
|---|------|------|
| RT1 | 正常 state → `JSON.parse(JSON.stringify)` → normalize | 構造等価（id 維持） |
| RT2 | Phase 2 fixtures の `makeSampleRoot()` + presets を export 想定で normalize | 選択・ネスト維持 |

### 実装メモ

- 内部関数は export されていないため、**公開 API 経由のブラックボックス**で十分。
- `genId` 衝突は気にせず「プレフィックス」と「一意性（2件生成）」程度でよい。
- strength は必ず `@/lib/strength` の `clampStrength` と揃っていること（Phase 1 との契約）。

### 完了条件

- [x] `normalize.test.ts` が緑
- [x] 旧形式プリセット・壊れた JSON・空 presets キー省略をカバー
- [x] `npm run test:run` 全体緑（12 files / 186 tests）

---

## 4. Phase 6 — プロンプト差分検出（Diff）

### 対象

- 実装: [`src/lib/diff.ts`](../src/lib/diff.ts)
- 公開 API:
  - `buildSnapshotEntries(refs: SelectedRef[]): SnapshotEntry[]`
  - `makeSnapshot(refs, separator): Snapshot`
  - `computeDiff(currentRefs, snapshot): PromptDiff`

### テストファイル案

```
src/lib/diff.test.ts
```

### ヘルパ案（テスト内）

```ts
function ref(
  id: string,
  text: string,
  opts: { strength?: number; groupId?: string; groupPath?: string[] } = {},
): SelectedRef {
  return {
    word: {
      id,
      text,
      note: "",
      selected: true,
      strength: opts.strength ?? 0,
    },
    groupId: opts.groupId ?? "g1",
    groupPath: opts.groupPath ?? ["G"],
  };
}
```

### ケース表

#### 4.1 `buildSnapshotEntries`

| # | 入力 | 期待 |
|---|------|------|
| B1 | 空配列 | `[]` |
| B2 | 通常 2 件 | 出現順維持、formatted / strength / groupPath 付与 |
| B3 | `text` が空白のみ | スキップ |
| B4 | 同一正規化キーの重複（例: `"A"` と `" a "`、強度 0） | **最初の 1 件のみ** |
| B5 | 生 text は違っても format 後 normalize が同じ | 重複排除（synthesis と同一ルール） |
| B6 | 強度付き format | `strength: 1` → `(text)`、`2` → `(text:1.1)` |
| B7 | strength 非数 | clamp 後 0 |

**重複排除キー:** `normalizeText(formatWordWithStrength(text, strength))`

#### 4.2 `makeSnapshot`

| # | 入力 | 期待 |
|---|------|------|
| M1 | refs + `"comma"` | `separator: "comma"`, `count === entries.length` |
| M2 | `"newline"` | separator 反映 |
| M3 | `takenAt` | `Date.now`（fake timers で固定可能） |

#### 4.3 `computeDiff`

| # | 状況 | 期待 |
|---|------|------|
| D1 | `snapshot === null` | 空 PromptDiff、`hasChanges: false` |
| D2 | 同一選択 | items 空、hasChanges false |
| D3 | 新規選択 wordId | `kind: "added"`、`after` あり |
| D4 | スナップショットにあって現在なし | `kind: "removed"`、`before` あり |
| D5 | 同一 wordId で strength のみ変化 | `kind: "strength"`、before/after |
| D6 | 同一 wordId で text のみ変化 | `kind: "text"` |
| D7 | strength と text **同時**変化 | **kind は `"strength"` 優先**（実装どおり） |
| D8 | text 比較は `normalizeText`（大小・空白差） | 正規化後同一なら text 変更なし |
| D9 | `items === [...added, ...removed, ...modified]` | 配列結合順を確認 |
| D10 | hasChanges | いずれか非空なら true |

#### 4.4 synthesis 整合

| # | 内容 |
|---|------|
| S1 | 同じ refs を `buildSnapshotEntries` した結果が、総括欄の重複排除方針と一致すること（コメント + テストで固定） |

### 完了条件

- [x] added / removed / strength / text / null snapshot / 重複排除をカバー
- [x] strength+text 同時変更の kind 優先を明文化したテストあり
- [x] 全体緑（13 files / 207 tests）

---

## 5. Phase 7 — storage

### 対象

- 実装: [`src/lib/storage.ts`](../src/lib/storage.ts)
- 公開 API:
  - `loadState` / `saveState`
  - `loadSnapshot` / `saveSnapshot`
  - `debounce`

### テストファイル案

```
src/lib/storage.test.ts
```

### 環境分岐の要点

モジュールロード時に `hasChromeStorage` が評価される。

```ts
const hasChromeStorage =
  typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;
```

**注意:** トップレベルで一度だけ評価されるため、テストでは次のいずれかが必要。

1. **推奨:** `vi.resetModules()` のあと `vi.stubGlobal("chrome", ...)` / `undefined` してから `import()` し直す  
2. または memory / localStorage パスだけを、chrome 無し環境（Vitest node）で検証する

### ケース表

#### 5.1 memory / localStorage フォールバック（chrome なし）

| # | 操作 | 期待 |
|---|------|------|
| S1 | `saveState` → `loadState` | ラウンドトリップで等価 |
| S2 | 未保存で `loadState` | `null` |
| S3 | 壊れた JSON を set 相当で仕込む | `loadState` → `null` |
| S4 | `saveSnapshot` → `loadSnapshot` | entries 配列ありで復元 |
| S5 | snapshot に `entries` が配列でない | `loadSnapshot` → `null` |
| S6 | 壊れた snapshot JSON | `null` |

**localStorage がある場合（jsdom 導入後）:**

| # | 操作 | 期待 |
|---|------|------|
| L1 | chrome なし + localStorage | setItem/getItem 経由で永続 |
| L2 | `localStorage.clear()` 後 load | null |

**chrome.storage mock:**

```ts
const store: Record<string, unknown> = {};
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      }),
    },
  },
});
// その後 vi.resetModules() + dynamic import
```

| # | 操作 | 期待 |
|---|------|------|
| C1 | chrome ありで save/load | `chrome.storage.local.set/get` が呼ばれる |
| C2 | get が throw | `null`（catch） |
| C3 | set が throw | 例外を外に出さない |

#### 5.2 `debounce`

| # | 操作 | 期待 |
|---|------|------|
| DB1 | wait 内に複数回呼び出し | 最後の 1 回だけ実行 |
| DB2 | wait 経過後 | 実行される |
| DB3 | fake timers で検証 | `vi.advanceTimersByTime` |

```ts
vi.useFakeTimers();
const fn = vi.fn();
const d = debounce(fn, 220);
d(1); d(2); d(3);
vi.advanceTimersByTime(219);
expect(fn).not.toHaveBeenCalled();
vi.advanceTimersByTime(1);
expect(fn).toHaveBeenCalledOnce();
expect(fn).toHaveBeenCalledWith(3);
```

### 完了条件

- [x] state / snapshot の往復と壊データ
- [x] debounce を fake timers で検証
- [x] chrome mock + memory パスをカバー（resetModules + stubGlobal）
- [x] 全体緑（14 files / 222 tests）

---

## 6. Phase 8 — 後回し領域

Phase 1〜7 で `src/lib` の純粋パスがほぼ固まる。ROI が落ちる部分はここに集約する。

### 8a. 画像圧縮 [`src/lib/image.ts`](../src/lib/image.ts) — ✅ 条件付き完了

| 項目 | 内容 |
|------|------|
| 実施 | `fitWithin` を export し、定数 + 寸法計算のみ unit 化 |
| 非実施 | Canvas / FileReader / `processPresetImage` 全体の mock テスト |
| 成果物 | `src/lib/image.test.ts` |

**カバー済み:**

| # | 内容 |
|---|------|
| I1 | `WORD_IMAGE_MAX_DIM` / `PRESET_IMAGE_MAX_DIM` 定数 |
| I2 | `fitWithin` — 縮小なし / 幅超過 / 高さ超過 / 正方形 / 比率維持 / round |
| — | 極端に細い画像で短辺 0 になる実装挙動を文書化 |

**やらないこと（継続）:** 実画像の見た目・品質、巨大バイナリのスナップショット、jsdom + canvas mock。

### 8b. Hooks

| Hook | テスト観点 | 必要物 |
|------|------------|--------|
| `useClickOutside` | 外側クリックで callback | jsdom + RTL |
| `useEscapeKey` | Escape で callback | jsdom + fireEvent |
| `useSynthesisCopy` | コピー + snapshot 保存の呼び出し | mock storage / clipboard |
| `usePresetFormState` | バリデーション・同名ブロック・画像処理呼び出し | mock image |
| `usePresetListActions` | 還元・更新・削除が confirm 経由 | mock ConfirmContext |
| `usePresetHexDnD` | **後回し**（ポインタ座標・重い） | — |

**追加依存（Phase 8b 着手時）:**

```bash
npm i -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 8c. UI コンポーネント（任意 smoke）

| 対象 | やるなら | やらない |
|------|----------|----------|
| `PresetFormModal` バリデーション表示 | ラベル・エラー文言 | テーマ色スナップショット |
| `ConfirmDialog` Promise 解決 | OK/Cancel | アニメーション |
| `SynthesisPanel` 区切り切替 | テキスト結合 | Motion |
| DnD / Hex honeycomb | **対象外** | — |

---

## 7. カバレッジ目標（残り）

| 段階 | 目標 | メモ |
|------|------|------|
| Phase 5〜6 完了 | `src/lib` statements **~80%+** | normalize / diff を厚く |
| Phase 7 完了 | storage 経路含む | mock 行は除外可 |
| image / motions | 除外 or 低優先 | `coverage.exclude` 候補 |
| hooks / UI | 閾値に入れない | smoke のみ |

`vitest.config.ts` への coverage 設定例（Phase 5 以降で導入可）:

```ts
coverage: {
  provider: "v8",
  include: ["src/lib/**/*.ts"],
  exclude: [
    "src/lib/**/*.test.ts",
    "src/lib/motions.ts",
    "src/lib/image.ts", // 当面
  ],
},
```

依存: `npm i -D @vitest/coverage-v8`

---

## 8. ディレクトリ最終形（予定）

```
src/lib/
  normalize.test.ts          ✅ Phase 1
  strength.test.ts           ✅ Phase 1
  array.test.ts              ✅ Phase 1
  diff.test.ts               ✅ Phase 6
  storage.test.ts            ✅ Phase 7
  image.test.ts              ✅ Phase 8a（fitWithin + 定数のみ）
  tree/
    __fixtures__/
      sampleState.ts         ✅
      import-samples.ts      ✅ Phase 5
    factory.test.ts          ✅
    search.test.ts           ✅
    collector.test.ts        ✅
    navigation.test.ts       ✅
    immutable.test.ts        ✅
    word.test.ts             ✅
    group.test.ts            ✅
    preset.test.ts           ✅
    normalize.test.ts        ✅ Phase 5
```

---

## 9. 実装チェックリスト（コピペ用）

### Phase 5

- [x] `import-samples.ts` に無効 / 旧形式 / 正常サンプルを固定
- [x] `normalize.test.ts` — ルートフォールバック
- [x] グループ・ワード正規化
- [x] プリセット現行 + 旧形式
- [x] 空 presets でキー省略
- [x] `npm run test:run` 緑
- [ ] コミット例: `test: Phase 5 — Import 正規化のユニットテスト`

### Phase 6

- [x] `diff.test.ts` — buildSnapshotEntries（重複排除・空 text）
- [x] makeSnapshot
- [x] computeDiff 全 kind + null + strength 優先
- [x] `npm run test:run` 緑
- [ ] コミット例: `test: Phase 6 — プロンプト差分検出のユニットテスト`

### Phase 7

- [x] `storage.test.ts` — load/save 往復
- [x] 壊 JSON / 不正 snapshot
- [x] debounce + fake timers
- [x] chrome 分岐（resetModules + stubGlobal）と memory パス
- [x] `npm run test:run` 緑
- [ ] コミット例: `test: Phase 7 — storage と debounce のユニットテスト`

### Phase 8（任意）

- [x] 8a: `fitWithin` export + unit（Canvas mock なし）
- [ ] jsdom / RTL 依存追加（8b 着手時）
- [ ] 軽量 hooks のみ
- [ ] UI は smoke に限定

---

## 10. 書かない・避けたいこと（再掲）

- コンポーネントの見た目スナップショット大量取得（EVA テーマ変更で壊れやすい）
- DnD のピクセル座標・Hex レイアウトの幾何テスト
- 本物の `chrome.storage` 実機依存（必ず mock）
- `genId` の文字列完全一致
- flaky な `Date.now` 依存（必ず fake timers）

---

## 11. 次のアクション

1. ~~**Phase 5** から着手~~ ✅ 完了
2. ~~**Phase 6**（コピー後 diff）~~ ✅ 完了
3. ~~**Phase 7** で永続化の安心を足す~~ ✅ 完了
4. ~~**Phase 8a**（fitWithin のみ）~~ ✅ 完了
5. Phase 8b / 8c は不具合が出てからで十分なことが多い

実装に入る際は、このドキュメントのチェックリストを上から消化し、フェーズごとにコミットすると Phase 0〜8a と同じ運用になる。
