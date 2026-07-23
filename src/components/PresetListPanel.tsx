// プリセット一覧パネル / PresetListPanel
// 全画面スライドイン + 正六角形ハニカム + Motion DnD 並替 + 3Dカード詳細
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { FiLayers, FiX } from "react-icons/fi";
import { usePrompt } from "@/context/PromptContext";
import { usePresetForm } from "@/context/PresetFormContext";
import { HexDragGhost } from "./preset/HexDragGhost";
import { PresetDetailCard } from "./preset/PresetDetailCard";
import { PresetHexTile } from "./preset/PresetHexTile";
import { usePresetHexDnD } from "@/hooks/usePresetHexDnD";
import { usePresetListActions } from "@/hooks/usePresetListActions";
import type { PromptPreset } from "@/types";

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
  const { state, reorderPresets } = usePrompt();
  const { openEdit } = usePresetForm();
  const presets = useMemo(() => state.presets ?? [], [state.presets]);
  const presetIds = useMemo(() => presets.map((p) => p.id), [presets]);

  const [detailId, setDetailId] = useState<string | null>(null);

  const {
    order,
    dragId,
    overId,
    isDragging,
    ghostSize,
    springX,
    springY,
    ghostRotate,
    setCellRef,
    onTilePointerDown,
    shouldOpenDetail,
    endDrag,
  } = usePresetHexDnD(reorderPresets, !!detailId, presetIds);

  const { onApply, onUpdateEntries, onDelete } = usePresetListActions({
    detailId,
    setDetailId,
    onApplied: onClose,
  });

  const byId = useMemo(() => new Map(presets.map((p) => [p.id, p])), [presets]);
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as PromptPreset[];

  const onTileOpenDetail = useCallback(
    (id: string) => {
      if (!shouldOpenDetail()) return;
      setDetailId(id);
    },
    [shouldOpenDetail],
  );

  // Esc で閉じる / ドラッグ中断
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailId) {
        setDetailId(null);
        return;
      }
      if (dragId) {
        endDrag(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, detailId, dragId, endDrag]);

  const detail = detailId ? byId.get(detailId) : null;
  const dragPreset = dragId ? byId.get(dragId) : null;

  return (
    <>
      {/* 背景オーバーレイ */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-80 bg-eva-claret/50 backdrop-blur-[2px] bg-[url(/images/PresetPanelBg.png)] bg-no-repeat bg-center bg-contain"
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
