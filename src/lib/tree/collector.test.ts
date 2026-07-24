import { describe, expect, it } from "vitest";
import { findGroup } from "./search";
import {
  collectSelected,
  countSelectedWords,
  countSelectedWordsInGroup,
  groupHasSelection,
} from "./collector";
import { makeEmptyRoot, makeSampleRoot } from "./__fixtures__/sampleState";

describe("collectSelected", () => {
  it("選択ワードを深さ優先・出現順で収集する", () => {
    const root = makeSampleRoot();
    const refs = collectSelected(root);
    expect(refs.map((r) => r.word.id)).toEqual(["w-a1", "w-b1", "w-d1"]);
  });

  it("groupId と groupPath を付与する", () => {
    const root = makeSampleRoot();
    const refs = collectSelected(root);
    const beta = refs.find((r) => r.word.id === "w-b1");
    expect(beta?.groupId).toBe("grp-b");
    expect(beta?.groupPath).toEqual(["Group A", "Group B"]);
  });

  it("未選択のみのツリーは空配列", () => {
    const root = makeSampleRoot();
    // 全解除
    for (const g of root.rootGroups) {
      const clear = (group: typeof g): void => {
        for (const w of group.words) w.selected = false;
        for (const c of group.groups) clear(c);
      };
      clear(g);
    }
    expect(collectSelected(root)).toEqual([]);
  });

  it("空ルートは空配列", () => {
    expect(collectSelected(makeEmptyRoot())).toEqual([]);
  });
});

describe("groupHasSelection", () => {
  it("自身に選択があれば true", () => {
    const root = makeSampleRoot();
    const a = findGroup(root, "grp-a")!;
    expect(groupHasSelection(a)).toBe(true);
  });

  it("子孫にのみ選択があっても true", () => {
    const root = makeSampleRoot();
    // A 自身の選択を外しても B に残る
    const a = findGroup(root, "grp-a")!;
    a.words.forEach((w) => {
      w.selected = false;
    });
    expect(groupHasSelection(a)).toBe(true);
  });

  it("自身も子孫も未選択なら false", () => {
    const root = makeSampleRoot();
    const c = findGroup(root, "grp-c")!;
    expect(groupHasSelection(c)).toBe(false);
  });
});

describe("countSelectedWords", () => {
  it("子孫を含む選択数を返す", () => {
    const root = makeSampleRoot();
    const a = findGroup(root, "grp-a")!;
    // A: w-a1, B: w-b1 → 2
    expect(countSelectedWords(a)).toBe(2);
    const d = findGroup(root, "grp-d")!;
    expect(countSelectedWords(d)).toBe(1);
  });

  it("未選択グループは 0", () => {
    const root = makeSampleRoot();
    const c = findGroup(root, "grp-c")!;
    expect(countSelectedWords(c)).toBe(0);
  });
});

describe("countSelectedWordsInGroup", () => {
  it("サブグループを含まない", () => {
    const root = makeSampleRoot();
    const a = findGroup(root, "grp-a")!;
    // A 直下は w-a1 のみ
    expect(countSelectedWordsInGroup(a)).toBe(1);
    expect(countSelectedWords(a)).toBe(2);
  });
});
