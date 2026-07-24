import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzePresetApply,
  applyPreset,
  collectPresetEntries,
  deletePreset,
  diffPresetEntries,
  renamePreset,
  reorderPresets,
  savePreset,
  updatePresetEntries,
  updatePresetMeta,
} from "./preset";
import { findGroup } from "./search";
import { makeEmptyRoot, makeSampleRoot } from "./__fixtures__/sampleState";
import type { PresetFormData, PromptPreset, RootState } from "@/types";
import { ROOT_VERSION } from "@/types";

const FIXED_NOW = 1_700_000_000_000;

function baseForm(overrides: Partial<PresetFormData> = {}): PresetFormData {
  return {
    name: "My Preset",
    baseModel: "sdxl.safetensors",
    baseModelKind: "checkpoint",
    image: "data:image/jpeg;base64,abc",
    metadata: {
      steps: 28,
      cfg: 7.5,
      sampler: "euler",
      scheduler: "normal",
      width: 1024,
      height: 1024,
    },
    ...overrides,
  };
}

/** sample の選択 (w-a1, w-b1, w-d1) を持つプリセットを手動で載せる */
function rootWithPreset(
  root: RootState = makeSampleRoot(),
  presetOverrides: Partial<PromptPreset> = {},
): RootState {
  const preset: PromptPreset = {
    id: "preset-1",
    name: "Saved",
    baseModel: "model.safetensors",
    baseModelKind: "checkpoint",
    metadata: {
      steps: 20,
      cfg: 7,
      sampler: "euler",
      scheduler: "normal",
      width: 512,
      height: 512,
    },
    image: "data:image/jpeg;base64,old",
    entries: [
      { wordId: "w-a1", text: "alpha", strength: 0 },
      { wordId: "w-b1", text: "beta", strength: 2 },
      { wordId: "w-d1", text: "delta", strength: 0 },
    ],
    createdAt: 1_000,
    ...presetOverrides,
  };
  return { ...root, presets: [preset, ...(root.presets ?? [])] };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================
// collectPresetEntries
// ============================================================

describe("collectPresetEntries", () => {
  it("選択ワードのみを深さ優先で収集する", () => {
    const root = makeSampleRoot();
    expect(collectPresetEntries(root)).toEqual([
      { wordId: "w-a1", text: "alpha", strength: 0 },
      { wordId: "w-b1", text: "beta", strength: 2 },
      { wordId: "w-d1", text: "delta", strength: 0 },
    ]);
  });

  it("strength 未設定は 0 として扱う", () => {
    const root = makeSampleRoot();
    const w = findGroup(root, "grp-a")!.words[0];
    delete w.strength;
    w.selected = true;
    const entries = collectPresetEntries(root);
    expect(entries.find((e) => e.wordId === "w-a1")?.strength).toBe(0);
  });

  it("未選択のみなら空配列", () => {
    const root = makeSampleRoot();
    const clear = (g: (typeof root.rootGroups)[0]): void => {
      for (const w of g.words) w.selected = false;
      for (const c of g.groups) clear(c);
    };
    for (const g of root.rootGroups) clear(g);
    expect(collectPresetEntries(root)).toEqual([]);
  });

  it("空ルートは空配列", () => {
    expect(collectPresetEntries(makeEmptyRoot())).toEqual([]);
  });
});

// ============================================================
// savePreset
// ============================================================

describe("savePreset", () => {
  it("現在の選択とフォームから新規プリセットを追加する", () => {
    const root = makeSampleRoot();
    const next = savePreset(root, baseForm());
    expect(next.presets).toHaveLength(1);
    const p = next.presets![0];
    expect(p.id).toMatch(/^preset_/);
    expect(p.name).toBe("My Preset");
    expect(p.baseModel).toBe("sdxl.safetensors");
    expect(p.baseModelKind).toBe("checkpoint");
    expect(p.image).toBe("data:image/jpeg;base64,abc");
    expect(p.metadata).toEqual(baseForm().metadata);
    expect(p.entries).toEqual([
      { wordId: "w-a1", text: "alpha", strength: 0 },
      { wordId: "w-b1", text: "beta", strength: 2 },
      { wordId: "w-d1", text: "delta", strength: 0 },
    ]);
    expect(p.createdAt).toBe(FIXED_NOW);
    expect(p.updatedAt).toBeUndefined();
  });

  it("name を trim する", () => {
    const next = savePreset(makeSampleRoot(), baseForm({ name: "  spaced  " }));
    expect(next.presets![0].name).toBe("spaced");
  });

  it("空名は PRESET n にフォールバックする", () => {
    const root = makeSampleRoot();
    const a = savePreset(root, baseForm({ name: "   " }));
    expect(a.presets![0].name).toBe("PRESET 1");
    const b = savePreset(a, baseForm({ name: "" }));
    expect(b.presets![1].name).toBe("PRESET 2");
  });

  it("同名でも上書きせず追加する", () => {
    const root = rootWithPreset();
    const next = savePreset(root, baseForm({ name: "Saved" }));
    expect(next.presets).toHaveLength(2);
    expect(next.presets!.map((p) => p.name)).toEqual(["Saved", "Saved"]);
    expect(next.presets![0].id).toBe("preset-1");
    expect(next.presets![1].id).not.toBe("preset-1");
  });

  it("空の loras / controlNets は undefined になる", () => {
    const next = savePreset(
      makeSampleRoot(),
      baseForm({
        loras: [{ model: "  ", strength: 1 }],
        controlNets: [],
      }),
    );
    expect(next.presets![0].loras).toBeUndefined();
    expect(next.presets![0].controlNets).toBeUndefined();
  });

  it("loras を正規化して保存する", () => {
    const next = savePreset(
      makeSampleRoot(),
      baseForm({
        loras: [
          { model: "  style.safetensors  ", strength: 0.8 },
          { model: "", strength: 1 },
          { model: "detail", strength: Number.NaN },
        ],
      }),
    );
    expect(next.presets![0].loras).toEqual([
      { model: "style.safetensors", strength: 0.8 },
      { model: "detail", strength: 1 },
    ]);
  });

  it("description 空は undefined", () => {
    const next = savePreset(
      makeSampleRoot(),
      baseForm({ description: "   " }),
    );
    expect(next.presets![0].description).toBeUndefined();
  });

  it("metadata 未設定は 0 / 空文字へ落とす", () => {
    const next = savePreset(
      makeSampleRoot(),
      baseForm({ metadata: undefined }),
    );
    expect(next.presets![0].metadata).toEqual({
      steps: 0,
      cfg: 0,
      sampler: "",
      scheduler: "",
      width: 0,
      height: 0,
    });
  });

  it("元の root を変更しない", () => {
    const root = makeSampleRoot();
    savePreset(root, baseForm());
    expect(root.presets).toBeUndefined();
  });
});

// ============================================================
// updatePresetMeta
// ============================================================

describe("updatePresetMeta", () => {
  it("メタのみ更新し entries は維持する", () => {
    const root = rootWithPreset();
    const entriesBefore = root.presets![0].entries;
    const next = updatePresetMeta(
      root,
      "preset-1",
      baseForm({
        name: "Renamed Meta",
        baseModel: "new.safetensors",
        image: "data:image/jpeg;base64,new",
      }),
    );
    const p = next.presets!.find((x) => x.id === "preset-1")!;
    expect(p.name).toBe("Renamed Meta");
    expect(p.baseModel).toBe("new.safetensors");
    expect(p.image).toBe("data:image/jpeg;base64,new");
    expect(p.entries).toEqual(entriesBefore);
    expect(p.updatedAt).toBe(FIXED_NOW);
  });

  it("image が空なら既存 image を残す", () => {
    const root = rootWithPreset();
    const next = updatePresetMeta(
      root,
      "preset-1",
      baseForm({ name: "X", image: "" }),
    );
    expect(next.presets![0].image).toBe("data:image/jpeg;base64,old");
  });

  it("存在しない presetId では presets が等価", () => {
    const root = rootWithPreset();
    const next = updatePresetMeta(root, "missing", baseForm());
    expect(next.presets).toEqual(root.presets);
    expect(next).not.toBe(root);
  });
});

// ============================================================
// updatePresetEntries
// ============================================================

describe("updatePresetEntries", () => {
  it("現在の選択で entries を差し替える", () => {
    const root = rootWithPreset();
    // 選択を w-a2 のみに変更
    findGroup(root, "grp-a")!.words[0].selected = false;
    findGroup(root, "grp-a")!.words[1].selected = true;
    findGroup(root, "grp-b")!.words[0].selected = false;
    findGroup(root, "grp-d")!.words[0].selected = false;

    const next = updatePresetEntries(root, "preset-1");
    const p = next.presets!.find((x) => x.id === "preset-1")!;
    expect(p.entries).toEqual([
      { wordId: "w-a2", text: "alpha_dup", strength: 0 },
    ]);
    expect(p.updatedAt).toBe(FIXED_NOW);
    // メタは維持
    expect(p.name).toBe("Saved");
    expect(p.image).toBe("data:image/jpeg;base64,old");
  });
});

// ============================================================
// applyPreset
// ============================================================

describe("applyPreset", () => {
  it("全解除後に entries の wordId のみ selected/strength を当てる", () => {
    const root = rootWithPreset(
      makeSampleRoot(),
      {
        entries: [
          { wordId: "w-a2", text: "alpha_dup", strength: 5 },
          { wordId: "w-c1", text: "gamma", strength: 1 },
        ],
      },
    );
    // 事前: w-a1, w-b1, w-d1 が選択
    const next = applyPreset(root, "preset-1");

    const a = findGroup(next, "grp-a")!;
    expect(a.words.find((w) => w.id === "w-a1")).toMatchObject({
      selected: false,
      strength: 0,
    });
    expect(a.words.find((w) => w.id === "w-a2")).toMatchObject({
      selected: true,
      strength: 5,
    });
    expect(findGroup(next, "grp-b")!.words[0]).toMatchObject({
      selected: false,
      strength: 0,
    });
    expect(findGroup(next, "grp-c")!.words[0]).toMatchObject({
      selected: true,
      strength: 1,
    });
    expect(findGroup(next, "grp-d")!.words[0]).toMatchObject({
      selected: false,
      strength: 0,
    });
  });

  it("text は復元しない", () => {
    const root = rootWithPreset();
    findGroup(root, "grp-a")!.words[0].text = "alpha_edited";
    const next = applyPreset(root, "preset-1");
    expect(findGroup(next, "grp-a")!.words[0].text).toBe("alpha_edited");
    expect(findGroup(next, "grp-a")!.words[0].selected).toBe(true);
  });

  it("ツリーに無い wordId は無視する", () => {
    const root = rootWithPreset(makeSampleRoot(), {
      entries: [
        { wordId: "w-a1", text: "alpha", strength: 0 },
        { wordId: "gone", text: "missing", strength: 3 },
      ],
    });
    const next = applyPreset(root, "preset-1");
    expect(findGroup(next, "grp-a")!.words[0].selected).toBe(true);
    // 他は解除
    expect(findGroup(next, "grp-b")!.words[0].selected).toBe(false);
  });

  it("未知の presetId は同一参照を返す", () => {
    const root = rootWithPreset();
    expect(applyPreset(root, "missing")).toBe(root);
  });

  it("元の root を変更しない", () => {
    const root = rootWithPreset();
    applyPreset(root, "preset-1");
    expect(findGroup(root, "grp-a")!.words[0].selected).toBe(true);
    expect(findGroup(root, "grp-b")!.words[0].strength).toBe(2);
  });
});

// ============================================================
// analyzePresetApply
// ============================================================

describe("analyzePresetApply", () => {
  it("id 欠落・text 変更・件数を報告する", () => {
    const root = rootWithPreset(makeSampleRoot(), {
      entries: [
        { wordId: "w-a1", text: "alpha_old", strength: 0 },
        { wordId: "w-b1", text: "beta", strength: 2 },
        { wordId: "gone", text: "missing", strength: 1 },
      ],
    });
    const report = analyzePresetApply(root, "preset-1")!;
    expect(report.total).toBe(3);
    expect(report.applied).toBe(2);
    expect(report.missing).toEqual([
      { wordId: "gone", text: "missing", strength: 1 },
    ]);
    expect(report.textChanged).toEqual([
      {
        wordId: "w-a1",
        savedText: "alpha_old",
        currentText: "alpha",
        strength: 0,
      },
    ]);
  });

  it("問題がなければ missing/textChanged は空", () => {
    const root = rootWithPreset();
    const report = analyzePresetApply(root, "preset-1")!;
    expect(report.missing).toEqual([]);
    expect(report.textChanged).toEqual([]);
    expect(report.applied).toBe(3);
    expect(report.total).toBe(3);
  });

  it("未知の presetId は null", () => {
    expect(analyzePresetApply(rootWithPreset(), "missing")).toBeNull();
  });
});

// ============================================================
// diffPresetEntries
// ============================================================

describe("diffPresetEntries", () => {
  it("選択が同一なら hasChanges false", () => {
    const root = rootWithPreset();
    const diff = diffPresetEntries(root, "preset-1")!;
    expect(diff.hasChanges).toBe(false);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.strengthChanged).toEqual([]);
    expect(diff.textChanged).toEqual([]);
  });

  it("追加・削除・強度変更・text 変更を検出する", () => {
    const root = rootWithPreset();
    // w-a1 解除（removed）
    findGroup(root, "grp-a")!.words[0].selected = false;
    // w-a2 選択（added）
    findGroup(root, "grp-a")!.words[1].selected = true;
    // w-b1 強度変更
    findGroup(root, "grp-b")!.words[0].strength = 7;
    // w-d1 text 変更（選択は維持）
    findGroup(root, "grp-d")!.words[0].text = "delta_new";

    const diff = diffPresetEntries(root, "preset-1")!;
    expect(diff.hasChanges).toBe(true);
    expect(diff.added).toEqual([
      { wordId: "w-a2", text: "alpha_dup", strength: 0 },
    ]);
    expect(diff.removed).toEqual([
      { wordId: "w-a1", text: "alpha", strength: 0 },
    ]);
    expect(diff.strengthChanged).toEqual([
      { wordId: "w-b1", text: "beta", from: 2, to: 7 },
    ]);
    expect(diff.textChanged).toEqual([
      {
        wordId: "w-d1",
        savedText: "delta",
        currentText: "delta_new",
        strength: 0,
      },
    ]);
  });

  it("未知の presetId は null", () => {
    expect(diffPresetEntries(rootWithPreset(), "missing")).toBeNull();
  });
});

