// 時計ダイヤルの針角度・アクティブインデックス管理
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import {
  angleFromCenter,
  calcRingGap,
  layerOf,
  nearestIndex,
  radiusOf,
  shortestAngleTo,
} from "@/lib/clockGeometry";
import { R_OUTER } from "@/components/clock/constants";
import type { GroupRef } from "@/lib/tree";

export interface UseClockDialOptions {
  groups: GroupRef[];
  onJump: (g: GroupRef) => void;
}

export interface UseClockDialResult {
  dialRef: RefObject<HTMLDivElement | null>;
  N: number;
  step: number;
  maxLayer: number;
  ringGap: number;
  needleAngle: number;
  activeIdx: number;
  active: GroupRef | null;
  handLen: number;
  radiusOfDepth: (depth: number) => number;
  onPointerMove: (e: PointerEvent) => void;
  onClick: (e: ReactMouseEvent) => void;
}

/**
 * ダイヤル上のポインタ位置から針角度とハイライトインデックスを更新し、
 * クリックで onJump を呼ぶ。
 */
export function useClockDial({
  groups,
  onJump,
}: UseClockDialOptions): UseClockDialResult {
  const N = groups.length;
  const dialRef = useRef<HTMLDivElement>(null);

  // 針の角度（度・連続値）。0=12時方向、時計回りに増加。
  const [needleAngle, setNeedleAngle] = useState(0);
  // ハイライト中インデックス（マウスホバー位置から算出）
  const [activeIdx, setActiveIdx] = useState(0);

  const step = N > 0 ? 360 / N : 360;

  const maxLayer = useMemo(
    () => (N > 0 ? groups.reduce((m, g) => Math.max(m, layerOf(g.depth)), 0) : 0),
    [groups, N],
  );
  const ringGap = useMemo(() => calcRingGap(maxLayer), [maxLayer]);
  const radiusOfDepth = useCallback(
    (depth: number) => radiusOf(depth, ringGap),
    [ringGap],
  );

  // 針の長さ = 現在指しているインデックスの層半径
  const handLen =
    (N > 0 ? radiusOfDepth(groups[activeIdx].depth) : R_OUTER) - 6;

  const setAngleShort = useCallback((target: number) => {
    setNeedleAngle((prev) => shortestAngleTo(prev, target));
  }, []);

  const angleFromPointer = useCallback((clientX: number, clientY: number): number => {
    const el = dialRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return angleFromCenter(clientX, clientY, cx, cy);
  }, []);

  // マウスの動きに合わせて針を回転（ドラッグ不要）。
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (N <= 0) return;
      const a = angleFromPointer(e.clientX, e.clientY);
      setAngleShort(a);
      setActiveIdx(nearestIndex(a, N, step));
    },
    [N, step, angleFromPointer, setAngleShort],
  );

  // クリックで現在針が指すインデックスへジャンプ確定。
  const onClick = useCallback(
    (e: ReactMouseEvent) => {
      if (N <= 0) return;
      const a = angleFromPointer(e.clientX, e.clientY);
      const idx = nearestIndex(a, N, step);
      const target = groups[idx];
      if (target) onJump(target);
    },
    [N, step, groups, angleFromPointer, onJump],
  );

  const active = N > 0 ? groups[activeIdx] : null;

  return {
    dialRef,
    N,
    step,
    maxLayer,
    ringGap,
    needleAngle,
    activeIdx,
    active,
    handLen,
    radiusOfDepth,
    onPointerMove,
    onClick,
  };
}
