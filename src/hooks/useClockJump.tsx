// 時計ナビ：グループへジャンプ（祖先展開 → スクロール → 閉じる）
import { useCallback } from "react";
import type { GroupRef } from "@/lib/tree";

/**
 * expandGroupPath → 2 フレーム待って scrollIntoView → onClose。
 * AnimatePresence 展開後のレイアウト確定を待つための rAF 二重化。
 */
export function useClockJump(
  expandGroupPath: (id: string) => void,
  onClose: () => void,
): (g: GroupRef) => void {
  return useCallback(
    (g: GroupRef) => {
      // 1. 祖先ごと展開（state 更新 → React 再描画 → DOM 出現）
      expandGroupPath(g.id);
      // 2. 描画 + AnimatePresence 展開開始後のレイアウト確定を待つ
      const doScroll = () => {
        const el = document.querySelector<HTMLElement>(`[data-group-id="${g.id}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
      // 3. ポップアップを閉じる
      onClose();
    },
    [expandGroupPath, onClose],
  );
}
