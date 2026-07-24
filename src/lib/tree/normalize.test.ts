import { describe, expect, it } from "vitest";
import { normalizeImportedState } from "./normalize";
import { makeSampleRoot } from "./__fixtures__/sampleState";
import {
  SAMPLE_CORRUPT_GROUP_WORD,
  SAMPLE_CORRUPT_PRESET_META,
  SAMPLE_CORRUPT_STRENGTH,
  SAMPLE_EMPTY_PRESETS,
  SAMPLE_FULL_PRESET,
  SAMPLE_INVALID,
  SAMPLE_LEGACY_PRESET,
  SAMPLE_MINIMAL_OK,
  SAMPLE_NESTED_OK,
} from "./__fixtures__/import-samples";
import { ROOT_VERSION } from "@/types";
import { clampStrength } from "@/lib/strength";

// ============================================================
// ルートフォールバック
// ============================================================

describe("normalizeImportedState — root fallback", () => {
  it.each(SAMPLE_INVALID)("無効値 %# は空 state へフォールバックする", (raw) => {
    const state = normalizeImportedState(raw);
    expect(state).toEqual({ version: ROOT_VERSION, rootGroups: [] });
    expect(state).not.toHaveProperty("presets");
  });

  it("{} は空 rootGroups、presets キーなし", () => {
    const state = normalizeImportedState({});
    expect(state.version).toBe(ROOT_VERSION);
    expect(state.rootGroups).toEqual([]);
    expect(state).not.toHaveProperty("presets");
  });

  it("rootGroups / presets が非配列なら両方空扱い", () => {
    const state = normalizeImportedState({
      rootGroups: "x",
      presets: "y",
    });
    expect(state.rootGroups).toEqual([]);
    expect(state).not.toHaveProperty("presets");
  });

  it("presets: [] のとき presets キーを持たない", () => {
    const state = normalizeImportedState(SAMPLE_EMPTY_PRESETS);
    expect(state.rootGroups).toEqual([]);
    expect(state).not.toHaveProperty("presets");
  });

  it("最小 OK オブジェクトを受け入れる", () => {
    const state = normalizeImportedState(SAMPLE_MINIMAL_OK);
    expect(state).toEqual({ version: ROOT_VERSION, rootGroups: [] });
  });
});

// ============================================================
// グループ
// ============================================================

describe("normalizeImportedState — group", () => {
  it("正常ネストを id/name/words/groups で復元する", () => {
    const state = normalizeImportedState(SAMPLE_NESTED_OK);
    expect(state.rootGroups).toHaveLength(1);
    const a = state.rootGroups[0];
    expect(a.id).toBe("grp-a");
    expect(a.name).toBe("Group A");
    expect(a.collapsed).toBe(false);
    expect(a.words).toHaveLength(2);
    expect(a.words[0]).toMatchObject({
      id: "w-a1",
      text: "alpha",
      note: "n1",
      selected: true,
      strength: 0,
    });
    expect(a.words[1]).toMatchObject({
      id: "w-a2",
      text: "beta",
      strength: 2,
      image: "data:image/jpeg;base64,abc",
    });
    expect(a.groups).toHaveLength(1);
    expect(a.groups[0]).toMatchObject({
      id: "grp-b",
      name: "Group B",
      collapsed: true,
      words: [],
      groups: [],
    });
  });

  it("name 欠落・空白は GROUP にフォールバックする", () => {
    const state = normalizeImportedState({
      rootGroups: [{ id: "g1", name: "   " }, { id: "g2" }],
    });
    expect(state.rootGroups[0].name).toBe("GROUP");
    expect(state.rootGroups[1].name).toBe("GROUP");
  });

  it("id 欠落時は grp_ プレフィックスの自動 ID", () => {
    const state = normalizeImportedState({
      rootGroups: [{ name: "A" }, { name: "B" }],
    });
    expect(state.rootGroups[0].id).toMatch(/^grp_/);
    expect(state.rootGroups[1].id).toMatch(/^grp_/);
    expect(state.rootGroups[0].id).not.toBe(state.rootGroups[1].id);
  });

  it("collapsed 非 boolean は false", () => {
    const state = normalizeImportedState({
      rootGroups: [{ id: "g1", name: "G", collapsed: "yes" }],
    });
    expect(state.rootGroups[0].collapsed).toBe(false);
  });

  it("groups / words 非配列は []", () => {
    const state = normalizeImportedState({
      rootGroups: [
        {
          id: "g1",
          name: "G",
          groups: "x",
          words: 42,
        },
      ],
    });
    expect(state.rootGroups[0].groups).toEqual([]);
    expect(state.rootGroups[0].words).toEqual([]);
  });

  it("子に null 混在は filter で除去する", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_GROUP_WORD);
    // ルートの null / 文字列は除去され、有効なオブジェクト 1 件のみ
    expect(state.rootGroups).toHaveLength(1);
    // words: null 除去、残り 2（id あり + id 自動）
    expect(state.rootGroups[0].words).toHaveLength(2);
  });

  it("未知フィールドがあっても落ちない", () => {
    expect(() =>
      normalizeImportedState(SAMPLE_CORRUPT_GROUP_WORD),
    ).not.toThrow();
  });
});

