import { describe, expect, it } from "vitest";
import { clone, mutateGroup } from "./immutable";
import { findGroup } from "./search";
import { makeSampleRoot } from "./__fixtures__/sampleState";

describe("clone", () => {
  it("深いコピーを返す（参照を共有しない）", () => {
    const root = makeSampleRoot();
    const next = clone(root);

    expect(next).not.toBe(root);
    expect(next.rootGroups).not.toBe(root.rootGroups);
    expect(next.rootGroups[0]).not.toBe(root.rootGroups[0]);
    expect(next.rootGroups[0].words).not.toBe(root.rootGroups[0].words);
    expect(next.rootGroups[0].words[0]).not.toBe(root.rootGroups[0].words[0]);
  });

  it("内容は等価", () => {
    const root = makeSampleRoot();
    expect(clone(root)).toEqual(root);
  });

  it("クローン側の変更が元に影響しない", () => {
    const root = makeSampleRoot();
    const next = clone(root);
    next.rootGroups[0].name = "CHANGED";
    next.rootGroups[0].words[0].text = "mutated";
    expect(root.rootGroups[0].name).toBe("Group A");
    expect(root.rootGroups[0].words[0].text).toBe("alpha");
  });
});

describe("mutateGroup", () => {
  it("対象グループを updater で更新した新しい root を返す", () => {
    const root = makeSampleRoot();
    const next = mutateGroup(root, "grp-b", (g) => {
      g.name = "Renamed B";
      g.collapsed = false;
    });

    expect(findGroup(next, "grp-b")?.name).toBe("Renamed B");
    expect(findGroup(next, "grp-b")?.collapsed).toBe(false);
    // 元は不変
    expect(findGroup(root, "grp-b")?.name).toBe("Group B");
    expect(findGroup(root, "grp-b")?.collapsed).toBe(true);
  });

  it("存在しない id でもクローンを返し、内容は等価", () => {
    const root = makeSampleRoot();
    const next = mutateGroup(root, "missing", (g) => {
      g.name = "nope";
    });
    expect(next).not.toBe(root);
    expect(next).toEqual(root);
  });

  it("ネストしたグループも更新できる", () => {
    const root = makeSampleRoot();
    const next = mutateGroup(root, "grp-c", (g) => {
      g.words.push({
        id: "w-new",
        text: "new",
        note: "",
        selected: false,
        strength: 0,
      });
    });
    expect(findGroup(next, "grp-c")?.words).toHaveLength(2);
    expect(findGroup(root, "grp-c")?.words).toHaveLength(1);
  });
});
