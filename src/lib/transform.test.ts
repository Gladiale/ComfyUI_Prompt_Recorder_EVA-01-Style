import { describe, expect, it } from "vitest";
import {
  applyTransformRules,
  buildDisplayEntries,
  buildSynthesisText,
  buildTransformedEntries,
  replaceAllLiteral,
  transformWordText,
  type TransformSelectedRef,
} from "./transform";
import type { PromptTransformRule } from "@/types";

function rule(
  id: string,
  from: string,
  to: string,
  enabled = true,
  name = id,
): PromptTransformRule {
  return { id, name, from, to, enabled };
}

function ref(
  id: string,
  text: string,
  opts: { strength?: number; groupId?: string; groupPath?: string[] } = {},
): TransformSelectedRef {
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
// replaceAllLiteral
// ============================================================

describe("replaceAllLiteral", () => {
  it("一致なしはそのまま", () => {
    expect(replaceAllLiteral("cat", "dog", "x")).toBe("cat");
  });

  it("全一致箇所を置換する", () => {
    expect(replaceAllLiteral("aa-aa", "aa", "b")).toBe("b-b");
  });

  it("左から非重複で置換する（重複一致）", () => {
    // "aaa" に "aa" → 先頭2文字だけ置換
    expect(replaceAllLiteral("aaa", "aa", "b")).toBe("ba");
  });

  it("from が空なら何もしない", () => {
    expect(replaceAllLiteral("cat", "", "x")).toBe("cat");
  });

  it("$ をリテラルとして扱う", () => {
    expect(replaceAllLiteral("a$b", "a$b", "$1")).toBe("$1");
    expect(replaceAllLiteral("cat", "cat", "$$")).toBe("$$");
  });

  it("正規表現構文を解釈しない", () => {
    expect(replaceAllLiteral("a.c", "a.c", "x")).toBe("x");
    expect(replaceAllLiteral("abc", "a.c", "x")).toBe("abc");
    expect(replaceAllLiteral("a+b", "a+", "x")).toBe("xb");
  });

  it("大文字小文字を区別する", () => {
    expect(replaceAllLiteral("Cat", "cat", "dog")).toBe("Cat");
    expect(replaceAllLiteral("cat", "Cat", "dog")).toBe("cat");
  });

  it("自己置換を許可する", () => {
    expect(replaceAllLiteral("aa", "a", "aa")).toBe("aaaa");
  });
});

// ============================================================
// applyTransformRules / transformWordText
// ============================================================

describe("applyTransformRules", () => {
  it("enabled のみ適用し、一覧順に逐次適用する", () => {
    const rules = [
      rule("r1", "A", "B", true),
      rule("r2", "B", "C", false),
      rule("r3", "B", "D", true),
    ];
    // A → B → D（r2 は無効）
    expect(applyTransformRules("A", rules)).toBe("D");
  });

  it("ルール間では trim しない", () => {
    const rules = [
      rule("r1", "cat", "  dog  "),
      rule("r2", "dog", "animal"),
    ];
    // "  dog  " の中の dog が置換 → "  animal  "
    expect(applyTransformRules("cat", rules)).toBe("  animal  ");
  });
});

describe("transformWordText", () => {
  it("前後 trim → ルール → 最終 trim", () => {
    const rules = [rule("r1", "cat", "  dog  ")];
    expect(transformWordText("  cat  ", rules)).toBe("dog");
  });

  it("元本文が空白のみなら空文字", () => {
    expect(transformWordText("   ", [rule("r1", "a", "b")])).toBe("");
  });

  it("変換後が空文字になる", () => {
    expect(transformWordText("cat", [rule("r1", "cat", "")])).toBe("");
  });
});

// ============================================================
// buildTransformedEntries / buildDisplayEntries / synthesis
// ============================================================

describe("buildTransformedEntries", () => {
  it("元本文が空のワードは除外、変換後空は保持", () => {
    const entries = buildTransformedEntries(
      [ref("w1", "   "), ref("w2", "cat")],
      [rule("r1", "cat", "")],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      wordId: "w2",
      originalText: "cat",
      text: "",
      formatted: "",
    });
  });

  it("強度は変換後に付与する", () => {
    const entries = buildTransformedEntries(
      [ref("w1", "cat", { strength: 2 })],
      [rule("r1", "cat", "dog")],
    );
    expect(entries[0].formatted).toBe("(dog:1.1)");
    expect(entries[0].text).toBe("dog");
    expect(entries[0].strength).toBe(2);
  });

  it("重複排除しない（全件保持）", () => {
    const entries = buildTransformedEntries(
      [ref("w1", "cat"), ref("w2", "cat")],
      [],
    );
    expect(entries).toHaveLength(2);
  });
});

describe("buildDisplayEntries", () => {
  it("変換後空は表示から除外", () => {
    const entries = buildDisplayEntries(
      [ref("w1", "cat"), ref("w2", "dog")],
      [rule("r1", "cat", "")],
    );
    expect(entries.map((e) => e.wordId)).toEqual(["w2"]);
  });

  it("変換後の重複を normalizeText で除去する", () => {
    const entries = buildDisplayEntries(
      [ref("w1", "Cat"), ref("w2", "  cat  ")],
      [],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].wordId).toBe("w1");
  });

  it("強度付き format 後のキーで重複排除", () => {
    const entries = buildDisplayEntries(
      [
        ref("w1", "a", { strength: 1 }),
        ref("w2", "A", { strength: 1 }),
      ],
      [],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].formatted).toBe("(a)");
  });
});

describe("buildSynthesisText", () => {
  it("カンマ区切りで結合する", () => {
    const text = buildSynthesisText(
      [ref("w1", "alpha"), ref("w2", "beta", { strength: 1 })],
      [],
      "comma",
    );
    expect(text).toBe("alpha, (beta)");
  });

  it("改行区切りで結合する", () => {
    const text = buildSynthesisText(
      [ref("w1", "a"), ref("w2", "b")],
      [],
      "newline",
    );
    expect(text).toBe("a\nb");
  });

  it("ルール適用後の出力になる", () => {
    const text = buildSynthesisText(
      [ref("w1", "cat", { strength: 2 })],
      [rule("r1", "cat", "dog")],
      "comma",
    );
    expect(text).toBe("(dog:1.1)");
  });
});
