// 時計ダイヤル上のグループマーカー（親=緑六角 / 子=紫円）
import { HEX_POLYGON_POINTS } from "@/components/clock/constants";
import type { GroupRef } from "@/lib/tree";

interface DialMarkerProps {
  group: GroupRef;
  angle: number;
  radius: number;
  isActive: boolean;
  /** 選択ワード件数（アクティブ時は頭文字の代わりに件数を表示） */
  selectedCount: number;
}

export function DialMarker({
  group,
  angle,
  radius,
  isActive,
  selectedCount,
}: DialMarkerProps) {
  const isParent = group.depth % 2 === 0;
  const size = isParent ? 22 : 18;
  const initial =
    isActive && selectedCount > 0
      ? String(selectedCount)
      : Array.from(group.name)[0]?.toUpperCase() ?? "";

  return (
    <button
      title={group.path.join(" / ")}
      className="absolute left-1/2 top-1/2 flex items-center justify-center transition-transform cursor-crosshair"
      style={{
        transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(${-angle}deg)`,
        transformOrigin: "center",
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
    >
      {isParent ? (
        // ボーダー付き正六角形。
        // clip-path では box-shadow が切り抜かれて効かなくなるため、
        // SVG polygon + stroke で縁を描き、グローは filter: drop-shadow で六角形形状に追従させる。
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className="absolute inset-0 block overflow-visible transition-transform"
          style={{
            transform: isActive ? "scale(1.25)" : "none",
            filter: isActive
              ? "drop-shadow(0 0 6px rgba(57,255,20,0.85))"
              : "none",
          }}
        >
          <polygon
            points={HEX_POLYGON_POINTS}
            fill="rgba(57,255,20,0.3)"
            stroke="var(--color-eva-green)"
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span
          className={[
            "absolute inset-0 block rounded-full border transition-all aspect-square",
            "bg-eva-purple/30 border-eva-lilac",
            isActive ? "shadow-glow-purple scale-125" : "",
          ].join(" ")}
          style={{ width: size, height: size }}
        />
      )}
      <span
        className={[
          "relative flex items-center justify-center w-full h-full text-[9px] font-mono leading-none pointer-events-none",
          isParent ? "text-eva-green" : "text-eva-lavender",
        ].join(" ")}
      >
        {initial}
      </span>
    </button>
  );
}
