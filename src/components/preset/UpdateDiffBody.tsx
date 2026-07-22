// プリセット更新確認用の差分表示（DiffPopup と同系統のセクション構成）
import type { ReactNode } from "react";
import type { PresetUpdateDiff } from "@/lib/tree";
import { formatWordWithStrength } from "@/lib/strength";

function DiffSection({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-1 mb-1">
        <span className={`font-mono text-[10px] ${accent}`}>{label}</span>
        <span className="font-mono text-[10px] text-eva-ink-dim">×{count}</span>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function DiffRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-1.5 px-1.5 py-0.5 rounded-sm">
      <span className="font-mono text-[11px] leading-relaxed break-all">{children}</span>
    </li>
  );
}

const PREVIEW_LIMIT = 9;

function MoreHint({ rest }: { rest: number }) {
  if (rest <= 0) return null;
  return (
    <li className="px-1.5 py-0.5 font-mono text-[10px] text-eva-ink-dim">
      …他 {rest} 件
    </li>
  );
}

/** プリセット更新確認ダイアログ本体（DiffPopup 風レイアウト）。 */
export function UpdateDiffBody({ name, diff }: { name: string; diff: PresetUpdateDiff }) {
  const added = diff.added.slice(0, PREVIEW_LIMIT);
  const removed = diff.removed.slice(0, PREVIEW_LIMIT);
  const strength = diff.strengthChanged.slice(0, PREVIEW_LIMIT);
  const text = diff.textChanged.slice(0, PREVIEW_LIMIT);

  return (
    <div className="space-y-2.5">
      <p className="text-[12px] text-eva-ink/90 leading-relaxed">
        プリセット「{name}」のワード情報を現在の選択で更新します。
      </p>

      <div className="space-y-2 rounded-sm border border-eva-line-soft bg-eva-bg-void/40 p-2">
        {diff.added.length > 0 && (
          <DiffSection label="追加" count={diff.added.length} accent="text-eva-green">
            {added.map((e) => (
              <DiffRow key={`+${e.wordId}`}>
                <span className="text-eva-green-soft">
                  {formatWordWithStrength(e.text || "(空)", e.strength)}
                </span>
              </DiffRow>
            ))}
            <MoreHint rest={diff.added.length - added.length} />
          </DiffSection>
        )}

        {diff.removed.length > 0 && (
          <DiffSection label="削除" count={diff.removed.length} accent="text-eva-magenta">
            {removed.map((e) => (
              <DiffRow key={`-${e.wordId}`}>
                <span className="line-through text-eva-magenta/90">
                  {formatWordWithStrength(e.text || "(空)", e.strength)}
                </span>
              </DiffRow>
            ))}
            <MoreHint rest={diff.removed.length - removed.length} />
          </DiffSection>
        )}

        {diff.strengthChanged.length > 0 && (
          <DiffSection
            label="強度変更"
            count={diff.strengthChanged.length}
            accent="text-eva-amber"
          >
            {strength.map((e) => (
              <DiffRow key={`s${e.wordId}`}>
                <span className="text-eva-amber">
                  <span className="line-through opacity-60">
                    {formatWordWithStrength(e.text || "(空)", e.from)}
                  </span>
                  <span className="text-eva-ink-dim mx-1">→</span>
                  {formatWordWithStrength(e.text || "(空)", e.to)}
                </span>
              </DiffRow>
            ))}
            <MoreHint rest={diff.strengthChanged.length - strength.length} />
          </DiffSection>
        )}

        {diff.textChanged.length > 0 && (
          <DiffSection
            label="テキスト変更"
            count={diff.textChanged.length}
            accent="text-eva-purple-bright"
          >
            {text.map((e) => (
              <DiffRow key={`t${e.wordId}`}>
                <span className="text-eva-purple-bright">
                  <span className="line-through opacity-60">
                    {formatWordWithStrength(e.savedText || "(空)", e.strength)}
                  </span>
                  <span className="text-eva-ink-dim mx-1">→</span>
                  {formatWordWithStrength(e.currentText || "(空)", e.strength)}
                </span>
              </DiffRow>
            ))}
            <MoreHint rest={diff.textChanged.length - text.length} />
          </DiffSection>
        )}
      </div>

      <p className="text-[12px] text-eva-ink-dim">よろしいですか？</p>
    </div>
  );
}
