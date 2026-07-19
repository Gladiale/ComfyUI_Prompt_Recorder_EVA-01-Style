// ワード行 / WordItem — 選択切替・編集・DnD並替
// 編集はポップアップ(WordEditModal)で行う。注釈/画像がある場合は緑の印を表示し、
// その印をホバーすると画像と注釈がポップオーバーで表示される。
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { Word } from "@/types";
import { usePrompt } from "@/context/PromptContext";
import { useConfirm } from "./ConfirmDialog";
import { useWordEditor } from "./WordEditModal";
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
  const { toggleWord, deleteWord, focusSelectedWord } = usePrompt();
  const confirm = useConfirm();
  const { openEdit } = useWordEditor();
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 注釈/画像プレビューポップオーバー表示
  const [showInfo, setShowInfo] = useState(false);
  const infoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNote = !!word.note.trim();
  const hasImage = !!word.image;
  const hasInfo = hasNote || hasImage;

  // ポータル描画するポップオーバーの位置（ビューポート座標）。印の rect から計算。
  const markRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<{
    left: number;
    top: number;
    x: string;
  } | null>(null);

  // ポップオーバーの位置を計算（印と実ポップ寸法から）。bodyの560px枠外へ
  // はみ出さないよう上下左右を画面境界でクランプ。画像ロード後の再測定にも使う。
  const measure = useCallback(() => {
    const el = markRef.current;
    if (!el) return;

    const GAP = 8;
    const PADDING = 4; // 画面端からの安全マージン
    const r = el.getBoundingClientRect();
    const pop = popRef.current;

    // 実寸法（未描画フォールバック）
    const popW = pop ? pop.offsetWidth : 200;
    const popH = pop ? pop.offsetHeight : hasImage ? 230 : 30;

    // 1. 垂直位置（top）の基本計算：基本は印の上。上に収まらなければ下。
    let top = r.top - GAP - popH < PADDING ? r.bottom + GAP : r.top - GAP - popH;

    // ポップアップの基準（x軸）：デフォルトは中央揃え（-50%）
    let x = "-50%";

    // 2. 垂直位置のクランプ（上下のはみ出し調整）
    // 下方向へはみ出す場合は画面下端にクランプ（上に寄せる）
    if (top + popH > window.innerHeight - PADDING) {
      top = Math.max(PADDING, window.innerHeight - PADDING - popH);
      x = "0";
    }
    // 上方向へはみ出す場合は画面上端にクランプ
    if (top < PADDING) {
      top = PADDING;
      x = "0";
    }

    // 3. 水平位置（left）の計算
    const halfW = popW / 2;
    let left = r.left + r.width / 2; // 基本は印の中心位置

    // 中央揃えの場合で、左側が画面端（PADDING）をはみ出す場合
    if (x !== "0" && halfW >= r.left) {
      left = halfW + PADDING;
    }

    // 【補完】右側へのはみ出し対策（画面右端を超えないように制限）
    if (x !== "0" && left + halfW > window.innerWidth - PADDING) {
      left = window.innerWidth - PADDING - halfW;
    }

    setPopPos({ left, top, x });
  }, [hasImage]);

  // ポップオーバー表示中：初回・スクロール・リサイズで再計算。
  // 初回は motion の描画前で popRef が未確定なため rAF で次フレームに再測定。
  useEffect(() => {
    if (!showInfo) return;
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [showInfo, measure]);

  const startEdit = () => {
    openEdit(groupId, word.id, { text: word.text, note: word.note, image: word.image });
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
    if (clickTimer.current) {
      // 2回目のクリック → ダブルクリック → 編集ポップアップ
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

  // 注釈/画像プレビュー：ホバーで遅延表示、離脱で遅延非表示（クリック耐性用）
  const enterInfo = () => {
    if (infoTimer.current) clearTimeout(infoTimer.current);
    infoTimer.current = setTimeout(() => setShowInfo(true), 120);
  };
  const leaveInfo = () => {
    if (infoTimer.current) clearTimeout(infoTimer.current);
    infoTimer.current = setTimeout(() => setShowInfo(false), 120);
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
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onWordDragEnd}
        onClick={onClick}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.preventDefault();
          word.selected ? focusSelectedWord(word.id) : undefined;
        }}
        className={[
          "font-garamond group flex items-center gap-2 border px-2.25 py-1.25 cursor-pointer transition-all max-w-65 relative select-none",
          word.selected
            ? "word-selected bg-eva-bg-panel-2"
            : "border-eva-line-soft bg-eva-purple-bright/50 hover:border-eva-purple-bright",
          dimmed ? "opacity-30" : "opacity-100",
        ].join(" ")}
      >
        {/* ワード */}
        <div className="flex-1 min-w-0">
          <div
            className={`truncate text-[13px] ${
              word.selected
                ? "text-eva-green-soft font-medium"
                : "text-eva-ink group-hover:text-[#07ff77]"
            }`}
            title={`+${word.strength}; ${word.text}`}
          >
            {word.text || <span className="text-eva-ink-dim italic">（empty）</span>}
          </div>
        </div>

        {/* strength数値の表示と調整 */}
        {word.strength !== 0 && word.selected && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              focusSelectedWord(word.id);
            }}
            className="border border-eva-green hover:border-[#ff92de] hover:text-[#ff92de] rounded-full text-[0.7rem] leading-none w-4 aspect-square flex items-center justify-center"
          >
            +{word.strength}
          </span>
        )}

        {/* 注釈/画像の有無を示す小さな緑の印：ホバーで画像と注釈を表示 */}
        {hasInfo && (
          <span
            ref={markRef}
            className="relative w-1.5 h-1.5 text-[13px] rounded-full shrink-0 hover:text-[#ff92de] flex items-center justify-center cursor-help"
            style={{ boxShadow: "0 0 6px var(--eva-green)" }}
            onMouseEnter={enterInfo}
            onMouseLeave={leaveInfo}
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo((v) => !v);
            }}
          >
            ✦
          </span>
        )}

        {/* 削除（ホバー時） */}
        <button
          onClick={onDelete}
          className="absolute right-0 bottom-[-0.1rem] opacity-0 translate-x-1/2 group-hover:opacity-100 text-eva-ink-dim hover:text-eva-magenta transition-all shrink-0 cursor-pointer"
          title="削除"
        >
          <RiDeleteBin2Line size={13} />
        </button>
      </div>

      {/* 注釈/画像ポップオーバー：親の overflow に遮られないよう body 直下にポータル描画 */}
      {hasInfo &&
        createPortal(
          <AnimatePresence>
            {showInfo && popPos && (
              <motion.div
                ref={popRef}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.14 }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={enterInfo}
                onMouseLeave={leaveInfo}
                style={{
                  position: "fixed",
                  left: popPos.left,
                  top: popPos.top,
                  x: popPos.x,
                  zIndex: 9999,
                }}
                className="w-fit max-w-80 rounded-xl border border-eva-line bg-eva-ink/95 shadow-glow-green p-1.5"
              >
                {hasImage && (
                  <img
                    src={word.image}
                    alt={word.text}
                    onLoad={measure}
                    className="w-full rounded-sm mb-1"
                  />
                )}
                {hasNote && (
                  <p className="text-[11px] font-mono text-eva-purple whitespace-pre-wrap wrap-break-word">
                    {word.note}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  );
}
