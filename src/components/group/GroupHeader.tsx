import { motion } from "motion/react";
import { FiChevronRight, FiFilePlus, FiFolderPlus, FiTrash2 } from "react-icons/fi";
import type { DragEvent } from "react";
import type { Group } from "@/types";

interface Props {
  group: Group;
  depth: number;
  expanded: boolean;
  selectedCount: number;
  editing: boolean;
  draftName: string;
  onNameClick: () => void;
  onDraftNameChange: (value: string) => void;
  onCommitName: () => void;
  onCancelEdit: () => void;
  onAddWord: () => void;
  onAddGroup: () => void;
  onDelete: () => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}

export function GroupHeader({
  group, depth, expanded, selectedCount, editing, draftName,
  onNameClick, onDraftNameChange, onCommitName, onCancelEdit, onAddWord, onAddGroup,
  onDelete, onDragStart, onDragEnd,
}: Props) {
  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onNameClick}
      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group peer hover:bg-[#c28bc5] transition-colors duration-200"
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      <motion.span animate={{ rotate: expanded ? 90 : 0 }} className="text-eva-purple-bright group-hover:text-eva-green">
        <FiChevronRight size={13} />
      </motion.span>
      {editing ? (
        <input
          autoFocus
          value={draftName}
          onChange={(event) => onDraftNameChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommitName();
            if (event.key === "Escape") onCancelEdit();
          }}
          onBlur={onCommitName}
          className="ev-input flex-1 rounded-sm px-1.5 py-0.5 font-cinzel text-[12px] tracking-widest"
        />
      ) : (
        <span className="font-cinzel tracking-widest text-[12px] truncate group-hover:text-eva-green text-eva-ink">
          {group.name}
        </span>
      )}
      {!editing && (
        <div className="flex items-center gap-1 ml-auto">
          {selectedCount > 0 && (
            <span className="badge-pulse shrink-0 min-w-4 h-4 px-1 rounded-full bg-eva-green/15 border border-eva-green/60 text-eva-green-soft text-[10px] font-mono leading-none flex items-center justify-center" title={`内に選択ワード ${selectedCount} 件`}>
              {selectedCount}
            </span>
          )}
          <button onClick={(event) => { event.stopPropagation(); onAddWord(); }} className="p-0.5 text-eva-green-soft hover:text-eva-green transition-colors opacity-60 hover:opacity-100" title="ワード追加 (+ WORD)"><FiFilePlus size={12} /></button>
          <button onClick={(event) => { event.stopPropagation(); onAddGroup(); }} className="p-0.5 text-eva-purple-bright hover:text-eva-green transition-colors opacity-60 hover:opacity-100" title="サブグループ追加"><FiFolderPlus size={12} /></button>
          <button onClick={(event) => { event.stopPropagation(); onDelete(); }} className="p-0.5 text-eva-ink-dim hover:text-eva-magenta transition-colors opacity-60 hover:opacity-100" title="グループ削除"><FiTrash2 size={11} /></button>
        </div>
      )}
    </div>
  );
}
