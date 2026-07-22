// 総括テキストのポイント数（区切り方式に依存）
import type { Separator } from "@/lib/diff";

/** synthesis 文字列を区切り方式に応じてポイント数に換算する。 */
export function countSynthesisPoints(
  synthesis: string,
  separator: Separator,
): number {
  if (!synthesis) return 0;
  return separator === "comma"
    ? synthesis.split(", ").length
    : synthesis.split("\n").length;
}
