// グループ名のシングルクリック・ダブルクリック編集
import { useEffect, useRef, useState } from "react";
import { usePrompt } from "@/context/PromptContext";

const DBL_CLICK_DELAY = 230;

export function useGroupNodeEditing(groupId: string, groupName: string) {
  const { renameGroup } = usePrompt();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(groupName);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  const onNameClick = (onSingleClick: () => void) => {
    if (editing) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setDraftName(groupName);
      setEditing(true);
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onSingleClick();
    }, DBL_CLICK_DELAY);
  };

  const commitName = () => {
    renameGroup(groupId, draftName.trim() || groupName);
    setEditing(false);
  };
  const cancelEditing = () => {
    setDraftName(groupName);
    setEditing(false);
  };

  return { editing, draftName, setDraftName, onNameClick, commitName, cancelEditing };
}
