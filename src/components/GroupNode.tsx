// 再帰的グループ表示 / GroupNode
// 展開・折り畳み、グループ名編集、ワードのDnD並替、グループ自体のDnD移動
import { useEffect, useRef, useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FiChevronRight, FiFolderPlus, FiFilePlus, FiTrash2 } from "react-icons/fi";
import type { Group, Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";
import { countSelectedWords } from "@/lib/tree";
import { normalizeText } from "@/lib/normalize";
import { WordItem } from "./WordItem";
import { useConfirm } from "./ConfirmDialog";
import { useWordEditor } from "./WordEditModal";

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
  const { toggleCollapse, renameGroup, addGroup, deleteGroup, reorderWords, moveGroup } =
    usePrompt();
  const confirm = useConfirm();
  const { openAdd } = useWordEditor();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(group.name);
  const [dropInfo, setDropInfo] = useState<"before" | "after" | "into" | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ドラッグ終了時（isDraggingGroup が null に戻った時）に残ったドロップ表示を全て消去。
  // 深いネスト時、ドロップ先が子グループになり親の onDrop が発火しないケースでも
  // 緑枠が残らないようにする安全網。
  useEffect(() => {
    if (!isDraggingGroup) setDropInfo(null);
  }, [isDraggingGroup]);

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

  // 検索時はマッチを含むグループを強制展開し、ヒットしたワードを即選択できるようにする
  const containsMatch = !!q && recursiveHasMatch(group);
  const expanded = !group.collapsed || containsMatch;

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

  // ---- ワード並替（HTML5 DnD・2Dブロック対応）----
  // Motion Reorder は単一軸前提で flex-wrap の2D配置だと行内並替が壊れるため、
  // ポインタ位置から挿入先を算出して自前で並び替える。
  const [dragWordId, setDragWordId] = useState<string | null>(null);
  const dragWordIdRef = useRef<string | null>(null);
  const setDragWord = (id: string | null) => {
    dragWordIdRef.current = id;
    setDragWordId(id);
  };

  const handleWordDragStart = (word: Word) => {
    setDragWord(word.id);
  };
  const handleWordDragEnd = () => {
    setDragWord(null);
  };

  // 各ワード上での dragover：ポインタが中央より左なら前、右なら後ろへ挿入。
  // 折り返し2D配置でも「乗っているワード」自身が判定するので自然に機能する。
  const handleWordDragOver = (e: DragEvent, word: Word) => {
    const dragId = dragWordIdRef.current;
    if (!dragId || dragId === word.id) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isAfter = e.clientX > rect.left + rect.width / 2;
    const from = group.words.findIndex((w) => w.id === dragId);
    const over = group.words.findIndex((w) => w.id === word.id);
    if (from === -1 || over === -1) return;

    let insertAt = isAfter ? over + 1 : over;
    const newWords = [...group.words];
    const [moved] = newWords.splice(from, 1);
    if (from < insertAt) insertAt -= 1;
    insertAt = Math.max(0, Math.min(insertAt, newWords.length));
    newWords.splice(insertAt, 0, moved);

    // 変化があるときだけ更新（dragover は高頻度発火のため）
    const changed = newWords.some((w, i) => w.id !== group.words[i]?.id);
    if (changed) reorderWords(group.id, newWords);
  };

  const onWordsContainerDragOver = (e: DragEvent) => {
    if (!dragWordIdRef.current) return;
    // ワード間の隙間でもドロップ可能にする
    e.preventDefault();
  };
  const onWordsDrop = (e: DragEvent) => {
    if (!dragWordIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setDragWord(null);
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

  // ドロップ先計算：グループ枠上で before/after/into を判定。
  // 折り畳み時は内容が見えないため into は無効化し、上半分/下半分で before/after に割り振る。
  const computeDropMode = (e: DragEvent): "before" | "after" | "into" | null => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (expanded) {
      const topZone = h * 0.22;
      const botZone = h * 0.78;
      if (y < topZone) return "before";
      if (y > botZone) return "after";
      return "into";
    }
    // 折り畳み時：上下一杯の要素しかないので中央で二分
    return y < h / 2 ? "before" : "after";
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
          dropInfo === "into" ? "border-eva-green shadow-glow-green" : "border-[#8058b1]",
        ].join(" ")}
      >
        {/* 挿入位置インジケータ（before）：折り畳み時も表示するため枠直下に置く */}
        {dropInfo === "before" && <div className="drop-indicator mx-2 mt-1" />}

        {/* グループヘッダ行（グループ自身のDnDドラッグ元） */}
        <div
          draggable={!editing}
          onDragStart={onGroupDragStart}
          onDragEnd={onGroupDragEnd}
          onClick={onNameClick}
          // group 親として peer 兄弟として
          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group peer hover:bg-[#c28bc5] transition-colors duration-200"
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
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
                  openAdd(group.id);
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
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden peer-hover:bg-[#d8b3e1] transition-colors duration-200"
            >
              {/* ワード群（ブロック配置・HTML5 DnDで2D並替） */}
              <div
                className="flex flex-wrap gap-1 py-1.5"
                style={{ paddingLeft: 14 + depth * 0 }}
                onDragOver={onWordsContainerDragOver}
                onDrop={onWordsDrop}
              >
                <AnimatePresence initial={false}>
                  {group.words.map((w) => (
                    <WordItem
                      key={w.id}
                      word={w}
                      groupId={group.id}
                      dimmed={!!q && !wordMatches(w)}
                      isDragging={dragWordId === w.id}
                      onWordDragStart={handleWordDragStart}
                      onWordDragOver={handleWordDragOver}
                      onWordDragEnd={handleWordDragEnd}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* 子グループ群（再帰） */}
              <div
                className={`flex flex-col gap-1.5 ${group.groups.length > 0 ? "pb-1.5" : ""}`}
              >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* 挿入位置インジケータ（after）：折り畳み時も表示するため枠直上（末尾）に置く */}
        {dropInfo === "after" && <div className="drop-indicator mx-2 mb-1" />}
      </div>
    </motion.div>
  );
}
