// ============================================================
// 総括欄プロンプト変換ルール / Transform
// ============================================================
//
// ワードツリーの元本文は変更せず、総括欄の表示・コピー・差分用
// テキストだけを変換する。
//
// 適用順：
//   1. 元本文を trim
//   2. enabled ルールを一覧順に逐次適用（リテラル置換）
//   3. 全ルール適用後に trim
//   4. 空文字なら表示から除外
//   5. 元ワードの強度を付与
//   6. 強度付き文字列で重複排除（表示用）

import { normalizeText } from "@/lib/normalize";
import { clampStrength, formatWordWithStrength } from "@/lib/strength";
import type { PromptTransformRule, Word } from "@/types";

/** 選択ワードの参照（PromptContext / diff と同一形状） */
export interface TransformSelectedRef {
  word: Word;
  groupId: string;
  groupPath: string[];
}

/** 変換後の1エントリ（元ワード単位・重複排除前） */
export interface TransformedEntry {
  wordId: string;
  /** 元本文（trim 済み） */
  originalText: string;
  /** ルール適用後の本文（trim 済み。空文字可） */
  text: string;
  strength: number;
  /** 強度付き文字列。text が空なら空文字。 */
  formatted: string;
  groupId: string;
  groupPath: string[];
}

/**
 * リテラル文字列の全置換。
 * - 正規表現は解釈しない
 * - 置換先の `$` 等もリテラル
 * - 左から非重複で一致箇所をすべて置換
 * - from が空の場合は何もしない
 */
export function replaceAllLiteral(
  source: string,
  from: string,
  to: string,
): string {
  if (!from) return source;
  if (!source.includes(from)) return source;

  let result = "";
  let i = 0;
  while (i < source.length) {
    const idx = source.indexOf(from, i);
    if (idx === -1) {
      result += source.slice(i);
      break;
    }
    result += source.slice(i, idx) + to;
    i = idx + from.length;
  }
  return result;
}

/**
 * 有効ルールを一覧順に逐次適用する。
 * ルール間では trim せず、呼び出し側が前後で trim する。
 */
export function applyTransformRules(
  text: string,
  rules: readonly PromptTransformRule[],
): string {
  let result = text;
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!rule.from) continue;
    result = replaceAllLiteral(result, rule.from, rule.to);
  }
  return result;
}

/**
 * 1ワードの本文へルールを適用し、trim 済み変換結果を返す。
 * 元本文が空白のみの場合は空文字。
 */
export function transformWordText(
  text: string,
  rules: readonly PromptTransformRule[],
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return applyTransformRules(trimmed, rules).trim();
}

/**
 * 選択ワードから変換後エントリ列を構築する（重複排除なし）。
 * 元本文が空のワードは除外。変換後が空でも保持する（差分追跡用）。
 */
export function buildTransformedEntries(
  refs: readonly TransformSelectedRef[],
  rules: readonly PromptTransformRule[],
): TransformedEntry[] {
  const out: TransformedEntry[] = [];
  for (const ref of refs) {
    const originalText = ref.word.text.trim();
    if (!originalText) continue;
    const strength = clampStrength(ref.word.strength ?? 0);
    const text = transformWordText(ref.word.text, rules);
    const formatted = text
      ? formatWordWithStrength(text, strength)
      : "";
    out.push({
      wordId: ref.word.id,
      originalText,
      text,
      strength,
      formatted,
      groupId: ref.groupId,
      groupPath: ref.groupPath,
    });
  }
  return out;
}

/**
 * 表示用：変換 → 強度付与 → 空除外 → normalizeText で重複排除。
 * 出現順を維持し、最初の出現のみ残す。
 */
export function buildDisplayEntries(
  refs: readonly TransformSelectedRef[],
  rules: readonly PromptTransformRule[],
): TransformedEntry[] {
  const seen = new Set<string>();
  const out: TransformedEntry[] = [];
  for (const entry of buildTransformedEntries(refs, rules)) {
    if (!entry.text) continue;
    const key = normalizeText(entry.formatted);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

/** 表示用エントリを区切りで結合する。 */
export function joinDisplayEntries(
  entries: readonly TransformedEntry[],
  separator: "comma" | "newline",
): string {
  const parts = entries.map((e) => e.formatted);
  return separator === "comma" ? parts.join(", ") : parts.join("\n");
}

/** 選択ワード + ルールから総括テキストを生成する。 */
export function buildSynthesisText(
  refs: readonly TransformSelectedRef[],
  rules: readonly PromptTransformRule[],
  separator: "comma" | "newline",
): string {
  return joinDisplayEntries(buildDisplayEntries(refs, rules), separator);
}
