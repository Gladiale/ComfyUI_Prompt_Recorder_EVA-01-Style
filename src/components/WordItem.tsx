// ワード行 / WordItem — 選択切替・編集・DnD並替
import { useRef, useState, type DragEvent } from "react";
import { motion } from "motion/react";
import type { Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";
import { useConfirm } from "./ConfirmDialog";
import { RiDeleteBin2Line } from "react-icons/ri";

interface Props {
  word: Word;
  groupId: string;
  dimmed: boolean; // 検索非ヒット時の淡色化
  isDragging: boolean; // 自身がドラッグ中（隙間を空けるため非表示）
  onWordDragStart: (word: Word) => void;
  onWordDragOver: (e: DragEvent, word: Word) => void;
  onWordDragEnd: () => void;
}

const DBL_CLICK_DELAY = 230;

export function WordItem({
  word,
  groupId,
  dimmed,
  isDragging,
  onWordDragStart,
  onWordDragOver,
  onWordDragEnd,
}: Props) {
  const { toggleWord, updateWord, deleteWord, focusSelectedWord } = usePrompt();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 編集ローカル状態
  const [draftText, setDraftText] = useState(word.text);
  const [draftNote, setDraftNote] = useState(word.note);

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

  // 削除：アプリ内ダイアログで確認してから実行
  const onDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "WORD DELETE",
      message: `「${word.text || "（empty）"}」を削除しますか？`,
      confirmLabel: "削除",
      cancelLabel: "キャンセル",
      danger: true,
    });
    if (ok) deleteWord(groupId, word.id);
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

  // ---- DnD並替 ----
  const onDragStart = (e: DragEvent) => {
    if (editing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/word", word.id);
    onWordDragStart(word);
  };
  // ワードDnD以外（グループDnD）は親のグループハンドラへ委譲するため何もしない。
  const isWordDrag = (e: DragEvent) => e.dataTransfer.types.includes("text/word");
  const onDragOver = (e: DragEvent) => {
    if (!isWordDrag(e)) return;
    onWordDragOver(e, word);
  };
  const onDrop = (e: DragEvent) => {
    if (!isWordDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    onWordDragEnd();
  };

  return (
    <motion.div
      layout
      initial={false}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative inline-flex max-w-full transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div
        draggable={!editing}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onWordDragEnd}
        onClick={onClick}
        className={[
          "group flex items-center gap-2 border rounded-sm px-2.5 py-1.5 cursor-pointer transition-all max-w-[260px] relative",
          editing ? "" : "select-none",
          word.selected
            ? "word-selected bg-eva-bg-panel-2"
            : "border-eva-line-soft bg-eva-bg-panel/60 hover:border-eva-purple-bright",
          dimmed ? "opacity-30" : "opacity-100",
        ].join(" ")}
      >
        {/* ドラッグハンドル風の縦線（初号機装甲継ぎ目）
            選択中ワードならクリックで選択一覧へフォーカス（点滅＋スクロール）。
            親の選択切替クリックは発火させない。 */}
        <span
          role={word.selected ? "button" : undefined}
          aria-label={word.selected ? "選択一覧でこのワードにフォーカス" : undefined}
          onClick={
            word.selected
              ? (e) => {
                  e.stopPropagation();
                  focusSelectedWord(word.id);
                }
              : undefined
          }
          className={`w-[3px] self-stretch rounded-full bg-eva-line group-hover:bg-eva-green/60 transition-colors${
            word.selected ? " cursor-pointer group-hover:hover:bg-[#f6cff9]" : ""
          }`}
        />

        {editing ? (
          <div
            className="flex-1 flex flex-col gap-1 py-0.5"
            // フォーカスが編集領域の外へ出たときだけ確定（入力欄間移動では閉じない）
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                commitEdit();
              }
            }}
          >
            <input
              autoFocus
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
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
              title={word.text}
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
            title={word.note}
          >
            ✦
          </span>
        )}

        {/* 削除（編集中・ホバー時） */}
        {!editing && (
          <button
            onClick={onDelete}
            className="absolute right-0 bottom-0 opacity-0 translate-x-1/2 group-hover:opacity-100 text-eva-ink-dim hover:text-eva-magenta transition-all shrink-0"
            title="削除"
          >
            <RiDeleteBin2Line size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
