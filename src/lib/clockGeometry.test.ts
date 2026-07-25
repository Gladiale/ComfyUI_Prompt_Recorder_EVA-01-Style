import { describe, expect, it } from "vitest";
import {
  angleFromCenter,
  calcRingGap,
  layerOf,
  nearestIndex,
  normAngle,
  radiusOf,
  shortestAngleTo,
} from "./clockGeometry";
import { R_INNER_MIN, R_OUTER, RING_GAP_MAX } from "@/components/clock/constants";

describe("layerOf", () => {
  it("depth を 2 で割った層番号を返す", () => {
    expect(layerOf(0)).toBe(0);
    expect(layerOf(1)).toBe(0);
    expect(layerOf(2)).toBe(1);
    expect(layerOf(3)).toBe(1);
    expect(layerOf(4)).toBe(2);
  });
});

describe("calcRingGap", () => {
  it("層が 0 のとき最大ギャップを返す", () => {
    expect(calcRingGap(0)).toBe(RING_GAP_MAX);
  });

  it("層が増えるとギャップが縮む（下限あり）", () => {
    const gap = calcRingGap(10);
    expect(gap).toBeLessThanOrEqual(RING_GAP_MAX);
    expect(gap).toBe((R_OUTER - R_INNER_MIN) / 10);
  });
});

describe("radiusOf", () => {
  it("外側ほど大きく、層が深いほど小さくなる", () => {
    const gap = 20;
    expect(radiusOf(0, gap)).toBe(R_OUTER);
    expect(radiusOf(1, gap)).toBe(R_OUTER); // same layer
    expect(radiusOf(2, gap)).toBe(R_OUTER - gap);
  });
});

describe("normAngle", () => {
  it("0..360 に正規化する", () => {
    expect(normAngle(0)).toBe(0);
    expect(normAngle(360)).toBe(0);
    expect(normAngle(-90)).toBe(270);
    expect(normAngle(450)).toBe(90);
  });
});

describe("shortestAngleTo", () => {
  it("最短回転で連続角度を返す（境界越えで逆回りしない）", () => {
    // 350 → 10 は +20（時計回り）で 370
    expect(shortestAngleTo(350, 10)).toBe(370);
    // 10 → 350 は -20 で -10
    expect(shortestAngleTo(10, 350)).toBe(-10);
    // 同値
    expect(shortestAngleTo(90, 90)).toBe(90);
  });
});

describe("angleFromCenter", () => {
  it("12時=0, 3時=90, 6時=180, 9時=270", () => {
    const cx = 100;
    const cy = 100;
    expect(angleFromCenter(100, 50, cx, cy)).toBeCloseTo(0); // 上
    expect(angleFromCenter(150, 100, cx, cy)).toBeCloseTo(90); // 右
    expect(angleFromCenter(100, 150, cx, cy)).toBeCloseTo(180); // 下
    expect(angleFromCenter(50, 100, cx, cy)).toBeCloseTo(270); // 左
  });
});

describe("nearestIndex", () => {
  it("N 等分の最近傍インデックスを返す", () => {
    const n = 4;
    const step = 90;
    expect(nearestIndex(0, n, step)).toBe(0);
    expect(nearestIndex(44, n, step)).toBe(0);
    expect(nearestIndex(46, n, step)).toBe(1);
    expect(nearestIndex(180, n, step)).toBe(2);
    expect(nearestIndex(350, n, step)).toBe(0); // wrap
  });

  it("N=0 のとき 0 を返す", () => {
    expect(nearestIndex(90, 0, 360)).toBe(0);
  });
});
