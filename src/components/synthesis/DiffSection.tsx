// 差分ポップアップ内の1セクション（追加 / 削除 / 強度変更 / テキスト変更）
import type { ReactNode } from "react";
import type { DiffItem } from "@/lib/diff";

export function DiffSection({
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
