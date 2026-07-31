export interface PointLike {
  x: number;
  y: number;
}

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface MenuPosition {
  left: number;
  top: number;
}

export interface ContextMenuPositionInput {
  cursor: PointLike;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
}

/**
 * カーソル起点でメニューを配置。右下優先、はみ出し時は左/上へ反転し viewport 内へ clamp。
 */
export function calculateContextMenuPosition({
  cursor,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  padding = 4,
}: ContextMenuPositionInput): MenuPosition {
  let left = cursor.x;
  let top = cursor.y;

  if (left + menuWidth > viewportWidth - padding) {
    left = cursor.x - menuWidth;
  }
  if (top + menuHeight > viewportHeight - padding) {
    top = cursor.y - menuHeight;
  }

  left = clamp(left, padding, Math.max(padding, viewportWidth - padding - menuWidth));
  top = clamp(top, padding, Math.max(padding, viewportHeight - padding - menuHeight));

  return { left, top };
}

export interface SubmenuPositionInput {
  anchor: RectLike;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  gap?: number;
  padding?: number;
}

/**
 * 親アイテム右隣にサブメニューを配置。右はみ出し時は左へ反転し viewport 内へ clamp。
 */
export function calculateSubmenuPosition({
  anchor,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  gap = 0,
  padding = 4,
}: SubmenuPositionInput): MenuPosition {
  let left = anchor.right + gap;
  if (left + menuWidth > viewportWidth - padding) {
    left = anchor.left - gap - menuWidth;
  }

  let top = anchor.top;
  if (top + menuHeight > viewportHeight - padding) {
    top = viewportHeight - padding - menuHeight;
  }

  left = clamp(left, padding, Math.max(padding, viewportWidth - padding - menuWidth));
  top = clamp(top, padding, Math.max(padding, viewportHeight - padding - menuHeight));

  return { left, top };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
