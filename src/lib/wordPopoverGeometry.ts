export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface WordPopoverPositionInput {
  anchor: RectLike;
  popoverWidth: number;
  popoverHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  gap?: number;
  padding?: number;
}

export interface WordPopoverPosition {
  left: number;
  top: number;
  x: "0" | "-50%";
}

export function calculateWordPopoverPosition({
  anchor,
  popoverWidth,
  popoverHeight,
  viewportWidth,
  viewportHeight,
  gap = 8,
  padding = 4,
}: WordPopoverPositionInput): WordPopoverPosition {
  let top = anchor.top - gap - popoverHeight < padding
    ? anchor.bottom + gap
    : anchor.top - gap - popoverHeight;
  let x: WordPopoverPosition["x"] = "-50%";

  if (top + popoverHeight > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - padding - popoverHeight);
    x = "0";
  }
  if (top < padding) {
    top = padding;
    x = "0";
  }

  const halfWidth = popoverWidth / 2;
  let left = anchor.left + anchor.width / 2;
  if (x !== "0" && halfWidth >= anchor.left) {
    left = halfWidth + padding;
  }
  if (x !== "0" && left + halfWidth > viewportWidth - padding) {
    left = viewportWidth - padding - halfWidth;
  }

  return { left, top, x };
}
