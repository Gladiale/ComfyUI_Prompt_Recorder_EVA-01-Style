import { FiMinus, FiPlus } from "react-icons/fi";
import { MAX_STRENGTH, clampStrength } from "@/lib/strength";

interface Props {
  strength: number;
  onChange: (next: number) => void;
}

/** コンテキストメニュー内の強度ステッパー行。選択状態に関係なく調整可能。 */
export function StrengthMenuItem({ strength, onChange }: Props) {
  const value = clampStrength(strength);

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-eva-ink"
      onClick={(e) => e.stopPropagation()}
      title="強度を調整"
    >
      <span className="flex-1 min-w-0 font-mono text-[11px] tracking-wide">強度</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          disabled={value <= 0}
          onClick={() => onChange(clampStrength(value - 1))}
          className="p-0.5 rounded-sm text-eva-ink-dim hover:text-eva-magenta hover:bg-eva-bg-panel/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-eva-ink-dim transition-colors cursor-pointer disabled:cursor-default"
          title="強度を下げる"
        >
          <FiMinus size={11} />
        </button>
        <span
          className={`font-mono text-[11px] w-5 text-center tabular-nums ${
            value > 0 ? "text-eva-magenta" : "text-eva-ink-dim"
          }`}
          title={`強度 ${value} / ${MAX_STRENGTH}`}
        >
          {value}
        </span>
        <button
          type="button"
          disabled={value >= MAX_STRENGTH}
          onClick={() => onChange(clampStrength(value + 1))}
          className="p-0.5 rounded-sm text-eva-ink-dim hover:text-eva-magenta hover:bg-eva-bg-panel/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-eva-ink-dim transition-colors cursor-pointer disabled:cursor-default"
          title="強度を上げる"
        >
          <FiPlus size={11} />
        </button>
      </div>
    </div>
  );
}
