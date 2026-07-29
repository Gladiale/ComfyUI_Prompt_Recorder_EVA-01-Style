// グループ自身のHTML5 DnD
import { useEffect, useState, type DragEvent } from "react";
import { usePrompt } from "@/context/PromptContext";
import { useGroupTreeDnd, type GroupDropMode } from "@/context/GroupTreeDndContext";

export function computeGroupDropMode(relativeY: number, height: number, expanded: boolean): GroupDropMode {
  if (expanded) {
    if (relativeY < height * 0.22) return "before";
    if (relativeY > height * 0.78) return "after";
    return "into";
  }
  return relativeY < height / 2 ? "before" : "after";
}

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
    if (!draggingGroupId || draggingGroupId === groupId) return;
    if (!event.dataTransfer.types.includes("text/group")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(groupId, modeFromEvent(event));
  };
  const onGroupDragLeave = () => {
    if (targetGroupId === groupId) clearDropTarget();
  };
  const onGroupDrop = (event: DragEvent) => {
    if (!draggingGroupId || draggingGroupId === groupId) {
      clearDropTarget();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
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
