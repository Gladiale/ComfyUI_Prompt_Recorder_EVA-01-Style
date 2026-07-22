// 正六角形プリセットタイル
import { motion } from "motion/react";
import { FiCheck, FiEdit2, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import type { PromptPreset } from "@/types";

export function PresetHexTile({
  preset,
  isDragging,
  isOver,
  isAnyDragging,
  setCellRef,
  onApply,
  onEdit,
  onUpdate,
  onDelete,
  onOpenDetail,
  onPointerDown,
}: {
  preset: PromptPreset;
  isDragging: boolean;
  isOver: boolean;
  isAnyDragging: boolean;
  setCellRef: (id: string, el: HTMLElement | null) => void;
  onApply: () => void;
  onEdit: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <motion.div
      layout
      layoutId={`hex-${preset.id}`}
      data-hex-id={preset.id}
      ref={(el) => setCellRef(preset.id, el)}
      transition={{
        layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
      }}
      animate={
        isDragging
          ? { scale: 0.92, opacity: 0.35 }
          : isOver
            ? { scale: 1.06, opacity: 1 }
            : { scale: 1, opacity: 1 }
      }
      whileHover={
        isAnyDragging
          ? undefined
          : {
              scale: 1.04,
              transition: { type: "spring", stiffness: 400, damping: 22 },
            }
      }
      whileTap={isAnyDragging ? undefined : { scale: 0.97 }}
      className={[
        "hex-cell list-none cursor-grab active:cursor-grabbing group select-none touch-none",
        isDragging ? "hex-cell-dragging" : "",
        isOver ? "hex-cell-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onOpenDetail();
      }}
    >
      <div className="hex-ring" aria-hidden />

      <div className="hex-inner">
        <div
          className="absolute inset-0 bg-eva-bg-panel-2 bg-cover bg-center"
          style={preset.image ? { backgroundImage: `url(${preset.image})` } : undefined}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/25" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-[18%] left-[18%] z-10 p-1 rounded-full border border-eva-green/50 bg-black/60 text-eva-green opacity-0 group-hover:opacity-100 transition-opacity hover:bg-eva-green/25 hover:shadow-glow-green"
          title="還元"
        >
          <FiCheck size={11} />
        </button>

        {preset.baseModelKind && (
          <span
            className="absolute top-[16%] right-[14%] z-10 max-w-[42%] truncate px-1 py-px rounded-sm border border-eva-lilac/40 bg-black/55 font-mono text-[8px] text-eva-lavender tracking-wide"
            title={preset.baseModelKind}
          >
            {preset.baseModelKind}
          </span>
        )}

        <div className="absolute inset-x-[18%] top-1/2 translate-y-[-42%] z-10 text-center pointer-events-none">
          <div
            className="font-cinzel text-[11px] leading-tight text-eva-ink line-clamp-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
            title={preset.name}
          >
            {preset.name}
          </div>
          <div className="mt-0.5 font-mono text-[8px] text-eva-ink-dim truncate">
            {preset.entries.length} pt
          </div>
        </div>

        <div className="absolute inset-x-[20%] bottom-[14%] z-10 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-full bg-black/55 text-eva-ink-dim hover:text-eva-green transition-colors"
            title="編集"
          >
            <FiEdit2 size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-full bg-black/55 text-eva-ink-dim hover:text-eva-amber transition-colors"
            title="ワード情報を現在の選択で更新"
          >
            <FiRefreshCw size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-full bg-black/55 text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="削除"
          >
            <FiTrash2 size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
