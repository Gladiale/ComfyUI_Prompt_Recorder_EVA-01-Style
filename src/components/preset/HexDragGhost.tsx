// ドラッグ中フローティング・ゴースト（ポインター追従）
import { motion, type MotionValue } from "motion/react";
import type { PromptPreset } from "@/types";

export function HexDragGhost({
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
