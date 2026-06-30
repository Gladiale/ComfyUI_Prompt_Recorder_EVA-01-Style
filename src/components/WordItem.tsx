// ワード行 / WordItem — 選択切替・編集・DnD並替
import { useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { FiX } from "react-icons/fi";
import type { Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";

interface Props {
  word: Word;
  groupId: string;
  dimmed: boolean; // 検索非ヒット時の淡色化
}

const DBL_CLICK_DELAY = 230;

export function WordItem({ word, groupId, dimmed }: Props) {
  const { toggleWord, updateWord, deleteWord } = usePrompt();
  const [editing, setEditing] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 編集ローカル状態
  const [draftText, setDraftText] = useState(word.text);
  const [draftNote, setDraftNote] = useState(word.note);
  const controls = useDragControls();

  const startEdit = () => {
    setDraftText(word.text);
    setDraftNote(word.note);
    setEditing(true);
  };

  const commitEdit = () => {
    updateWord(groupId, word.id, { text: draftText, note: draftNote });
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraftText(word.text);
    setDraftNote(word.note);
    setEditing(false);
  };

  // シングルクリック=選択切替、ダブルクリック=編集（遅延で判別）
  const onClick = () => {
    if (editing) return;
    if (clickTimer.current) {
      // 2回目のクリック → ダブルクリック
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      startEdit();
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      toggleWord(groupId, word.id);
    }, DBL_CLICK_DELAY);
  };

  return (
    <Reorder.Item
      value={word}
      dragListener
      dragControls={controls}
      dragTransition={{ bounceStiffness: 260, bounceDamping: 24 }}
      initial={false}
      className="relative"
      whileDrag={{
        scale: 0.96,
        opacity: 0.7,
        boxShadow: "0 0 18px rgba(57,255,20,0.45)",
        zIndex: 50,
      }}
    >
      <div
        onClick={onClick}
        className={[
          "group flex items-center gap-2 border rounded-sm px-2.5 py-1.5 cursor-pointer select-none transition-all",
          word.selected
            ? "word-selected bg-eva-bg-panel-2"
            : "border-eva-line-soft bg-eva-bg-panel/60 hover:border-eva-purple-bright",
          dimmed ? "opacity-30" : "opacity-100",
        ].join(" ")}
      >
        {/* ドラッグハンドル風の縦線（初号機装甲継ぎ目） */}
        <span className="w-[3px] self-stretch rounded-full bg-eva-line group-hover:bg-eva-green/60 transition-colors" />

        {editing ? (
          <div className="flex-1 flex flex-col gap-1 py-0.5">
            <input
              autoFocus
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              onBlur={commitEdit}
              className="ev-input rounded-sm px-1.5 py-0.5 text-[13px]"
              placeholder="word"
            />
            <input
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              onBlur={commitEdit}
              className="ev-input rounded-sm px-1.5 py-0.5 text-[11px] font-mono"
              placeholder="note (注釈)"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div
              className={`truncate text-[13px] ${
                word.selected ? "text-eva-green-soft font-medium" : "text-eva-ink"
              }`}
              title={word.note}
            >
              {word.text || <span className="text-eva-ink-dim italic">（empty）</span>}
            </div>
          </div>
        )}

        {/* 注釈の有無を示す小さな緑の印 */}
        {word.note.trim() && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 flex items-center justify-center"
            style={{
              boxShadow: "0 0 6px var(--eva-green)",
              // color: "var(--eva-green-soft)",
            }}
            title="注釈あり"
          >
            ✦
          </span>
        )}

        {/* 削除（編集中・ホバー時） */}
        {!editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteWord(groupId, word.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-eva-ink-dim hover:text-eva-magenta transition-all shrink-0"
            title="削除"
          >
            <FiX size={12} />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}
