// 指定要素の外側クリックでコールバックを呼ぶ
import { useEffect, type RefObject } from "react";

/**
 * `enabled` の間だけ document に mousedown を張り、
 * `ref` の外側なら `onOutside` を実行する。
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onOutside: () => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [enabled, onOutside, ref]);
}
