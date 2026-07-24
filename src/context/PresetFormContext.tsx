// プリセット保存・編集フォームの Provider / Context
// 保存時は現在の選択ワード + フォーム情報を記録。
// 編集時はメタ情報のみ更新（entries は維持）。
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "motion/react";
import { PresetFormModal } from "@/components/PresetFormModal";
import { usePrompt } from "@/context/PromptContext";
import {
  emptyForm,
  presetToForm,
} from "@/hooks/usePresetFormState";
import type { PresetFormData, PromptPreset } from "@/types";

type Mode =
  | { kind: "save" }
  | { kind: "edit"; preset: PromptPreset };

interface PresetFormValue {
  openSave: () => void;
  openEdit: (preset: PromptPreset) => void;
}

const PresetFormContext = createContext<PresetFormValue | null>(null);

export function PresetFormProvider({ children }: { children: ReactNode }) {
  const { savePreset, updatePresetMeta, state } = usePrompt();
  const [mode, setMode] = useState<Mode | null>(null);

  const openSave = useCallback(() => setMode({ kind: "save" }), []);
  const openEdit = useCallback(
    (preset: PromptPreset) => setMode({ kind: "edit", preset }),
    [],
  );
  const close = useCallback(() => setMode(null), []);

  const submit = useCallback(
    (form: PresetFormData) => {
      if (!mode) return;
      if (mode.kind === "save") {
        savePreset(form);
      } else {
        updatePresetMeta(mode.preset.id, form);
      }
      close();
    },
    [mode, savePreset, updatePresetMeta, close],
  );

  // 同名禁止チェック用（上書きはしない）
  const existingNames = (state.presets ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const value: PresetFormValue = { openSave, openEdit };

  return (
    <PresetFormContext value={value}>
      {children}
      <AnimatePresence>
        {mode && (
          <PresetFormModal
            key={mode.kind === "save" ? "save" : `edit-${mode.preset.id}`}
            title={mode.kind === "save" ? "SAVE PRESET" : "EDIT PRESET"}
            mode={mode.kind}
            initial={
              mode.kind === "save" ? emptyForm() : presetToForm(mode.preset)
            }
            excludeId={mode.kind === "edit" ? mode.preset.id : undefined}
            existingNames={existingNames}
            requireImage={mode.kind === "save"}
            onSubmit={submit}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </PresetFormContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePresetForm(): PresetFormValue {
  const ctx = useContext(PresetFormContext);
  if (!ctx) throw new Error("usePresetForm must be used within PresetFormProvider");
  return ctx;
}
