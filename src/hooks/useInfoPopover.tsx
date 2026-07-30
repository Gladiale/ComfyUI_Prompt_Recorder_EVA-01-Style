import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { calculateWordPopoverPosition, type WordPopoverPosition } from "@/lib/wordPopoverGeometry";

interface Options {
  enabled: boolean;
}

export interface InfoPopoverState {
  showInfo: boolean;
  popPos: WordPopoverPosition | null;
  markRef: RefObject<HTMLSpanElement | null>;
  popRef: RefObject<HTMLDivElement | null>;
  measure: () => void;
  enterMark: () => void;
  leaveMark: () => void;
  enterPop: () => void;
  leavePop: () => void;
  toggleInfo: () => void;
  hideInfo: () => void;
}

const HOVER_DELAY = 120;
/** AnimatePresence の exit 時間より少し長く。退出中のポインタ再入で復活するのを防ぐ */
const EXIT_SUPPRESS_MS = 200;

export function useInfoPopover({ enabled }: Options): InfoPopoverState {
  const [showInfo, setShowInfo] = useState(false);
  const [popPos, setPopPos] = useState<WordPopoverPosition | null>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const infoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // カウンタ方式は mouseleave 欠落で永久に閉じなくなるため、要素ごとの boolean で管理する
  const markHovered = useRef(false);
  const popHovered = useRef(false);
  /** 退出アニメ中に popover 側の enter を無視する期限（epoch ms） */
  const popEnterSuppressUntil = useRef(0);

  const clearTimer = useCallback(() => {
    if (infoTimer.current) clearTimeout(infoTimer.current);
    infoTimer.current = null;
  }, []);

  const isAnyHovered = useCallback(
    () => markHovered.current || popHovered.current,
    [],
  );

  const beginClose = useCallback(() => {
    markHovered.current = false;
    popHovered.current = false;
    popEnterSuppressUntil.current = Date.now() + EXIT_SUPPRESS_MS;
  }, []);

  const hideInfo = useCallback(() => {
    clearTimer();
    beginClose();
    setShowInfo(false);
  }, [beginClose, clearTimer]);

  const measure = useCallback(() => {
    const mark = markRef.current;
    const pop = popRef.current;
    if (!mark || !pop) return;
    const rect = mark.getBoundingClientRect();
    setPopPos(calculateWordPopoverPosition({
      anchor: rect,
      popoverWidth: pop.offsetWidth,
      popoverHeight: pop.offsetHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
  }, []);

  const scheduleShow = useCallback(() => {
    clearTimer();
    infoTimer.current = setTimeout(() => {
      if (!isAnyHovered()) return;
      setShowInfo((visible) => {
        if (!visible) setPopPos(null);
        return true;
      });
    }, HOVER_DELAY);
  }, [clearTimer, isAnyHovered]);

  const scheduleHide = useCallback(() => {
    clearTimer();
    infoTimer.current = setTimeout(() => {
      if (isAnyHovered()) return;
      beginClose();
      setShowInfo(false);
    }, HOVER_DELAY);
  }, [beginClose, clearTimer, isAnyHovered]);

  const enterMark = useCallback(() => {
    markHovered.current = true;
    scheduleShow();
  }, [scheduleShow]);

  const leaveMark = useCallback(() => {
    markHovered.current = false;
    scheduleHide();
  }, [scheduleHide]);

  const enterPop = useCallback(() => {
    // 退出アニメ中のゴースト要素への再入は無視（マーク側は通常どおり開いてよい）
    if (Date.now() < popEnterSuppressUntil.current) return;
    popHovered.current = true;
    scheduleShow();
  }, [scheduleShow]);

  const leavePop = useCallback(() => {
    popHovered.current = false;
    scheduleHide();
  }, [scheduleHide]);

  const toggleInfo = useCallback(() => {
    clearTimer();
    setShowInfo((visible) => {
      if (visible) {
        // トグルで閉じるときはフラグもリセット（portal アンマウントで leave が飛ばない対策）
        beginClose();
        return false;
      }
      setPopPos(null);
      return true;
    });
  }, [beginClose, clearTimer]);

  // 表示中は位置追従 + スクロール/リサイズでカーソル下から外れたら閉じる
  // （scroll では mouseleave が発火しないため）
  useEffect(() => {
    if (!enabled || !showInfo) return;

    const syncHoverFromPointer = () => {
      const markHot = markRef.current?.matches(":hover") ?? false;
      const popHot = popRef.current?.matches(":hover") ?? false;
      markHovered.current = markHot;
      popHovered.current = popHot;
      if (!markHot && !popHot) {
        clearTimer();
        beginClose();
        setShowInfo(false);
      }
    };

    const onScrollOrResize = () => {
      measure();
      // スクロール後の :hover 更新を待ってから判定
      requestAnimationFrame(syncHoverFromPointer);
    };

    const raf = requestAnimationFrame(measure);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [beginClose, clearTimer, enabled, measure, showInfo]);

  // フォーカス喪失・タブ非表示で閉じる（leave が飛ばないケース）
  useEffect(() => {
    if (!enabled || !showInfo) return;
    const onBlur = () => hideInfo();
    const onVisibility = () => {
      if (document.hidden) hideInfo();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, hideInfo, showInfo]);

  // 外側クリックで閉じる（トグル表示のまま残るのを防ぐ）
  useEffect(() => {
    if (!enabled || !showInfo) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (markRef.current?.contains(target) || popRef.current?.contains(target)) return;
      hideInfo();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [enabled, hideInfo, showInfo]);

  // enabled が外れたときは effect 内 setState を避け、表示だけ派生で抑止。
  // 実 state のリセットは次のイベント経路（hide / leave / unmount）で行う。
  useEffect(() => () => {
    clearTimer();
    markHovered.current = false;
    popHovered.current = false;
  }, [clearTimer]);

  return {
    showInfo: enabled && showInfo,
    popPos,
    markRef,
    popRef,
    measure,
    enterMark,
    leaveMark,
    enterPop,
    leavePop,
    toggleInfo,
    hideInfo,
  };
}
