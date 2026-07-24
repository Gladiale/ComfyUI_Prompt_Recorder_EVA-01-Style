// 時計ナビ外周の魔法陣装飾（SVG）
// 外周二重円 + 3つの正方形(0°/30°/60°回転 → 十二角星) + 内円

export function MagicCircleDecor() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full overflow-visible"
      aria-hidden="true"
    >
      {/* 外周二重円 */}
      <circle
        cx={50}
        cy={50}
        r={49}
        fill="none"
        stroke="var(--color-eva-purple-bright)"
        strokeWidth={0.4}
        opacity={0.55}
      />
      <circle
        cx={50}
        cy={50}
        r={47.5}
        fill="none"
        stroke="var(--color-eva-line)"
        strokeWidth={0.25}
        opacity={0.6}
      />
      {/* 3つの正方形: 頂点が円周上(半径≈46)、0°/30°/60°回転で計12頂点が30°間隔になる */}
      {[0, 30, 60].map((rot) => (
        <rect
          key={rot}
          x={50 - 33.53}
          y={50 - 33.53}
          width={67}
          height={67}
          transform={`rotate(${rot} 50 50)`}
          fill="none"
          stroke="rgba(255, 220, 254, 0.884)"
          strokeWidth={0.1}
          opacity={0.6}
        />
      ))}
      {/* 内円 */}
      <circle
        cx={50}
        cy={50}
        r={33.5}
        fill="none"
        stroke="var(--color-eva-purple-bright)"
        strokeWidth={0.25}
        opacity={0.4}
      />
    </svg>
  );
}
