// ============================================================
// 正規化 / 重複判定
// ============================================================

/**
 * ワードの text を正規化して重複判定のキーを生成する。
 * trim + 小文字化 + 連続空白の圧縮。
 */
export function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** 2つのワードテキストが同一（正規化後等価）かを判定する。 */
export function isSameWord(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b)
}
