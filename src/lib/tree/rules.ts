/**
 * プロンプト変換ルール操作
 * 追加・編集・削除・適用切替・並替を担当
 */

import type { PromptTransformRule, RootState } from "@/types";
import { moveItem } from "@/lib/array";
import { clone } from "./immutable";
import { genId } from "./id";

/** ルール新規作成時の入力（id / enabled 以外）。 */
export interface RuleFormInput {
  name: string;
  from: string;
  to: string;
}

/**
 * 入力を正規化する。
 * - name のみ前後空白を trim（表示用ラベル）
 * - from / to は空白を変換対象に含めるため trim しない
 */
export function normalizeRuleInput(input: RuleFormInput): RuleFormInput {
  return {
    name: input.name.trim(),
    from: input.from,
    to: input.to,
  };
}

/** 保存可能か（name が非空 / from が空文字でない。from/to の空白は有効）。 */
export function isValidRuleInput(input: RuleFormInput): boolean {
  const n = normalizeRuleInput(input);
  return n.name.length > 0 && n.from.length > 0;
}

/** 新規ルールを末尾に追加（常に disabled）。 */
export function addRule(root: RootState, input: RuleFormInput): RootState {
  const n = normalizeRuleInput(input);
  if (!n.name || !n.from) return root;
  const next = clone(root);
  const rule: PromptTransformRule = {
    id: genId("rule"),
    name: n.name,
    from: n.from,
    to: n.to,
    enabled: false,
  };
  next.rules = [...(next.rules ?? []), rule];
  return next;
}

/** 既存ルールを編集（enabled は維持）。 */
export function updateRule(
  root: RootState,
  ruleId: string,
  input: RuleFormInput,
): RootState {
  const n = normalizeRuleInput(input);
  if (!n.name || !n.from) return root;
  const next = clone(root);
  const rules = next.rules ?? [];
  const idx = rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return root;
  rules[idx] = {
    ...rules[idx],
    name: n.name,
    from: n.from,
    to: n.to,
  };
  next.rules = rules;
  return next;
}

/** ルールを削除。 */
export function deleteRule(root: RootState, ruleId: string): RootState {
  const next = clone(root);
  const rules = next.rules ?? [];
  const filtered = rules.filter((r) => r.id !== ruleId);
  if (filtered.length === rules.length) return root;
  next.rules = filtered;
  return next;
}

/** 適用状態を切替。 */
export function setRuleEnabled(
  root: RootState,
  ruleId: string,
  enabled: boolean,
): RootState {
  const next = clone(root);
  const rules = next.rules ?? [];
  const idx = rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return root;
  if (rules[idx].enabled === enabled) return root;
  rules[idx] = { ...rules[idx], enabled };
  next.rules = rules;
  return next;
}

/**
 * ルールを並べ替える。
 * targetId の前へ挿入する（仕様 11.3）。
 * targetId が draggedId 自身、または見つからない場合は変更なし。
 */
export function reorderRules(
  root: RootState,
  draggedId: string,
  targetId: string,
): RootState {
  if (draggedId === targetId) return root;
  const rules = root.rules ?? [];
  const fromIndex = rules.findIndex((r) => r.id === draggedId);
  const toIndex = rules.findIndex((r) => r.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return root;
  const next = clone(root);
  next.rules = moveItem(rules, fromIndex, toIndex);
  return next;
}
