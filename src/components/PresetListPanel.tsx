// プリセット一覧パネル / PresetListPanel
// 全画面スライドイン + 正六角形ハニカム + Motion DnD 並替 + 3Dカード詳細
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  FiCheck,
  FiEdit2,
  FiLayers,
  FiRefreshCw,
  FiRotateCw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { usePrompt } from "@/context/PromptContext";
import { useConfirm } from "./ConfirmDialog";
import { usePresetForm } from "./PresetFormModal";
import type { PromptPreset } from "@/types";
import type { PresetApplyReport, PresetUpdateDiff } from "@/lib/tree";
import { formatWordWithStrength } from "@/lib/strength";

/** 配列内で fromIndex の要素を toIndex へ移動する。 */
function moveItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return list;
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const next = list.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

const DRAG_THRESHOLD_PX = 5;

// ============================================================
// Context
// ============================================================

interface PresetListValue {
  open: () => void;
  close: () => void;
}

const PresetListContext = createContext<PresetListValue | null>(null);

export function PresetListProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <PresetListContext value={value}>
      {children}
      <AnimatePresence>{visible && <PresetListPanel onClose={close} />}</AnimatePresence>
    </PresetListContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePresetList(): PresetListValue {
  const ctx = useContext(PresetListContext);
  if (!ctx) throw new Error("usePresetList must be used within PresetListProvider");
  return ctx;
}

// ============================================================
// Panel
// ============================================================

