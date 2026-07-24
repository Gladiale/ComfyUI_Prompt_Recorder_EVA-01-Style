import { describe, expect, it } from "vitest";
import { findGroup } from "./search";
import { collectAllGroups, expandGroupPath } from "./navigation";
import { makeEmptyRoot, makeSampleRoot } from "./__fixtures__/sampleState";

describe("collectAllGroups", () => {
  it("全グループを深さ優先で平坦化する", () => {
    const root = makeSampleRoot();
    const refs = collectAllGroups(root);
    expect(refs.map((r) => r.id)).toEqual(["grp-a", "grp-b", "grp-c", "grp-d"]);
  });

  it("depth と path を付与する", () => {
    const root = makeSampleRoot();
    const refs = collectAllGroups(root);
    const c = refs.find((r) => r.id === "grp-c")!;
    expect(c.depth).toBe(2);
    expect(c.path).toEqual(["Group A", "Group B", "Group C"]);
    expect(c.name).toBe("Group C");

    const a = refs.find((r) => r.id === "grp-a")!;
    expect(a.depth).toBe(0);
    expect(a.path).toEqual(["Group A"]);
  });

  it("空ルートは空配列", () => {
    expect(collectAllGroups(makeEmptyRoot())).toEqual([]);
  });
});

describe("expandGroupPath", () => {
  it("対象と祖先を展開する", () => {
    const root = makeSampleRoot();
    // B は collapsed: true
    expect(findGroup(root, "grp-b")?.collapsed).toBe(true);

    const next = expandGroupPath(root, "grp-c");
    expect(findGroup(next, "grp-a")?.collapsed).toBe(false);
    expect(findGroup(next, "grp-b")?.collapsed).toBe(false);
    expect(findGroup(next, "grp-c")?.collapsed).toBe(false);
  });

  it("元の root を変更しない", () => {
    const root = makeSampleRoot();
    expandGroupPath(root, "grp-c");
    expect(findGroup(root, "grp-b")?.collapsed).toBe(true);
  });

  it("存在しない id では collapsed 状態を変えない（クローンのみ）", () => {
    const root = makeSampleRoot();
    const next = expandGroupPath(root, "missing");
    expect(findGroup(next, "grp-b")?.collapsed).toBe(true);
    expect(next).not.toBe(root);
  });

  it("ルート直下のグループも展開できる", () => {
    const root = makeSampleRoot();
    const a = findGroup(root, "grp-a")!;
    a.collapsed = true;
    const next = expandGroupPath(root, "grp-a");
    expect(findGroup(next, "grp-a")?.collapsed).toBe(false);
  });
});
