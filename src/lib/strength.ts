// ============================================================
// 強度（Strength）/ ワードの強調フォーマット
// ============================================================
//
// 選択ワードの強度に応じて、総括欄へ出力するテキストを整形する。
//   0           -> school_uniform        （デフォルト・そのまま）
//   1           -> (school_uniform)      （括弧のみ）
//   2           -> (school_uniform:1.1)
//   3           -> (school_uniform:1.2)
//   ...
//   10          -> (school_uniform:1.9)
// n>=2 の重み = 1.0 + (n - 1) * 0.1

export const MAX_STRENGTH = 10
export const DEFAULT_STRENGTH = 0

/** 強度を 0..MAX_STRENGTH の整数に収める。非数値は 0 扱い。 */
export function clampStrength(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return DEFAULT_STRENGTH
  return Math.max(0, Math.min(MAX_STRENGTH, Math.round(v)))
}

/**
 * 強度に応じてワードテキストをフォーマットする。
 * text は前後空白を除去してから整形する。
 */
export function formatWordWithStrength(text: string, strength: unknown): string {
  const s = clampStrength(strength)
  const t = text.trim()
  if (s <= 0) return t
  if (s === 1) return `(${t})`
  const weight = (1.0 + (s - 1) * 0.1).toFixed(1)
  return `(${t}:${weight})`
}
