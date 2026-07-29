// ワード編集ポップアップ / WordEditModal
// ワード本文・注釈・画像を編集する表示コンポーネント。
import { motion } from "motion/react";
import { FiX } from "react-icons/fi";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import {
  useWordEditFormState,
  type WordEditFormData,
} from "@/hooks/useWordEditFormState";
import { WordImagePicker } from "@/components/word/WordImagePicker";

interface WordEditModalProps {
  title: string;
  initial: WordEditFormData;
  onSubmit: (data: WordEditFormData) => void;
  onClose: () => void;
}

export function WordEditModal({
  title,
  initial,
  onSubmit,
  onClose,
}: WordEditModalProps) {
  useEscapeKey(onClose);
  const form = useWordEditFormState({ initial, onSubmit });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-85 rounded-sm border border-eva-line bg-eva-bg-panel-2 shadow-glow-purple"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-eva-line-soft">
          <span className="font-cinzel tracking-widest text-[11px] text-eva-green">
            {title}
          </span>
          <button
            onClick={onClose}
            className="text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="閉じる"
          >
            <FiX size={14} />
          </button>
        </div>

        <div className="px-3 py-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
              WORD
            </span>
            <input
              autoFocus
              value={form.text}
              onChange={(e) => form.setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey))
                  form.submit();
              }}
              className="ev-input rounded-sm px-1.5 py-1 text-[13px]"
              placeholder="word"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
              NOTE (注釈・任意)
            </span>
            <textarea
              value={form.note}
              onChange={(e) => form.setNote(e.target.value)}
              rows={2}
              className="ev-input rounded-sm px-1.5 py-1 text-[11px] font-mono resize-none"
              placeholder="注釈"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.submit();
              }}
            />
          </label>

          <WordImagePicker
            image={form.image}
            busy={form.busy}
            error={form.error}
            fileRef={form.fileRef}
            onPickFile={form.onPickFile}
            onRemove={form.removeImage}
          />
        </div>

        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-eva-line px-2 py-1.5 text-[12px] text-eva-ink-dim hover:text-eva-ink hover:border-eva-purple-bright transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={form.submit}
            disabled={!form.canSubmit}
            className="flex-1 rounded-sm border border-eva-green/60 px-2 py-1.5 text-[12px] font-medium text-eva-green-soft hover:bg-eva-green/15 hover:shadow-glow-green transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            {form.busy ? "処理中…" : "保存"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
