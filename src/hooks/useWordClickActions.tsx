import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import type { Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { useWordEditor } from "@/components/WordEditModal";

const DBL_CLICK_DELAY = 230;

export function useWordClickActions(groupId: string, word: Word) {
  const { toggleWord, deleteWord, focusSelectedWord } = usePrompt();
  const confirm = useConfirm();
  const { openEdit } = useWordEditor();
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
  }, []);

  const startEdit = useCallback(() => {
    openEdit(groupId, word.id, { text: word.text, note: word.note, image: word.image });
  }, [groupId, openEdit, word.id, word.image, word.note, word.text]);

  const onClick = useCallback(() => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      startEdit();
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      toggleWord(groupId, word.id);
    }, DBL_CLICK_DELAY);
  }, [groupId, startEdit, toggleWord, word.id]);

  const onContextMenu = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (word.selected) focusSelectedWord(word.id);
  }, [focusSelectedWord, word.id, word.selected]);

  const onDelete = useCallback(async (event: MouseEvent) => {
    event.stopPropagation();
    const ok = await confirm({
      title: "WORD DELETE",
      message: `「${word.text || "（empty）"}」を削除しますか？`,
      confirmLabel: "削除",
      cancelLabel: "キャンセル",
      danger: true,
    });
    if (ok) deleteWord(groupId, word.id);
  }, [confirm, deleteWord, groupId, word.id, word.text]);

  const onFocusStrength = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    focusSelectedWord(word.id);
  }, [focusSelectedWord, word.id]);

  return { onClick, onContextMenu, onDelete, onFocusStrength };
}
