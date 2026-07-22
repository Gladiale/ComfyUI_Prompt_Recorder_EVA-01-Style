// Escape キーでコールバックを呼ぶ
import { useEffect } from "react";

/**
 * `enabled` の間だけ window に keydown を張り、
 * Escape が押されたら `onEscape` を実行する。
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onEscape]);
}
