import { describe, expect, it } from "vitest";
import {
  addGroup,
  deleteGroup,
  moveGroup,
  renameGroup,
  setCollapsed,
  toggleCollapse,
} from "./group";
import { findGroup } from "./search";
import { collectAllGroups } from "./navigation";
import { group, makeEmptyRoot, makeSampleRoot, word } from "./__fixtures__/sampleState";
import type { RootState } from "@/types";
import { ROOT_VERSION } from "@/types";

/** 兄弟並び用: root に X, Y, Z をフラット配置 */
function makeSiblingRoot(): RootState {
  return {
    version: ROOT_VERSION,
    rootGroups: [
      group("grp-x", "X", { words: [word("w-x", "x")] }),
      group("grp-y", "Y"),
      group("grp-z", "Z"),
    ],
  };
}

describe("addGroup", () => {
  it("parentId null でルート末尾に追加する", () => {
    const root = makeSampleRoot();
    const next = addGroup(root, null);
    expect(next.rootGroups).toHaveLength(3);
    const added = next.rootGroups[2];
    expect(added.name).toBe("NEW GROUP");
    expect(added.id).toMatch(/^grp_/);
    expect(added.groups).toEqual([]);
    expect(added.words).toEqual([]);
  });

  it("親の子として追加し、親を展開する", () => {
    const root = makeSampleRoot();
    expect(findGroup(root, "grp-b")?.collapsed).toBe(true);
    const next = addGroup(root, "grp-b");
    const b = findGroup(next, "grp-b")!;
    expect(b.collapsed).toBe(false);
    expect(b.groups).toHaveLength(2); // C + NEW
    expect(b.groups[1].name).toBe("NEW GROUP");
  });

  it("存在しない parentId ではツリー構造が変わらない", () => {
    const root = makeSampleRoot();
    const next = addGroup(root, "missing");
    expect(collectAllGroups(next).map((g) => g.id)).toEqual(
      collectAllGroups(root).map((g) => g.id),
    );
  });

  it("空ルートにも追加できる", () => {
    const next = addGroup(makeEmptyRoot(), null);
    expect(next.rootGroups).toHaveLength(1);
  });

  it("元の root を変更しない", () => {
    const root = makeSampleRoot();
    const len = root.rootGroups.length;
    addGroup(root, null);
    expect(root.rootGroups).toHaveLength(len);
  });
});

describe("renameGroup", () => {
  it("名前を変更する", () => {
    const root = makeSampleRoot();
    const next = renameGroup(root, "grp-c", "Renamed C");
    expect(findGroup(next, "grp-c")?.name).toBe("Renamed C");
    expect(findGroup(root, "grp-c")?.name).toBe("Group C");
  });
});

describe("toggleCollapse / setCollapsed", () => {
  it("toggle で collapsed を反転する", () => {
    const root = makeSampleRoot();
    // B は true
    const off = toggleCollapse(root, "grp-b");
    expect(findGroup(off, "grp-b")?.collapsed).toBe(false);
    const on = toggleCollapse(off, "grp-b");
    expect(findGroup(on, "grp-b")?.collapsed).toBe(true);
  });

  it("setCollapsed で明示設定する", () => {
    const root = makeSampleRoot();
    const next = setCollapsed(root, "grp-a", true);
    expect(findGroup(next, "grp-a")?.collapsed).toBe(true);
    const back = setCollapsed(next, "grp-a", false);
    expect(findGroup(back, "grp-a")?.collapsed).toBe(false);
  });
});

describe("deleteGroup", () => {
  it("ルート直下のグループを削除する", () => {
    const root = makeSampleRoot();
    const next = deleteGroup(root, "grp-d");
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-a"]);
    expect(findGroup(next, "grp-d")).toBeUndefined();
  });

  it("ネストしたグループを削除する", () => {
    const root = makeSampleRoot();
    const next = deleteGroup(root, "grp-c");
    expect(findGroup(next, "grp-c")).toBeUndefined();
    expect(findGroup(next, "grp-b")?.groups).toHaveLength(0);
    // 兄弟・祖先は残る
    expect(findGroup(next, "grp-a")).toBeDefined();
    expect(findGroup(next, "grp-b")).toBeDefined();
  });

  it("親を削除すると子孫も消える", () => {
    const root = makeSampleRoot();
    const next = deleteGroup(root, "grp-a");
    expect(findGroup(next, "grp-a")).toBeUndefined();
    expect(findGroup(next, "grp-b")).toBeUndefined();
    expect(findGroup(next, "grp-c")).toBeUndefined();
    expect(findGroup(next, "grp-d")).toBeDefined();
  });

  it("存在しない id では構造が変わらない", () => {
    const root = makeSampleRoot();
    const next = deleteGroup(root, "missing");
    expect(collectAllGroups(next).map((g) => g.id)).toEqual(
      collectAllGroups(root).map((g) => g.id),
    );
  });

  it("元の root を変更しない", () => {
    const root = makeSampleRoot();
    deleteGroup(root, "grp-a");
    expect(findGroup(root, "grp-a")).toBeDefined();
  });
});

