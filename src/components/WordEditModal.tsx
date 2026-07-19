// ワード追加・編集ポップアップ / WordEditModal
// 追加ボタン・ダブルクリック編集から起動。ワード / 注釈 / 画像 を記録する。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { FiImage, FiX } from "react-icons/fi";
import { usePrompt } from "@/context/PromptContext";
import { fileToCompressedDataURL } from "@/lib/image";

type Mode =
  | { kind: "add"; groupId: string }
  | {
      kind: "edit";
      groupId: string;
      wordId: string;
      text: string;
      note: string;
      image?: string;
    };

interface WordEditorValue {
  openAdd: (groupId: string) => void;
  openEdit: (
    groupId: string,
    wordId: string,
    initial: { text: string; note: string; image?: string },
  ) => void;
}

const WordEditorContext = createContext<WordEditorValue | null>(null);

export function WordEditorProvider({ children }: { children: ReactNode }) {
  const { addWord, updateWord } = usePrompt();
  const [mode, setMode] = useState<Mode | null>(null);

  const openAdd = useCallback((groupId: string) => {
    setMode({ kind: "add", groupId });
  }, []);

  const openEdit = useCallback(
    (
      groupId: string,
      wordId: string,
      initial: { text: string; note: string; image?: string },
    ) => {
      setMode({
        kind: "edit",
        groupId,
        wordId,
        text: initial.text,
        note: initial.note,
        image: initial.image,
      });
    },
    [],
  );

  const close = useCallback(() => setMode(null), []);

  const submit = useCallback(
    (data: { text: string; note: string; image?: string }) => {
      if (!mode) return;
      if (mode.kind === "add") {
        addWord(mode.groupId, data);
      } else {
        updateWord(mode.groupId, mode.wordId, data);
      }
      close();
    },
    [mode, addWord, updateWord, close],
  );

  const value: WordEditorValue = { openAdd, openEdit };

  return (
    <WordEditorContext value={value}>
      {children}
      <AnimatePresence>
        {mode && (
          <WordEditModalView
            key="modal"
            title={mode.kind === "add" ? "NEW WORD" : "EDIT WORD"}
            initial={{
              text: mode.kind === "add" ? "" : mode.text,
              note: mode.kind === "add" ? "" : mode.note,
              image: mode.kind === "add" ? undefined : mode.image,
            }}
            onSubmit={submit}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </WordEditorContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWordEditor(): WordEditorValue {
  const ctx = useContext(WordEditorContext);
  if (!ctx) throw new Error("useWordEditor must be used within WordEditorProvider");
  return ctx;
}

// ---- モーダル本体 ----

interface ViewProps {
  title: string;
  initial: { text: string; note: string; image?: string };
  onSubmit: (data: { text: string; note: string; image?: string }) => void;
  onClose: () => void;
}

function WordEditModalView({ title, initial, onSubmit, onClose }: ViewProps) {
  const [text, setText] = useState(initial.text);
  const [note, setNote] = useState(initial.note);
  const [image, setImage] = useState<string | undefined>(initial.image);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Esc で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataURL(file);
      setImage(dataUrl);
    } catch {
      setError("画像の読み込みに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const removeImage = () => setImage(undefined);

  const canSubmit = text.trim().length > 0 && !busy;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ text: text.trim(), note: note.trim(), image });
  };

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
        {/* ヘッダ */}
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

        {/* 本文 */}
        <div className="px-3 py-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
              WORD
            </span>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey))
                  submit();
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
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="ev-input rounded-sm px-1.5 py-1 text-[11px] font-mono resize-none"
              placeholder="注釈"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
              IMAGE (任意・最大420px / JPEG圧縮)
            </span>

            {image ? (
              <div className="relative w-fit">
                <img
                  src={image}
                  alt="preview"
                  className="max-h-40 max-w-full rounded-sm border border-eva-line-soft"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full border border-eva-line bg-eva-bg-panel text-eva-ink-dim hover:text-eva-magenta transition-colors"
                  title="画像を削除"
                >
                  <FiX size={11} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-sm border border-dashed border-eva-line px-2 py-2 text-[11px] text-eva-ink-dim hover:text-eva-green hover:border-eva-green transition-colors disabled:opacity-50"
              >
                <FiImage size={13} />
                {busy ? "圧縮中…" : "画像を選択"}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />
            {error && <span className="text-[10px] text-eva-magenta">{error}</span>}
          </div>
        </div>

        {/* ボタン群 */}
        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-eva-line px-2 py-1.5 text-[12px] text-eva-ink-dim hover:text-eva-ink hover:border-eva-purple-bright transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 rounded-sm border border-eva-green/60 px-2 py-1.5 text-[12px] font-medium text-eva-green-soft hover:bg-eva-green/15 hover:shadow-glow-green transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            {busy ? "処理中…" : "保存"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
