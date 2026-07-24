import { describe, expect, it } from "vitest";
import { isSameWord, normalizeText } from "./normalize";

describe("normalizeText", () => {
  it("前後の空白を除去する", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });

  it("小文字に正規化する", () => {
    expect(normalizeText("Hello World")).toBe("hello world");
  });

  it("連続空白を1つに圧縮する", () => {
    expect(normalizeText("a   b\t\tc\n\nd")).toBe("a b c d");
  });

  it("trim・小文字・空白圧縮を同時に適用する", () => {
    expect(normalizeText("  Foo   BAR  ")).toBe("foo bar");
  });

  it("空文字・空白のみは空文字になる", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   ")).toBe("");
  });

  it("既に正規化済みの文字列はそのまま返す", () => {
    expect(normalizeText("school_uniform")).toBe("school_uniform");
  });
});

describe("isSameWord", () => {
  it("正規化後が同一なら true", () => {
    expect(isSameWord("  Hello ", "hello")).toBe(true);
    expect(isSameWord("A  B", "a b")).toBe(true);
  });

  it("正規化後が異なれば false", () => {
    expect(isSameWord("hello", "world")).toBe(false);
    expect(isSameWord("school uniform", "school_uniform")).toBe(false);
  });

  it("両方空（空白のみ含む）なら true", () => {
    expect(isSameWord("", "   ")).toBe(true);
  });
});