// ============================================================
// delete / rename / reorder
// ============================================================

describe("deletePreset", () => {
  it("指定プリセットを削除する", () => {
    const root: RootState = {
      version: ROOT_VERSION,
      rootGroups: [],
      presets: [
        {
          id: "p1",
          name: "A",
          baseModel: "",
          baseModelKind: "",
          metadata: {
            steps: 0,
            cfg: 0,
            sampler: "",
            scheduler: "",
            width: 0,
            height: 0,
          },
          image: "",
          entries: [],
          createdAt: 1,
        },
        {
          id: "p2",
          name: "B",
          baseModel: "",
          baseModelKind: "",
          metadata: {
            steps: 0,
            cfg: 0,
            sampler: "",
            scheduler: "",
            width: 0,
            height: 0,
          },
          image: "",
          entries: [],
          createdAt: 2,
        },
      ],
    };
    const next = deletePreset(root, "p1");
    expect(next.presets?.map((p) => p.id)).toEqual(["p2"]);
    expect(root.presets).toHaveLength(2);
  });
});

describe("renamePreset", () => {
  it("名前を trim して更新する", () => {
    const root = rootWithPreset();
    const next = renamePreset(root, "preset-1", "  New Name  ");
    expect(next.presets![0].name).toBe("New Name");
    expect(next.presets![0].updatedAt).toBe(FIXED_NOW);
  });

  it("空名は既存名を維持する", () => {
    const root = rootWithPreset();
    const next = renamePreset(root, "preset-1", "   ");
    expect(next.presets![0].name).toBe("Saved");
  });
});

