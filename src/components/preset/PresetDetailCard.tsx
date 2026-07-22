// プリセット 3D 詳細カード（表面=画像 / 裏面=メタ情報）
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { FiCheck, FiEdit2, FiRotateCw } from "react-icons/fi";
import type { PromptPreset } from "@/types";
import { formatWordWithStrength } from "@/lib/strength";

export function PresetDetailCard({
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
    // 3D 傾きのみ（光エフェクトなし）／表面・裏面共通
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
          onClick={() => setFlipped((f) => !f)}
          animate={{
            rotateX: tilt.rx,
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
              // 裏面表示中は表面のヒット判定を完全に無効化（還元ボタン誤作動防止）
              pointerEvents: flipped ? "none" : "auto",
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply();
                }}
                className="p-1.5 rounded-sm border border-eva-green/50 bg-black/55 text-eva-green hover:bg-eva-green/20 hover:shadow-glow-green transition-all"
                title="還元"
              >
                <FiCheck size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 rounded-sm border border-eva-line bg-black/55 text-eva-ink-dim hover:text-eva-green transition-colors"
                title="編集"
              >
                <FiEdit2 size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(true);
                }}
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
              // 裏面表示中は表面のヒット判定を完全に無効化（還元ボタン誤作動防止）
              pointerEvents: !flipped ? "none" : "auto",
            }}
          >
            <div className="relative h-full flex flex-col p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="font-cinzel tracking-widest text-[11px] text-eva-green">
                  DETAILS
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlipped(false);
                  }}
                  className="p-1.5 min-w-8 min-h-8 inline-flex items-center justify-center rounded-sm border border-eva-line bg-black/55 text-eva-ink-dim hover:text-eva-lavender hover:border-eva-lilac/50 transition-colors"
                  title="表面に戻る"
                  aria-label="表面に戻る"
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
