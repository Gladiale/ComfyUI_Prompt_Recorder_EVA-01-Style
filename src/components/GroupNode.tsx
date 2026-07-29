// 再帰的グループ表示 / GroupNode
// 展開・折り畳み、グループ名編集、ワードのDnD並替、グループ自体のDnD移動
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Group } from "@/types";
import { usePrompt } from "@/context/PromptContext";
import { useWordEditor } from "@/components/WordEditModal";
import { useConfirm } from "@/components/ConfirmDialog";
import { countSelectedWords } from "@/lib/tree";
import { useGroupSearch } from "@/hooks/useGroupSearch";
import { useGroupNodeEditing } from "@/hooks/useGroupNodeEditing";
import { useGroupWordDnD } from "@/hooks/useGroupWordDnD";
import { useGroupDnD } from "@/hooks/useGroupDnD";
import { GroupHeader } from "./group/GroupHeader";
import { GroupWords } from "./group/GroupWords";
import { GroupChildren } from "./group/GroupChildren";

interface Props { group: Group; depth: number; query: string }

export function GroupNode({ group, depth, query }: Props) {
  const { toggleCollapse, addGroup, deleteGroup } = usePrompt();
  const confirm = useConfirm();
  const { openAdd } = useWordEditor();
  const search = useGroupSearch(group, query);
  const editing = useGroupNodeEditing(group.id, group.name);
  const wordsDnd = useGroupWordDnD(group.id, group.words);
  const groupDnd = useGroupDnD(group.id, search.expanded);
  const selectedCount = countSelectedWords(group);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const onDelete = async () => {
    if (confirmingDelete) return;
    setConfirmingDelete(true);
    try {
      const ok = await confirm({
        title: "GROUP DELETE",
        message: `「${group.name}」を削除しますか？\n（配下のワード・サブグループも全て削除されます）`,
        confirmLabel: "削除",
        cancelLabel: "キャンセル",
        danger: true,
      });
      if (ok) deleteGroup(group.id);
    } finally {
      setConfirmingDelete(false);
    }
  };

  return (
    <motion.div layout data-group-id={group.id} className="select-none scroll-mt-2">
      <div
        onDragOver={groupDnd.onGroupDragOver}
        onDragLeave={groupDnd.onGroupDragLeave}
        onDrop={groupDnd.onGroupDrop}
        className={[
          "bg-eva-claret rounded-xl transition-all overflow-hidden",
          groupDnd.dropInfo === "into" ? "border border-eva-green shadow-glow-green" : "border-t border-[#c993e0]",
        ].join(" ")}
      >
        {groupDnd.dropInfo === "before" && <div className="drop-indicator mx-2 mt-1" />}
        <GroupHeader
          group={group}
          depth={depth}
          expanded={search.expanded}
          groupMatchesSearch={search.groupMatchesSearch}
          selectedCount={selectedCount}
          editing={editing.editing}
          draftName={editing.draftName}
          onNameClick={() => editing.onNameClick(() => toggleCollapse(group.id))}
          onDraftNameChange={editing.setDraftName}
          onCommitName={editing.commitName}
          onCancelEdit={editing.cancelEditing}
          onAddWord={() => openAdd(group.id)}
          onAddGroup={() => addGroup(group.id)}
          onDelete={onDelete}
          onDragStart={groupDnd.onGroupDragStart}
          onDragEnd={groupDnd.onGroupDragEnd}
        />
        <AnimatePresence initial={false}>
          {search.expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden peer-hover:bg-[#d8b3e1] transition-colors duration-200"
            >
              <GroupWords
                words={group.words}
                groupId={group.id}
                query={search.query}
                wordMatches={search.wordMatches}
                dragWordId={wordsDnd.dragWordId}
                onWordDragStart={wordsDnd.onWordDragStart}
                onWordDragOver={wordsDnd.onWordDragOver}
                onWordDragEnd={wordsDnd.onWordDragEnd}
                onWordsContainerDragOver={wordsDnd.onWordsContainerDragOver}
                onWordsDrop={wordsDnd.onWordsDrop}
              />
              <GroupChildren groups={group.groups} depth={depth} query={query} />
            </motion.div>
          )}
        </AnimatePresence>
        {groupDnd.dropInfo === "after" && <div className="drop-indicator mx-2 mb-1" />}
      </div>
    </motion.div>
  );
}
