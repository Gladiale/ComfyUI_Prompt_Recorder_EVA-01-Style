import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSnapshotEntries,
  computeDiff,
  isValidSnapshot,
  makeSnapshot,
  type SelectedRef,
  type Snapshot,
} from "./diff";
import type { PromptTransformRule } from "@/types";

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

function rule(
  id: string,
  from: string,
  to: string,
  enabled = true,
): PromptTransformRule {
  return { id, name: id, from, to, enabled };
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
    expect(buildSnapshotEntries([ref("w1", "   "), ref("w2", "ok")])).toEqual([
      expect.objectContaining({ wordId: "w2", text: "ok" }),
    ]);
  });

  it("重複は排除せず全件保持する", () => {
    const entries = buildSnapshotEntries([
      ref("w1", "A", { strength: 0 }),
      ref("w2", " a ", { strength: 0 }),
    ]);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.wordId)).toEqual(["w1", "w2"]);
  });

  it("強度付き format: 1 → (text)、2 → (text:1.1)", () => {
    const entries = buildSnapshotEntries([
      ref("w1", "school", { strength: 1 }),
      ref("w2", "uniform", { strength: 2 }),
    ]);
    expect(entries[0].formatted).toBe("(school)");
    expect(entries[1].formatted).toBe("(uniform:1.1)");
  });

  it("変換ルール適用後のテキストを保存する", () => {
    const entries = buildSnapshotEntries(
      [ref("w1", "cat", { strength: 2 })],
      [rule("r1", "cat", "dog")],
    );
    expect(entries[0]).toMatchObject({
      text: "dog",
      formatted: "(dog:1.1)",
      strength: 2,
    });
  });

  it("変換後が空でも保持する", () => {
    const entries = buildSnapshotEntries(
      [ref("w1", "cat")],
      [rule("r1", "cat", "")],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      wordId: "w1",
      text: "",
      formatted: "",
    });
  });
});

// ============================================================
// makeSnapshot / isValidSnapshot
// ============================================================

describe("makeSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('separator "comma" と formatVersion 2', () => {
    const refs = [ref("w1", "a"), ref("w2", "b")];
    const snap = makeSnapshot(refs, "comma");
    expect(snap.formatVersion).toBe(2);
    expect(snap.separator).toBe("comma");
    expect(snap.count).toBe(2);
    expect(snap.entries).toHaveLength(2);
    expect(snap.takenAt).toBe(FIXED_NOW);
  });

  it("変換後空は count に含めないが entries には残す", () => {
    const snap = makeSnapshot(
      [ref("w1", "cat"), ref("w2", "dog")],
      "comma",
      [rule("r1", "cat", "")],
    );
    expect(snap.entries).toHaveLength(2);
    expect(snap.count).toBe(1);
  });
});

describe("isValidSnapshot", () => {
  it("formatVersion 2 のみ有効", () => {
    expect(
      isValidSnapshot({
        formatVersion: 2,
        entries: [],
        separator: "comma",
        takenAt: 1,
        count: 0,
      }),
    ).toBe(true);
  });

  it("旧形式（formatVersion なし）は無効", () => {
    expect(
      isValidSnapshot({
        entries: [{ wordId: "w1", text: "a", strength: 0, formatted: "a" }],
        separator: "comma",
        takenAt: 1,
        count: 1,
      }),
    ).toBe(false);
  });

  it("entries 非配列は無効", () => {
    expect(isValidSnapshot({ formatVersion: 2, entries: null })).toBe(false);
  });
});

// ============================================================
// computeDiff
// ============================================================