// ============================================================
// ワード
// ============================================================

describe("normalizeImportedState — word", () => {
  it("正常ワードを復元する", () => {
    const state = normalizeImportedState(SAMPLE_NESTED_OK);
    const w = state.rootGroups[0].words[1];
    expect(w).toEqual({
      id: "w-a2",
      text: "beta",
      note: "",
      selected: false,
      strength: 2,
      image: "data:image/jpeg;base64,abc",
    });
  });

  it("id 欠落時は w_ 自動 ID", () => {
    const state = normalizeImportedState({
      rootGroups: [
        {
          id: "g1",
          name: "G",
          words: [{ text: "no-id" }],
          groups: [],
        },
      ],
    });
    expect(state.rootGroups[0].words[0].id).toMatch(/^w_/);
  });

  it("text 非 string は空文字", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_GROUP_WORD);
    const w = state.rootGroups[0].words.find((x) => x.id === "w1")!;
    expect(w.text).toBe("");
  });

  it("strength 範囲外 / 非数は clampStrength と同一", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_STRENGTH);
    const words = state.rootGroups[0].words;
    expect(words[0].strength).toBe(clampStrength("x"));
    expect(words[1].strength).toBe(clampStrength(99));
    expect(words[2].strength).toBe(clampStrength(-1));
    expect(words[0].strength).toBe(0);
    expect(words[1].strength).toBe(10);
    expect(words[2].strength).toBe(0);

    const entry = state.presets![0].entries[0];
    expect(entry.strength).toBe(clampStrength(Number.NaN));
    expect(entry.strength).toBe(0);
  });

  it("image 空文字は image プロパティなし", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_GROUP_WORD);
    const w = state.rootGroups[0].words.find((x) => x.id === "w1")!;
    expect(w).not.toHaveProperty("image");
  });

  it("selected 非 boolean は false", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_GROUP_WORD);
    const w = state.rootGroups[0].words.find((x) => x.id === "w1")!;
    expect(w.selected).toBe(false);
  });
});

// ============================================================
// プリセット（現行形式）
// ============================================================

describe("normalizeImportedState — preset (current)", () => {
  it("完全な PromptPreset を全フィールド復元する", () => {
    const state = normalizeImportedState(SAMPLE_FULL_PRESET);
    expect(state.presets).toHaveLength(1);
    const p = state.presets![0];
    expect(p).toEqual({
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
    });
  });

  it("name 空白は PRESET にフォールバックする", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    expect(state.presets![0].name).toBe("PRESET");
  });

  it("id 欠落時は preset_ 自動 ID", () => {
    const state = normalizeImportedState({
      rootGroups: [],
      presets: [{ name: "X", entries: [] }],
    });
    expect(state.presets![0].id).toMatch(/^preset_/);
  });

  it("metadata 欠落は steps/cfg/width/height=0、sampler/scheduler=\"\"", () => {
    const state = normalizeImportedState({
      rootGroups: [],
      presets: [{ id: "p1", name: "N", entries: [] }],
    });
    expect(state.presets![0].metadata).toEqual({
      steps: 0,
      cfg: 0,
      sampler: "",
      scheduler: "",
      width: 0,
      height: 0,
    });
  });

  it("metadata 不正数値は非負整数丸め / cfg は有限数 fallback", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    expect(state.presets![0].metadata).toEqual({
      steps: 0, // max(0, round(-3.7))
      cfg: 0, // "high" → fallback
      sampler: "",
      scheduler: "",
      width: 512, // round(512.4)
      height: 0, // NaN → fallback
    });
  });

  it("loras / controlNets 空・不正は undefined または有効分のみ", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    const p = state.presets![0];
    // 空白 model と null 除去、ok + strength NaN→1 のみ
    expect(p.loras).toEqual([{ model: "ok", strength: 1 }]);
    expect(p.controlNets).toBeUndefined();
  });

  it("model 空白エントリは除去する", () => {
    const state = normalizeImportedState({
      rootGroups: [],
      presets: [
        {
          id: "p1",
          name: "N",
          entries: [],
          loras: [{ model: "  ", strength: 1 }],
        },
      ],
    });
    expect(state.presets![0].loras).toBeUndefined();
  });

  it("strength 非数（model list）はデフォルト 1", () => {
    const state = normalizeImportedState({
      rootGroups: [],
      presets: [
        {
          id: "p1",
          name: "N",
          entries: [],
          loras: [{ model: "a", strength: "x" }],
        },
      ],
    });
    expect(state.presets![0].loras).toEqual([{ model: "a", strength: 1 }]);
  });

  it("description 空白はキーなし", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    expect(state.presets![0]).not.toHaveProperty("description");
  });

  it("createdAt 欠落は 0", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    expect(state.presets![0].createdAt).toBe(0);
  });

  it("updatedAt 有限数は保持する", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    expect(state.presets![0].updatedAt).toBe(99);
  });

  it("baseModel を trim する", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    expect(state.presets![0].baseModel).toBe("m");
  });
});

