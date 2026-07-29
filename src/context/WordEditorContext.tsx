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
import { usePrompt } from "@/context/PromptContext";
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

export function WordEditorProvider({ children }: { children: ReactNode }) {
  const { addWord, updateWord } = usePrompt();
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
    (data: WordEditFormData) => {
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
