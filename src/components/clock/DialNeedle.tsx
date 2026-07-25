// 時計ダイヤルの針 + 中心軸 + 中心ラベル
import { motion } from "motion/react";
import type { GroupRef } from "@/lib/tree";

interface DialNeedleProps {
  angle: number;
  length: number;
  active: GroupRef | null;
}

export function DialNeedle({ angle, length, active }: DialNeedleProps) {
  return (
    <>
      {/* 針（指針1本）：下端をダイヤル中心に合わせ、指す層の半径に長さを追従 */}
      <motion.div
        className="absolute left-1/2"
        animate={{ rotate: angle, height: length, marginTop: -length }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{
          top: "50%",
          width: 2,
          marginLeft: -1,
          transformOrigin: "bottom center",
          background:
            "linear-gradient(to top, rgba(57,255,20,0.15), var(--color-eva-green))",
          boxShadow: "0 0 8px rgba(57,255,20,0.6)",
        }}
      />
      {/* 中心軸 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-eva-green shadow-glow-green" />
      {active && (
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-nowrap mt-7 font-cinzel tracking-widest text-[13px] transition-all ${
            active.depth % 2 === 0 ? "text-eva-green" : "text-eva-lavender"
          }`}
        >
          {active.name}
        </div>
      )}
    </>
  );
}
