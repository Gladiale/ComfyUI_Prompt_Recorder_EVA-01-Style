import { describe, expect, it } from "vitest";
import { moveItem } from "./array";

describe("moveItem", () => {
  it("fromIndex === toIndex のとき同一配列を返す", () => {
    const list = [1, 2, 3];
    expect(moveItem(list, 1, 1)).toBe(list);
  });

  it("範囲外 index のとき同一配列を返す", () => {
    const list = [1, 2, 3];
    expect(moveItem(list, -1, 0)).toBe(list);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 3, 0)).toBe(list);
    expect(moveItem(list, 0, 3)).toBe(list);
  });

  it("先頭を末尾へ移動する", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("末尾を先頭へ移動する", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("中間要素を後方へ移動する", () => {
    expect(moveItem([1, 2, 3, 4], 1, 3)).toEqual([1, 3, 4, 2]);
  });

  it("中間要素を前方へ移動する", () => {
    expect(moveItem([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });

  it("元配列を変更しない（immutable）", () => {
    const list = [1, 2, 3];
    const next = moveItem(list, 0, 2);
    expect(list).toEqual([1, 2, 3]);
    expect(next).not.toBe(list);
    expect(next).toEqual([2, 3, 1]);
  });

  it("1要素・空配列は範囲外扱いで同一参照", () => {
    const single = [42];
    expect(moveItem(single, 0, 0)).toBe(single);
    const empty: number[] = [];
    expect(moveItem(empty, 0, 0)).toBe(empty);
  });
});
