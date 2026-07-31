// 変換ルール追加・編集フォーム
import type { RuleFormInput } from "@/lib/tree";
import { isValidRuleInput } from "@/lib/tree";

export interface RuleFormState {
  name: string;
  from: string;
  to: string;
}

export function RuleForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  value: RuleFormState;
  onChange: (next: RuleFormState) => void;
  onSubmit: (input: RuleFormInput) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const nameError = !value.name.trim() ? "ルール名は必須です" : "";
  const fromError = !value.from.trim() ? "変換前の文字は必須です" : "";
  const canSubmit = isValidRuleInput(value);

  return (
    <form
      className="space-y-2 px-1 py-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          name: value.name,
          from: value.from,
          to: value.to,
        });
      }}
    >
      <label className="flex flex-col gap-0.5">
        <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
          ルール名
        </span>
        <input
          autoFocus
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="w-full px-2 py-1 rounded-sm border border-eva-line bg-eva-bg/60 font-mono text-[11px] text-eva-ink outline-none focus:border-eva-green/50"
          placeholder="例: cat → dog"
        />
        {nameError && (
          <span className="font-mono text-[10px] text-eva-magenta">{nameError}</span>
        )}
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
          変換前
        </span>
        <input
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="w-full px-2 py-1 rounded-sm border border-eva-line bg-eva-bg/60 font-mono text-[11px] text-eva-ink outline-none focus:border-eva-green/50"
          placeholder="変換前の文字列"
        />
        {fromError && (
          <span className="font-mono text-[10px] text-eva-magenta">{fromError}</span>
        )}
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
          変換後
        </span>
        <input
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="w-full px-2 py-1 rounded-sm border border-eva-line bg-eva-bg/60 font-mono text-[11px] text-eva-ink outline-none focus:border-eva-green/50"
          placeholder="空欄で削除"
        />
      </label>

      <div className="flex items-center justify-end gap-1.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-0.5 rounded-sm border border-eva-line text-[10px] text-eva-ink-dim hover:text-eva-lavender transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-2 py-0.5 rounded-sm border border-eva-green/60 text-[10px] text-eva-green-soft hover:bg-eva-green/15 hover:shadow-glow-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
