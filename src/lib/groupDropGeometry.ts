// グループDnDのドロップ位置判定（DOM非依存）

export type GroupDropMode = "before" | "after" | "into";

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** 展開時は上下端を before/after、中央を into。折り畳み時は上下二分。 */
export function computeGroupDropMode(
  relativeY: number,
  height: number,
  expanded: boolean,
): GroupDropMode {
  if (expanded) {
    if (relativeY < height * 0.22) return "before";
    if (relativeY > height * 0.78) return "after";
    return "into";
  }
  return relativeY < height / 2 ? "before" : "after";
}

/** dragleave が子要素への移動かどうか判定する。 */
export function isPointInsideRect(x: number, y: number, rect: RectLike): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