describe("moveGroup", () => {
  it("into: 指定親の子として末尾にネストする", () => {
    const root = makeSampleRoot();
    // D を B の中へ
    const next = moveGroup(root, "grp-d", { kind: "into", parentId: "grp-b" });
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-a"]);
    const b = findGroup(next, "grp-b")!;
    expect(b.groups.map((g) => g.id)).toEqual(["grp-c", "grp-d"]);
    expect(b.collapsed).toBe(false); // 展開される
    // 移動したグループの中身は保持
    expect(findGroup(next, "grp-d")?.words.map((w) => w.id)).toEqual(["w-d1"]);
  });

  it("before: アンカーの直前（兄弟）に挿入する", () => {
    const root = makeSiblingRoot();
    // Z を X の前へ → Z, X, Y
    const next = moveGroup(root, "grp-z", { kind: "before", anchorId: "grp-x" });
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-z", "grp-x", "grp-y"]);
  });

  it("after: アンカーの直後（兄弟）に挿入する", () => {
    const root = makeSiblingRoot();
    // X を Z の後へ → Y, Z, X
    const next = moveGroup(root, "grp-x", { kind: "after", anchorId: "grp-z" });
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-y", "grp-z", "grp-x"]);
  });

  it("root: ルート直下の末尾へ移動する", () => {
    const root = makeSampleRoot();
    // ネストされた C を root 末尾へ
    const next = moveGroup(root, "grp-c", { kind: "root" });
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-a", "grp-d", "grp-c"]);
    expect(findGroup(next, "grp-b")?.groups).toHaveLength(0);
  });

  it("into: 自分自身への移動は拒否（同一参照を返す）", () => {
    const root = makeSampleRoot();
    const next = moveGroup(root, "grp-a", { kind: "into", parentId: "grp-a" });
    expect(next).toBe(root);
  });

  it("into: 自分の子孫への移動は拒否（循環防止）", () => {
    const root = makeSampleRoot();
    // A を C（孫）の中へ
    const next = moveGroup(root, "grp-a", { kind: "into", parentId: "grp-c" });
    expect(next).toBe(root);
    // B を C の中へも拒否
    const next2 = moveGroup(root, "grp-b", { kind: "into", parentId: "grp-c" });
    expect(next2).toBe(root);
  });

  it("before/after: 自身をアンカーにした操作は no-op", () => {
    const root = makeSampleRoot();
    expect(moveGroup(root, "grp-a", { kind: "before", anchorId: "grp-a" })).toBe(root);
    expect(moveGroup(root, "grp-a", { kind: "after", anchorId: "grp-a" })).toBe(root);
  });

  it("存在しない draggedId は no-op（同一参照）", () => {
    const root = makeSampleRoot();
    const next = moveGroup(root, "missing", { kind: "root" });
    expect(next).toBe(root);
  });

  it("兄弟間の before で index ズレなく並ぶ", () => {
    const root = makeSiblingRoot();
    // Y を Z の前（すでに Y,Z 隣接）→ X, Y, Z のまま
    const next = moveGroup(root, "grp-y", { kind: "before", anchorId: "grp-z" });
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-x", "grp-y", "grp-z"]);
  });

  it("ネスト内の兄弟 before: 親リスト内で並び替える", () => {
    // A の下に B と E を並べる
    const root: RootState = {
      version: ROOT_VERSION,
      rootGroups: [
        group("grp-a", "A", {
          groups: [group("grp-b", "B"), group("grp-e", "E")],
        }),
      ],
    };
    // E を B の前へ
    const next = moveGroup(root, "grp-e", { kind: "before", anchorId: "grp-b" });
    expect(findGroup(next, "grp-a")!.groups.map((g) => g.id)).toEqual([
      "grp-e",
      "grp-b",
    ]);
  });

  it("into 後に移動元リストから消えている", () => {
    const root = makeSiblingRoot();
    const next = moveGroup(root, "grp-x", { kind: "into", parentId: "grp-y" });
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-y", "grp-z"]);
    expect(findGroup(next, "grp-y")!.groups.map((g) => g.id)).toEqual(["grp-x"]);
  });

  it("元の root を変更しない", () => {
    const root = makeSampleRoot();
    const idsBefore = collectAllGroups(root).map((g) => g.id);
    moveGroup(root, "grp-d", { kind: "into", parentId: "grp-b" });
    expect(collectAllGroups(root).map((g) => g.id)).toEqual(idsBefore);
    expect(root.rootGroups.map((g) => g.id)).toEqual(["grp-a", "grp-d"]);
  });

  it("アンカーが無い before は root 末尾へフォールバック", () => {
    const root = makeSiblingRoot();
    const next = moveGroup(root, "grp-x", { kind: "before", anchorId: "missing" });
    // pluck 後: Y, Z → push X → Y, Z, X
    expect(next.rootGroups.map((g) => g.id)).toEqual(["grp-y", "grp-z", "grp-x"]);
  });
});