describe("computeDiff", () => {
  function snapFrom(
    refs: SelectedRef[],
    rules: PromptTransformRule[] = [],
  ): Snapshot {
    return makeSnapshot(refs, "comma", rules);
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
  });

  it("新規選択 wordId は kind: added", () => {
    const snapshot = snapFrom([ref("w1", "alpha")]);
    const diff = computeDiff(
      [ref("w1", "alpha"), ref("w2", "beta", { strength: 1 })],
      snapshot,
    );
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({
      kind: "added",
      wordId: "w2",
      after: { text: "beta", strength: 1, formatted: "(beta)" },
    });
    expect(diff.hasChanges).toBe(true);
  });

  it("スナップショットにあって現在なしは kind: removed", () => {
    const snapshot = snapFrom([
      ref("w1", "alpha"),
      ref("w2", "beta", { strength: 2 }),
    ]);
    const diff = computeDiff([ref("w1", "alpha")], snapshot);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]).toMatchObject({
      kind: "removed",
      wordId: "w2",
      before: { text: "beta", strength: 2, formatted: "(beta:1.1)" },
    });
  });

  it("同一 wordId で strength のみ変化は kind: strength", () => {
    const snapshot = snapFrom([ref("w1", "alpha", { strength: 0 })]);
    const diff = computeDiff([ref("w1", "alpha", { strength: 3 })], snapshot);
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
    const diff = computeDiff([ref("w1", "alpha_v2", { strength: 0 })], snapshot);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]).toMatchObject({
      kind: "text",
      wordId: "w1",
      before: { text: "alpha", strength: 0 },
      after: { text: "alpha_v2", strength: 0 },
    });
  });

  it("strength と text 同時変化は kind が strength 優先", () => {
    const snapshot = snapFrom([ref("w1", "alpha", { strength: 0 })]);
    const diff = computeDiff([ref("w1", "beta", { strength: 5 })], snapshot);
    expect(diff.modified[0].kind).toBe("strength");
  });

  it("text 比較は完全一致（大小・空白差も変更とみなす）", () => {
    const snapshot = snapFrom([ref("w1", "Alpha")]);
    const diff = computeDiff([ref("w1", "  alpha  ")], snapshot);
    expect(diff.hasChanges).toBe(true);
    expect(diff.modified[0].kind).toBe("text");
  });

  it("ルール変更によるテキスト変化を検出する", () => {
    const refs = [ref("w1", "cat")];
    const snapshot = snapFrom(refs, []); // コピー時: cat
    const diff = computeDiff(refs, snapshot, [rule("r1", "cat", "dog")]);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]).toMatchObject({
      kind: "text",
      before: { text: "cat", formatted: "cat" },
      after: { text: "dog", formatted: "dog" },
    });
  });

  it("変換後の空文字化はテキスト変更として表示", () => {
    const refs = [ref("w1", "cat")];
    const snapshot = snapFrom(refs, []);
    const diff = computeDiff(refs, snapshot, [rule("r1", "cat", "")]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]).toMatchObject({
      kind: "text",
      before: { text: "cat", formatted: "cat" },
      after: { text: "", formatted: "" },
    });
  });

  it("重複排除で非表示のワードも追跡する", () => {
    const refs = [ref("w1", "cat"), ref("w2", "cat")];
    const snapshot = snapFrom(refs, []);
    // w2 を dog に変換するルールはないが、選択は両方残る
    const diff = computeDiff(refs, snapshot, []);
    expect(diff.hasChanges).toBe(false);
    // ルールで w 全体 cat→dog しても両方 text 変更
    const diff2 = computeDiff(refs, snapshot, [rule("r1", "cat", "dog")]);
    expect(diff2.modified).toHaveLength(2);
  });

  it("items === [...added, ...removed, ...modified] の結合順", () => {
    const snapshot = snapFrom([
      ref("w1", "keep"),
      ref("w2", "gone"),
      ref("w3", "edit", { strength: 0 }),
    ]);
    const current = [
      ref("w1", "keep"),
      ref("w3", "edit", { strength: 2 }),
      ref("w4", "new"),
    ];
    const diff = computeDiff(current, snapshot);
    expect(diff.items.map((i) => i.kind)).toEqual([
      "added",
      "removed",
      "strength",
    ]);
  });
});
