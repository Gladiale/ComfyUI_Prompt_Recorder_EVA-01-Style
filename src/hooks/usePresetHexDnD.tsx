// プリセット六角タイルのポインター DnD（しきい値開始・ライブ並替・ゴースト追従）
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { moveItem } from "@/lib/array";

const DRAG_THRESHOLD_PX = 5;

/** ユーザー並び (order) と外部 id 列をマージ。既存順を保ち、新規は末尾。 */
function mergeOrder(order: string[], presetIds: string[]): string[] {
  if (order.length === 0) return presetIds;
  const kept = order.filter((id) => presetIds.includes(id));
  const added = presetIds.filter((id) => !kept.includes(id));
  return [...kept, ...added];
}

export interface PresetHexDnD {
  /** 表示・コミット用の有効並び（外部 presets とマージ済み） */
  order: string[];
  dragId: string | null;
  overId: string | null;
  isDragging: boolean;
  ghostSize: { w: number; h: number };
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  ghostRotate: MotionValue<number>;
  setCellRef: (id: string, el: HTMLElement | null) => void;
  onTilePointerDown: (id: string, e: React.PointerEvent) => void;
  /** ドラッグ後の誤クリック抑制を含む「詳細を開いてよいか」判定 */
  shouldOpenDetail: () => boolean;
  /** ドラッグ中断（commit=false）や Esc 用 */
  endDrag: (commit: boolean) => void;
}

/**
 * 正六角形ハニカム上のポインター DnD。
 * @param reorderPresets ドロップ確定時に永続並びをコミット
 * @param detailOpen 詳細カード表示中はドラッグ開始を抑止
 * @param presetIds 外部 presets の id 列（追加・削除に追随）
 */
export function usePresetHexDnD(
  reorderPresets: (ids: string[]) => void,
  detailOpen: boolean,
  presetIds: string[],
): PresetHexDnD {
  /** ユーザーが DnD で並べた順序。空 = 外部 presets 順に従う */
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [ghostSize, setGhostSize] = useState({ w: 148, h: 128 });

  const order = useMemo(
    () => mergeOrder(userOrder, presetIds),
    [userOrder, presetIds],
  );

  const orderRef = useRef(order);
  const dragIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** ポインター起点（しきい値判定用） */
  const pointerOrigin = useRef<{ x: number; y: number; id: string } | null>(null);
  const activePointerId = useRef<number | null>(null);

  // ゴースト位置（ビューポート座標・中心）
  const ghostX = useMotionValue(0);
  const ghostY = useMotionValue(0);
  const springX = useSpring(ghostX, { stiffness: 520, damping: 38, mass: 0.55 });
  const springY = useSpring(ghostY, { stiffness: 520, damping: 38, mass: 0.55 });
  const dragOriginX = useMotionValue(0);
  const ghostRotate = useTransform([springX, dragOriginX], ([x, ox]: number[]) =>
    Math.max(-10, Math.min(10, (x - ox) * 0.04)),
  );

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const setCellRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cellRefs.current.set(id, el);
    else cellRefs.current.delete(id);
  }, []);

  /** ポインター下の六角 id をヒットテスト（ドラッグ中セルは除外） */
  const hitTest = useCallback((clientX: number, clientY: number, excludeId: string) => {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
      const cell = (el as HTMLElement).closest?.("[data-hex-id]") as HTMLElement | null;
      if (!cell) continue;
      const id = cell.dataset.hexId;
      if (!id || id === excludeId) continue;
      return id;
    }
    return null;
  }, []);

  const liveReorderTo = useCallback((targetId: string) => {
    const fromId = dragIdRef.current;
    if (!fromId || fromId === targetId) return;
    setUserOrder((prev) => {
      // ライブ並替は「現在の有効並び」基準で行う
      const base = orderRef.current;
      const from = base.indexOf(fromId);
      const to = base.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      return moveItem(base, from, to);
    });
    overIdRef.current = targetId;
    setOverId(targetId);
  }, []);

  const endDrag = useCallback(
    (commit: boolean) => {
      const id = dragIdRef.current;
      if (commit && id) {
        reorderPresets(orderRef.current);
      }
      dragIdRef.current = null;
      overIdRef.current = null;
      pointerOrigin.current = null;
      activePointerId.current = null;
      setDragId(null);
      setOverId(null);
      if (id) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 100);
      }
    },
    [reorderPresets],
  );

  // グローバル pointer 追跡（ドラッグ中）
  useEffect(() => {
    if (!dragId) return;

    const onMove = (e: PointerEvent) => {
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      ghostX.set(e.clientX);
      ghostY.set(e.clientY);
      const hit = hitTest(e.clientX, e.clientY, dragId);
      if (hit && hit !== overIdRef.current) {
        liveReorderTo(hit);
      } else if (!hit && overIdRef.current) {
        overIdRef.current = null;
        setOverId(null);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      endDrag(true);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragId, ghostX, ghostY, hitTest, liveReorderTo, endDrag]);

  // しきい値前の pointer 監視（ドラッグ開始判定）
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const origin = pointerOrigin.current;
      if (!origin || dragIdRef.current) return;
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;

      const el = cellRefs.current.get(origin.id);
      if (el) {
        const r = el.getBoundingClientRect();
        setGhostSize({ w: r.width, h: r.height });
      }
      dragIdRef.current = origin.id;
      dragOriginX.set(e.clientX);
      setDragId(origin.id);
      ghostX.set(e.clientX);
      ghostY.set(e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      // しきい値未満 = クリック扱い
      pointerOrigin.current = null;
      activePointerId.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ghostX, ghostY, dragOriginX]);

  const onTilePointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button")) return;
      if (detailOpen) return;
      e.preventDefault();
      activePointerId.current = e.pointerId;
      pointerOrigin.current = { x: e.clientX, y: e.clientY, id };
    },
    [detailOpen],
  );

  const shouldOpenDetail = useCallback(() => {
    return !suppressClickRef.current && !dragIdRef.current;
  }, []);

  return {
    order,
    dragId,
    overId,
    isDragging: !!dragId,
    ghostSize,
    springX,
    springY,
    ghostRotate,
    setCellRef,
    onTilePointerDown,
    shouldOpenDetail,
    endDrag,
  };
}