describe("reorderPresets", () => {
  function multiPresets(): RootState {
    return {
      version: ROOT_VERSION,
      rootGroups: [],
      presets: [
        {
          id: "p1",
          name: "A",
          baseModel: "",
          baseModelKind: "",
          metadata: {
            steps: 0,
            cfg: 0,
            sampler: "",
            scheduler: "",
            width: 0,
            height: 0,
          },
          image: "",
          entries: [],
          createdAt: 1,
        },
        {
          id: "p2",
          name: "B",
          baseModel: "",
          baseModelKind: "",
          metadata: {
            steps: 0,
            cfg: 0,
            sampler: "",
            scheduler: "",
            width: 0,
            height: 0,
          },
          image: "",
          entries: [],
          createdAt: 2,
        },
        {
          id: "p3",
          name: "C",
          baseModel: "",
          baseModelKind: "",
          metadata: {
            steps: 0,
            cfg: 0,
            sampler: "",
            scheduler: "",
            width: 0,
            height: 0,
          },
          image: "",
          entries: [],
          createdAt: 3,
        },
      ],
    };
  }

  it("newIds の順に並べ替える", () => {
    const root = multiPresets();
    const next = reorderPresets(root, ["p3", "p1", "p2"]);
    expect(next.presets?.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
  });

  it("newIds に無いプリセットは末尾に残す", () => {
    const root = multiPresets();
    const next = reorderPresets(root, ["p2"]);
    expect(next.presets?.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
  });

  it("未知 id は無視する", () => {
    const root = multiPresets();
    const next = reorderPresets(root, ["missing", "p2", "p1"]);
    expect(next.presets?.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
  });
});

// ============================================================
// 統合シナリオ
// ============================================================

describe("preset integration", () => {
  it("save → 選択変更 → apply で元の選択に戻る", () => {
    const root = makeSampleRoot();
    const saved = savePreset(root, baseForm({ name: "Roundtrip" }));
    const presetId = saved.presets![0].id;

    // 選択を変える
    findGroup(saved, "grp-a")!.words[0].selected = false;
    findGroup(saved, "grp-a")!.words[1].selected = true;
    findGroup(saved, "grp-b")!.words[0].selected = false;
    findGroup(saved, "grp-d")!.words[0].selected = false;

    const applied = applyPreset(saved, presetId);
    expect(collectPresetEntries(applied)).toEqual([
      { wordId: "w-a1", text: "alpha", strength: 0 },
      { wordId: "w-b1", text: "beta", strength: 2 },
      { wordId: "w-d1", text: "delta", strength: 0 },
    ]);
  });

  it("保存後 text 変更 → analyze で textChanged", () => {
    const root = makeSampleRoot();
    const saved = savePreset(root, baseForm());
    const presetId = saved.presets![0].id;
    findGroup(saved, "grp-a")!.words[0].text = "alpha_v2";

    const report = analyzePresetApply(saved, presetId)!;
    expect(report.textChanged).toContainEqual({
      wordId: "w-a1",
      savedText: "alpha",
      currentText: "alpha_v2",
      strength: 0,
    });
  });

  it("ワード削除後 apply → missing、残存 id のみ適用", () => {
    const root = makeSampleRoot();
    const saved = savePreset(root, baseForm());
    const presetId = saved.presets![0].id;

    // w-d1 を持つグループ D をツリーから除去（id 欠落をシミュレート）
    saved.rootGroups = saved.rootGroups.filter((g) => g.id !== "grp-d");

    const report = analyzePresetApply(saved, presetId)!;
    expect(report.missing.map((e) => e.wordId)).toEqual(["w-d1"]);
    expect(report.applied).toBe(2);

    const applied = applyPreset(saved, presetId);
    expect(collectPresetEntries(applied).map((e) => e.wordId)).toEqual([
      "w-a1",
      "w-b1",
    ]);
  });

  it("diff → updateEntries 後は hasChanges false", () => {
    const root = rootWithPreset();
    findGroup(root, "grp-a")!.words[1].selected = true; // add w-a2

    expect(diffPresetEntries(root, "preset-1")!.hasChanges).toBe(true);

    const updated = updatePresetEntries(root, "preset-1");
    expect(diffPresetEntries(updated, "preset-1")!.hasChanges).toBe(false);
  });
});
