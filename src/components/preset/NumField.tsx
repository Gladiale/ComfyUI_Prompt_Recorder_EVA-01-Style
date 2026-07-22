// 数値入力フィールド（Steps / CFG / Width / Height など）

export function NumField({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] text-eva-ink-dim/80">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="ev-input rounded-sm px-1 py-0.5 text-[11px] w-full font-mono"
      />
    </div>
  );
}
