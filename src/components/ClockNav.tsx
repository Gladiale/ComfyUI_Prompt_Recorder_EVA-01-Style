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

const DIAL_SIZE = 280; // ダイヤル全体のサイズ (px)
const RADIUS = 112; // インデックス配置半径
const HAND_LEN = RADIUS - 6; // 針の長さ

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
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center gap-3 p-5 rounded-sm border border-eva-line bg-eva-bg-panel-2 shadow-glow-purple"
      >
        <span className="font-cinzel-deco tracking-[0.25em] text-[11px] text-eva-green glow-text">
          ◇ NAVIGATION DIAL ◇
        </span>

        {N > 0 ? (
          <div
            ref={dialRef}
            onPointerMove={onPointerMove}
            onClick={onClick}
            className="relative touch-none cursor-crosshair"
            style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
          >
            {/* 外周リング */}
            <div className="absolute inset-0 rounded-full border border-eva-line" />
            <div
              className="absolute rounded-full border border-eva-purple/40"
              style={{ inset: (DIAL_SIZE - RADIUS * 2) / 2 - 8 }}
            />
            {/* 12時基準マーカー */}
            <div className="absolute left-1/2 top-1 -translate-x-1/2 w-px h-3 bg-eva-green/60" />

            {/* インデックス */}
            {groups.map((g, i) => {
              const a = i * step;
              const isRoot = g.depth === 0;
              const isActive = i === activeIdx;
              return (
                <button
                  key={g.id}
                  title={g.path.join(" / ")}
                  className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full transition-transform cursor-crosshair"
                  style={{
                    transform: `rotate(${a}deg) translateY(-${RADIUS}px) rotate(${-a}deg)`,
                    transformOrigin: "center",
                    width: isRoot ? 22 : 14,
                    height: isRoot ? 22 : 14,
                    marginLeft: isRoot ? -11 : -7,
                    marginTop: isRoot ? -11 : -7,
                  }}
                >
                  <span
                    className={[
                      "block rounded-full border transition-all",
                      isRoot
                        ? "bg-eva-green/30 border-eva-green text-eva-green"
                        : "bg-eva-purple/30 border-eva-purple-bright text-eva-ink-dim",
                      isActive
                        ? isRoot
                          ? "shadow-glow-green scale-125"
                          : "shadow-glow-purple scale-125"
                        : "",
                    ].join(" ")}
                    style={{
                      width: isRoot ? 22 : 14,
                      height: isRoot ? 22 : 14,
                    }}
                  >
                    <span className="flex items-center justify-center w-full h-full text-[10px] font-mono leading-none">
                      {Array.from(g.name)[0].toUpperCase()}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* 針（指針1本）：下端をダイヤル中心に合わせ、12時方向へ伸ばす */}
            <motion.div
              className="absolute left-1/2"
              animate={{ rotate: needleAngle }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              style={{
                top: "50%",
                width: 2,
                height: HAND_LEN,
                marginLeft: -1,
                marginTop: -HAND_LEN,
                transformOrigin: "bottom center",
                background:
                  "linear-gradient(to top, rgba(57,255,20,0.15), var(--color-eva-green))",
                boxShadow: "0 0 8px rgba(57,255,20,0.6)",
              }}
            />
            {/* 中心軸 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-eva-green shadow-glow-green" />
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
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="text-center min-h-[2.5em]"
            >
              <div
                className={`font-cinzel tracking-widest text-[13px] ${
                  active.depth === 0 ? "text-eva-green" : "text-eva-purple-bright"
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

        <span className="font-mono text-[9px] text-eva-ink-dim tracking-widest">
          マウスを動かして針を合わせ・クリックでジャンプ
        </span>
      </motion.div>
    </motion.div>
  );
}
