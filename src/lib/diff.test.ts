import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSnapshotEntries,
  computeDiff,
  makeSnapshot,
  type SelectedRef,
  type Snapshot,
} from "./diff";
import { normalizeText } from "@/lib/normalize";
import { formatWordWithStrength } from "@/lib/strength";

const FIXED_NOW = 1_700_000_000_000;

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

// ============================================================
// buildSnapshotEntries
// ============================================================

describe("buildSnapshotEntries", () => {
  it("空配列は []", () => {
    expect(buildSnapshotEntries([])).toEqual([]);
  });

  it("通常 2 件は出現順維持、formatted / strength / groupPath 付与", () => {
    const entries = buildSnapshotEntries([
      ref("w1", "alpha", { strength: 0, groupPath: ["A"] }),
      ref("w2", "beta", { strength: 2, groupId: "g2", groupPath: ["A", "B"] }),
    ]);
    expect(entries).toEqual([
      {
        wordId: "w1",
        text: "alpha",
        strength: 0,
        formatted: "alpha",
        groupId: "g1",
        groupPath: ["A"],
      },
      {
        wordId: "w2",
        text: "beta",
        strength: 2,
        formatted: "(beta:1.1)",
        groupId: "g2",
        groupPath: ["A", "B"],
      },
    ]);
  });

  it("text が空白のみのワードはスキップする", () => {
    expect(
      buildSnapshotEntries([ref("w1", "   "), ref("w2", "ok")]),
    ).toEqual([
      expect.objectContaining({ wordId: "w2", text: "ok" }),
    ]);
  });

  it("同一正規化キーの重複は最初の 1 件のみ残す", () => {
    const entries = buildSnapshotEntries([
      ref("w1", "A", { strength: 0 }),
      ref("w2", " a ", { strength: 0 }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].wordId).toBe("w1");
    expect(entries[0].text).toBe("A");
  });

  it("生 text が違っても format 後 normalize が同じなら重複排除", () => {
    // strength 0 の "Hello" と "  HELLO  " → normalizeText 同一
    const entries = buildSnapshotEntries([
      ref("w1", "Hello"),
      ref("w2", "  HELLO  "),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].wordId).toBe("w1");
  });

  it("強度付き format: 1 → (text)、2 → (text:1.1)", () => {
    const entries = buildSnapshotEntries([
      ref("w1", "school", { strength: 1 }),
      ref("w2", "uniform", { strength: 2 }),
    ]);
    expect(entries[0].formatted).toBe("(school)");
    expect(entries[1].formatted).toBe("(uniform:1.1)");
  });

  it("strength 非数は clamp 後 0", () => {
    const entries = buildSnapshotEntries([
      {
        word: {
          id: "w1",
          text: "x",
          note: "",
          selected: true,
          strength: Number.NaN as unknown as number,
        },
        groupId: "g1",
        groupPath: ["G"],
      },
    ]);
    expect(entries[0].strength).toBe(0);
    expect(entries[0].formatted).toBe("x");
  });

  /**
   * synthesis 整合 (S1):
   * 重複排除キーは normalizeText(formatWordWithStrength(text, strength))。
   * 総括欄と同じルールで最初の出現のみ残す。
   */
  it("重複排除キーは normalizeText(formatWordWithStrength(...))", () => {
    const r1 = ref("w1", "tag", { strength: 1 });
    const r2 = ref("w2", "TAG", { strength: 1 }); // format 後 "(TAG)" → normalize "(tag)"
    const entries = buildSnapshotEntries([r1, r2]);
    expect(entries).toHaveLength(1);

    const key1 = normalizeText(
      formatWordWithStrength(r1.word.text, r1.word.strength),
    );
    const key2 = normalizeText(
      formatWordWithStrength(r2.word.text, r2.word.strength),
    );
    expect(key1).toBe(key2);
    expect(entries[0].wordId).toBe("w1");
  });
});

// ============================================================
// makeSnapshot
// ============================================================

describe("makeSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('separator "comma" と count === entries.length', () => {
    const refs = [ref("w1", "a"), ref("w2", "b")];
    const snap = makeSnapshot(refs, "comma");
    expect(snap.separator).toBe("comma");
    expect(snap.count).toBe(2);
    expect(snap.entries).toHaveLength(2);
    expect(snap.takenAt).toBe(FIXED_NOW);
  });

  it('separator "newline" を反映する', () => {
    const snap = makeSnapshot([ref("w1", "a")], "newline");
    expect(snap.separator).toBe("newline");
    expect(snap.count).toBe(1);
  });

  it("重複排除後の件数を count に使う", () => {
    const snap = makeSnapshot(
      [ref("w1", "A"), ref("w2", " a ")],
      "comma",
    );
    expect(snap.count).toBe(1);
    expect(snap.entries).toHaveLength(1);
  });
});

// ============================================================
// computeDiff
// ============================================================

