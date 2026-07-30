// ワード編集フォームの状態・検証・画像処理
import { useRef, useState, type ChangeEvent } from "react";
import { fileToCompressedDataURL } from "@/lib/image";

export interface WordEditFormData {
  text: string;
  note: string;
  image?: string;
}

interface UseWordEditFormStateOptions {
  initial: WordEditFormData;
  onSubmit: (data: WordEditFormData) => void;
}

export function useWordEditFormState({
  initial,
  onSubmit,
}: UseWordEditFormStateOptions) {
  const [text, setText] = useState(initial.text);
  const [note, setNote] = useState(initial.note);
  const [image, setImage] = useState<string | undefined>(initial.image);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setImage(await fileToCompressedDataURL(file));
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

  return {
    text,
    setText,
    note,
    setNote,
    image,
    busy,
    error,
    fileRef,
    onPickFile,
    removeImage,
    canSubmit,
    submit,
  };
}
