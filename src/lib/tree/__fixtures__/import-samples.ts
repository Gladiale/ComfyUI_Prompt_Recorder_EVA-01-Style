/**
 * Import 正規化（normalizeImportedState）用の固定サンプル。
 * 壊れた / 旧形式 / 正常 JSON を回帰テストで再利用する。
 */

/** ルートとして無効な値（空 state へフォールバック）。 */
export const SAMPLE_INVALID = [null, undefined, [], "str", 42, true] as const;

/** 最小の正常オブジェクト（空ツリー）。 */
export const SAMPLE_MINIMAL_OK = { rootGroups: [] };

/** 正常なネスト構造（ID 固定）。 */
export const SAMPLE_NESTED_OK = {
  version: 1,
  rootGroups: [
    {
      id: "grp-a",
      name: "Group A",
      collapsed: false,
      words: [
        {
          id: "w-a1",
          text: "alpha",
          note: "n1",
          selected: true,
          strength: 0,
        },
        {
          id: "w-a2",
          text: "beta",
          note: "",
          selected: false,
          strength: 2,
          image: "data:image/jpeg;base64,abc",
        },
      ],
      groups: [
        {
          id: "grp-b",
          name: "Group B",
          collapsed: true,
          words: [],
          groups: [],
        },
      ],
    },
  ],
};

/** 現行形式の完全な PromptPreset 1 件付き。 */
export const SAMPLE_FULL_PRESET = {
  rootGroups: [],
  presets: [
    {
      id: "preset-1",
      name: "Full Preset",
      baseModel: "sdxl.safetensors",
      baseModelKind: "checkpoint",
      loras: [{ model: "style.safetensors", strength: 0.8 }],
      controlNets: [{ model: "cn.safetensors", strength: 1 }],
      metadata: {
        steps: 28,
        cfg: 7.5,
        sampler: "euler",
        scheduler: "normal",
        width: 1024,
        height: 1024,
      },
      image: "data:image/jpeg;base64,img",
      description: "desc",
      entries: [
        { wordId: "w-a1", text: "alpha", strength: 0 },
        { wordId: "w-b1", text: "beta", strength: 2 },
      ],
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_100,
    },
  ],
};

/**
 * 旧形式プリセット（name + entries のみ）。
 * entry に selected がある場合もある。
 */
export const SAMPLE_LEGACY_PRESET = {
  rootGroups: [
    {
      id: "grp-1",
      name: "G",
      words: [{ id: "w1", text: "hello", selected: true }],
      groups: [],
    },
  ],
  presets: [
    {
      name: "old",
      entries: [
        { wordId: "w1", selected: true },
        { wordId: "w2", text: "world", strength: 3 },
      ],
    },
  ],
};

/** strength が壊れているワード / entry。 */
export const SAMPLE_CORRUPT_STRENGTH = {
  rootGroups: [
    {
      id: "g1",
      name: "G",
      words: [
        { id: "w1", text: "a", strength: "x" },
        { id: "w2", text: "b", strength: 99 },
        { id: "w3", text: "c", strength: -1 },
      ],
      groups: [],
    },
  ],
  presets: [
    {
      id: "p1",
      name: "P",
      entries: [{ wordId: "w1", text: "a", strength: Number.NaN }],
    },
  ],
};

/** グループ・ワードの欠損・型崩れ。 */
export const SAMPLE_CORRUPT_GROUP_WORD = {
  rootGroups: [
    {
      // id 欠落 → 自動生成
      name: "   ",
      collapsed: "yes",
      groups: "not-array",
      words: [
        null,
        { id: "w1", text: 123, note: null, selected: "yes", image: "" },
        { text: "no-id" },
      ],
      extraField: "ignored",
    },
    null,
    "skip-me",
  ],
};

/** presets が空配列（キー省略を期待）。 */
export const SAMPLE_EMPTY_PRESETS = {
  rootGroups: [],
  presets: [],
};

/** metadata / model list の不正値。 */
export const SAMPLE_CORRUPT_PRESET_META = {
  rootGroups: [],
  presets: [
    {
      id: "p-meta",
      name: "   ",
      baseModel: "  m  ",
      metadata: {
        steps: -3.7,
        cfg: "high",
        sampler: 1,
        scheduler: null,
        width: 512.4,
        height: Number.NaN,
      },
      loras: [
        { model: "  ", strength: 1 },
        { model: "ok", strength: Number.NaN },
        null,
        "x",
      ],
      controlNets: [],
      description: "   ",
      entries: [
        { wordId: "  ", text: "drop" },
        { text: "no-wordId", strength: 1 },
        { wordId: "w1", text: "keep", strength: 5 },
      ],
      // createdAt 欠落
      updatedAt: 99,
    },
  ],
};