function PresetListPanel({ onClose }: { onClose: () => void }) {
  const {
    state,
    applyPreset,
    deletePreset,
    reorderPresets,
    updatePresetEntries,
    analyzePresetApply,
    diffPresetEntries,
    selectedRefs,
  } = usePrompt();
  const confirm = useConfirm();
  const { openEdit } = usePresetForm();
  const presets = state.presets ?? [];

  const [order, setOrder] = useState(() => presets.map((p) => p.id));
  const [detailId, setDetailId] = useState<string | null>(null);

  // Motion ポインター DnD
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [ghostSize, setGhostSize] = useState({ w: 148, h: 128 });
  const orderRef = useRef(order);
  const dragIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** ポインター起点（しきい値判定用） */
  const pointerOrigin = useRef<{ x: number; y: number; id: string } | null>(null);
  const activePointerId = useRef<number | null>(null);

  // ゴースト位置（ビューポート座標・中心）
  const ghostX = useMotionValue(0);
  const ghostY = useMotionValue(0);
  const springX = useSpring(ghostX, { stiffness: 520, damping: 38, mass: 0.55 });
  const springY = useSpring(ghostY, { stiffness: 520, damping: 38, mass: 0.55 });
  const dragOriginX = useMotionValue(0);
  const ghostRotate = useTransform([springX, dragOriginX], ([x, ox]: number[]) =>
    Math.max(-10, Math.min(10, (x - ox) * 0.04)),
  );

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  // 外部からの presets 変更に追随
  useEffect(() => {
    const ids = presets.map((p) => p.id);
    setOrder((prev) => {
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [presets]);

  const byId = useMemo(() => new Map(presets.map((p) => [p.id, p])), [presets]);
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as PromptPreset[];

  const setCellRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cellRefs.current.set(id, el);
    else cellRefs.current.delete(id);
  }, []);

  /** ポインター下の六角 id をヒットテスト（ドラッグ中セルは除外） */
  const hitTest = useCallback((clientX: number, clientY: number, excludeId: string) => {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
      const cell = (el as HTMLElement).closest?.("[data-hex-id]") as HTMLElement | null;
      if (!cell) continue;
      const id = cell.dataset.hexId;
      if (!id || id === excludeId) continue;
      return id;
    }
    return null;
  }, []);

  const liveReorderTo = useCallback((targetId: string) => {
    const fromId = dragIdRef.current;
    if (!fromId || fromId === targetId) return;
    setOrder((prev) => {
      const from = prev.indexOf(fromId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      return moveItem(prev, from, to);
    });
    overIdRef.current = targetId;
    setOverId(targetId);
  }, []);

  const endDrag = useCallback(
    (commit: boolean) => {
      const id = dragIdRef.current;
      if (commit && id) {
        reorderPresets(orderRef.current);
      }
      dragIdRef.current = null;
      overIdRef.current = null;
      pointerOrigin.current = null;
      activePointerId.current = null;
      setDragId(null);
      setOverId(null);
      if (id) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 100);
      }
    },
    [reorderPresets],
  );

  // Esc で閉じる / ドラッグ中断
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailId) {
        setDetailId(null);
        return;
      }
      if (dragIdRef.current) {
        endDrag(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, detailId, endDrag]);

  // グローバル pointer 追跡（ドラッグ中）
  useEffect(() => {
    if (!dragId) return;

    const onMove = (e: PointerEvent) => {
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      ghostX.set(e.clientX);
      ghostY.set(e.clientY);
      const hit = hitTest(e.clientX, e.clientY, dragId);
      if (hit && hit !== overIdRef.current) {
        liveReorderTo(hit);
      } else if (!hit && overIdRef.current) {
        overIdRef.current = null;
        setOverId(null);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      endDrag(true);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragId, ghostX, ghostY, hitTest, liveReorderTo, endDrag]);

  // しきい値前の pointer 監視（ドラッグ開始判定）
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const origin = pointerOrigin.current;
      if (!origin || dragIdRef.current) return;
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;

      const el = cellRefs.current.get(origin.id);
      if (el) {
        const r = el.getBoundingClientRect();
        setGhostSize({ w: r.width, h: r.height });
      }
      dragIdRef.current = origin.id;
      dragOriginX.set(e.clientX);
      setDragId(origin.id);
      ghostX.set(e.clientX);
      ghostY.set(e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current != null && e.pointerId !== activePointerId.current) {
        return;
      }
      // しきい値未満 = クリック扱い
      pointerOrigin.current = null;
      activePointerId.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ghostX, ghostY, dragOriginX]);

  const onTilePointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button")) return;
      if (detailId) return;
      e.preventDefault();
      activePointerId.current = e.pointerId;
      pointerOrigin.current = { x: e.clientX, y: e.clientY, id };
    },
    [detailId],
  );

  const onTileOpenDetail = useCallback((id: string) => {
    if (suppressClickRef.current || dragIdRef.current) return;
    setDetailId(id);
  }, []);

  // ---- 還元 ----
  const onApply = async (p: PromptPreset) => {
    const report = analyzePresetApply(p.id);
    let message = `プリセット「${p.name}」（${p.entries.length} pt）を還元しますか？\n現在の選択状態は置き換えられます。`;
    if (report) {
      const warnings: string[] = [];
      if (report.missing.length > 0) {
        warnings.push(
          `・消失したワード ${report.missing.length} 件（ツリーに id がありません）:\n` +
            report.missing
              .slice(0, 5)
              .map((e) => `  - ${e.text || "(空)"}`)
              .join("\n") +
            (report.missing.length > 5 ? `\n  …他 ${report.missing.length - 5} 件` : ""),
        );
      }
      if (report.textChanged.length > 0) {
        warnings.push(
          `・テキストが変更されたワード ${report.textChanged.length} 件:\n` +
            report.textChanged
              .slice(0, 5)
              .map((t) => `  - 「${t.savedText}」→「${t.currentText}」`)
              .join("\n") +
            (report.textChanged.length > 5
              ? `\n  …他 ${report.textChanged.length - 5} 件`
              : ""),
        );
      }
      if (warnings.length > 0) {
        message +=
          `\n\n⚠ 注意（還元は id 基準・text は復元しません）:\n` + warnings.join("\n");
      }
      message += `\n\n適用可能: ${report.applied} / ${report.total}`;
    }

    const ok = await confirm({
      title: "PRESET RESTORE",
      message,
      confirmLabel: "還元",
      cancelLabel: "キャンセル",
      danger: true,
    });
    if (ok) {
      applyPreset(p.id);
      onClose();
    }
  };

  // ---- 更新（ワード情報） ----
  const onUpdateEntries = async (p: PromptPreset) => {
    if (selectedRefs.length === 0) {
      await confirm({
        title: "PRESET UPDATE",
        message: "現在選択中のワードがありません。更新できません。",
        confirmLabel: "OK",
        cancelLabel: "閉じる",
      });
      return;
    }
    const diff = diffPresetEntries(p.id);
    if (!diff) return;

    if (!diff.hasChanges) {
      await confirm({
        title: "PRESET UPDATE",
        message: "現在の選択とプリセットのワード情報は同一です。更新の必要はありません。",
        confirmLabel: "OK",
        cancelLabel: "閉じる",
      });
      return;
    }

    const message = formatUpdateDiffMessage(p.name, diff);
    const ok = await confirm({
      title: "PRESET UPDATE",
      message,
      confirmLabel: "更新する",
      cancelLabel: "キャンセル",
      danger: true,
    });
    if (ok) updatePresetEntries(p.id);
  };

  // ---- 削除 ----
  const onDelete = async (p: PromptPreset) => {
    const ok = await confirm({
      title: "PRESET DELETE",
      message: `プリセット「${p.name}」を削除しますか？`,
      confirmLabel: "削除",
      cancelLabel: "キャンセル",
      danger: true,
    });
    if (ok) {
      if (detailId === p.id) setDetailId(null);
      deletePreset(p.id);
    }
  };

  const detail = detailId ? byId.get(detailId) : null;
  const dragPreset = dragId ? byId.get(dragId) : null;
  const isDragging = !!dragId;

  return (
    <>
      {/* 背景オーバーレイ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-80 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 右からスライドする全画面パネル */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-0 z-90 flex flex-col bg-eva-bg-void/95 border-l border-eva-line shadow-glow-purple"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダ */}
        <header className="flex items-center gap-2 px-3 py-2 border-b border-eva-line shrink-0 bg-eva-bg-panel/60">
          <FiLayers size={14} className="text-eva-green" />
          <h2 className="font-cinzel-deco tracking-[0.18em] text-[12px] text-eva-green glow-text">
            PRESETS
          </h2>
          <span className="font-mono text-[10px] text-eva-ink-dim">
            {presets.length} items
          </span>
          <div className="flex-1" />
          <span className="font-mono text-[9px] text-eva-ink-dim/70 hidden sm:inline">
            ドラッグで並替 · クリックで詳細
          </span>
          <button
            onClick={onClose}
            className="p-1 text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="閉じる"
          >
            <FiX size={15} />
          </button>
        </header>

        {/* 正六角形ハニカム */}
        <div
          className={[
            "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
            isDragging ? "hex-grid-dragging" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {ordered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-eva-ink-dim italic text-[13px] font-garamond px-4">
              プリセットはありません。SELECTED のブックマークから保存してください。
            </div>
          ) : (
            <LayoutGroup id="preset-hex-grid">
              <div className="hex-grid">
                {ordered.map((p) => (
                  <PresetHexTile
                    key={p.id}
                    preset={p}
                    isDragging={dragId === p.id}
                    isOver={overId === p.id && dragId !== p.id}
                    isAnyDragging={isDragging}
                    setCellRef={setCellRef}
                    onApply={() => void onApply(p)}
                    onEdit={() => openEdit(p)}
                    onUpdate={() => void onUpdateEntries(p)}
                    onDelete={() => void onDelete(p)}
                    onOpenDetail={() => onTileOpenDetail(p.id)}
                    onPointerDown={(e) => onTilePointerDown(p.id, e)}
                  />
                ))}
              </div>
            </LayoutGroup>
          )}
        </div>
      </motion.div>

      {/* ドラッグ中フローティング・ゴースト */}
      <AnimatePresence>
        {dragPreset && (
          <HexDragGhost
            preset={dragPreset}
            x={springX}
            y={springY}
            rotate={ghostRotate}
            width={ghostSize.w}
            height={ghostSize.h}
          />
        )}
      </AnimatePresence>

      {/* 3D 詳細カード */}
      <AnimatePresence>
        {detail && (
          <PresetDetailCard
            preset={detail}
            onClose={() => setDetailId(null)}
            onApply={() => void onApply(detail)}
            onEdit={() => {
              openEdit(detail);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// ドラッグゴースト（ポインター追従）
// ============================================================

function HexDragGhost({
  preset,
  x,
  y,
  rotate,
  width,
  height,
}: {
  preset: PromptPreset;
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  width: number;
  height: number;
}) {
  return (
    <motion.div
      className="hex-ghost pointer-events-none fixed z-110 left-0 top-0"
      style={{
        width,
        height,
        x,
        y,
        rotate,
        translateX: "-50%",
        translateY: "-50%",
      }}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1.12, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <div className="hex-ghost-ring" aria-hidden />
      <div className="hex-ghost-inner">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={
            preset.image
              ? { backgroundImage: `url(${preset.image})` }
              : { background: "var(--color-eva-bg-panel-2)" }
          }
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-black/10" />
        <div className="absolute inset-x-[16%] top-1/2 -translate-y-1/2 text-center">
          <div className="font-cinzel text-[12px] text-eva-ink line-clamp-2 drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">
            {preset.name}
          </div>
          <div className="mt-0.5 font-mono text-[9px] text-eva-green-soft">
            {preset.entries.length} pt
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 正六角形タイル
// ============================================================

function PresetHexTile({
  preset,
  isDragging,
  isOver,
  isAnyDragging,
  setCellRef,
  onApply,
  onEdit,
  onUpdate,
  onDelete,
  onOpenDetail,
  onPointerDown,
}: {
  preset: PromptPreset;
  isDragging: boolean;
  isOver: boolean;
  isAnyDragging: boolean;
  setCellRef: (id: string, el: HTMLElement | null) => void;
  onApply: () => void;
  onEdit: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <motion.div
      layout
      layoutId={`hex-${preset.id}`}
      data-hex-id={preset.id}
      ref={(el) => setCellRef(preset.id, el)}
      transition={{
        layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
      }}
      animate={
        isDragging
          ? { scale: 0.92, opacity: 0.35 }
          : isOver
            ? { scale: 1.06, opacity: 1 }
            : { scale: 1, opacity: 1 }
      }
      whileHover={
        isAnyDragging
          ? undefined
          : {
              scale: 1.04,
              transition: { type: "spring", stiffness: 400, damping: 22 },
            }
      }
      whileTap={isAnyDragging ? undefined : { scale: 0.97 }}
      className={[
        "hex-cell list-none cursor-grab active:cursor-grabbing group select-none touch-none",
        isDragging ? "hex-cell-dragging" : "",
        isOver ? "hex-cell-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onOpenDetail();
      }}
    >
      <div className="hex-ring" aria-hidden />

      <div className="hex-inner">
        <div
          className="absolute inset-0 bg-eva-bg-panel-2 bg-cover bg-center"
          style={preset.image ? { backgroundImage: `url(${preset.image})` } : undefined}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/25" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-[18%] left-[18%] z-10 p-1 rounded-full border border-eva-green/50 bg-black/60 text-eva-green opacity-0 group-hover:opacity-100 transition-opacity hover:bg-eva-green/25 hover:shadow-glow-green"
          title="還元"
        >
          <FiCheck size={11} />
        </button>

        {preset.baseModelKind && (
          <span
            className="absolute top-[16%] right-[14%] z-10 max-w-[42%] truncate px-1 py-px rounded-sm border border-eva-lilac/40 bg-black/55 font-mono text-[8px] text-eva-lavender tracking-wide"
            title={preset.baseModelKind}
          >
            {preset.baseModelKind}
          </span>
        )}

        <div className="absolute inset-x-[18%] top-1/2 translate-y-[-42%] z-10 text-center pointer-events-none">
          <div
            className="font-cinzel text-[11px] leading-tight text-eva-ink line-clamp-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
            title={preset.name}
          >
            {preset.name}
          </div>
          <div className="mt-0.5 font-mono text-[8px] text-eva-ink-dim truncate">
            {preset.entries.length} pt
          </div>
        </div>

        <div className="absolute inset-x-[20%] bottom-[14%] z-10 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-full bg-black/55 text-eva-ink-dim hover:text-eva-green transition-colors"
            title="編集"
          >
            <FiEdit2 size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-full bg-black/55 text-eva-ink-dim hover:text-eva-amber transition-colors"
            title="ワード情報を現在の選択で更新"
          >
            <FiRefreshCw size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-full bg-black/55 text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="削除"
          >
            <FiTrash2 size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 3D Detail Card
// ============================================================

function PresetDetailCard({
  preset,
  onClose,
  onApply,
  onEdit,
}: {
  preset: PromptPreset;
  onClose: () => void;
  onApply: () => void;
  onEdit: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // 3D 傾きのみ（光エフェクトなし）
    setTilt({
      rx: (0.5 - py) * 22,
      ry: (px - 0.5) * 28,
    });
  };

  const onLeave = () => setTilt({ rx: 0, ry: 0 });
  const meta = preset.metadata;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="relative"
        style={{ perspective: "1200px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          ref={cardRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onContextMenu={(e) => {
            e.preventDefault();
            setFlipped((f) => !f);
          }}
          animate={{
            rotateX: flipped ? 0 : tilt.rx,
            rotateY: flipped ? 180 + tilt.ry : tilt.ry,
            scale: 1,
          }}
          transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.7 }}
          style={{
            transformStyle: "preserve-3d",
            width: 340,
            height: 560,
          }}
          className="relative"
        >
          {/* ===== 表面 ===== */}
          <div
            className="absolute inset-0 rounded-md overflow-hidden border border-eva-lilac/40 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div
              className="absolute inset-0 bg-eva-bg-panel-2 bg-cover bg-center"
              style={
                preset.image ? { backgroundImage: `url(${preset.image})` } : undefined
              }
            />
            {/* 下部テキスト可読性のみ確保（画像中央は遮らない） */}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

            {preset.baseModelKind && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-sm border border-eva-lilac/50 bg-black/50 font-mono text-[10px] text-eva-lavender tracking-widest">
                {preset.baseModelKind}
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="font-cinzel-deco text-[18px] text-eva-ink tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {preset.name}
              </div>
              <div className="mt-1 font-mono text-[11px] text-eva-green-soft/90">
                {preset.entries.length} words
                {preset.baseModel ? ` · ${preset.baseModel}` : ""}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-eva-ink-dim">
                {meta.width}×{meta.height} · steps {meta.steps} · cfg {meta.cfg}
              </div>
            </div>

            <div className="absolute top-3 left-3 flex gap-1.5">
              <button
                onClick={onApply}
                className="p-1.5 rounded-sm border border-eva-green/50 bg-black/55 text-eva-green hover:bg-eva-green/20 hover:shadow-glow-green transition-all"
                title="還元"
              >
                <FiCheck size={13} />
              </button>
              <button
                onClick={onEdit}
                className="p-1.5 rounded-sm border border-eva-line bg-black/55 text-eva-ink-dim hover:text-eva-green transition-colors"
                title="編集"
              >
                <FiEdit2 size={13} />
              </button>
              <button
                onClick={() => setFlipped(true)}
                className="p-1.5 rounded-sm border border-eva-line bg-black/55 text-eva-ink-dim hover:text-eva-lavender transition-colors"
                title="裏面を表示（右クリックでも可）"
              >
                <FiRotateCw size={13} />
              </button>
            </div>
          </div>

          {/* ===== 裏面 ===== */}
          <div
            className="absolute inset-0 rounded-md overflow-hidden border border-eva-lilac/40 bg-eva-bg-panel-2 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="relative h-full flex flex-col p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="font-cinzel tracking-widest text-[11px] text-eva-green">
                  DETAILS
                </span>
                <button
                  onClick={() => setFlipped(false)}
                  className="p-1 text-eva-ink-dim hover:text-eva-lavender transition-colors"
                  title="表面に戻る"
                >
                  <FiRotateCw size={13} />
                </button>
              </div>

              <DetailRow label="NAME" value={preset.name} />
              <DetailRow label="BASE MODEL" value={preset.baseModel || "—"} />
              <DetailRow label="KIND" value={preset.baseModelKind || "—"} />

              <SectionTitle>METADATA</SectionTitle>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
                <DetailRow label="Steps" value={String(meta.steps)} compact />
                <DetailRow label="CFG" value={String(meta.cfg)} compact />
                <DetailRow label="Sampler" value={meta.sampler || "—"} compact />
                <DetailRow label="Scheduler" value={meta.scheduler || "—"} compact />
                <DetailRow label="Width" value={String(meta.width)} compact />
                <DetailRow label="Height" value={String(meta.height)} compact />
              </div>

              <SectionTitle>LoRAs</SectionTitle>
              <ModelList list={preset.loras} />

              <SectionTitle>ControlNets</SectionTitle>
              <ModelList list={preset.controlNets} />

              {preset.description && (
                <>
                  <SectionTitle>DESCRIPTION</SectionTitle>
                  <p className="text-[11px] text-eva-ink/85 whitespace-pre-wrap leading-relaxed mb-2">
                    {preset.description}
                  </p>
                </>
              )}

              <SectionTitle>
                <div className="flex items-center justify-between">
                  <span>WORDS</span>
                  <span className="font-mono text-[9px] text-eva-ink-dim">
                    {preset.entries.length} entries
                  </span>
                </div>
              </SectionTitle>
              <div className="space-y-0.5 max-h-28 w-full overflow-y-auto overflow-x-hidden">
                <div className="font-mono text-[10px] text-eva-green-soft/90 w-full">
                  {preset.entries
                    .slice(0, 40)
                    .map((e) => formatWordWithStrength(e.text, e.strength))
                    .join(", ")}
                </div>
                {preset.entries.length > 40 && (
                  <div className="text-[10px] text-eva-ink-dim">
                    …他 {preset.entries.length - 40} 件
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="absolute -bottom-8 inset-x-0 text-center font-mono text-[9px] text-eva-ink-dim/70">
          右クリック / 回転ボタンで裏面 · Esc / 背景クリックで閉じる
        </div>
      </div>
    </motion.div>
  );
}

function DetailRow({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mb-0.5" : "mb-1.5"}>
      <div className="font-mono text-[8px] tracking-widest text-eva-ink-dim/70">
        {label}
      </div>
      <div className="text-[11px] text-eva-ink truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[9px] tracking-[0.2em] text-eva-lilac mt-2 mb-1 border-b border-eva-line-soft pb-0.5">
      {children}
    </div>
  );
}

function ModelList({ list }: { list?: Array<{ model: string; strength: number }> }) {
  if (!list || list.length === 0) {
    return <p className="text-[10px] text-eva-ink-dim/60 italic mb-1">なし</p>;
  }
  return (
    <ul className="mb-1 space-y-0.5">
      {list.map((m, i) => (
        <li
          key={i}
          className="font-mono text-[10px] text-eva-ink flex justify-between gap-2"
        >
          <span className="truncate">{m.model}</span>
          <span className="text-eva-ink-dim shrink-0">{m.strength}</span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// Diff message
// ============================================================

function formatUpdateDiffMessage(name: string, diff: PresetUpdateDiff): string {
  const lines: string[] = [
    `プリセット「${name}」のワード情報を現在の選択で更新します。`,
    "",
  ];

  if (diff.added.length > 0) {
    lines.push(`＋ 追加 ${diff.added.length} 件:`);
    for (const e of diff.added.slice(0, 6)) {
      lines.push(`  + ${e.text || "(空)"} (str ${e.strength})`);
    }
    if (diff.added.length > 6) lines.push(`  …他 ${diff.added.length - 6} 件`);
  }
  if (diff.removed.length > 0) {
    lines.push(`− 削除 ${diff.removed.length} 件:`);
    for (const e of diff.removed.slice(0, 6)) {
      lines.push(`  - ${e.text || "(空)"} (str ${e.strength})`);
    }
    if (diff.removed.length > 6) lines.push(`  …他 ${diff.removed.length - 6} 件`);
  }
  if (diff.strengthChanged.length > 0) {
    lines.push(`△ 強度変化 ${diff.strengthChanged.length} 件:`);
    for (const e of diff.strengthChanged.slice(0, 6)) {
      lines.push(`  ~ ${e.text || "(空)"} : ${e.from} → ${e.to}`);
    }
    if (diff.strengthChanged.length > 6)
      lines.push(`  …他 ${diff.strengthChanged.length - 6} 件`);
  }
  if (diff.textChanged.length > 0) {
    lines.push(`✎ テキスト変化 ${diff.textChanged.length} 件（保存テキストを更新）:`);
    for (const e of diff.textChanged.slice(0, 6)) {
      lines.push(`  ~ 「${e.savedText}」→「${e.currentText}」`);
    }
    if (diff.textChanged.length > 6)
      lines.push(`  …他 ${diff.textChanged.length - 6} 件`);
  }

  lines.push("", "よろしいですか？");
  return lines.join("\n");
}

export type { PresetApplyReport, PresetUpdateDiff };
