// 時計ダイヤル本体：同心円リング + マーカー + 針
import { usePrompt } from "@/context/PromptContext";
import {
  countSelectedWordsInGroup,
  findGroup,
  type GroupRef,
} from "@/lib/tree";
import { DIAL_SIZE, R_OUTER } from "@/components/clock/constants";
import { DialMarker } from "@/components/clock/DialMarker";
import { DialNeedle } from "@/components/clock/DialNeedle";
import type { UseClockDialResult } from "@/hooks/useClockDial";

interface DialFaceProps {
  groups: GroupRef[];
  dial: UseClockDialResult;
}

export function DialFace({ groups, dial }: DialFaceProps) {
  const { state } = usePrompt();
  const {
    dialRef,
    N,
    step,
    maxLayer,
    ringGap,
    needleAngle,
    activeIdx,
    active,
    handLen,
    radiusOfDepth,
    onPointerMove,
    onClick,
  } = dial;

  if (N <= 0) {
    return (
      <div
        className="flex items-center justify-center text-eva-ink-dim italic font-garamond text-[13px]"
        style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
      >
        グループがありません。
      </div>
    );
  }

  return (
    <div
      ref={dialRef}
      onPointerMove={onPointerMove}
      onClick={onClick}
      className="relative touch-none cursor-crosshair"
      style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
    >
      {/* 階層リング（同心円）：各層の境界を視覚化。層間の一本線。 */}
      {Array.from({ length: maxLayer + 1 }).map((_, k) => {
        const r = R_OUTER - k * ringGap;
        return (
          <div
            key={k}
            className="absolute left-1/2 top-1/2 rounded-full border border-eva-purple/25"
            style={{
              width: r * 2,
              height: r * 2,
              marginLeft: -r,
              marginTop: -r,
            }}
          />
        );
      })}
      {/* 12時基準マーカー */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-3 bg-eva-green/60" />

      {/* インデックス：各層の半径に配置。親(depth偶数)=緑の正六角形、子(depth奇数)=紫の円 */}
      {groups.map((g, i) => {
        const groupObj = findGroup(state, g.id);
        const selectedCount = groupObj
          ? countSelectedWordsInGroup(groupObj)
          : 0;
        return (
          <DialMarker
            key={g.id}
            group={g}
            angle={i * step}
            radius={radiusOfDepth(g.depth)}
            isActive={i === activeIdx}
            selectedCount={selectedCount}
          />
        );
      })}

      <DialNeedle angle={needleAngle} length={handLen} active={active} />
    </div>
  );
}
