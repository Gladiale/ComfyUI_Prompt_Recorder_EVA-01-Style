// ワード行 / WordItem — 選択切替・編集・DnD並替
import { motion } from "motion/react";
import type { DragEvent } from "react";
import type { Word } from "@/types";
import { useInfoPopover } from "@/hooks/useInfoPopover";
import { useWordClickActions } from "@/hooks/useWordClickActions";
import { useWordDragEvents } from "@/hooks/useWordDragEvents";
import { WordBody } from "./word/WordBody";
import { WordInfoPopover } from "./word/WordInfoPopover";

interface Props {
  word: Word;
  groupId: string;
  dimmed: boolean;
  isDragging: boolean;
  onWordDragStart: (word: Word) => void;
  onWordDragOver: (e: DragEvent, word: Word) => void;
  onWordDragEnd: () => void;
}

export function WordItem({ word, groupId, dimmed, isDragging, onWordDragStart, onWordDragOver, onWordDragEnd }: Props) {
  const hasInfo = !!word.note.trim() || !!word.image;
  const actions = useWordClickActions(groupId, word);
  const dnd = useWordDragEvents({ word, onWordDragStart, onWordDragOver, onWordDragEnd });
  const info = useInfoPopover({ enabled: hasInfo });

  return (
    <motion.div
      layout
      initial={false}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative inline-flex max-w-full transition-opacity ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <WordBody
        word={word}
        dimmed={dimmed}
        draggable={!isDragging}
        hasInfo={hasInfo}
        markRef={info.markRef}
        onDragStart={dnd.onDragStart}
        onDragOver={dnd.onDragOver}
        onDrop={dnd.onDrop}
        onDragEnd={dnd.onDragEnd}
        onClick={actions.onClick}
        onContextMenu={actions.onContextMenu}
        onDelete={actions.onDelete}
        onFocusStrength={actions.onFocusStrength}
        onInfoMouseEnter={info.enterInfo}
        onInfoMouseLeave={info.leaveInfo}
        onInfoClick={(event) => {
          event.stopPropagation();
          info.toggleInfo();
        }}
      />
      <WordInfoPopover
        word={word}
        show={info.showInfo}
        position={info.popPos}
        popRef={info.popRef}
        measure={info.measure}
        onMouseEnter={info.enterInfo}
        onMouseLeave={info.leaveInfo}
      />
    </motion.div>
  );
}
