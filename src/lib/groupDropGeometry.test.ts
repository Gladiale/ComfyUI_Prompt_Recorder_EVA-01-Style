import { describe, expect, it } from "vitest";
import { computeGroupDropMode, isPointInsideRect } from "./groupDropGeometry";

describe("computeGroupDropMode", () => {
  describe("展開時", () => {
    it("上端付近は before", () => {
      expect(computeGroupDropMode(0, 100, true)).toBe("before");
      expect(computeGroupDropMode(21.9, 100, true)).toBe("before");
    });

    it("中央帯は into", () => {
      expect(computeGroupDropMode(22, 100, true)).toBe("into");
      expect(computeGroupDropMode(50, 100, true)).toBe("into");
      expect(computeGroupDropMode(78, 100, true)).toBe("into");
    });

    it("下端付近は after", () => {
      expect(computeGroupDropMode(78.1, 100, true)).toBe("after");
      expect(computeGroupDropMode(100, 100, true)).toBe("after");
    });
  });

  describe("折り畳み時", () => {
    it("上半分は before、下半分は after", () => {
      expect(computeGroupDropMode(0, 40, false)).toBe("before");
      expect(computeGroupDropMode(19.9, 40, false)).toBe("before");
      expect(computeGroupDropMode(20, 40, false)).toBe("after");
      expect(computeGroupDropMode(40, 40, false)).toBe("after");
    });
  });
});

describe("isPointInsideRect", () => {
  const rect = { left: 10, top: 20, right: 110, bottom: 80 };

  it("内部と辺上は true", () => {
    expect(isPointInsideRect(10, 20, rect)).toBe(true);
    expect(isPointInsideRect(60, 50, rect)).toBe(true);
    expect(isPointInsideRect(110, 80, rect)).toBe(true);
  });

  it("外側は false", () => {
    expect(isPointInsideRect(9, 50, rect)).toBe(false);
    expect(isPointInsideRect(60, 19, rect)).toBe(false);
    expect(isPointInsideRect(111, 50, rect)).toBe(false);
    expect(isPointInsideRect(60, 81, rect)).toBe(false);
  });
});
