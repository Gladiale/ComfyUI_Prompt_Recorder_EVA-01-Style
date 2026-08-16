import type { MouseEvent, RefObject } from "react";
import { RiDeleteBin2Line } from "react-icons/ri";
import type { Word } from "@/types";

interface Props {
  word: Word;
  draggable: boolean;
  hasInfo: boolean;
  markRef: RefObject<HTMLSpanElement | null>;
  onDragStart: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onDelete: (event: MouseEvent) => void;
  onFocusStrength: (event: MouseEvent) => void;
  onInfoMouseEnter: () => void;
  onInfoMouseLeave: () => void;
  onInfoClick: (event: MouseEvent) => void;
}

export function WordBody({
  word,
  draggable,
  hasInfo,
  markRef,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
  onContextMenu,
  onDelete,
  onFocusStrength,
  onInfoMouseEnter,
  onInfoMouseLeave,
  onInfoClick,
}: Props) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={[
        "font-garamond group flex items-center gap-2 border px-2.25 py-1.25 cursor-pointer transition-all max-w-57 relative select-none",
        word.selected
          ? "word-selected bg-eva-bg-panel-2"
          : "border-eva-line-soft bg-eva-purple-bright/50 hover:border-eva-purple-bright",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0">
        <div
          className={`truncate text-[13px] ${word.selected ? "text-eva-green-soft font-medium" : "text-eva-ink group-hover:text-[#07ff77]"}`}
          title={`+${word.strength}; ${word.text}`}
        >
          {word.text || <span className="text-eva-ink-dim italic">（empty）</span>}
        </div>
      </div>
      {word.strength !== 0 && word.selected && (
        <span
          onClick={onFocusStrength}
          className="border border-eva-green hover:border-[#ff92de] hover:text-[#ff92de] rounded-full text-[0.7rem] leading-none w-4 aspect-square flex items-center justify-center"
        >
          +{word.strength}
        </span>
      )}
      {hasInfo && (
        <span
          ref={markRef}
          className="relative w-1.5 h-1.5 text-[13px] rounded-full shrink-0 hover:text-[#ff92de] flex items-center justify-center cursor-help"
          style={{ boxShadow: "0 0 6px var(--color-eva-green)" }}
          onPointerEnter={onInfoMouseEnter}
          onPointerLeave={onInfoMouseLeave}
          onClick={onInfoClick}
        >
          ✦
        </span>
      )}
      <button
        onClick={onDelete}
        className="absolute right-0 bottom-[-0.1rem] opacity-0 translate-x-1/2 group-hover:opacity-100 text-eva-ink-dim hover:text-eva-magenta transition-all shrink-0 cursor-pointer"
        title="削除"
      >
        <RiDeleteBin2Line size={13} />
      </button>
    </div>
  );
}
