import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { FiCheck, FiChevronRight } from "react-icons/fi";
import type { GroupRef } from "@/lib/tree";
import {
  calculateSubmenuPosition,
  type MenuPosition,
} from "@/lib/contextMenuGeometry";

interface Props {
  groups: GroupRef[];
  currentGroupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (groupId: string) => void;
  subMenuRef: RefObject<HTMLDivElement | null>;
  itemRef: RefObject<HTMLButtonElement | null>;
}

/** 「グループ移動」行 + 横開きサブメニュー。 */
export function MoveGroupMenuItem({
  groups,
  currentGroupId,
  open,
  onOpenChange,
  onSelect,
  subMenuRef,
  itemRef,
}: Props) {
  const [subPos, setSubPos] = useState<MenuPosition | null>(null);
  // open=false の間は位置を見せない（effect 内 setState を避ける）
  const visiblePos = open ? subPos : null;

  const measureSub = useCallback((): boolean => {
    const item = itemRef.current;
    const sub = subMenuRef.current;
    if (!item || !sub) return false;
    // まだレイアウトされていない
    if (sub.offsetWidth === 0 && sub.offsetHeight === 0) return false;
    const rect = item.getBoundingClientRect();
    setSubPos(
      calculateSubmenuPosition({
        anchor: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        menuWidth: sub.offsetWidth,
        menuHeight: sub.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }),
    );
    return true;
  }, [itemRef, subMenuRef]);

  // マウント遅延に備え数フレーム再試行
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      if (measureSub() || attempts >= 10) return;
      attempts += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [open, groups, measureSub]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      measureSub();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureSub, open]);

  // 背後パネルへの scroll chaining を止める（passive:false が必要なため native）
  useEffect(() => {
    if (!open) return;
    const el = subMenuRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      // 背後へ伝播させない（capture の scroll 閉じ判定の誤爆も防ぐ）
      event.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = el;
      const canScroll = scrollHeight > clientHeight + 1;
      if (!canScroll) {
        event.preventDefault();
        return;
      }

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
        event.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, subMenuRef, groups]);

  // スクロールバー操作が document の外側扱いになるのを防ぐ
  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <>
      <button
        ref={itemRef}
        type="button"
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-eva-ink-dim hover:text-eva-ink hover:bg-eva-purple/30 transition-colors cursor-pointer"
        onMouseEnter={() => onOpenChange(true)}
        onFocus={() => onOpenChange(true)}
        onClick={() => onOpenChange(true)}
      >
        <span className="flex-1 min-w-0">グループ移動</span>
        <FiChevronRight size={12} className="shrink-0 text-eva-ink-dim" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={subMenuRef}
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 2, pointerEvents: "none" }}
              transition={{ duration: 0.12 }}
              onMouseEnter={() => onOpenChange(true)}
              onPointerDown={onPointerDown}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                left: visiblePos?.left ?? -9999,
                top: visiblePos?.top ?? 0,
                // 計測前は画面外に逃がしつつレイアウトは有効
                zIndex: 10000,
                overscrollBehavior: "contain",
              }}
              className="min-w-44 max-w-64 max-h-72 overflow-y-auto overscroll-contain py-1 rounded-sm border border-eva-line bg-eva-bg-panel-2/95 backdrop-blur shadow-glow-purple"
            >
              {groups.length === 0 ? (
                <div className="px-2.5 py-1.5 text-[11px] text-eva-ink-dim italic">
                  グループがありません
                </div>
              ) : (
                groups.map((g) => {
                  const isCurrent = g.id === currentGroupId;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        if (isCurrent) return;
                        onSelect(g.id);
                      }}
                      className={[
                        "w-full flex items-center gap-1.5 pr-2.5 py-1.5 text-left text-[12px] transition-colors",
                        isCurrent
                          ? "text-eva-green-soft opacity-70 cursor-default"
                          : "text-eva-ink-dim hover:text-eva-ink hover:bg-eva-purple/30 cursor-pointer",
                      ].join(" ")}
                      style={{ paddingLeft: 10 + g.depth * 12 }}
                      title={g.path.join(" / ")}
                    >
                      <span className="flex-1 min-w-0 truncate">{g.name}</span>
                      {isCurrent && (
                        <FiCheck size={12} className="shrink-0 text-eva-green" />
                      )}
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
