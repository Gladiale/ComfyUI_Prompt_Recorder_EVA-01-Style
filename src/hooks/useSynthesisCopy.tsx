// 総括欄のコピー + スナップショット基準更新
import { useCallback, useState } from "react";
import { usePrompt } from "@/context/PromptContext";

/**
 * synthesis をクリップボードへコピーし、成功時に差分基準を更新する。
 * コピー成功 UI（チェックアイコン）用の `copied` も返す。
 */
export function useSynthesisCopy(options?: { onCopied?: () => void }) {
  const { synthesis, captureSnapshot } = usePrompt();
  const [copied, setCopied] = useState(false);
  const onCopied = options?.onCopied;

  const onCopy = useCallback(async () => {
    if (!synthesis) return;
    try {
      await navigator.clipboard.writeText(synthesis);
    } catch (e) {
      // Chrome 拡張ポップアップでは実質成功するはずだが、念のためログ出力
      console.error("クリップボードへのコピーに失敗しました:", e);
      alert("クリップボードへのコピーに失敗しました！");
      return;
    }
    // コピーした瞬間を基準（スナップショット）として記録
    captureSnapshot();
    onCopied?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [synthesis, captureSnapshot, onCopied]);

  return { copied, onCopy, canCopy: !!synthesis };
}
