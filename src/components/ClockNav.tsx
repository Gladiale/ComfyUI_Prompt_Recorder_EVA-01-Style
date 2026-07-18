// 時計の指針型ロードマップ / ClockNav
// WORDS ラベルから起動。マウスの動きに合わせて針が回転し、
// クリックで該当グループへスクロール（閉じていれば祖先ごと自動展開）。
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePrompt } from "@/context/PromptContext";
import { collectAllGroups, type GroupRef } from "@/lib/tree";
import { fadeInOutSpring } from "@/lib/motions";

// ============================================================
// Provider / Hook
// ============================================================

interface ClockNavValue {
  open: () => void;
}

const ClockNavContext = createContext<ClockNavValue | null>(null);

export function ClockNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<ClockNavValue>(() => ({ open: () => setIsOpen(true) }), []);
  return (
    <ClockNavContext value={value}>
      {children}
      <AnimatePresence>
        {isOpen && <ClockDial onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </ClockNavContext>
  );
}

export function useClockNav(): ClockNavValue {
  const ctx = useContext(ClockNavContext);
  if (!ctx) throw new Error("useClockNav must be used within ClockNavProvider");
  return ctx;
}

// ============================================================
// ダイヤル
// ============================================================

const DIAL_SIZE = 360; // ダイヤル全体のサイズ (px)
const R_OUTER = 150; // 最外層のインデックス配置半径
const R_INNER_MIN = 26; // 最内層の最低半径（中心軸との干渉回避）
const RING_GAP_MAX = 22; // 層間の間隔（最大値）

// 魔法陣ポップアップ（一番外枠）のサイズ
const NAV_PANEL = 500;
// 正十二角形の clip-path（頂点12個が30°間隔）。
// 3つの正方形（0°/30°/60°回転）を重ねた十二角星の外接輪郭と一致する形状。
const CLIP_DODECAGON =
  "polygon(50% 0%, 75% 6.7%, 93.3% 25%, 100% 50%, 93.3% 75%, 75% 93.3%, 50% 100%, 25% 93.3%, 6.7% 75%, 0% 50%, 6.7% 25%, 25% 6.7%)";

