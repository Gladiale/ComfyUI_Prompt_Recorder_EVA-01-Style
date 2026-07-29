import { describe, expect, it } from "vitest";
import { calculateWordPopoverPosition, type RectLike } from "./wordPopoverGeometry";

const anchor: RectLike = {
  left: 100,
  top: 300,
  right: 110,
  bottom: 320,
  width: 10,
  height: 20,
};

const input = (overrides: Partial<Parameters<typeof calculateWordPopoverPosition>[0]> = {}) => ({
  anchor,
  popoverWidth: 200,
  popoverHeight: 100,
  viewportWidth: 800,
  viewportHeight: 600,
  ...overrides,
});

describe("calculateWordPopoverPosition", () => {
  it("アンカーの上へ中央配置する", () => {
    expect(calculateWordPopoverPosition(input())).toEqual({ left: 104, top: 192, x: "-50%" });
  });

  it("上端に収まらない場合は下へ配置する", () => {
    expect(calculateWordPopoverPosition(input({
      anchor: { ...anchor, top: 40, bottom: 60 },
    }))).toEqual({ left: 104, top: 68, x: "-50%" });
  });

  it("下端に収まらない場合はviewport内へclampする", () => {
    expect(calculateWordPopoverPosition(input({
      anchor: { ...anchor, top: 620, bottom: 640 },
    }))).toEqual({ left: 105, top: 496, x: "0" });
  });

  it("左右端では中央位置を補正する", () => {
    expect(calculateWordPopoverPosition(input({
      anchor: { ...anchor, left: 0, right: 10 },
    })).left).toBe(104);
    expect(calculateWordPopoverPosition(input({
      anchor: { ...anchor, left: 780, right: 790 },
    })).left).toBe(696);
  });
});
