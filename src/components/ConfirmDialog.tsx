// 確認ダイアログ / ConfirmDialog
// window.confirm の代替：アプリ内モーダルで Promise<boolean> を返す
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FiAlertTriangle } from "react-icons/fi";

interface ConfirmOptions {
  title?: string;
  /** 文字列またはリッチな差分 UI など */
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // 削除など破壊的操作：確認ボタンを赤紫に
  /** 差分一覧など縦に長い内容向け（既定: 320） */
  width?: number;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);

  // confirm() 呼び出しでモーダルを開き、ユーザー操作で解決する
  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    setPending((cur) => {
      cur?.resolve(ok);
      return null;
    });
  }, []);

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-sm border border-eva-line bg-eva-bg-panel-2 shadow-glow-purple"
              style={{ width: pending.width ?? 320 }}
            >
              {/* ヘッダ */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-eva-line-soft">
                <FiAlertTriangle
                  size={14}
                  className={pending.danger ? "text-eva-magenta" : "text-eva-amber"}
                />
                <span className="font-cinzel tracking-widest text-[11px] text-eva-ink">
                  {pending.title ?? "CONFIRM"}
                </span>
              </div>

              {/* 本文（差分など長い内容はスクロール） */}
              <div
                className={[
                  "px-3 py-3 text-[13px] text-eva-ink/90 max-h-115 overflow-y-auto",
                  typeof pending.message === "string" ? "whitespace-pre-line" : "",
                ].join(" ")}
              >
                {pending.message}
              </div>

              {/* ボタン群 */}
              <div className="flex gap-2 px-3 pb-3">
                <button
                  autoFocus
                  onClick={() => close(false)}
                  className="flex-1 rounded-sm border border-eva-line px-2 py-1.5 text-[12px] text-eva-ink-dim hover:text-eva-ink hover:border-eva-purple-bright transition-colors"
                >
                  {pending.cancelLabel ?? "キャンセル"}
                </button>
                <button
                  onClick={() => close(true)}
                  className={[
                    "flex-1 rounded-sm border px-2 py-1.5 text-[12px] font-medium transition-colors",
                    pending.danger
                      ? "border-eva-magenta/60 text-eva-magenta hover:bg-eva-magenta/15 hover:shadow-glow-green"
                      : "border-eva-green/60 text-eva-green-soft hover:bg-eva-green/15 hover:shadow-glow-green",
                  ].join(" ")}
                >
                  {pending.confirmLabel ?? "OK"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