function ClockDial({ onClose }: { onClose: () => void }) {
  const { state, expandGroupPath } = usePrompt();
  const groups = useMemo(() => collectAllGroups(state), [state]);
  const N = groups.length;

  // 針の角度（度・連続値）。0=12時方向、時計回りに増加。
  // 0..360 で折り返さず連続させることで、境界越え時に逆回りアニメしない。
  const [needleAngle, setNeedleAngle] = useState(0);
  // ハイライト中インデックス（マウスホバー位置から算出）
  const [activeIdx, setActiveIdx] = useState(0);

  const dialRef = useRef<HTMLDivElement>(null);

  const step = N > 0 ? 360 / N : 360;

  // ---- 階層（同心円リング）構造 ----
  // 層 = floor(depth/2)。層0が最外層。
  //   層0: depth0(親=A) と depth1(子=B)
  //   層1: depth2(親=C) と depth3(子)
  // 各インデックスに一意の角度を割り当て、層ごとに半径を変えて配置する。
  // 針は1本で、指しているインデックスの層半径に長さを追従させる。
  const layerOf = (depth: number) => Math.floor(depth / 2);
  const maxLayer = useMemo(
    () => (N > 0 ? groups.reduce((m, g) => Math.max(m, layerOf(g.depth)), 0) : 0),
    [groups, N],
  );
  const ringGap =
    maxLayer > 0
      ? Math.min(RING_GAP_MAX, (R_OUTER - R_INNER_MIN) / maxLayer)
      : RING_GAP_MAX;
  const radiusOf = (depth: number) => R_OUTER - layerOf(depth) * ringGap;
  // 針の長さ = 現在指しているインデックスの層半径
  const handLen = (N > 0 ? radiusOf(groups[activeIdx].depth) : R_OUTER) - 6;

  // 0..360 の正規化角度へ。
  const norm = (a: number) => ((a % 360) + 360) % 360;

  // target(0..360) へ最短回転で針角度（連続値）を更新。
  const setAngleShort = (target: number) => {
    setNeedleAngle((prev) => {
      const cur = norm(prev);
      const diff = ((target - cur + 540) % 360) - 180; // -180..180 の最短差
      return prev + diff;
    });
  };

  // ポインタ位置から針角度（0=12時, 時計回り）を計算
  const angleFromPointer = (clientX: number, clientY: number): number => {
    const el = dialRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2(dx, -dy): 12時=0, 3時=90, 6時=180, 9時=270
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  };

  const nearestIndex = (deg: number): number => {
    if (N <= 0) return 0;
    return ((Math.round(deg / step) % N) + N) % N;
  };

  // マウスの動きに合わせて針を回転（ドラッグ不要）。
  const onPointerMove = (e: PointerEvent) => {
    if (N <= 0) return;
    const a = angleFromPointer(e.clientX, e.clientY);
    setAngleShort(a);
    setActiveIdx(nearestIndex(a));
  };

  // クリックで現在針が指すインデックスへジャンプ確定。
  const onClick = (e: ReactMouseEvent) => {
    if (N <= 0) return;
    const a = angleFromPointer(e.clientX, e.clientY);
    const idx = nearestIndex(a);
    const target = groups[idx];
    if (target) jumpTo(target);
  };

  const jumpTo = useCallback(
    (g: GroupRef) => {
      // 1. 祖先ごと展開（state 更新 → React 再描画 → DOM 出現）
      expandGroupPath(g.id);
      // 2. 描画 + AnimatePresence 展開開始後のレイアウト確定を待つ
      const doScroll = () => {
        const el = document.querySelector<HTMLElement>(`[data-group-id="${g.id}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
      // 3. ポップアップを閉じる
      onClose();
    },
    [expandGroupPath, onClose],
  );

  const active = N > 0 ? groups[activeIdx] : null;

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
        // initial={{ scale: 0.92, opacity: 0, y: 8 }}
        // animate={{ scale: 1, opacity: 1, y: 0 }}
        // exit={{ scale: 0.95, opacity: 0, y: 8 }}
        // transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        variants={fadeInOutSpring(0.4, 40, 1)}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center justify-around"
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
        {/* 魔法陣装飾: 外周円 + 3つの正方形(0°/30°/60°回転 → 十二角星) + 内円 */}
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

        <div className="relative font-cinzel-deco tracking-[0.15em] text-[10px] text-eva-green glow-text flex flex-col items-center justify-center h-7 mt-2.5">
          ◇ NAVIGATION ◇
          <span className="relative font-mono text-[8px] text-eva-ink-dim tracking-widest">
            マウスで合わせ・クリックでジャンプ
          </span>
        </div>

        {N > 0 ? (
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
              const a = i * step;
              const isParent = g.depth % 2 === 0;
              const isActive = i === activeIdx;
              const r = radiusOf(g.depth);
              const size = isParent ? 22 : 18;
              const initial = Array.from(g.name)[0]?.toUpperCase() ?? "";
              return (
                <button
                  key={g.id}
                  title={g.path.join(" / ")}
                  className="absolute left-1/2 top-1/2 flex items-center justify-center transition-transform cursor-crosshair"
                  style={{
                    transform: `rotate(${a}deg) translateY(-${r}px) rotate(${-a}deg)`,
                    transformOrigin: "center",
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                  }}
                >
                  {isParent ? (
                    // ボーダー付き正六角形。
                    // clip-path では box-shadow(shadow-glow-green) が切り抜かれて効かなくなるため、
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
                        points="50,3 90.7,26.5 90.7,73.5 50,97 9.3,73.5 9.3,26.5"
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
                        "bg-eva-purple/30 border-eva-purple-bright",
                        isActive ? "shadow-glow-purple scale-125" : "",
                      ].join(" ")}
                      style={{ width: size, height: size }}
                    />
                  )}
                  <span
                    className={[
                      "relative flex items-center justify-center w-full h-full text-[9px] font-mono leading-none pointer-events-none",
                      isParent ? "text-eva-green" : "text-eva-ink-dim",
                    ].join(" ")}
                  >
                    {initial}
                  </span>
                </button>
              );
            })}

            {/* 針（指針1本）：下端をダイヤル中心に合わせ、指す層の半径に長さを追従 */}
            <motion.div
              className="absolute left-1/2"
              animate={{ rotate: needleAngle, height: handLen, marginTop: -handLen }}
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
                  active.depth % 2 === 0 ? "text-eva-green" : "text-eva-purple-bright"
                }`}
              >
                {active.name}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center justify-center text-eva-ink-dim italic font-garamond text-[13px]"
            style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
          >
            グループがありません。
          </div>
        )}

        {/* グループ名ポップアップ */}
        {/* mode="wait"の場合 短時間に active.id が大量に変化すると、アニメーションの「渋滞」が発生し、レンダリングが追いつかなくなったり、表示が消えたり（死んでしまう現象）します */}
        <AnimatePresence mode="popLayout">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              // transition={{ duration: 0.2 }}
              className="relative text-center h-7 mb-2.5"
            >
              <div
                className={`font-cinzel tracking-widest text-[13px] ${
                  active.depth % 2 === 0 ? "text-eva-green" : "text-eva-purple-bright"
                }`}
              >
                {active.name}
              </div>
              {active.path.length > 1 && (
                <div className="font-mono text-[10px] text-eva-ink-dim mt-0.5">
                  {active.path.join(" / ")}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
