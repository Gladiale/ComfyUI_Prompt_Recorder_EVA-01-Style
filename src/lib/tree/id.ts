/**
 * ID生成ユーティリティ
 */

// ---- ID 生成 ----
let _seq = 0;
function rand(): string {
  // Date.now / Math.random を併用しつつ、カウンタベースで一意性を確保。
  // （永続化された既存 ID との衝突回避のため、十分な桁数）
  _seq = (_seq + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${_seq.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function genId(prefix: string): string {
  return `${prefix}_${rand()}`;
}