describe("computeDiff", () => {
  function snapFrom(refs: SelectedRef[]): Snapshot {
    return makeSnapshot(refs, "comma");
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("snapshot === null は空 PromptDiff、hasChanges false", () => {
    const diff = computeDiff([ref("w1", "a")], null);
    expect(diff).toEqual({
      items: [],
      added: [],
      removed: [],
      modified: [],
      hasChanges: false,
    });
  });

  it("同一選択は items 空、hasChanges false", () => {
    const refs = [ref("w1", "alpha"), ref("w2", "beta", { strength: 2 })];
    const diff = computeDiff(refs, snapFrom(refs));
    expect(diff.hasChanges).toBe(false);
    expect(diff.items).toEqual([]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("新規選択 wordId は kind: added、after あり", () => {
    const snapshot = snapFrom([ref("w1", "alpha")]);
    const diff = computeDiff(
      [ref("w1", "alpha"), ref("w2", "beta", { strength: 1 })],
      snapshot,
    );
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({
      kind: "added",
      wordId: "w2",
      text: "beta",
      after: {
        text: "beta",
        strength: 1,
        formatted: "(beta)",
      },
    });
    expect(diff.added[0].before).toBeUndefined();
    expect(diff.hasChanges).toBe(true);
  });

  it("スナップショットにあって現在なしは kind: removed、before あり", () => {
    const snapshot = snapFrom([
      ref("w1", "alpha"),
      ref("w2", "beta", { strength: 2 }),
    ]);
    const diff = computeDiff([ref("w1", "alpha")], snapshot);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]).toMatchObject({
      kind: "removed",
      wordId: "w2",
      text: "beta",
      before: {
        text: "beta",
        strength: 2,
        formatted: "(beta:1.1)",
      },
    });
    expect(diff.removed[0].after).toBeUndefined();
  });

  it("同一 wordId で strength のみ変化は kind: strength", () => {
    const snapshot = snapFrom([ref("w1", "alpha", { strength: 0 })]);
    const diff = computeDiff(
      [ref("w1", "alpha", { strength: 3 })],
      snapshot,
    );
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]).toMatchObject({
      kind: "strength",
      wordId: "w1",
      before: { text: "alpha", strength: 0, formatted: "alpha" },
      after: { text: "alpha", strength: 3, formatted: "(alpha:1.2)" },
    });
  });

  it("同一 wordId で text のみ変化は kind: text", () => {
    const snapshot = snapFrom([ref("w1", "alpha", { strength: 0 })]);
    const diff = computeDiff(
      [ref("w1", "alpha_v2", { strength: 0 })],
      snapshot,
    );
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]).toMatchObject({
      kind: "text",
      wordId: "w1",
      text: "alpha_v2",
      before: { text: "alpha", strength: 0 },
      after: { text: "alpha_v2", strength: 0 },
    });
  });

  it("strength と text 同時変化は kind が strength 優先", () => {
    const snapshot = snapFrom([ref("w1", "alpha", { strength: 0 })]);
    const diff = computeDiff(
      [ref("w1", "beta", { strength: 5 })],
      snapshot,
    );
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].kind).toBe("strength");
    expect(diff.modified[0].before).toMatchObject({
      text: "alpha",
      strength: 0,
    });
    expect(diff.modified[0].after).toMatchObject({
      text: "beta",
      strength: 5,
    });
  });

  it("text 比較は normalizeText（大小・空白差は変更なし）", () => {
    const snapshot = snapFrom([ref("w1", "Alpha")]);
    const diff = computeDiff([ref("w1", "  alpha  ")], snapshot);
    expect(diff.hasChanges).toBe(false);
    expect(diff.modified).toEqual([]);
  });

  it("items === [...added, ...removed, ...modified] の結合順", () => {
    const snapshot = snapFrom([
      ref("w1", "keep"),
      ref("w2", "gone"),
      ref("w3", "edit", { strength: 0 }),
    ]);
    const current = [
      ref("w1", "keep"),
      ref("w3", "edit", { strength: 2 }), // strength
      ref("w4", "new"), // added
    ];
    const diff = computeDiff(current, snapshot);
    expect(diff.added.map((i) => i.wordId)).toEqual(["w4"]);
    expect(diff.removed.map((i) => i.wordId)).toEqual(["w2"]);
    expect(diff.modified.map((i) => i.wordId)).toEqual(["w3"]);
    expect(diff.items.map((i) => i.kind)).toEqual([
      "added",
      "removed",
      "strength",
    ]);
    expect(diff.items).toEqual([
      ...diff.added,
      ...diff.removed,
      ...diff.modified,
    ]);
  });

  it("いずれか非空なら hasChanges true", () => {
    const snapshot = snapFrom([ref("w1", "a")]);
    expect(computeDiff([ref("w1", "a"), ref("w2", "b")], snapshot).hasChanges).toBe(
      true,
    );
    expect(computeDiff([], snapshot).hasChanges).toBe(true);
    expect(
      computeDiff([ref("w1", "a", { strength: 1 })], snapshot).hasChanges,
    ).toBe(true);
  });
});