// ============================================================
// プリセット（旧形式互換）
// ============================================================

describe("normalizeImportedState — preset (legacy)", () => {
  it("{ name, entries } のみでも読み込み可", () => {
    const state = normalizeImportedState(SAMPLE_LEGACY_PRESET);
    expect(state.presets).toHaveLength(1);
    const p = state.presets![0];
    expect(p.name).toBe("old");
    expect(p.id).toMatch(/^preset_/);
    expect(p.baseModel).toBe("");
    expect(p.baseModelKind).toBe("");
    expect(p.image).toBe("");
    expect(p.metadata).toEqual({
      steps: 0,
      cfg: 0,
      sampler: "",
      scheduler: "",
      width: 0,
      height: 0,
    });
    expect(p.createdAt).toBe(0);
  });

  it("entry に selected のみ・text なし → text: \"\"、strength clamp", () => {
    const state = normalizeImportedState(SAMPLE_LEGACY_PRESET);
    const entries = state.presets![0].entries;
    expect(entries).toEqual([
      { wordId: "w1", text: "", strength: 0 },
      { wordId: "w2", text: "world", strength: 3 },
    ]);
  });

  it("entry に wordId 欠落 / 空白は破棄する", () => {
    const state = normalizeImportedState(SAMPLE_CORRUPT_PRESET_META);
    expect(state.presets![0].entries).toEqual([
      { wordId: "w1", text: "keep", strength: 5 },
    ]);
  });
});

// ============================================================
// ラウンドトリップ寄り
// ============================================================

describe("normalizeImportedState — round-trip", () => {
  it("正常 state を JSON 往復しても構造等価（id 維持）", () => {
    const original = makeSampleRoot();
    const raw = JSON.parse(JSON.stringify(original));
    const state = normalizeImportedState(raw);
    expect(state.version).toBe(ROOT_VERSION);
    expect(state.rootGroups).toEqual(original.rootGroups);
    expect(state).not.toHaveProperty("presets");
  });

  it("sample root + presets を normalize しても選択・ネスト維持", () => {
    const withPresets = {
      ...makeSampleRoot(),
      presets: SAMPLE_FULL_PRESET.presets,
    };
    const state = normalizeImportedState(
      JSON.parse(JSON.stringify(withPresets)),
    );
    expect(state.rootGroups).toEqual(makeSampleRoot().rootGroups);
    expect(state.presets).toHaveLength(1);
    expect(state.presets![0].entries.map((e) => e.wordId)).toEqual([
      "w-a1",
      "w-b1",
    ]);
    // 選択状態
    const a1 = state.rootGroups[0].words[0];
    expect(a1.selected).toBe(true);
    expect(state.rootGroups[0].groups[0].collapsed).toBe(true);
  });

  it("null プリセット要素は除去する", () => {
    const state = normalizeImportedState({
      rootGroups: [],
      presets: [null, "x", { id: "p1", name: "ok", entries: [] }],
    });
    expect(state.presets).toHaveLength(1);
    expect(state.presets![0].id).toBe("p1");
  });
});
