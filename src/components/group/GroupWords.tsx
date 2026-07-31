import { AnimatePresence } from "motion/react";
import type { DragEvent } from "react";
import type { Word } from "@/types";
import { WordItem } from "@/components/WordItem";

interface Props {
  words: Word[];
  groupId: string;
  dragWordId: string | null;
  onWordDragStart: (word: Word) => void;
  onWordDragOver: (event: DragEvent, word: Word) => void;
  onWordDragEnd: () => void;
  onWordsContainerDragOver: (event: DragEvent) => void;
  onWordsDrop: (event: DragEvent) => void;
}

export function GroupWords({ words, groupId, dragWordId, onWordDragStart, onWordDragOver, onWordDragEnd, onWordsContainerDragOver, onWordsDrop }: Props) {
  return (
    <div className="flex flex-wrap gap-1 py-1.5" style={{ paddingLeft: 14 }} onDragOver={onWordsContainerDragOver} onDrop={onWordsDrop}>
      <AnimatePresence initial={false}>
        {words.map((word) => (
          <WordItem key={word.id} word={word} groupId={groupId} isDragging={dragWordId === word.id} onWordDragStart={onWordDragStart} onWordDragOver={onWordDragOver} onWordDragEnd={onWordDragEnd} />
        ))}
      </AnimatePresence>
    </div>
  );
}
