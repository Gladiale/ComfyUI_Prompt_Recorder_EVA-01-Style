// 時計ナビ用の幾何ユーティリティ（純粋関数）
import { R_INNER_MIN, R_OUTER, RING_GAP_MAX } from "@/components/clock/constants";

/** 層 = floor(depth/2)。層0が最外層。 */
export function layerOf(depth: number): number {
  return Math.floor(depth / 2);
}

/** 最大層から層間ギャップを算出 */
export function calcRingGap(maxLayer: number): number {
  if (maxLayer <= 0) return RING_GAP_MAX;
  return Math.min(RING_GAP_MAX, (R_OUTER - R_INNER_MIN) / maxLayer);
}

/** depth に対応する配置半径 */
export function radiusOf(depth: number, ringGap: number): number {
  return R_OUTER - layerOf(depth) * ringGap;
}

/** 0..360 の正規化角度へ */
export function normAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}

/**
 * prev（連続値）から target(0..360) へ最短回転した連続角度を返す。
 * 0..360 で折り返さず連続させることで、境界越え時に逆回りアニメしない。
 */
export function shortestAngleTo(prev: number, target: number): number {
  const cur = normAngle(prev);
  const diff = ((target - cur + 540) % 360) - 180; // -180..180 の最短差
  return prev + diff;
}

/**
 * 要素中心からポインタ位置の角度（度）。
 * 12時=0, 3時=90, 6時=180, 9時=270（時計回り）。
 */
export function angleFromCenter(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
): number {
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  // atan2(dx, -dy): 12時=0, 3時=90, 6時=180, 9時=270
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/** 角度から最も近いインデックス（N 等分） */
export function nearestIndex(deg: number, n: number, step: number): number {
  if (n <= 0) return 0;
  return ((Math.round(deg / step) % n) + n) % n;
}
