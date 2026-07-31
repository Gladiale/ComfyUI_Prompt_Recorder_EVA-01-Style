import { describe, expect, it } from "vitest";
import {
  calculateContextMenuPosition,
  calculateSubmenuPosition,
  type RectLike,
} from "./contextMenuGeometry";

const viewport = {
  viewportWidth: 800,
  viewportHeight: 600,
};

describe("calculateContextMenuPosition", () => {
  it("カーソル右下に配置する", () => {
    expect(
      calculateContextMenuPosition({
        cursor: { x: 100, y: 200 },
        menuWidth: 160,
        menuHeight: 80,
        ...viewport,
      }),
    ).toEqual({ left: 100, top: 200 });
  });

  it("右端はみ出し時は左へ反転する", () => {
    expect(
      calculateContextMenuPosition({
        cursor: { x: 760, y: 200 },
        menuWidth: 160,
        menuHeight: 80,
        ...viewport,
      }),
    ).toEqual({ left: 600, top: 200 });
  });

  it("下端はみ出し時は上へ反転する", () => {
    expect(
      calculateContextMenuPosition({
        cursor: { x: 100, y: 560 },
        menuWidth: 160,
        menuHeight: 80,
        ...viewport,
      }),
    ).toEqual({ left: 100, top: 480 });
  });

  it("viewport 内へ clamp する", () => {
    expect(
      calculateContextMenuPosition({
        cursor: { x: 0, y: 0 },
        menuWidth: 160,
        menuHeight: 80,
        ...viewport,
        padding: 4,
      }),
    ).toEqual({ left: 4, top: 4 });
  });
});

describe("calculateSubmenuPosition", () => {
  const anchor: RectLike = {
    left: 100,
    top: 200,
    right: 260,
    bottom: 228,
    width: 160,
    height: 28,
  };

  it("親アイテムの右隣に配置する", () => {
    expect(
      calculateSubmenuPosition({
        anchor,
        menuWidth: 180,
        menuHeight: 120,
        ...viewport,
      }),
    ).toEqual({ left: 260, top: 200 });
  });

  it("右端はみ出し時は左へ反転する", () => {
    expect(
      calculateSubmenuPosition({
        anchor: { ...anchor, left: 640, right: 800, width: 160 },
        menuWidth: 180,
        menuHeight: 120,
        ...viewport,
      }),
    ).toEqual({ left: 460, top: 200 });
  });

  it("下端はみ出し時は上へ clamp する", () => {
    expect(
      calculateSubmenuPosition({
        anchor: { ...anchor, top: 540, bottom: 568 },
        menuWidth: 180,
        menuHeight: 120,
        ...viewport,
      }),
    ).toEqual({ left: 260, top: 476 });
  });
});
