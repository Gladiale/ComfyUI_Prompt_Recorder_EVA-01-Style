// 再帰的グループ表示 / GroupNode
// 展開・折り畳み、グループ名編集、ワードのDnD並替、グループ自体のDnD移動
import { useRef, useState, type DragEvent } from "react";
import { Reorder, motion, AnimatePresence } from "motion/react";
import { FiChevronRight, FiFolderPlus, FiFilePlus, FiTrash2 } from "react-icons/fi";
import type { Group, Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";
import { countSelectedWords } from "@/lib/tree";
import { normalizeText } from "@/lib/normalize";
import { WordItem } from "./WordItem";
import { useConfirm } from "./ConfirmDialog";

interface Props {
  group: Group;
  depth: number;
  query: string;
  isDraggingGroup?: string | null;
  setIsDraggingGroup?: (id: string | null) => void;
}

const DBL_CLICK_DELAY = 230;

export function GroupNode({
  group,
  depth,
  query,
  isDraggingGroup,
  setIsDraggingGroup,
}: Props) {
  const {
    toggleCollapse,
    renameGroup,
    addGroup,
    addWord,
    deleteGroup,
    reorderWords,
    moveGroup,
  } = usePrompt();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(group.name);
  const [dropInfo, setDropInfo] = useState<"before" | "after" | "into" | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reorder.Item の value は group自身
  const q = query.trim().toLowerCase();
  const wordMatches = (w: Word) =>
    !q || normalizeText(w.text).includes(q) || w.note.toLowerCase().includes(q);
  const groupMatchesSearch =
    !q || group.name.toLowerCase().includes(q) || recursiveHasMatch(group);

  // 配下の選択ワード数（徽章に件数表示）
  const selectedCount = countSelectedWords(group);

  function recursiveHasMatch(g: Group): boolean {
    if (g.words.some(wordMatches)) return true;
    return g.groups.some(recursiveHasMatch);
  }

  // ---- グループ名列クリック ----
  const onNameClick = () => {
    if (editing) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      // ダブルクリック → 編集
      setDraftName(group.name);
      setEditing(true);
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      toggleCollapse(group.id);
    }, DBL_CLICK_DELAY);
  };

  const commitName = () => {
    renameGroup(group.id, draftName.trim() || group.name);
    setEditing(false);
  };

  // ---- ワード並替 ----
  const onReorder = (newWords: Word[]) => {
    reorderWords(group.id, newWords);
  };

  // ---- グループ自身のDnD（HTML5で位置検出 → moveGroupで状態書換） ----
  const onGroupDragStart = (e: DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/group", group.id);
    setIsDraggingGroup?.(group.id);
  };
  const onGroupDragEnd = () => {
    setIsDraggingGroup?.(null);
    setDropInfo(null);
  };

  // ドロップ先計算：グループ枠上で before/after/into を判定
  const computeDropMode = (e: DragEvent): "before" | "after" | "into" | null => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    const topZone = h * 0.22;
    const botZone = h * 0.78;
    if (y < topZone) return "before";
    if (y > botZone) return "after";
    return "into";
  };

  const onGroupDragOver = (e: DragEvent) => {
    if (!isDraggingGroup || isDraggingGroup === group.id) return;
    if (e.dataTransfer.types.includes("text/group")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropInfo(computeDropMode(e));
    }
  };
  const onGroupDrop = (e: DragEvent) => {
    if (!isDraggingGroup || isDraggingGroup === group.id) {
      setDropInfo(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const mode = computeDropMode(e);
    if (mode === "into") {
      moveGroup(isDraggingGroup, { kind: "into", parentId: group.id });
    } else if (mode === "before") {
      moveGroup(isDraggingGroup, { kind: "before", anchorId: group.id });
    } else if (mode === "after") {
      moveGroup(isDraggingGroup, { kind: "after", anchorId: group.id });
    }
    setDropInfo(null);
    setIsDraggingGroup?.(null);
  };

  // ルート領域へのドロップ（親がいないグループをルートへ戻す用）は WordPanel で処理

  return (
    <motion.div layout className="select-none bg-[#371029]">
      <div
        onDragOver={onGroupDragOver}
        onDragLeave={() => setDropInfo(null)}
        onDrop={onGroupDrop}
        className={[
          "rounded-sm border transition-colors",
          dropInfo === "into"
            ? "border-eva-green shadow-glow-green"
            : "border-eva-line-soft",
        ].join(" ")}
      >
        {/* グループヘッダ行（グループ自身のDnDドラッグ元） */}
        <div
          draggable={!editing}
          onDragStart={onGroupDragStart}
          onDragEnd={onGroupDragEnd}
          onClick={onNameClick}
          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group hover:border-eva-purple-bright"
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <motion.span
            animate={{ rotate: group.collapsed ? 0 : 90 }}
            className="text-eva-purple-bright group-hover:text-eva-green "
          >
            <FiChevronRight size={13} />
          </motion.span>

          {editing ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setDraftName(group.name);
                  setEditing(false);
                }
              }}
              onBlur={commitName}
              className="ev-input flex-1 rounded-sm px-1.5 py-0.5 font-cinzel text-[12px] tracking-widest"
            />
          ) : (
            <span
              className={`font-cinzel tracking-widest text-[12px] truncate group-hover:text-eva-green ${
                groupMatchesSearch ? "text-eva-ink" : "text-eva-ink-dim"
              }`}
            >
              {group.name}
            </span>
          )}

          {/* 追加ボタン群 */}
          {!editing && (
            <div className="flex items-center gap-1 ml-auto">
              {/* 選択内包の徽章：配下の選択ワード数を表示 */}
              {selectedCount > 0 && (
                <span
                  className="badge-pulse shrink-0 min-w-[16px] h-[16px] px-1 rounded-full bg-eva-green/15 border border-eva-green/60 text-eva-green-soft text-[10px] font-mono leading-none flex items-center justify-center"
                  title={`内に選択ワード ${selectedCount} 件`}
                >
                  {selectedCount}
                </span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addWord(group.id);
                }}
                className="p-0.5 text-eva-green-soft hover:text-eva-green transition-colors opacity-60 hover:opacity-100"
                title="ワード追加 (+ WORD)"
              >
                <FiFilePlus size={12} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addGroup(group.id);
                }}
                className="p-0.5 text-eva-purple-bright hover:text-eva-green transition-colors opacity-60 hover:opacity-100"
                title="サブグループ追加"
              >
                <FiFolderPlus size={12} />
              </button>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await confirm({
                    title: "GROUP DELETE",
                    message: `「${group.name}」を削除しますか？\n（配下のワード・サブグループも全て削除されます）`,
                    confirmLabel: "削除",
                    cancelLabel: "キャンセル",
                    danger: true,
                  });
                  if (ok) deleteGroup(group.id);
                }}
                className="p-0.5 text-eva-ink-dim hover:text-eva-magenta transition-colors opacity-60 hover:opacity-100"
                title="グループ削除"
              >
                <FiTrash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* 折り畳み展開部 */}
        <AnimatePresence initial={false}>
          {!group.collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {/* 挿入位置インジケータ（before/after） */}
              {dropInfo === "before" && <div className="drop-indicator mx-2" />}

              {/* ワード群 */}
              <Reorder.Group
                axis="y"
                values={group.words}
                onReorder={onReorder}
                className="flex flex-col gap-1 py-1"
                style={{ paddingLeft: 14 + depth * 0 }}
              >
                <AnimatePresence initial={false}>
                  {group.words.map((w) => (
                    <WordItem
                      key={w.id}
                      word={w}
                      groupId={group.id}
                      dimmed={!!q && !wordMatches(w)}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>

              {/* 子グループ群（再帰） */}
              <div className="flex flex-col gap-1.5 pb-1.5">
                {group.groups.map((child) => (
                  <GroupNode
                    key={child.id}
                    group={child}
                    depth={depth + 1}
                    query={query}
                    isDraggingGroup={isDraggingGroup}
                    setIsDraggingGroup={setIsDraggingGroup}
                  />
                ))}
              </div>

              {dropInfo === "after" && <div className="drop-indicator mx-2" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
