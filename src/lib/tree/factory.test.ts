import { describe, expect, it } from "vitest";
import { createGroup, createWord } from "./factory";

describe("createWord", () => {
  it("デフォルト値で Word を生成する", () => {
    const w = createWord();
    expect(w.id).toMatch(/^w_/);
    expect(w.text).toBe("");
    expect(w.note).toBe("");
    expect(w.selected).toBe(false);
    expect(w.strength).toBe(0);
    expect(w.image).toBeUndefined();
  });

  it("引数を反映する", () => {
    const w = createWord("hello", "memo", true, 3, "data:image/jpeg;base64,xx");
    expect(w.text).toBe("hello");
    expect(w.note).toBe("memo");
    expect(w.selected).toBe(true);
    expect(w.strength).toBe(3);
    expect(w.image).toBe("data:image/jpeg;base64,xx");
  });

  it("image 未指定時は image プロパティを持たない", () => {
    const w = createWord("x");
    expect("image" in w).toBe(false);
  });

  it("毎回異なる id を振る", () => {
    const a = createWord();
    const b = createWord();
    expect(a.id).not.toBe(b.id);
  });
});

describe("createGroup", () => {
  it("デフォルト名で Group を生成する", () => {
    const g = createGroup();
    expect(g.id).toMatch(/^grp_/);
    expect(g.name).toBe("NEW GROUP");
    expect(g.collapsed).toBe(false);
    expect(g.groups).toEqual([]);
    expect(g.words).toEqual([]);
  });

  it("名前を指定できる", () => {
    const g = createGroup("OUTFITS");
    expect(g.name).toBe("OUTFITS");
  });

  it("毎回異なる id を振る", () => {
    const a = createGroup();
    const b = createGroup();
    expect(a.id).not.toBe(b.id);
  });
});
