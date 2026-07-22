// 差分ポップアップ（前回コピー基準との比較）
import { motion } from "motion/react";
import type { PromptDiff } from "@/lib/diff";
import { DiffSection } from "./DiffSection";

export function DiffPopup({
  hasBaseline,
  takenAt,
  baselineCount,
  diff,
  onRefresh,
}: {
  hasBaseline: boolean;
  takenAt: number;
  baselineCount: number;
  diff: PromptDiff;
  onRefresh: () => void;
}) {
  const time = takenAt
    ? new Date(takenAt).toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const strengthItems = diff.modified.filter((i) => i.kind === "strength");
  const textItems = diff.modified.filter((i) => i.kind === "text");

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.14 }}
      className="absolute right-0 top-full mt-0 z-30 w-80 max-h-132.5 overflow-y-auto rounded-sm border border-eva-line bg-eva-bg-void/95 backdrop-blur shadow-glow-purple"
    >
      {/* ヘッダ：基準情報 */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-eva-line-soft">
        <div className="min-w-0">
          <div className="font-cinzel-deco tracking-[0.14em] text-[10px] text-eva-green glow-text">
            DIFF
          </div>
          <div className="font-mono text-[10px] text-eva-ink-dim truncate">
            {hasBaseline ? `基準 ${baselineCount}pt · ${time}` : "基準なし"}
          </div>
        </div>
        {hasBaseline && (
          <button
            onClick={onRefresh}
            className="shrink-0 px-1.5 py-0.5 rounded-sm border border-eva-line text-[10px] text-eva-ink-dim hover:text-eva-green hover:border-eva-green/60 transition-colors"
            title="現在のプロンプトで基準を更新"
          >
            基準を更新
          </button>
        )}
      </div>

      {/* 本体 */}
      <div className="p-2 space-y-2">
        {!hasBaseline ? (
          <p className="text-eva-ink-dim italic font-garamond text-[12px] px-1 py-2">
            コピーすると、その瞬間のプロンプトが基準として記録されます。
          </p>
        ) : !diff.hasChanges ? (
          <p className="text-eva-ink-dim italic font-garamond text-[12px] px-1 py-2">
            前回コピーから変化はありません。
          </p>
        ) : (
          <>
            {diff.added.length > 0 && (
              <DiffSection
                label="追加"
                count={diff.added.length}
                accent="text-eva-green"
                items={diff.added}
                render={(it) => (
                  <span className="text-eva-green-soft">{it.after?.formatted}</span>
                )}
              />
            )}
            {diff.removed.length > 0 && (
              <DiffSection
                label="削除"
                count={diff.removed.length}
                accent="text-eva-magenta"
                items={diff.removed}
                render={(it) => (
                  <span className="line-through text-eva-magenta/90">
                    {it.before?.formatted}
                  </span>
                )}
              />
            )}
            {strengthItems.length > 0 && (
              <DiffSection
                label="強度変更"
                count={strengthItems.length}
                accent="text-eva-amber"
                items={strengthItems}
                render={(it) => (
                  <span className="text-eva-amber">
                    <span className="line-through opacity-60">
                      {it.before?.formatted}
                    </span>
                    <span className="text-eva-ink-dim mx-1">→</span>
                    {it.after?.formatted}
                  </span>
                )}
              />
            )}
            {textItems.length > 0 && (
              <DiffSection
                label="テキスト変更"
                count={textItems.length}
                accent="text-eva-purple-bright"
                items={textItems}
                render={(it) => (
                  <span className="text-eva-purple-bright">
                    <span className="line-through opacity-60">
                      {it.before?.formatted}
                    </span>
                    <span className="text-eva-ink-dim mx-1">→</span>
                    {it.after?.formatted}
                  </span>
                )}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
