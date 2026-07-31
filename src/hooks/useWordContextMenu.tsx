import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import type { Word } from "@/types";
import {
  calculateContextMenuPosition,
  type MenuPosition,
} from "@/lib/contextMenuGeometry";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { clampStrength } from "@/lib/strength";

export interface WordContextMenuTarget {
  groupId: string;
  wordId: string;
  selected: boolean;
  strength: number;
}

export interface WordContextMenuState {
  open: boolean;
  target: WordContextMenuTarget | null;
  cursor: { x: number; y: number } | null;
  position: MenuPosition | null;
  subOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  subMenuRef: RefObject<HTMLDivElement | null>;
  openMenu: (event: MouseEvent, groupId: string, word: Word) => void;
  closeMenu: () => void;
  setSubOpen: (open: boolean) => void;
  measure: () => void;
}

/**
 * ワード右クリックメニューの開閉・位置・サブメニュー状態。
 * root + submenu を multi-ref で外側クリック判定する。
 */
export function useWordContextMenu(): WordContextMenuState {
  const [target, setTarget] = useState<WordContextMenuTarget | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);

  const closeMenu = useCallback(() => {
    setTarget(null);
    setCursor(null);
    cursorRef.current = null;
    setPosition(null);
    setSubOpen(false);
  }, []);

  const openMenu = useCallback((event: MouseEvent, groupId: string, word: Word) => {
    event.preventDefault();
    event.stopPropagation();
    setSubOpen(false);
    setPosition(null);
    const nextCursor = { x: event.clientX, y: event.clientY };
    cursorRef.current = nextCursor;
    setCursor(nextCursor);
    setTarget({
      groupId,
      wordId: word.id,
      selected: word.selected,
      strength: clampStrength(word.strength ?? 0),
    });
  }, []);

  const measure = useCallback(() => {
    const menu = menuRef.current;
    const cur = cursorRef.current;
    if (!menu || !cur) return false;
    setPosition(
      calculateContextMenuPosition({
        cursor: cur,
        menuWidth: menu.offsetWidth,
        menuHeight: menu.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }),
    );
    return true;
  }, []);

  /** target がメニュー（サブ含む）内、またはその子孫か */
  const isInsideMenu = useCallback((node: EventTarget | null) => {
    if (!(node instanceof Node)) return false;
    const menu = menuRef.current;
    const sub = subMenuRef.current;
    if (menu && (menu === node || menu.contains(node))) return true;
    if (sub && (sub === node || sub.contains(node))) return true;
    return false;
  }, []);

  // 表示直後に寸法を測って clamp（マウント遅延に備え数フレーム再試行）
  useEffect(() => {
    if (!target || !cursor) return;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      if (measure() || attempts >= 8) return;
      attempts += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [target, cursor, measure]);

  // 外側クリックで閉じる（root + submenu）
  useEffect(() => {
    if (!target) return;
    const onDown = (event: globalThis.MouseEvent) => {
      if (isInsideMenu(event.target)) return;
      closeMenu();
    };
    // capture だとスクロールバー操作前に拾えるが、contains でメニュー内は除外
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [closeMenu, isInsideMenu, target]);

  // メニュー外のスクロール / リサイズ / blur で閉じる
  // サブメニュー自身の overflow スクロールは閉じない
  useEffect(() => {
    if (!target) return;

    const onScroll = (event: Event) => {
      if (isInsideMenu(event.target)) return;
      closeMenu();
    };

    const onClose = () => closeMenu();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [closeMenu, isInsideMenu, target]);

  useEscapeKey(closeMenu, !!target);

  return {
    open: !!target,
    target,
    cursor,
    position,
    subOpen,
    menuRef,
    subMenuRef,
    openMenu,
    closeMenu,
    setSubOpen,
    measure,
  };
}
