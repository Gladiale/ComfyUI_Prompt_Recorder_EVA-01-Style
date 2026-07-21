// 右上：総括欄 / SynthesisPanel
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FiCopy, FiCheck, FiMinus, FiMoreHorizontal, FiActivity } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import { usePrompt } from "@/context/PromptContext";
import type { DiffItem } from "@/lib/diff";

export function SynthesisPanel() {
  const { synthesis, separator, setSeparator, lastSnapshot, diff, captureSnapshot } =
    usePrompt();
  const [copied, setCopied] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const onCopy = async () => {
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
    setDiffOpen(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  // ポップアップ外部クリックで閉じる
  useEffect(() => {
    if (!diffOpen) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setDiffOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [diffOpen]);

  const count =
    separator === "comma"
      ? synthesis
        ? synthesis.split(", ").length
        : 0
      : synthesis
        ? synthesis.split("\n").length
        : 0;

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
        {/* 差分検知：前回コピーフ基準からの変化を表示 */}
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
              ? "まだコピーフ基準がありません"
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
            className={`font-mono text-[12px] leading-relaxed whitespace-pre-wrap wrap-break-word text-eva-green-soft/95 ${
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

// ---- 差分ポップアップ ----

function DiffPopup({
  hasBaseline,
  takenAt,
  baselineCount,
  diff,
  onRefresh,
}: {
  hasBaseline: boolean;
  takenAt: number;
  baselineCount: number;
  diff: ReturnType<typeof usePrompt>["diff"];
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
            {diff.modified.filter((i) => i.kind === "strength").length > 0 && (
              <DiffSection
                label="強度変更"
                count={diff.modified.filter((i) => i.kind === "strength").length}
                accent="text-eva-amber"
                items={diff.modified.filter((i) => i.kind === "strength")}
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
            {diff.modified.filter((i) => i.kind === "text").length > 0 && (
              <DiffSection
                label="テキスト変更"
                count={diff.modified.filter((i) => i.kind === "text").length}
                accent="text-eva-purple-bright"
                items={diff.modified.filter((i) => i.kind === "text")}
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

function DiffSection({
  label,
  count,
  accent,
  items,
  render,
}: {
  label: string;
  count: number;
  accent: string;
  items: DiffItem[];
  render: (it: DiffItem) => ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-1 mb-1">
        <span className={`font-mono text-[10px] ${accent}`}>{label}</span>
        <span className="font-mono text-[10px] text-eva-ink-dim">×{count}</span>
      </div>
      <ul className="space-y-0.5">
        {items.map((it) => (
          <li
            key={`${it.kind}-${it.wordId}`}
            className="flex items-start gap-1.5 px-1.5 py-0.5 rounded-sm hover:bg-eva-line-soft/40"
          >
            <span className="font-mono text-[11px] leading-relaxed break-all">
              {render(it)}
            </span>
            {it.groupPath.length > 0 && (
              <span className="ml-auto shrink-0 font-mono text-[9px] text-eva-ink-dim/70 self-center">
                {it.groupPath[it.groupPath.length - 1]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
