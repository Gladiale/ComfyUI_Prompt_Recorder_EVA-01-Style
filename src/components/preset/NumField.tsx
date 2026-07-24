// 数値入力フィールド（Steps / CFG / Width / Height / strength など）
// ネイティブスピンナーを隠し、EVA風の上下ステップボタンで調整する

import { useCallback, useEffect, useRef } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

export function NumField({
  label,
  value,
  onChange,
  min,
  step = 1,
  className = "",
  inputClassName = "",
  title,
  allowEmpty = false,
}: {
  label?: string;
  /** undefined のとき空欄表示（allowEmpty 時） */
  value: number | undefined;
  /** allowEmpty 時は undefined（クリア）も受け取る */
  onChange: (v: number | undefined) => void;
  min?: number;
  step?: number;
  /** 外側ラッパー用（例: w-16） */
  className?: string;
  /** input 要素用 */
  inputClassName?: string;
  title?: string;
  /** true のとき未入力を空欄で表示し、クリアも許可 */
  allowEmpty?: boolean;
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // 長押しリピート用。render 中の ref 更新は react-hooks/refs 違反のため effect で同期
  const valueRef = useRef(value ?? 0);
  useEffect(() => {
    valueRef.current = value ?? 0;
  }, [value]);

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
  }, []);

  const applyStep = useCallback(
    (dir: 1 | -1) => {
      const base = Number.isFinite(valueRef.current) ? valueRef.current : 0;
      // 浮動小数の誤差を抑えるため step の小数桁に丸める
      const decimals = String(step).includes(".")
        ? (String(step).split(".")[1]?.length ?? 0)
        : 0;
      let next = base + dir * step;
      if (decimals > 0) {
        const f = 10 ** decimals;
        next = Math.round(next * f) / f;
      }
      if (min !== undefined && next < min) next = min;
      valueRef.current = next;
      onChange(next);
    },
    [min, onChange, step],
  );

  const startHold = useCallback(
    (dir: 1 | -1) => {
      clearHold();
      applyStep(dir);
      // 長押しで加速リピート
      holdTimer.current = setTimeout(() => {
        holdInterval.current = setInterval(() => applyStep(dir), 55);
      }, 320);
    },
    [applyStep, clearHold],
  );

  const hasValue = value !== undefined && Number.isFinite(value);
  const display = hasValue ? value : 0;
  const atMin = min !== undefined && hasValue && display <= min;
  const ariaBase = label ?? title ?? "数値";

  return (
    <div className={`flex flex-col gap-0.5 ${className}`.trim()}>
      {label != null && label !== "" && (
        <span className="font-mono text-[9px] text-eva-ink-dim/80">{label}</span>
      )}
      <div className="ev-num-field group relative flex items-stretch overflow-hidden rounded-sm">
        <input
          type="number"
          value={allowEmpty && !hasValue ? "" : display}
          min={min}
          step={step}
          title={title}
          placeholder={allowEmpty ? "—" : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            if (allowEmpty && raw === "") {
              valueRef.current = 0;
              onChange(undefined);
              return;
            }
            const n = Number(raw);
            const next = Number.isFinite(n) ? n : allowEmpty ? undefined : 0;
            valueRef.current = next ?? 0;
            onChange(next);
          }}
          className={`ev-input ev-num-input min-w-0 flex-1 px-1.5 py-0.5 text-[11px] font-mono tabular-nums ${inputClassName}`.trim()}
        />
        <div className="ev-num-stepper flex shrink-0 flex-col self-stretch">
          <button
            type="button"
            tabIndex={-1}
            aria-label={`${ariaBase} を増やす`}
            onPointerDown={(e) => {
              e.preventDefault();
              startHold(1);
            }}
            onPointerUp={clearHold}
            onPointerLeave={clearHold}
            onPointerCancel={clearHold}
            className="ev-num-btn flex h-2.75 w-4 flex-1 items-center justify-center text-eva-ink-dim/70 transition-colors hover:bg-eva-purple/40 hover:text-eva-green active:bg-eva-green/25 active:text-eva-green"
          >
            <FiChevronUp size={9} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`${ariaBase} を減らす`}
            disabled={atMin}
            onPointerDown={(e) => {
              if (atMin) return;
              e.preventDefault();
              startHold(-1);
            }}
            onPointerUp={clearHold}
            onPointerLeave={clearHold}
            onPointerCancel={clearHold}
            className="ev-num-btn flex h-2.75 w-4 flex-1 items-center justify-center text-eva-ink-dim/70 transition-colors hover:bg-eva-purple/40 hover:text-eva-green active:bg-eva-green/25 active:text-eva-green disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-eva-ink-dim/70"
          >
            <FiChevronDown size={9} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
