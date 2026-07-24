// LoRA / ControlNet の model + strength リスト編集
import { FiMinus, FiPlus } from "react-icons/fi";
import type { PresetModelRef } from "@/types";
import { NumField } from "./NumField";

export function ModelListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: PresetModelRef[];
  onChange: (next: PresetModelRef[]) => void;
}) {
  const add = () => onChange([...items, { model: "", strength: 1 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const patch = (i: number, patch: Partial<PresetModelRef>) =>
    onChange(items.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
          {label}
        </span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-0.5 text-[10px] text-eva-green-soft hover:text-eva-green transition-colors"
        >
          <FiPlus size={11} /> 追加
        </button>
      </div>
      {items.length === 0 && (
        <span className="text-[10px] text-eva-ink-dim/60 italic">なし</span>
      )}
      {items.map((m, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            value={m.model}
            onChange={(e) => patch(i, { model: e.target.value })}
            className="ev-input flex-1 min-w-0 rounded-sm px-1.5 py-0.5 text-[11px]"
            placeholder="model name"
          />
          <NumField
            value={m.strength}
            step={0.05}
            onChange={(v) => patch(i, { strength: v })}
            className="w-16 shrink-0"
            inputClassName="px-1 text-center"
            title="strength"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-0.5 text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="削除"
          >
            <FiMinus size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
