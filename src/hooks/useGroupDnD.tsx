// グループ自身のHTML5 DnD
import { useEffect, useState, type DragEvent } from "react";
import { usePrompt } from "@/context/PromptContext";
import { useGroupTreeDnd } from "@/context/GroupTreeDndContext";
import { computeGroupDropMode, isPointInsideRect } from "@/lib/groupDropGeometry";

export { computeGroupDropMode } from "@/lib/groupDropGeometry";

export function useGroupDnD(groupId: string, expanded: boolean) {
  const { moveGroup } = usePrompt();
  const { draggingGroupId, targetGroupId, targetMode, startGroupDrag, endGroupDrag, setDropTarget, clearDropTarget } = useGroupTreeDnd();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!draggingGroupId) clearDropTarget();
  }, [draggingGroupId, clearDropTarget]);

  const modeFromEvent = (event: DragEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return computeGroupDropMode(event.clientY - rect.top, rect.height, expanded);
  };
  const onGroupDragStart = (event: DragEvent) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/group", groupId);
    setIsDragging(true);
    startGroupDrag(groupId);
  };
  const onGroupDragEnd = () => {
    setIsDragging(false);
    endGroupDrag();
  };
  const onGroupDragOver = (event: DragEvent) => {
    if (!draggingGroupId || !event.dataTransfer.types.includes("text/group")) return;
    // ネストした子の上では子が処理する。親へバブルすると親の大きな矩形で
    // mode がほぼ常に into になり、子の drop-indicator が出ない。
    event.stopPropagation();
    if (draggingGroupId === groupId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(groupId, modeFromEvent(event));
  };
  const onGroupDragLeave = (event: DragEvent) => {
    if (targetGroupId !== groupId) return;
    event.stopPropagation();
    // 子要素へ移っただけの dragleave ではインジケータを消さない
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (isPointInsideRect(event.clientX, event.clientY, rect)) return;
    clearDropTarget();
  };
  const onGroupDrop = (event: DragEvent) => {
    event.stopPropagation();
    if (!draggingGroupId || draggingGroupId === groupId) {
      clearDropTarget();
      return;
    }
    event.preventDefault();
    const mode = modeFromEvent(event);
    if (mode === "into") moveGroup(draggingGroupId, { kind: "into", parentId: groupId });
    else moveGroup(draggingGroupId, { kind: mode, anchorId: groupId });
    endGroupDrag();
  };
  return {
    draggingGroupId,
    isDragging,
    dropInfo: targetGroupId === groupId ? targetMode : null,
    onGroupDragStart,
    onGroupDragEnd,
    onGroupDragOver,
    onGroupDragLeave,
    onGroupDrop,
  };
}
