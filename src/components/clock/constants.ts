// 時計ナビ（ClockDial）の寸法・形状定数

/** ダイヤル全体のサイズ (px) */
export const DIAL_SIZE = 360;
/** 最外層のインデックス配置半径 */
export const R_OUTER = 150;
/** 最内層の最低半径（中心軸との干渉回避） */
export const R_INNER_MIN = 26;
/** 層間の間隔（最大値） */
export const RING_GAP_MAX = 22;

/** 魔法陣ポップアップ（一番外枠）のサイズ */
export const NAV_PANEL = 500;

/**
 * 正十二角形の clip-path（頂点12個が30°間隔）。
 * 3つの正方形（0°/30°/60°回転）を重ねた十二角星の外接輪郭と一致する形状。
 */
export const CLIP_DODECAGON =
  "polygon(50% 0%, 75% 6.7%, 93.3% 25%, 100% 50%, 93.3% 75%, 75% 93.3%, 50% 100%, 25% 93.3%, 6.7% 75%, 0% 50%, 6.7% 25%, 25% 6.7%)";

/** 正六角形マーカー用 polygon points (viewBox 0 0 100 100) */
export const HEX_POLYGON_POINTS =
  "50,3 90.7,26.5 90.7,73.5 50,97 9.3,73.5 9.3,26.5";
