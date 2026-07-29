// グループ内ワードのHTML5 DnD並替
import { useRef, useState, type DragEvent } from "react";
import type { Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";

export function reorderWordsAroundTarget(
  words: Word[], draggedId: string, targetId: string, isAfter: boolean,
): Word[] | null {
  const from = words.findIndex((word) => word.id === draggedId);
  const over = words.findIndex((word) => word.id === targetId);
  if (from < 0 || over < 0 || from === over) return null;
  let insertAt = isAfter ? over + 1 : over;
  const next = [...words];
  const [moved] = next.splice(from, 1);
  if (from < insertAt) insertAt -= 1;
  insertAt = Math.max(0, Math.min(insertAt, next.length));
  next.splice(insertAt, 0, moved);
  return next.some((word, index) => word.id !== words[index]?.id) ? next : null;
}

export function useGroupWordDnD(groupId: string, words: Word[]) {
  const { reorderWords } = usePrompt();
  const [dragWordId, setDragWordId] = useState<string | null>(null);
  const dragWordIdRef = useRef<string | null>(null);
  const setDragWord = (id: string | null) => {
    dragWordIdRef.current = id;
    setDragWordId(id);
  };
  const onWordDragStart = (word: Word) => setDragWord(word.id);
  const onWordDragEnd = () => setDragWord(null);
  const onWordDragOver = (event: DragEvent, word: Word) => {
    const dragId = dragWordIdRef.current;
    if (!dragId || dragId === word.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const next = reorderWordsAroundTarget(words, dragId, word.id, event.clientX > rect.left + rect.width / 2);
    if (next) reorderWords(groupId, next);
  };
  const onWordsContainerDragOver = (event: DragEvent) => {
    if (dragWordIdRef.current) event.preventDefault();
  };
  const onWordsDrop = (event: DragEvent) => {
    if (!dragWordIdRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    setDragWord(null);
  };
  return { dragWordId, onWordDragStart, onWordDragOver, onWordDragEnd, onWordsContainerDragOver, onWordsDrop };
}
