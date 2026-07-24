// 時計ナビ下部のアクティブグループ名 / パス表示
import { AnimatePresence, motion } from "motion/react";
import type { GroupRef } from "@/lib/tree";

interface ActiveGroupLabelProps {
  active: GroupRef | null;
}

export function ActiveGroupLabel({ active }: ActiveGroupLabelProps) {
  // mode="wait" の場合、短時間に active.id が大量に変化すると
  // アニメーション渋滞で表示が消えることがあるため popLayout を使用
  return (
    <AnimatePresence mode="popLayout">
      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="relative text-center h-7 mb-2.5"
        >
          <div
            className={`font-cinzel tracking-widest text-[13px] ${
              active.depth % 2 === 0 ? "text-eva-green" : "text-eva-lavender"
            }`}
          >
            {active.name}
          </div>
          {active.path.length > 1 && (
            <div className="font-mono text-[10px] text-eva-ink-dim mt-0.5">
              {active.path.join(" / ")}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
