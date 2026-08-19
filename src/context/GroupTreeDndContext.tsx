// グループツリーDnDの一時状態 / 永続データとは分離して管理
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type GroupDropMode = "before" | "after" | "into";

interface GroupTreeDndValue {
  draggingGroupId: string | null;
  targetGroupId: string | null;
  targetMode: GroupDropMode | null;
  startGroupDrag: (id: string) => void;
  endGroupDrag: () => void;
  setDropTarget: (groupId: string, mode: GroupDropMode | null) => void;
  clearDropTarget: () => void;
}

const GroupTreeDndContext = createContext<GroupTreeDndValue | null>(null);

export function GroupTreeDndProvider({ children }: { children: ReactNode }) {
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [target, setTarget] = useState<{ groupId: string; mode: GroupDropMode } | null>(null);
  const startGroupDrag = useCallback((id: string) => setDraggingGroupId(id), []);
  const endGroupDrag = useCallback(() => {
    setDraggingGroupId(null);
    setTarget(null);
  }, []);
  const setDropTarget = useCallback((groupId: string, mode: GroupDropMode | null) => {
    setTarget((prev) => {
      if (!mode) return null;
      if (prev?.groupId === groupId && prev.mode === mode) return prev;
      return { groupId, mode };
    });
  }, []);
  const clearDropTarget = useCallback(() => {
    setTarget((prev) => (prev === null ? prev : null));
  }, []);
  const value = useMemo<GroupTreeDndValue>(() => ({
    draggingGroupId,
    targetGroupId: target?.groupId ?? null,
    targetMode: target?.mode ?? null,
    startGroupDrag,
    endGroupDrag,
    setDropTarget,
    clearDropTarget,
  }), [draggingGroupId, target, startGroupDrag, endGroupDrag, setDropTarget, clearDropTarget]);

  return <GroupTreeDndContext value={value}>{children}</GroupTreeDndContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGroupTreeDnd(): GroupTreeDndValue {
  const value = useContext(GroupTreeDndContext);
  if (!value) throw new Error("useGroupTreeDnd must be used within GroupTreeDndProvider");
  return value;
}
