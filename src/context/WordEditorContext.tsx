// ワード追加・編集フォームの Provider / Context
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "motion/react";
import { WordEditModal } from "@/components/WordEditModal";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePrompt } from "@/context/PromptContext";
import { findDuplicateWords } from "@/lib/tree";
import type { WordEditFormData } from "@/hooks/useWordEditFormState";

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
    initial: WordEditFormData,
  ) => void;
}

const WordEditorContext = createContext<WordEditorValue | null>(null);

const DUP_LIST_LIMIT = 8;

function buildDuplicateMessage(
  text: string,
  dups: ReturnType<typeof findDuplicateWords>,
): string {
  const shown = dups.slice(0, DUP_LIST_LIMIT);
  const lines = shown.map((d) => `・${d.groupPath.join(" / ")}`).join("\n");
  const more =
    dups.length > DUP_LIST_LIMIT
      ? `\n…他 ${dups.length - DUP_LIST_LIMIT} 件`
      : "";
  return (
    `同じワード「${text}」が既に ${dups.length} 件あります。\n` +
    `${lines}${more}\n\nそれでも保存しますか？`
  );
}

export function WordEditorProvider({ children }: { children: ReactNode }) {
  const { state, addWord, updateWord } = usePrompt();
  const confirm = useConfirm();
  const [mode, setMode] = useState<Mode | null>(null);

  const openAdd = useCallback((groupId: string) => {
    setMode({ kind: "add", groupId });
  }, []);

  const openEdit = useCallback(
    (groupId: string, wordId: string, initial: WordEditFormData) => {
      setMode({ kind: "edit", groupId, wordId, ...initial });
    },
    [],
  );

  const close = useCallback(() => setMode(null), []);

  const submit = useCallback(
    async (data: WordEditFormData) => {
      if (!mode) return;

      const excludeWordId = mode.kind === "edit" ? mode.wordId : undefined;
      const dups = findDuplicateWords(state, data.text, { excludeWordId });
      if (dups.length > 0) {
        const ok = await confirm({
          title: "DUPLICATE WORD",
          message: buildDuplicateMessage(data.text, dups),
          confirmLabel: "保存する",
          cancelLabel: "キャンセル",
        });
        if (!ok) return;
      }

      if (mode.kind === "add") {
        addWord(mode.groupId, data);
      } else {
        updateWord(mode.groupId, mode.wordId, data);
      }
      close();
    },
    [mode, state, addWord, updateWord, confirm, close],
  );

  const value: WordEditorValue = { openAdd, openEdit };

  return (
    <WordEditorContext value={value}>
      {children}
      <AnimatePresence>
        {mode && (
          <WordEditModal
            key={mode.kind === "add" ? "add" : `edit-${mode.wordId}`}
            title={mode.kind === "add" ? "NEW WORD" : "EDIT WORD"}
            initial={
              mode.kind === "add"
                ? { text: "", note: "" }
                : { text: mode.text, note: mode.note, image: mode.image }
            }
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
