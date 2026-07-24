// 時計の指針型ロードマップ / ClockDial
// WORDS ラベルから起動。マウスの動きに合わせて針が回転し、
// クリックで該当グループへスクロール（閉じていれば祖先ごと自動展開）。
import { useMemo } from "react";
import { motion } from "motion/react";
import { usePrompt } from "@/context/PromptContext";
import { collectAllGroups } from "@/lib/tree";
import { fadeInOutSpring } from "@/lib/motions";
import { CLIP_DODECAGON, NAV_PANEL } from "@/components/clock/constants";
import { MagicCircleDecor } from "@/components/clock/MagicCircleDecor";
import { DialFace } from "@/components/clock/DialFace";
import { ActiveGroupLabel } from "@/components/clock/ActiveGroupLabel";
import { useClockJump } from "@/hooks/useClockJump";
import { useClockDial } from "@/hooks/useClockDial";

interface ClockDialProps {
  onClose: () => void;
}

export function ClockDial({ onClose }: ClockDialProps) {
  const { state, expandGroupPath } = usePrompt();
  const groups = useMemo(() => collectAllGroups(state), [state]);
  const jumpTo = useClockJump(expandGroupPath, onClose);
  const dial = useClockDial({ groups, onJump: jumpTo });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        variants={fadeInOutSpring(0.4, 40, 1)}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center justify-around select-none rounded-full overflow-hidden"
        style={{
          width: NAV_PANEL,
          height: NAV_PANEL,
          // clip-path で box-shadow が切り抜かれるため、十二角形形状に追従する drop-shadow でグローを表現
          filter: "drop-shadow(0 0 16px rgba(180,120,255,0.55))",
        }}
      >
        {/* 背景: 正十二角形でクリップしたパネル */}
        <div
          className="absolute inset-0 bg-eva-bg-panel-2/95"
          style={{ clipPath: CLIP_DODECAGON }}
        />

        <MagicCircleDecor />

        <div className="relative font-cinzel-deco tracking-[0.15em] text-[10px] text-eva-green glow-text flex flex-col items-center justify-center h-7 mt-2.5">
          ◇ NAVIGATION ◇
          <span className="relative font-mono text-[8px] text-eva-ink-dim tracking-widest">
            マウスで合わせ・クリックでジャンプ
          </span>
        </div>

        <DialFace groups={groups} dial={dial} />

        <ActiveGroupLabel active={dial.active} />
      </motion.div>
    </motion.div>
  );
}
