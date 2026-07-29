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
  enterInfo: () => void;
  leaveInfo: () => void;
  toggleInfo: () => void;
}

const HOVER_DELAY = 120;

export function useInfoPopover({ enabled }: Options): InfoPopoverState {
  const [showInfo, setShowInfo] = useState(false);
  const [popPos, setPopPos] = useState<WordPopoverPosition | null>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const infoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (infoTimer.current) clearTimeout(infoTimer.current);
    infoTimer.current = null;
  }, []);

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

  useEffect(() => {
    if (!enabled || !showInfo) return;
    const raf = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [enabled, showInfo, measure]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const enterInfo = useCallback(() => {
    clearTimer();
    infoTimer.current = setTimeout(() => {
      setPopPos(null);
      setShowInfo(true);
    }, HOVER_DELAY);
  }, [clearTimer]);

  const leaveInfo = useCallback(() => {
    clearTimer();
    infoTimer.current = setTimeout(() => setShowInfo(false), HOVER_DELAY);
  }, [clearTimer]);

  const toggleInfo = useCallback(() => {
    clearTimer();
    setShowInfo((visible) => {
      if (!visible) setPopPos(null);
      return !visible;
    });
  }, [clearTimer]);

  return { showInfo, popPos, markRef, popRef, measure, enterInfo, leaveInfo, toggleInfo };
}
