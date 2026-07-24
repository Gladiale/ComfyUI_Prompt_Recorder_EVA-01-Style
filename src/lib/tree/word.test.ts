import { describe, expect, it } from "vitest";
import {
  addWord,
  deleteWord,
  reorderWords,
  setWordSelected,
  setWordStrength,
  toggleWord,
  updateWord,
} from "./word";
import { findGroup } from "./search";
import { makeSampleRoot } from "./__fixtures__/sampleState";
import type { Word } from "@/types";

describe("addWord", () => {
  it("指定グループの末尾にワードを追加する", () => {
    const root = makeSampleRoot();
    const next = addWord(root, "grp-a", { text: "new_word", note: "n" });
    const words = findGroup(next, "grp-a")!.words;
    expect(words).toHaveLength(3);
    const added = words[2];
    expect(added.text).toBe("new_word");
    expect(added.note).toBe("n");
    expect(added.selected).toBe(false);
    expect(added.strength).toBe(0);
    expect(added.id).toMatch(/^w_/);
  });

  it("親グループを展開する", () => {
    const root = makeSampleRoot();
    expect(findGroup(root, "grp-b")?.collapsed).toBe(true);
    const next = addWord(root, "grp-b", { text: "x" });
    expect(findGroup(next, "grp-b")?.collapsed).toBe(false);
  });

  it("image を渡せる", () => {
    const root = makeSampleRoot();
    const next = addWord(root, "grp-d", {
      text: "with_img",
      image: "data:image/jpeg;base64,xx",
    });
    const w = findGroup(next, "grp-d")!.words.at(-1)!;
    expect(w.image).toBe("data:image/jpeg;base64,xx");
  });

  it("存在しない groupId では内容が変わらない", () => {
    const root = makeSampleRoot();
    const next = addWord(root, "missing", { text: "x" });
    expect(next).toEqual(root);
    expect(next).not.toBe(root);
  });

  it("元の root を変更しない", () => {
    const root = makeSampleRoot();
    const beforeLen = findGroup(root, "grp-a")!.words.length;
    addWord(root, "grp-a", { text: "x" });
    expect(findGroup(root, "grp-a")!.words).toHaveLength(beforeLen);
  });
});

describe("updateWord", () => {
  it("text / note を更新する", () => {
    const root = makeSampleRoot();
    const next = updateWord(root, "grp-a", "w-a2", {
      text: "updated",
      note: "new note",
    });
    const w = findGroup(next, "grp-a")!.words.find((x) => x.id === "w-a2")!;
    expect(w.text).toBe("updated");
    expect(w.note).toBe("new note");
    // 元は不変
    expect(findGroup(root, "grp-a")!.words.find((x) => x.id === "w-a2")!.text).toBe(
      "alpha_dup",
    );
  });

  it('image: "" は undefined に正規化（削除）', () => {
    const root = makeSampleRoot();
    const withImg = updateWord(root, "grp-a", "w-a1", {
      image: "data:image/jpeg;base64,xx",
    });
    expect(findGroup(withImg, "grp-a")!.words[0].image).toBe(
      "data:image/jpeg;base64,xx",
    );
    const cleared = updateWord(withImg, "grp-a", "w-a1", { image: "" });
    expect(findGroup(cleared, "grp-a")!.words[0].image).toBeUndefined();
  });

  it("存在しない wordId では他ワードを変えない", () => {
    const root = makeSampleRoot();
    const next = updateWord(root, "grp-a", "missing", { text: "x" });
    expect(findGroup(next, "grp-a")!.words.map((w) => w.text)).toEqual(
      findGroup(root, "grp-a")!.words.map((w) => w.text),
    );
  });
});

describe("toggleWord", () => {
  it("selected を反転する", () => {
    const root = makeSampleRoot();
    // w-a1 は selected: true
    const off = toggleWord(root, "grp-a", "w-a1");
    expect(findGroup(off, "grp-a")!.words[0].selected).toBe(false);
    const on = toggleWord(off, "grp-a", "w-a1");
    expect(findGroup(on, "grp-a")!.words[0].selected).toBe(true);
  });
});

describe("setWordSelected", () => {
  it("selected を明示的に設定する", () => {
    const root = makeSampleRoot();
    const next = setWordSelected(root, "grp-a", "w-a2", true);
    expect(findGroup(next, "grp-a")!.words.find((w) => w.id === "w-a2")!.selected).toBe(
      true,
    );
    const back = setWordSelected(next, "grp-a", "w-a2", false);
    expect(findGroup(back, "grp-a")!.words.find((w) => w.id === "w-a2")!.selected).toBe(
      false,
    );
  });
});

describe("setWordStrength", () => {
  it("strength を設定する", () => {
    const root = makeSampleRoot();
    const next = setWordStrength(root, "grp-b", "w-b1", 5);
    expect(findGroup(next, "grp-b")!.words[0].strength).toBe(5);
    expect(findGroup(root, "grp-b")!.words[0].strength).toBe(2);
  });
});

describe("deleteWord", () => {
  it("指定ワードを削除する", () => {
    const root = makeSampleRoot();
    const next = deleteWord(root, "grp-a", "w-a1");
    expect(findGroup(next, "grp-a")!.words.map((w) => w.id)).toEqual(["w-a2"]);
    expect(findGroup(root, "grp-a")!.words).toHaveLength(2);
  });

  it("存在しない wordId では配列長が変わらない", () => {
    const root = makeSampleRoot();
    const next = deleteWord(root, "grp-a", "missing");
    expect(findGroup(next, "grp-a")!.words).toHaveLength(2);
  });
});

describe("reorderWords", () => {
  it("同一グループ内の並びを差し替える", () => {
    const root = makeSampleRoot();
    const words = findGroup(root, "grp-a")!.words;
    const reordered: Word[] = [words[1], words[0]];
    const next = reorderWords(root, "grp-a", reordered);
    expect(findGroup(next, "grp-a")!.words.map((w) => w.id)).toEqual([
      "w-a2",
      "w-a1",
    ]);
  });

  it("渡した配列参照をそのまま使う", () => {
    const root = makeSampleRoot();
    const words = [...findGroup(root, "grp-a")!.words].reverse();
    const next = reorderWords(root, "grp-a", words);
    expect(findGroup(next, "grp-a")!.words).toBe(words);
  });
});
