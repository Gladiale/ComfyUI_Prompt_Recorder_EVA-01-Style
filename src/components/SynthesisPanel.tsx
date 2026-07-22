// 右上：総括欄 / SynthesisPanel
import { useCallback, useRef, useState } from "react";
import { FiCopy, FiCheck, FiMinus, FiMoreHorizontal, FiActivity } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import { usePrompt } from "@/context/PromptContext";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useSynthesisCopy } from "@/hooks/useSynthesisCopy";
import { countSynthesisPoints } from "./synthesis/countSynthesisPoints";
import { DiffPopup } from "./synthesis/DiffPopup";

export function SynthesisPanel() {
  const { synthesis, separator, setSeparator, lastSnapshot, diff, captureSnapshot } =
    usePrompt();
  const [diffOpen, setDiffOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const closeDiff = useCallback(() => setDiffOpen(false), []);
  const { copied, onCopy } = useSynthesisCopy({ onCopied: closeDiff });

  useClickOutside(headerRef, diffOpen, closeDiff);

  const count = countSynthesisPoints(synthesis, separator);
  const hasBaseline = !!lastSnapshot;
  const glow = hasBaseline && diff.hasChanges;

  return (
    <section className="flex flex-col h-full min-h-0 rounded-sm border border-eva-line bg-eva-bg-panel/70">
      <header
        ref={headerRef}
        className="relative flex items-center gap-2 px-3 py-1.5 border-b border-eva-line-soft"
      >
        <h2 className="font-cinzel-deco tracking-[0.18em] text-[12px] text-eva-green glow-text">
          SYNTHESIS
        </h2>
        <span className="font-mono text-[10px] text-eva-ink-dim">{count} pt</span>
        <div className="flex-1" />
        {/* 区切り切替：アイコンのみ（カンマ/改行） */}
        <button
          onClick={() => setSeparator(separator === "comma" ? "newline" : "comma")}
          className="p-1 text-eva-ink-dim hover:text-eva-lavender transition-colors"
          title={
            separator === "comma"
              ? "カンマ区切り（改行へ切替）"
              : "改行区切り（カンマへ切替）"
          }
        >
          {separator === "comma" ? <FiMoreHorizontal size={13} /> : <FiMinus size={13} />}
        </button>
        {/* 差分検知：前回コピー基準からの変化を表示 */}
        <button
          onClick={() => setDiffOpen((o) => !o)}
          className={`p-1 transition-all ${
            glow
              ? "text-eva-green"
              : hasBaseline
                ? "text-eva-ink-dim hover:text-eva-lavender"
                : "text-eva-ink-dim/50 hover:text-eva-ink-dim"
          }`}
          title={
            !hasBaseline
              ? "まだコピー基準がありません"
              : glow
                ? "前回コピーから変化があります"
                : "前回コピーから変化なし"
          }
        >
          <FiActivity
            size={13}
            className={
              glow ? "animate-flicker drop-shadow-[0_0_5px_rgba(57,255,20,0.7)]" : ""
            }
          />
        </button>
        <button
          onClick={onCopy}
          className={`p-1 transition-all flex items-center justify-center ${
            copied
              ? "text-eva-green"
              : "text-eva-ink-dim hover:text-eva-lavender hover:drop-shadow-[0_0_5px_rgba(238,55,255,0.888)]"
          }`}
          title="コピー"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="ok"
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                <FiCheck size={13} />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <FiCopy size={13} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* 差分ポップアップ */}
        <AnimatePresence>
          {diffOpen && (
            <DiffPopup
              hasBaseline={hasBaseline}
              takenAt={lastSnapshot?.takenAt ?? 0}
              baselineCount={lastSnapshot?.count ?? 0}
              diff={diff}
              onRefresh={() => {
                captureSnapshot();
                setDiffOpen(false);
              }}
            />
          )}
        </AnimatePresence>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {synthesis ? (
          <pre
            className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap wrap-break-word text-eva-green-soft/95"
            style={{ textShadow: "0 0 8px rgba(57,255,20,0.18)" }}
          >
            {synthesis}
          </pre>
        ) : (
          <div className="text-eva-ink-dim italic font-garamond text-[13px]">
            選択されたワードがここに集約されます。
          </div>
        )}
      </div>
    </section>
  );
}
