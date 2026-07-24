import { describe, expect, it } from "vitest";
import { makeEmptyRoot, makeSampleRoot } from "./__fixtures__/sampleState";
import { findGroup, isDescendant } from "./search";

describe("findGroup", () => {
  it("ルート直下のグループを見つける", () => {
    const root = makeSampleRoot();
    expect(findGroup(root, "grp-a")?.name).toBe("Group A");
    expect(findGroup(root, "grp-d")?.name).toBe("Group D");
  });

  it("ネストしたグループを見つける", () => {
    const root = makeSampleRoot();
    expect(findGroup(root, "grp-b")?.name).toBe("Group B");
    expect(findGroup(root, "grp-c")?.name).toBe("Group C");
  });

  it("存在しない id は undefined", () => {
    const root = makeSampleRoot();
    expect(findGroup(root, "missing")).toBeUndefined();
  });

  it("空ツリーでは undefined", () => {
    expect(findGroup(makeEmptyRoot(), "grp-a")).toBeUndefined();
  });
});

describe("isDescendant", () => {
  it("直接の子は子孫", () => {
    const root = makeSampleRoot();
    expect(isDescendant(root, "grp-a", "grp-b")).toBe(true);
  });

  it("孫も子孫", () => {
    const root = makeSampleRoot();
    expect(isDescendant(root, "grp-a", "grp-c")).toBe(true);
    expect(isDescendant(root, "grp-b", "grp-c")).toBe(true);
  });

  it("兄弟・無関係は false", () => {
    const root = makeSampleRoot();
    expect(isDescendant(root, "grp-a", "grp-d")).toBe(false);
    expect(isDescendant(root, "grp-d", "grp-a")).toBe(false);
    expect(isDescendant(root, "grp-c", "grp-a")).toBe(false);
  });

  it("自分自身は子孫ではない", () => {
    const root = makeSampleRoot();
    expect(isDescendant(root, "grp-a", "grp-a")).toBe(false);
  });

  it("祖先 id が存在しない場合は false", () => {
    const root = makeSampleRoot();
    expect(isDescendant(root, "missing", "grp-a")).toBe(false);
  });
});
