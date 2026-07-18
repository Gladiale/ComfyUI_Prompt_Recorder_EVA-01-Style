// 右下：選択済みワード一覧 / SelectedPanel
// 各ワードをクリックすると選択解除され、総括欄が即時再計算される。
// 強度ステッパーで出力時の強調（0..10）を調整できる。
// ヘッダから選択状態の組み合わせをプリセットとして保存・復元できる。
import { useEffect, useRef, useState } from "react";
import {
  FiX,
  FiMinus,
  FiPlus,
  FiBookmark,
  FiChevronDown,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiChevronUp,
} from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import { usePrompt } from "@/context/PromptContext";
import { useConfirm } from "./ConfirmDialog";
import { MAX_STRENGTH, clampStrength, formatWordWithStrength } from "@/lib/strength";

export function SelectedPanel() {
  const {
    selectedRefs,
    deselectWord,
    setWordStrength,
    focusWordId,
    focusNonce,
    state,
    savePreset,
    applyPreset,
    deletePreset,
    renamePreset,
    reorderPresets,
  } = usePrompt();
  const confirm = useConfirm();
  const presets = state.presets ?? [];

  // プリセット一覧プルダウン
  const [presetOpen, setPresetOpen] = useState(false);
  // 保存名入力モード
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  // 一覧内のリネームモード
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const startNaming = () => {
    setDraftName("");
    setNaming(true);
  };
  const commitNaming = async () => {
    const name = draftName.trim();
    if (!name) return;
    // 同名既存があれば上書き確認
    const dup = presets.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
    if (dup) {
      const ok = await confirm({
        title: "PRESET OVERWRITE",
        message: `同名のプリセット「${dup.name}」が存在します。\n上書きしますか？`,
        confirmLabel: "上書き",
        cancelLabel: "キャンセル",
        danger: true,
      });
      if (!ok) return;
    }
    savePreset(name);
    setNaming(false);
    setDraftName("");
  };

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameDraft(current);
  };
  const commitRename = () => {
    if (renamingId) renamePreset(renamingId, renameDraft);
    setRenamingId(null);
  };

  const onDeletePreset = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "PRESET DELETE",
      message: `プリセット「${name}」を削除しますか？`,
      confirmLabel: "削除",
      cancelLabel: "キャンセル",
      danger: true,
    });
    if (ok) deletePreset(id);
  };

  // 適用：現在の選択状態が完全置換されるため確認を挟む
  const onApplyPreset = async (
    e: React.MouseEvent,
    id: string,
    name: string,
    count: number,
  ) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "PRESET RESTORE",
      message: `プリセット「${name}」（${count} pt）を復元しますか？\n現在の選択状態は置き換えられます。`,
      confirmLabel: "復元",
      cancelLabel: "キャンセル",
      danger: true,
    });
    if (ok) {
      applyPreset(id);
      setPresetOpen(false);
    }
  };

  // 順序入替：指定プリセットを一つ前/後ろへ移動
  const movePreset = (id: string, dir: -1 | 1) => {
    const ids = presets.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderPresets(ids);
  };

  // フォーカス対象ワードのDOM参照マップ（key=word.id）
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // フォーカス要求を監視：該当行をスクロールインビュー＋一時点滅
  useEffect(() => {
    if (!focusWordId) return;
    const el = rowRefs.current.get(focusWordId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // 点滅：一度リセットしてから再付与で再発火させる
    el.classList.remove("focused-flash");
    // reflow を踏んで再発火
    void el.offsetWidth;
    el.classList.add("focused-flash");
  }, [focusWordId, focusNonce]);

  // プルダウン外部クリックで閉じる
  const presetHeaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!presetOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        presetHeaderRef.current &&
        !presetHeaderRef.current.contains(e.target as Node)
      ) {
        setPresetOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [presetOpen]);

  return (
    <section className="flex flex-col h-full min-h-0 rounded-sm border border-eva-line bg-eva-bg-panel/70">
      <header
        ref={presetHeaderRef}
        className="relative flex items-center gap-2 px-3 py-1.5 border-b border-eva-line-soft"
      >
        <h2 className="font-cinzel-deco tracking-[0.18em] text-[12px] text-eva-green glow-text">
          SELECTED
        </h2>
        <span className="font-mono text-[10px] text-eva-ink-dim">
          {selectedRefs.length} pt
        </span>

        {/* プリセット操作群 */}
        <div className="flex items-center gap-1 ml-auto">
          {/* 保存：名前入力 → savePreset */}
          {naming ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNaming();
                  if (e.key === "Escape") setNaming(false);
                }}
                placeholder="プリセット名"
                className="ev-input rounded-xl px-1.5 py-0.5 text-[11px] w-24"
              />
              <button
                onClick={commitNaming}
                className="p-0.5 text-eva-green hover:text-eva-green-soft transition-colors"
                title="保存"
              >
                <FiCheck size={13} />
              </button>
              <button
                onClick={() => setNaming(false)}
                className="p-0.5 text-eva-ink-dim hover:text-eva-magenta transition-colors"
                title="キャンセル"
              >
                <FiX size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={startNaming}
              disabled={selectedRefs.length === 0}
              className="p-0.5 text-eva-green-soft hover:text-eva-green transition-colors disabled:opacity-30 disabled:hover:text-eva-green-soft"
              title="現在の選択組み合わせをプリセット保存"
            >
              <FiBookmark size={13} />
            </button>
          )}

          {/* 一覧プルダウン */}
          {!naming && (
            <button
              onClick={() => setPresetOpen((v) => !v)}
              className={`flex items-center gap-0.5 p-0.5 transition-colors ${
                presetOpen ? "text-eva-green" : "text-[#cb73dc] hover:text-eva-green"
              }`}
              title="保存済みプリセット"
            >
              <FiChevronDown
                size={13}
                className={`transition-transform ${presetOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {/* プルダウン本体 */}
        <AnimatePresence>
          {presetOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-2 top-full z-20 w-[95%] max-h-63 overflow-y-auto rounded-sm border border-[#cb73dc] bg-[#fccbfc] shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {presets.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-eva-ink-dim italic">
                  プリセットはありません。FiBookmark で保存。
                </div>
              ) : (
                presets.map((p, idx) => (
                  <div
                    key={p.id}
                    className="group flex items-center gap-1 px-2 py-1.5 border-b border-eva-line-soft/50 last:border-0 hover:bg-[#7c3678] text-left group"
                  >
                    {/* 順序調整 ↑↓ */}
                    {renamingId === p.id ? null : (
                      <div
                        className="flex flex-col shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => movePreset(p.id, -1)}
                          disabled={idx === 0}
                          className="p-px text-eva-ink-dim hover:text-eva-green transition-colors disabled:opacity-20 disabled:hover:text-eva-ink-dim leading-none"
                          title="上へ"
                        >
                          <FiChevronUp size={11} />
                        </button>
                        <button
                          onClick={() => movePreset(p.id, 1)}
                          disabled={idx === presets.length - 1}
                          className="p-1px text-eva-ink-dim hover:text-eva-green transition-colors disabled:opacity-20 disabled:hover:text-eva-ink-dim leading-none"
                          title="下へ"
                        >
                          <FiChevronDown size={11} />
                        </button>
                      </div>
                    )}

                    {renamingId === p.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={commitRename}
                        className="ev-input flex-1 rounded-sm px-1.5 py-0.5 text-[11px]"
                      />
                    ) : (
                      <span className="flex-1 min-w-0 truncate text-[12px] text-[#582e4b] group-hover:text-[#eac5ef]">
                        {p.name}
                        <span className="ml-1 font-mono text-[9px] text-eva-ink-dim">
                          ({p.entries.length})
                        </span>
                      </span>
                    )}

                    {renamingId === p.id ? null : (
                      <>
                        {/* 復元：確認ダイアログを挟む */}
                        <button
                          onClick={(e) =>
                            onApplyPreset(e, p.id, p.name, p.entries.length)
                          }
                          className="p-0.5 text-eva-green-soft hover:text-eva-green transition-colors opacity-0 group-hover:opacity-100"
                          title="この組み合わせを復元"
                        >
                          <FiCheck size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(p.id, p.name);
                          }}
                          className="p-0.5 text-eva-ink-dim hover:text-eva-green transition-colors opacity-0 group-hover:opacity-100"
                          title="リネーム"
                        >
                          <FiEdit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => onDeletePreset(e, p.id, p.name)}
                          className="p-0.5 text-eva-ink-dim hover:text-eva-magenta transition-colors opacity-0 group-hover:opacity-100"
                          title="削除"
                        >
                          <FiTrash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 overflow-x-hidden">
        <AnimatePresence initial={false}>
          {selectedRefs.map((ref, i) => {
            const strength = clampStrength(ref.word.strength ?? 0);
            const preview = formatWordWithStrength(ref.word.text, strength);
            return (
              <motion.div
                key={ref.word.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(ref.word.id, el);
                  else rowRefs.current.delete(ref.word.id);
                }}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                onClick={() => deselectWord(ref.groupId, ref.word.id)}
                className="sel-row group w-full flex items-center gap-2 px-1.5 py-1 rounded-sm border border-eva-line-soft hover:border-eva-magenta bg-eva-bg-panel-2/60 mb-1 text-left cursor-pointer"
                title="クリックで選択解除"
              >
                <span className="font-mono text-[9px] text-eva-purple-bright w-4 text-left shrink-0">
                  {i + 1}
                </span>
                <span
                  className="flex-1 min-w-0 truncate text-[12px] text-eva-green-soft"
                  title={preview}
                >
                  {ref.word.text}
                </span>

                {/* 強度ステッパー：クリック伝播を止めて選択解除を防ぐ */}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      setWordStrength(
                        ref.groupId,
                        ref.word.id,
                        clampStrength(strength - 1),
                      )
                    }
                    disabled={strength <= 0}
                    className="p-0.5 rounded-sm text-eva-ink-dim hover:text-eva-magenta hover:bg-eva-bg-panel/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="強度を下げる"
                  >
                    <FiMinus size={10} />
                  </button>
                  <span
                    className={`font-mono text-[9px] w-5 text-center tabular-nums ${
                      strength > 0 ? "text-eva-magenta" : "text-eva-ink-dim"
                    }`}
                    title={`強度 ${strength} / ${MAX_STRENGTH}\n→ ${preview}`}
                  >
                    {strength}
                  </span>
                  <button
                    onClick={() =>
                      setWordStrength(
                        ref.groupId,
                        ref.word.id,
                        clampStrength(strength + 1),
                      )
                    }
                    disabled={strength >= MAX_STRENGTH}
                    className="p-0.5 rounded-sm text-eva-ink-dim hover:text-eva-magenta hover:bg-eva-bg-panel/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="強度を上げる"
                  >
                    <FiPlus size={10} />
                  </button>
                </div>

                <FiX
                  size={11}
                  className="text-eva-ink-dim group-hover:text-eva-magenta transition-colors shrink-0"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {selectedRefs.length === 0 && (
          <div className="text-eva-ink-dim italic font-garamond text-[12px] px-1 pt-2">
            選択中のワードはありません。
          </div>
        )}
      </div>
    </section>
  );
}
