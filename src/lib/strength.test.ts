import { describe, expect, it } from "vitest";
import {
  DEFAULT_STRENGTH,
  MAX_STRENGTH,
  clampStrength,
  formatWordWithStrength,
} from "./strength";

describe("clampStrength", () => {
  it("0..MAX_STRENGTH の整数はそのまま返す", () => {
    expect(clampStrength(0)).toBe(0);
    expect(clampStrength(1)).toBe(1);
    expect(clampStrength(5)).toBe(5);
    expect(clampStrength(MAX_STRENGTH)).toBe(MAX_STRENGTH);
  });

  it("範囲外は 0 または MAX に丸める", () => {
    expect(clampStrength(-1)).toBe(0);
    expect(clampStrength(-100)).toBe(0);
    expect(clampStrength(11)).toBe(MAX_STRENGTH);
    expect(clampStrength(99)).toBe(MAX_STRENGTH);
  });

  it("小数は四捨五入する", () => {
    expect(clampStrength(2.4)).toBe(2);
    expect(clampStrength(2.5)).toBe(3);
    expect(clampStrength(2.6)).toBe(3);
  });

  it("非数値・非有限値は DEFAULT_STRENGTH", () => {
    expect(clampStrength(undefined)).toBe(DEFAULT_STRENGTH);
    expect(clampStrength(null)).toBe(DEFAULT_STRENGTH);
    expect(clampStrength("x")).toBe(DEFAULT_STRENGTH);
    expect(clampStrength(NaN)).toBe(DEFAULT_STRENGTH);
    expect(clampStrength(Infinity)).toBe(DEFAULT_STRENGTH);
    expect(clampStrength(-Infinity)).toBe(DEFAULT_STRENGTH);
    expect(clampStrength({})).toBe(DEFAULT_STRENGTH);
  });

  it("数値文字列は数値として解釈する", () => {
    expect(clampStrength("3")).toBe(3);
    expect(clampStrength("2.6")).toBe(3);
  });
});

describe("formatWordWithStrength", () => {
  it("強度 0 は trim した text をそのまま返す", () => {
    expect(formatWordWithStrength("school_uniform", 0)).toBe("school_uniform");
    expect(formatWordWithStrength("  school_uniform  ", 0)).toBe("school_uniform");
  });

  it("強度 1 は括弧のみで囲む", () => {
    expect(formatWordWithStrength("school_uniform", 1)).toBe("(school_uniform)");
  });

  it("強度 2..10 は (text:1.x) 形式", () => {
    expect(formatWordWithStrength("a", 2)).toBe("(a:1.1)");
    expect(formatWordWithStrength("a", 3)).toBe("(a:1.2)");
    expect(formatWordWithStrength("a", 10)).toBe("(a:1.9)");
  });

  it("強度を clamp してから整形する", () => {
    expect(formatWordWithStrength("a", -1)).toBe("a");
    expect(formatWordWithStrength("a", 99)).toBe("(a:1.9)");
    expect(formatWordWithStrength("a", "2")).toBe("(a:1.1)");
  });

  it("text の前後空白は除去する", () => {
    expect(formatWordWithStrength("  a  ", 1)).toBe("(a)");
    expect(formatWordWithStrength("  a  ", 2)).toBe("(a:1.1)");
  });
});
