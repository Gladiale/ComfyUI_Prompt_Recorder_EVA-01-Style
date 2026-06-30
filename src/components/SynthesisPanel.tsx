// 右上：総括欄 / SynthesisPanel
import { useState } from "react";
import { FiCopy, FiCheck, FiMinus, FiMoreHorizontal } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import { usePrompt } from "@/context/PromptContext";

export function SynthesisPanel() {
  const { synthesis, separator, setSeparator } = usePrompt();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!synthesis) return;
    try {
      await navigator.clipboard.writeText(synthesis);
    } catch {
      // フォールバック
      const ta = document.createElement("textarea");
      ta.value = synthesis;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const count =
    separator === "comma"
      ? synthesis
        ? synthesis.split(", ").length
        : 0
      : synthesis
        ? synthesis.split("\n").length
        : 0;

  return (
    <section className="flex flex-col h-full min-h-0 rounded-sm border border-eva-line bg-eva-bg-panel/70">
      <header className="flex items-center gap-2 px-3 py-1.5 border-b border-eva-line-soft">
        <h2 className="font-cinzel-deco tracking-[0.18em] text-[12px] text-eva-green glow-text">
          SYNTHESIS
        </h2>
        <span className="font-mono text-[10px] text-eva-ink-dim">{count} pt</span>
        <div className="flex-1" />
        {/* 区切り切替：アイコンのみ（カンマ/改行） */}
        <button
          onClick={() => setSeparator(separator === "comma" ? "newline" : "comma")}
          className="p-1 text-eva-ink-dim hover:text-eva-green transition-colors"
          title={
            separator === "comma"
              ? "カンマ区切り（改行へ切替）"
              : "改行区切り（カンマへ切替）"
          }
        >
          {separator === "comma" ? <FiMoreHorizontal size={13} /> : <FiMinus size={13} />}
        </button>
        <button
          onClick={onCopy}
          className={`p-1 transition-all ${
            copied
              ? "text-eva-green"
              : "text-eva-ink-dim hover:text-eva-green hover:shadow-glow-green"
          }`}
          title="コピー"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="ok"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FiCheck size={13} />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FiCopy size={13} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {synthesis ? (
          <pre
            className={`font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words text-eva-green-soft/95 ${
              separator === "comma" ? "" : ""
            }`}
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
