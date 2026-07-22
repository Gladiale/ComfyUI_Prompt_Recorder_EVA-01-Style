// フォームラベル付きフィールド
import type { ReactNode } from "react";

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
        {label}
      </span>
      {children}
    </label>
  );
}
