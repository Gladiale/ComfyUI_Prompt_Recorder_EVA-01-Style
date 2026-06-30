// 右下：選択済みワード一覧 / SelectedPanel
// 各ワードをクリックすると選択解除され、総括欄が即時再計算される。
// 強度ステッパーで出力時の強調（0..10）を調整できる。
import { FiX, FiMinus, FiPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import { usePrompt } from "@/context/PromptContext";
import {
  MAX_STRENGTH,
  clampStrength,
  formatWordWithStrength,
} from "@/lib/strength";

export function SelectedPanel() {
  const { selectedRefs, deselectWord, setWordStrength } = usePrompt();

  return (
    <section className="flex flex-col h-full min-h-0 rounded-sm border border-eva-line bg-eva-bg-panel/70">
      <header className="flex items-center gap-2 px-3 py-1.5 border-b border-eva-line-soft">
        <h2 className="font-cinzel-deco tracking-[0.18em] text-[12px] text-eva-green glow-text">
          SELECTED
        </h2>
        <span className="font-mono text-[10px] text-eva-ink-dim">
          {selectedRefs.length} pt
        </span>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 overflow-x-hidden">
        <AnimatePresence initial={false}>
          {selectedRefs.map((ref, i) => {
            const strength = clampStrength(ref.word.strength ?? 0);
            const preview = formatWordWithStrength(ref.word.text, strength);
            return (
              <motion.div
                key={ref.word.id}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                onClick={() => deselectWord(ref.groupId, ref.word.id)}
                className="group w-full flex items-center gap-2 px-2 py-1 rounded-sm border border-eva-line-soft hover:border-eva-magenta bg-eva-bg-panel-2/60 mb-1 text-left cursor-pointer"
                title="クリックで選択解除"
              >
                <span className="font-mono text-[9px] text-eva-purple-bright w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <span
                  className="flex-1 min-w-0 truncate text-[12px] text-eva-green-soft"
                  title={preview}
                >
                  {ref.word.text}
                </span>

                {/* 強度ステッパー：クリック伝播を止めて選択解除を防ぐ */}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      setWordStrength(ref.groupId, ref.word.id, clampStrength(strength - 1))
                    }
                    disabled={strength <= 0}
                    className="p-0.5 rounded-sm text-eva-ink-dim hover:text-eva-magenta hover:bg-eva-bg-panel/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="強度を下げる"
                  >
                    <FiMinus size={10} />
                  </button>
                  <span
                    className={`font-mono text-[9px] w-5 text-center tabular-nums ${
                      strength > 0 ? "text-eva-magenta" : "text-eva-ink-dim"
                    }`}
                    title={`強度 ${strength} / ${MAX_STRENGTH}\n→ ${preview}`}
                  >
                    {strength}
                  </span>
                  <button
                    onClick={() =>
                      setWordStrength(ref.groupId, ref.word.id, clampStrength(strength + 1))
                    }
                    disabled={strength >= MAX_STRENGTH}
                    className="p-0.5 rounded-sm text-eva-ink-dim hover:text-eva-magenta hover:bg-eva-bg-panel/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="強度を上げる"
                  >
                    <FiPlus size={10} />
                  </button>
                </div>

                <FiX
                  size={11}
                  className="text-eva-ink-dim group-hover:text-eva-magenta transition-colors shrink-0"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {selectedRefs.length === 0 && (
          <div className="text-eva-ink-dim italic font-garamond text-[12px] px-1 pt-2">
            選択中のワードはありません。
          </div>
        )}
      </div>
    </section>
  );
}
