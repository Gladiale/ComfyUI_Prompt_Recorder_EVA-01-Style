// 変換ルール一覧の1行（DnD + 操作ボタン）
import type { DragEvent } from "react";
import { FiCheck, FiEdit2, FiTrash2 } from "react-icons/fi";
import type { PromptTransformRule } from "@/types";

const RULE_MIME = "text/rule-id";

export function RuleListItem({
  rule,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: PromptTransformRule;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (ruleId: string) => void;
  onDragEnd: () => void;
  onDragOver: (ruleId: string) => void;
  onDrop: (targetId: string) => void;
  onToggle: (rule: PromptTransformRule) => void;
  onEdit: (rule: PromptTransformRule) => void;
  onDelete: (rule: PromptTransformRule) => void;
}) {
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(RULE_MIME, rule.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(rule.id);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(rule.id);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(rule.id);
  };

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={[
        "flex items-start gap-1.5 px-1.5 py-1.5 rounded-sm border cursor-grab active:cursor-grabbing select-none transition-all",
        isDragging ? "opacity-40" : "",
        rule.enabled
          ? "border-eva-green/50 bg-eva-green/15 shadow-[0_0_8px_rgba(57,255,20,0.18)]"
          : "border-eva-line-soft/60 bg-[#5b2369] hover:bg-[#69235e]/90",
        isDropTarget ? "ring-1 ring-eva-lavender/70" : "",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] text-eva-ink truncate">{rule.name}</div>
        <div className="font-mono text-[10px] text-eva-ink-dim truncate">
          <span className={rule.enabled ? "text-eva-green-soft" : ""}>
            {rule.from || "（空）"}
          </span>
          <span className="mx-1 text-eva-ink-dim/70">→</span>
          <span>{rule.to === "" ? "（空欄）" : rule.to}</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-0.5 cursor-auto">
        <button
          type="button"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(rule);
          }}
          className={[
            "p-1 transition-colors",
            rule.enabled
              ? "text-eva-green-soft hover:text-eva-green"
              : "text-eva-ink-dim hover:text-eva-lavender",
          ].join(" ")}
          title={rule.enabled ? "適用を解除" : "適用する"}
        >
          <FiCheck size={14} />
        </button>
        <button
          type="button"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(rule);
          }}
          className="p-1 text-eva-ink-dim hover:text-eva-lavender transition-colors"
          title="編集"
        >
          <FiEdit2 size={12} />
        </button>
        <button
          type="button"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(rule);
          }}
          className="p-1 text-eva-ink-dim hover:text-eva-magenta transition-colors"
          title="削除"
        >
          <FiTrash2 size={12} />
        </button>
      </div>
    </li>
  );
}

export { RULE_MIME };
