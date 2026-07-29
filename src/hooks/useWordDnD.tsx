import { useCallback, type DragEvent } from "react";
import type { Word } from "@/types";

interface Options {
  word: Word;
  onWordDragStart: (word: Word) => void;
  onWordDragOver: (event: DragEvent, word: Word) => void;
  onWordDragEnd: () => void;
}

export function useWordDnD({ word, onWordDragStart, onWordDragOver, onWordDragEnd }: Options) {
  const isWordDrag = useCallback((event: DragEvent) => (
    event.dataTransfer.types.includes("text/word")
  ), []);

  const onDragStart = useCallback((event: DragEvent) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/word", word.id);
    onWordDragStart(word);
  }, [onWordDragStart, word]);

  const onDragOver = useCallback((event: DragEvent) => {
    if (!isWordDrag(event)) return;
    onWordDragOver(event, word);
  }, [isWordDrag, onWordDragOver, word]);

  const onDrop = useCallback((event: DragEvent) => {
    if (!isWordDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    onWordDragEnd();
  }, [isWordDrag, onWordDragEnd]);

  return { onDragStart, onDragOver, onDrop, onDragEnd: onWordDragEnd };
}
