import { describe, expect, it } from "vitest";
import {
  fitWithin,
  PRESET_IMAGE_MAX_DIM,
  WORD_IMAGE_MAX_DIM,
} from "./image";

// ============================================================
// 定数
// ============================================================

describe("image constants", () => {
  it("WORD_IMAGE_MAX_DIM は 420", () => {
    expect(WORD_IMAGE_MAX_DIM).toBe(420);
  });

  it("PRESET_IMAGE_MAX_DIM は 560", () => {
    expect(PRESET_IMAGE_MAX_DIM).toBe(560);
  });

  it("プリセットの上限はワードより大きい", () => {
    expect(PRESET_IMAGE_MAX_DIM).toBeGreaterThan(WORD_IMAGE_MAX_DIM);
  });
});

// ============================================================
// fitWithin（純粋関数）
// ============================================================

describe("fitWithin", () => {
  it("両方 maxDim 未満なら元の寸法を返す", () => {
    expect(fitWithin(100, 80, 420)).toEqual({ w: 100, h: 80 });
  });

  it("両方 maxDim ちょうどならそのまま", () => {
    expect(fitWithin(420, 420, 420)).toEqual({ w: 420, h: 420 });
  });

  it("幅だけ超過: 長辺が maxDim になるよう等比縮小", () => {
    // 800×400 → ratio = min(420/800, 420/400) = 0.525
    expect(fitWithin(800, 400, 420)).toEqual({
      w: Math.round(800 * 0.525),
      h: Math.round(400 * 0.525),
    });
    expect(fitWithin(800, 400, 420)).toEqual({ w: 420, h: 210 });
  });

  it("高さだけ超過: 長辺が maxDim になるよう等比縮小", () => {
    // 300×900 → ratio = min(420/300, 420/900) = 420/900
    const ratio = 420 / 900;
    expect(fitWithin(300, 900, 420)).toEqual({
      w: Math.round(300 * ratio),
      h: Math.round(900 * ratio),
    });
    expect(fitWithin(300, 900, 420).h).toBe(420);
  });

  it("正方形で超過: 両辺が maxDim", () => {
    expect(fitWithin(1000, 1000, 560)).toEqual({ w: 560, h: 560 });
  });

  it("横長を PRESET_IMAGE_MAX_DIM に収める", () => {
    const r = fitWithin(1920, 1080, PRESET_IMAGE_MAX_DIM);
    expect(r.w).toBe(PRESET_IMAGE_MAX_DIM);
    expect(r.h).toBe(Math.round(1080 * (PRESET_IMAGE_MAX_DIM / 1920)));
    expect(r.w).toBeLessThanOrEqual(PRESET_IMAGE_MAX_DIM);
    expect(r.h).toBeLessThanOrEqual(PRESET_IMAGE_MAX_DIM);
  });

  it("縦長を WORD_IMAGE_MAX_DIM に収める", () => {
    const r = fitWithin(600, 1200, WORD_IMAGE_MAX_DIM);
    expect(r.h).toBe(WORD_IMAGE_MAX_DIM);
    expect(r.w).toBe(Math.round(600 * (WORD_IMAGE_MAX_DIM / 1200)));
    expect(r.w).toBeLessThanOrEqual(WORD_IMAGE_MAX_DIM);
    expect(r.h).toBeLessThanOrEqual(WORD_IMAGE_MAX_DIM);
  });

  it("比率を維持する（縮小後の w/h ≈ 元の w/h）", () => {
    const srcW = 1600;
    const srcH = 900;
    const r = fitWithin(srcW, srcH, 420);
    const origAspect = srcW / srcH;
    const outAspect = r.w / r.h;
    expect(Math.abs(outAspect - origAspect)).toBeLessThan(0.01);
  });

  it("端数は Math.round で丸める", () => {
    // 1001×501, max=420 → ratio = min(420/1001, 420/501) = 420/1001
    const ratio = 420 / 1001;
    expect(fitWithin(1001, 501, 420)).toEqual({
      w: Math.round(1001 * ratio),
      h: Math.round(501 * ratio),
    });
  });

  it("縮小結果は常に両辺が maxDim 以下", () => {
    const cases: [number, number, number][] = [
      [1, 1, 420],
      [419, 419, 420],
      [421, 100, 420],
      [100, 421, 420],
      [3000, 2000, WORD_IMAGE_MAX_DIM],
      [2000, 3000, PRESET_IMAGE_MAX_DIM],
    ];
    for (const [w, h, max] of cases) {
      const r = fitWithin(w, h, max);
      expect(r.w).toBeLessThanOrEqual(max);
      expect(r.h).toBeLessThanOrEqual(max);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
    }
  });

  it("極端に細い画像は短辺が 0 に丸まることがある（実装どおり）", () => {
    // ratio = 560/9999 ≈ 0.056 → h = round(1 * 0.056) = 0
    const r = fitWithin(9999, 1, 560);
    expect(r.w).toBe(560);
    expect(r.h).toBe(0);
    expect(r.w).toBeLessThanOrEqual(560);
  });
});
