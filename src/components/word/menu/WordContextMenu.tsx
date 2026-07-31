import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { Group, Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";
import { collectAllGroups } from "@/lib/tree";
import type { MenuPosition } from "@/lib/contextMenuGeometry";
import type { WordContextMenuTarget } from "@/hooks/useWordContextMenu";
import { StrengthMenuItem } from "./StrengthMenuItem";
import { MoveGroupMenuItem } from "./MoveGroupMenuItem";

interface Props {
  open: boolean;
  target: WordContextMenuTarget | null;
  position: MenuPosition | null;
  subOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  subMenuRef: RefObject<HTMLDivElement | null>;
  onSubOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export function WordContextMenu({
  open,
  target,
  position,
  subOpen,
  menuRef,
  subMenuRef,
  onSubOpenChange,
  onClose,
}: Props) {
  const { state, setWordStrength, moveWord } = usePrompt();
  const itemRef = useRef<HTMLButtonElement>(null);

  const groups = collectAllGroups(state);

  // ライブ strength を state から拾う（メニュー表示中の更新に追従）
  const live = target
    ? findLiveWord(state.rootGroups, target.wordId) ?? {
        groupId: target.groupId,
        strength: target.strength,
      }
    : null;

  if (!target || !live) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97, pointerEvents: "none" }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            position: "fixed",
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            visibility: position ? "visible" : "hidden",
            zIndex: 9999,
          }}
          className="min-w-44 py-1 rounded-sm border border-eva-line bg-eva-bg-panel-2/95 backdrop-blur shadow-glow-purple"
        >
          <StrengthMenuItem
            strength={live.strength}
            onChange={(next) => {
              setWordStrength(live.groupId, target.wordId, next);
            }}
          />

          <div className="my-1 border-t border-eva-line-soft" />

          <MoveGroupMenuItem
            groups={groups}
            currentGroupId={live.groupId}
            open={subOpen}
            onOpenChange={onSubOpenChange}
            onSelect={(toGroupId) => {
              moveWord(live.groupId, target.wordId, toGroupId);
              onClose();
            }}
            subMenuRef={subMenuRef}
            itemRef={itemRef}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function findLiveWord(
  groups: Group[],
  wordId: string,
): { groupId: string; strength: number } | null {
  for (const group of groups) {
    const word = group.words.find((w: Word) => w.id === wordId);
    if (word) {
      return {
        groupId: group.id,
        strength: word.strength ?? 0,
      };
    }
    const nested = findLiveWord(group.groups, wordId);
    if (nested) return nested;
  }
  return null;
}
